import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { concatMap, from, tap, last } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import { Tag } from 'primeng/tag';
import { Dialog } from 'primeng/dialog';
import { FeeService } from '../../../core/services/fee.service';
import { AcademicService } from '../../../core/services/academic.service';
import { InstituteService } from '../../../core/services/institute.service';
import { UserService } from '../../../core/services/user.service';
import { StudentService } from '../../../core/services/student.service';
import { AuthService } from '../../../core/services/auth.service';
import { StudentListDto } from '../../../core/models/student.model';
import { environment } from '../../../../environments/environment';
import {
  StudentFeeDto, FeePaymentDto, FeeStructureDto, BulkAssignFeeDto,
  DiscountPolicyDto, StudentDiscountDto, FeeGenerationPreviewDto,
  DISCOUNT_TYPES
} from '../../../core/models/fee.model';
import { AcademicYear, ClassDto } from '../../../core/models/academic.model';
import { InstituteDto, CampusDto } from '../../../core/models/institute.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';

@Component({
  selector: 'app-student-fees',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, PageHeaderComponent, DatePickerComponent,
    Button, Select, InputText, InputNumber, Tag, Dialog
  ],
  template: `
    <app-page-header title="Student Fees" subtitle="Manage fee payments and student concessions" />

    <!-- Filters -->
    <div class="filter-bar card flex flex-wrap items-end gap-3">
      @if (isParentFeeView) {
        <div class="field">
          <label>Child</label>
          <p-select
            class="min-w-[220px]"
            [options]="myChildrenOptions()"
            optionLabel="label"
            optionValue="value"
            appendTo="body"
            [(ngModel)]="parentStudentId"
            (onChange)="loadFees()" />
        </div>
      }
      @if (!isParentFeeView && isSuperAdmin) {
        <div class="field">
          <label>Institute</label>
          <p-select
            class="min-w-[180px]"
            [options]="institutes()"
            optionLabel="name"
            optionValue="instituteId"
            placeholder="All Institutes"
            [showClear]="true"
            appendTo="body"
            [(ngModel)]="filterInstituteId"
            (onChange)="onInstituteChange()" />
        </div>
        <div class="field">
          <label>Campus</label>
          <p-select
            class="min-w-[180px]"
            [options]="campuses()"
            optionLabel="name"
            optionValue="campusId"
            placeholder="All Campuses"
            [showClear]="true"
            appendTo="body"
            [disabled]="!filterInstituteId"
            [(ngModel)]="filterCampusId"
            (onChange)="loadFees()" />
        </div>
      }
      @if (!isParentFeeView && isInstituteAdmin) {
        <div class="field">
          <label>Campus</label>
          <p-select
            class="min-w-[180px]"
            [options]="campuses()"
            optionLabel="name"
            optionValue="campusId"
            placeholder="All Campuses"
            [showClear]="true"
            appendTo="body"
            [(ngModel)]="filterCampusId"
            (onChange)="loadFees()" />
        </div>
      }
      @if (!isParentFeeView) {
        <div class="field">
          <label>Academic Year</label>
          <p-select
            class="min-w-[160px]"
            [options]="years()"
            optionLabel="yearLabel"
            optionValue="academicYearId"
            placeholder="All Years"
            [showClear]="true"
            appendTo="body"
            [(ngModel)]="filterYearId"
            (onChange)="onYearChange()" />
        </div>
        <div class="field">
          <label>Class</label>
          <p-select
            class="min-w-[160px]"
            [options]="filterClassOptions()"
            optionLabel="label"
            optionValue="value"
            placeholder="All Classes"
            [showClear]="true"
            appendTo="body"
            [(ngModel)]="filterClassId"
            (onChange)="loadFees()" />
        </div>
        <div class="field">
          <label>Status</label>
          <p-select
            class="min-w-[140px]"
            [options]="statusOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="All Status"
            [showClear]="true"
            appendTo="body"
            [(ngModel)]="filterStatus"
            (onChange)="loadFees()" />
        </div>
        <div class="flex flex-wrap items-center gap-2 mt-auto">
          <p-button label="Bulk Assign" icon="pi pi-bolt" (onClick)="openBulkModal()" />
          <p-button label="Concessions" icon="pi pi-ticket" severity="secondary" [outlined]="true" (onClick)="openConcessionPanel()" />
        </div>
      }
    </div>

    <!-- Summary Strip -->
    <div class="summary-strip">
      <div class="stat-card"><div class="stat-val">{{ studentGroups().length }}</div><div class="stat-lbl">Total Students</div></div>
      <div class="stat-card red"><div class="stat-val">{{ unpaidCount() }}</div><div class="stat-lbl">Unpaid</div></div>
      <div class="stat-card orange"><div class="stat-val">{{ partialCount() }}</div><div class="stat-lbl">Partial</div></div>
      <div class="stat-card green"><div class="stat-val">{{ paidCount() }}</div><div class="stat-lbl">Paid</div></div>
      <div class="stat-card blue"><div class="stat-val">{{ totalBalance() | number:'1.0-0' }}</div><div class="stat-lbl">Total Outstanding</div></div>
    </div>

    <!-- Student-grouped Fees Table -->
    <div class="card">
      <table class="table">
        <thead>
          <tr>
            <th style="width:32px"></th>
            <th>#</th>
            <th>Student</th>
            <th>Class</th>
            <th style="text-align:right">Total Fees</th>
            <th style="text-align:right">Discount</th>
            <th style="text-align:right">Paid</th>
            <th style="text-align:right">Balance</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          @if (!studentGroups().length) {
            <tr><td colspan="10" class="empty">No fee records found. Use Bulk Assign to create fee records for a class.</td></tr>
          }
          @for (s of studentGroups(); track s.studentId; let i = $index) {
            <!-- Summary row -->
            <tr class="student-row" [class.has-overdue]="s.hasOverdue" (click)="toggleExpand(s.studentId)">
              <td class="expand-cell">
                <span class="expand-icon">{{ expandedIds.has(s.studentId) ? '▾' : '▸' }}</span>
              </td>
              <td class="idx">{{ i + 1 }}</td>
              <td>
                <div class="student-cell">
                  <span class="student-name">{{ s.studentName }}</span>
                  <span class="admission">{{ s.admissionNo }}</span>
                </div>
              </td>
              <td>{{ s.className }}</td>
              <td style="text-align:right">{{ s.totalDue | number:'1.0-0' }}</td>
              <td style="text-align:right" [class.discount-cell]="s.totalDiscount > 0">
                {{ s.totalDiscount > 0 ? (s.totalDiscount | number:'1.0-0') : '—' }}
              </td>
              <td style="text-align:right">{{ s.totalPaid | number:'1.0-0' }}</td>
              <td style="text-align:right" [class.balance-due]="s.totalBalance > 0">
                <strong>{{ s.totalBalance | number:'1.0-0' }}</strong>
              </td>
              <td><p-tag [value]="overallStatus(s)" [severity]="statusSeverity(overallStatus(s))" [rounded]="true" /></td>
              <td class="actions" (click)="$event.stopPropagation()">
                @if (s.totalBalance > 0) {
                  <p-button label="Pay" icon="pi pi-credit-card" size="small" (onClick)="openGroupPaymentModal(s)" />
                }
                @if (s.totalBalance === 0 && s.totalPaid > 0) {
                  <p-button label="Receipt" icon="pi pi-print" size="small" severity="success" [outlined]="true" (onClick)="printGroupReceipt(s)" />
                }
              </td>
            </tr>

            <!-- Expanded fee-type breakdown rows -->
            @if (expandedIds.has(s.studentId)) {
              @for (fee of s.fees; track fee.studentFeeId) {
                <tr class="detail-row" [class.row-overdue]="isOverdue(fee)">
                  <td></td>
                  <td></td>
                  <td colspan="2" class="detail-fee-type">
                    <span class="fee-type-dot"></span>{{ fee.feeTypeName }}
                    <span class="detail-due-date">Due: {{ fee.dueDate }}</span>
                  </td>
                  <td style="text-align:right">{{ fee.amountDue | number:'1.0-0' }}</td>
                  <td style="text-align:right" [class.discount-cell]="fee.discount > 0">
                    {{ fee.discount ? (fee.discount | number:'1.0-0') : '—' }}
                  </td>
                  <td style="text-align:right">{{ fee.amountPaid | number:'1.0-0' }}</td>
                  <td style="text-align:right" [class.balance-due]="fee.balance > 0">
                    {{ fee.balance | number:'1.0-0' }}
                  </td>
                  <td><p-tag [value]="fee.status" [severity]="statusSeverity(fee.status)" [rounded]="true" /></td>
                  <td class="actions">
                    @if (fee.status !== 'Paid' && fee.status !== 'Waived') {
                      <p-button label="Pay" icon="pi pi-credit-card" size="small" (onClick)="openPaymentModal(fee)" />
                    }
                    @if (fee.status === 'Paid') {
                      <p-button label="Receipt" icon="pi pi-print" size="small" severity="success" [outlined]="true" (onClick)="printFeeReceipt(fee)" />
                    }
                    <p-button label="History" icon="pi pi-history" size="small" severity="secondary" [text]="true" (onClick)="viewPayments(fee)" />
                  </td>
                </tr>
              }
            }
          }
        </tbody>
        @if (studentGroups().length > 0) {
          <tfoot>
            <tr class="total-row">
              <td colspan="4"><strong>TOTAL ({{ studentGroups().length }} students)</strong></td>
              <td style="text-align:right"><strong>{{ grandTotalDue() | number:'1.0-0' }}</strong></td>
              <td style="text-align:right"><strong>{{ grandTotalDiscount() | number:'1.0-0' }}</strong></td>
              <td style="text-align:right"><strong>{{ grandTotalPaid() | number:'1.0-0' }}</strong></td>
              <td style="text-align:right"><strong>{{ totalBalance() | number:'1.0-0' }}</strong></td>
              <td colspan="2"></td>
            </tr>
          </tfoot>
        }
      </table>
    </div>

    <!-- ── BULK ASSIGN MODAL ── -->
    <p-dialog
      header="Bulk Assign Fees"
      [visible]="showBulkModal()"
      (visibleChange)="$event ? null : closeBulkModal()"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
      [style]="{ width: '56rem' }"
      [breakpoints]="{ '960px': '96vw' }">
      @if (showBulkModal()) {
          <div>
            <form [formGroup]="bulkForm" class="bulk-form-grid">
              <div class="field">
                <label>Academic Year *</label>
                <p-select
                  class="w-full"
                  [options]="years()"
                  optionLabel="yearLabel"
                  optionValue="academicYearId"
                  placeholder="Select year"
                  appendTo="body"
                  [overlayOptions]="{ baseZIndex: 10050 }"
                  [invalid]="!!(bulkF('academicYearId')?.invalid && bulkF('academicYearId')?.touched)"
                  formControlName="academicYearId"
                  (onChange)="onBulkYearChange()" />
              </div>
              <div class="field">
                <label>Class *</label>
                <p-select
                  class="w-full"
                  [options]="bulkClassOptions()"
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Select class"
                  appendTo="body"
                  [overlayOptions]="{ baseZIndex: 10050 }"
                  [invalid]="!!(bulkF('classId')?.invalid && bulkF('classId')?.touched)"
                  formControlName="classId"
                  (onChange)="onBulkClassChange()" />
              </div>
              <div class="field">
                <label>Fee Structure *</label>
                <p-select
                  class="w-full"
                  [options]="bulkStructureOptions()"
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Select structure"
                  appendTo="body"
                  [overlayOptions]="{ baseZIndex: 10050 }"
                  [invalid]="!!(bulkF('feeStructureId')?.invalid && bulkF('feeStructureId')?.touched)"
                  formControlName="feeStructureId"
                  (onChange)="onBulkStructureChange()" />
              </div>
              <div class="field" [class.invalid]="bulkF('dueDate')?.invalid && bulkF('dueDate')?.touched">
                <label>Due Date *</label>
                <app-date-picker formControlName="dueDate" />
              </div>
            </form>

            <!-- Preview Table -->
            @if (bulkPreview().length > 0) {
              <div class="preview-section">
                <div class="preview-header">
                  <h4>Fee Generation Preview</h4>
                  <div class="preview-stats">
                    <span class="ps-chip ps-new">{{ newCount() }} new</span>
                    <span class="ps-chip ps-skip">{{ skippedCount() }} already assigned</span>
                    <span class="ps-chip ps-discount">{{ discountedCount() }} with discounts</span>
                  </div>
                </div>
                <div class="preview-table-wrap">
                  <table class="table table-sm">
                    <thead>
                      <tr>
                        <th>Student</th><th>Base Fee</th><th>Discount</th><th>Net Payable</th>
                        <th>Discount Breakdown</th><th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (p of bulkPreview(); track p.studentId) {
                        <tr [class.already-row]="p.alreadyAssigned">
                          <td>
                            <div class="student-cell">
                              <span class="student-name">{{ p.studentName }}</span>
                              <span class="admission">{{ p.admissionNo }}</span>
                            </div>
                          </td>
                          <td>{{ p.baseFee | number:'1.0-0' }}</td>
                          <td [class.discount-cell]="p.totalDiscount > 0">
                            {{ p.totalDiscount > 0 ? '' + (p.totalDiscount | number:'1.0-0') : '—' }}
                          </td>
                          <td><strong>{{ p.netPayable | number:'1.0-0' }}</strong></td>
                          <td>
                            @if (p.discountLines.length) {
                              <div class="discount-lines">
                                @for (dl of p.discountLines; track dl.policyName) {
                                  <span class="dl-chip">
                                    {{ dl.policyName }}:
                                    {{ dl.valueType === 'Percentage' ? dl.value + '%' : '' + dl.value }}
                                    = {{ dl.discountAmount | number:'1.0-0' }}
                                  </span>
                                }
                              </div>
                            } @else {
                              <span class="t4">No discounts</span>
                            }
                          </td>
                          <td>
                            @if (p.alreadyAssigned) {
                              <p-tag value="Already Assigned" severity="secondary" [rounded]="true" />
                            } @else {
                              <p-tag value="Will Create" severity="success" [rounded]="true" />
                            }
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            }

            @if (bulkResult()) {
              <div class="alert success">✅ {{ bulkResult()!.assigned }} fee records created successfully.</div>
            }
            @if (bulkError()) { <div class="alert error">{{ bulkError() }}</div> }
          </div>
      }
      <ng-template #footer>
        <div class="flex flex-col-reverse flex-wrap gap-2 sm:flex-row sm:justify-end">
          <p-button label="Close" severity="secondary" [outlined]="true" (onClick)="closeBulkModal()" />
          <p-button
            [label]="loadingPreview() ? 'Loading...' : 'Preview'"
            icon="pi pi-search"
            severity="secondary"
            [loading]="loadingPreview()"
            [disabled]="bulkForm.invalid || loadingPreview()"
            (onClick)="loadBulkPreview()" />
          <p-button
            [label]="saving() ? 'Processing...' : 'Assign Fees'"
            icon="pi pi-bolt"
            [loading]="saving()"
            [disabled]="bulkForm.invalid || saving() || !bulkPreview().length"
            (onClick)="saveBulk()" />
        </div>
      </ng-template>
    </p-dialog>

    <!-- ── PAYMENT MODAL ── -->
    <p-dialog
      header="Record Payment"
      [visible]="showPaymentModal()"
      (visibleChange)="$event ? null : closePaymentModal()"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
      [style]="{ width: '34rem' }"
      [breakpoints]="{ '640px': '96vw' }">
      @if (showPaymentModal()) {
          <div>

            <!-- Student + total balance summary -->
            <div class="fee-summary">
              <div>
                <strong>{{ (selectedGroup() ?? selectedFee())?.studentName }}</strong>
                <span style="color:var(--t4); font-size:12px"> · {{ (selectedGroup() ?? selectedFee())?.admissionNo }}</span>
              </div>
              <span class="balance-chip">
                Total Balance: {{ (selectedGroup()?.totalBalance ?? selectedFee()?.balance ?? 0) | number:'1.0-0' }}
              </span>
            </div>

            <!-- Fee breakdown table (group payment) -->
            @if (selectedGroup()) {
              <table class="table table-sm" style="margin-bottom:14px">
                <thead>
                  <tr><th>Fee Type</th><th style="text-align:right">Due</th><th style="text-align:right">Discount</th><th style="text-align:right">Balance</th></tr>
                </thead>
                <tbody>
                  @for (f of selectedGroup()!.fees; track f.studentFeeId) {
                    @if (f.balance > 0) {
                      <tr>
                        <td>{{ f.feeTypeName }}</td>
                        <td style="text-align:right">{{ f.amountDue | number:'1.0-0' }}</td>
                        <td style="text-align:right">{{ f.discount > 0 ? ('' + (f.discount | number:'1.0-0')) : '—' }}</td>
                        <td style="text-align:right"><strong>{{ f.balance | number:'1.0-0' }}</strong></td>
                      </tr>
                    }
                  }
                </tbody>
              </table>
            }

            <form [formGroup]="paymentForm" (ngSubmit)="savePayment()">
              <div class="row-2">
                <div class="field" [class.invalid]="pf('amountPaid')?.invalid && pf('amountPaid')?.touched">
                  <label>Amount (PKR) *</label>
                  <p-inputnumber
                    formControlName="amountPaid"
                    [min]="1"
                    [max]="selectedGroup()?.totalBalance ?? selectedFee()?.balance ?? null"
                    [useGrouping]="false"
                    styleClass="w-full"
                    inputStyleClass="w-full" />
                  @if (pf('amountPaid')?.invalid && pf('amountPaid')?.touched) { <span class="err">Valid amount required.</span> }
                </div>
                <div class="field" [class.invalid]="pf('paymentDate')?.invalid && pf('paymentDate')?.touched">
                  <label>Payment Date *</label>
                  <app-date-picker formControlName="paymentDate" />
                </div>
              </div>
              <div class="row-2">
                <div class="field">
                  <label>Method</label>
                  <p-select
                    class="w-full"
                    [options]="methodOptions"
                    optionLabel="label"
                    optionValue="value"
                    appendTo="body"
                    [overlayOptions]="{ baseZIndex: 10050 }"
                    formControlName="method" />
                </div>
                <div class="field">
                  <label>Receipt No</label>
                  <input pInputText class="w-full" formControlName="receiptNo" placeholder="Optional" />
                </div>
              </div>
              <div class="field">
                <label>Remarks</label>
                <input pInputText class="w-full" formControlName="remarks" placeholder="Optional" />
              </div>
              @if (payError()) { <div class="alert error">{{ payError() }}</div> }
            </form>
          </div>
      }
      <ng-template #footer>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <p-button label="Cancel" severity="secondary" [outlined]="true" (onClick)="closePaymentModal()" />
          <p-button
            [label]="saving() ? 'Processing...' : 'Record Payment'"
            icon="pi pi-check"
            [loading]="saving()"
            [disabled]="saving()"
            (onClick)="savePayment()" />
        </div>
      </ng-template>
    </p-dialog>

    <!-- ── PAYMENT HISTORY PANEL ── -->
    @if (showHistoryPanel()) {
      <div class="panel-overlay" (click)="showHistoryPanel.set(false)">
        <div class="side-panel" (click)="$event.stopPropagation()">
          <div class="panel-header">
            <div>
              <h3>Payment History</h3>
              <p>{{ selectedFee()?.studentName }} — {{ selectedFee()?.feeTypeName }}</p>
            </div>
            <p-button icon="pi pi-times" [text]="true" [rounded]="true" severity="secondary" ariaLabel="Close" (onClick)="showHistoryPanel.set(false)" />
          </div>
          <div class="panel-body">
            <div class="fee-summary" style="margin-bottom:16px">
              <span>Due: {{ selectedFee()?.amountDue | number:'1.0-0' }}</span>
              <span>Discount: {{ selectedFee()?.discount | number:'1.0-0' }}</span>
              <span class="balance-chip">Balance: {{ selectedFee()?.balance | number:'1.0-0' }}</span>
            </div>
            @for (p of payments(); track p.feePaymentId) {
              <div class="payment-row">
                <div class="pay-info">
                  <span class="pay-date">{{ p.paymentDate }}</span>
                  <span class="pay-method">{{ p.method }}</span>
                  @if (p.receiptNo) { <span class="pay-receipt">Receipt: {{ p.receiptNo }}</span> }
                </div>
                <div class="pay-amount">{{ p.amountPaid | number:'1.0-0' }}</div>
                <div class="pay-by">by {{ p.collectedByName }}</div>
                @if (p.remarks) { <div class="pay-remarks">{{ p.remarks }}</div> }
              </div>
            }
            @if (!payments().length) {
              <div class="empty" style="padding:32px">No payments recorded yet.</div>
            }
          </div>
        </div>
      </div>
    }

    <!-- ── STUDENT CONCESSIONS PANEL ── -->
    @if (showConcessionPanel()) {
      <div class="panel-overlay" (click)="showConcessionPanel.set(false)">
        <div class="side-panel side-panel-wide" (click)="$event.stopPropagation()">
          <div class="panel-header">
            <div>
              <h3>Student Concessions</h3>
              <p>Assign discount policies to individual students</p>
            </div>
            <p-button icon="pi pi-times" [text]="true" [rounded]="true" severity="secondary" ariaLabel="Close" (onClick)="showConcessionPanel.set(false)" />
          </div>
          <div class="panel-body">

            <!-- Assign new discount -->
            <div class="concession-form">
              <h4 style="font-size:13px; font-weight:700; color:var(--t2); margin:0 0 12px">Assign New Discount</h4>
              <form [formGroup]="concessionForm" (ngSubmit)="saveConcesssion()">
                <div class="field">
                  <label>Academic Year *</label>
                  <p-select
                    class="w-full"
                    [options]="years()"
                    optionLabel="yearLabel"
                    optionValue="academicYearId"
                    placeholder="Select year"
                    appendTo="body"
                    [overlayOptions]="{ baseZIndex: 10050 }"
                    [invalid]="!!(cf('academicYearId')?.invalid && cf('academicYearId')?.touched)"
                    formControlName="academicYearId" />
                </div>
                <div class="field" [class.invalid]="cf('studentId')?.invalid && cf('studentId')?.touched">
                  <label>Student (Admission No or Name) *</label>
                  <input pInputText class="w-full" formControlName="studentSearch" placeholder="Type to search..."
                    (input)="onStudentSearch($event)" list="student-list-dl" />
                  <datalist id="student-list-dl">
                    @for (f of fees(); track f.studentId) {
                      <option [value]="f.studentName + ' (' + f.admissionNo + ')'" [attr.data-id]="f.studentId"></option>
                    }
                  </datalist>
                  <input type="hidden" formControlName="studentId" />
                </div>
                <div class="field">
                  <label>Discount Policy *</label>
                  <p-select
                    class="w-full"
                    [options]="discountPolicyOptions()"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Select policy"
                    appendTo="body"
                    [overlayOptions]="{ baseZIndex: 10050 }"
                    [invalid]="!!(cf('discountPolicyId')?.invalid && cf('discountPolicyId')?.touched)"
                    formControlName="discountPolicyId" />
                </div>
                <div class="row-2">
                  <div class="field">
                    <label>Override Value <span style="color:var(--t4); font-weight:400">(optional)</span></label>
                    <p-inputnumber
                      formControlName="overrideValue"
                      placeholder="Leave blank to use policy default"
                      [min]="0"
                      [useGrouping]="false"
                      [maxFractionDigits]="2"
                      styleClass="w-full"
                      inputStyleClass="w-full" />
                  </div>
                  <div class="field">
                    <label>Remarks</label>
                    <input pInputText class="w-full" formControlName="remarks" placeholder="Optional reason" />
                  </div>
                </div>
                @if (concessionError()) { <div class="alert error" style="margin-top:0">{{ concessionError() }}</div> }
                <div class="mt-1 flex justify-end">
                  <p-button
                    type="submit"
                    [label]="saving() ? 'Saving...' : 'Assign Discount'"
                    icon="pi pi-plus"
                    [loading]="saving()"
                    [disabled]="saving()" />
                </div>
              </form>
            </div>

            <!-- Existing discounts filter -->
            <div class="concession-filter">
              <div class="field" style="min-width:0; flex:1">
                <label>Filter by Year</label>
                <p-select
                  class="w-full"
                  [options]="years()"
                  optionLabel="yearLabel"
                  optionValue="academicYearId"
                  placeholder="All Years"
                  [showClear]="true"
                  appendTo="body"
                  [overlayOptions]="{ baseZIndex: 10050 }"
                  [(ngModel)]="concessionFilterYear"
                  [ngModelOptions]="{standalone:true}"
                  (onChange)="loadConcessions()" />
              </div>
            </div>

            <!-- Existing discounts list -->
            @for (sd of studentDiscounts(); track sd.studentDiscountId) {
              <div class="sd-row" [class.sd-inactive]="!sd.isActive">
                <div class="sd-top">
                  <div>
                    <span class="sd-name">{{ sd.studentName }}</span>
                    <span class="admission"> · {{ sd.admissionNo }}</span>
                  </div>
                  <div class="sd-actions">
                    <p-button label="Remove" icon="pi pi-trash" size="small" severity="danger" [text]="true" (onClick)="deleteConcesssion(sd.studentDiscountId)" />
                  </div>
                </div>
                <div class="sd-details">
                  <span class="dt-chip dt-{{ sd.discountType.toLowerCase() }}">{{ discountTypeLabel(sd.discountType) }}</span>
                  <span class="sd-policy">{{ sd.policyName }}</span>
                  <span class="sd-value">
                    @if (sd.valueType === 'Percentage') {
                      {{ sd.effectiveValue }}%
                    } @else {
                      {{ sd.effectiveValue | number:'1.0-0' }}
                    }
                    @if (sd.overrideValue !== null && sd.overrideValue !== undefined) {
                      <span class="override-badge">(overridden)</span>
                    }
                  </span>
                  <span class="sd-year">{{ sd.yearLabel }}</span>
                  @if (!sd.isActive) { <p-tag value="Inactive" severity="secondary" [rounded]="true" /> }
                </div>
                @if (sd.remarks) { <div class="sd-remarks">{{ sd.remarks }}</div> }
              </div>
            }
            @if (!studentDiscounts().length) {
              <div class="empty" style="padding:24px">No student discounts assigned yet.</div>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .filter-bar { display:flex; gap:12px; align-items:flex-end; flex-wrap:wrap; margin-bottom:16px; padding:16px 20px; }
    .field { display:flex; flex-direction:column; gap:5px; min-width:140px; }
    label { font-size:11px; font-weight:600; color:var(--t3); text-transform:uppercase; letter-spacing:.5px; }
    input, select { padding:9px 12px; border:1.5px solid var(--border); border-radius:7px; font-size:13.5px; font-family:inherit; background:var(--surface); color:var(--t1); }
    input:focus, select:focus { outline:none; border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-g); }
    .field.invalid input, .field.invalid select { border-color:var(--red); }
    .err { font-size:11.5px; color:var(--red); }

    .summary-strip { display:grid; grid-template-columns:repeat(5,1fr); gap:12px; margin-bottom:16px; }
    .stat-card { background:var(--surface); border-radius:10px; padding:14px 16px; box-shadow:var(--sh); border-left:4px solid var(--accent); }
    .stat-card.red    { border-left-color:var(--red); }
    .stat-card.orange { border-left-color:var(--amber); }
    .stat-card.green  { border-left-color:var(--green); }
    .stat-card.blue   { border-left-color:var(--accent); }
    .stat-val { font-size:20px; font-weight:700; color:var(--t1); }
    .stat-lbl { font-size:11px; color:var(--t4); margin-top:2px; }

    .student-cell { display:flex; flex-direction:column; }
    .student-name { font-weight:600; font-size:13px; color:var(--t1); }
    .admission { font-size:11px; color:var(--t4); }
    .row-overdue { background:var(--red-s) !important; }
    .has-overdue td { background:rgba(239,68,68,.04); }
    .balance-due { color:var(--red); }
    .discount-cell { color:var(--green); font-weight:600; }
    .t4 { color:var(--t4); font-size:12px; }
    .idx { color:var(--t4); font-size:12px; width:32px; }

    /* Student summary rows */
    .student-row { cursor:pointer; transition:background .1s; }
    .student-row:hover td { background:var(--accent-g); }
    .expand-cell { width:32px; text-align:center; }
    .expand-icon { font-size:12px; color:var(--t3); user-select:none; }

    /* Detail (fee-type breakdown) rows */
    .detail-row { background:var(--surface-2); }
    .detail-row td { padding-top:5px !important; padding-bottom:5px !important; font-size:12px; }
    .detail-fee-type { color:var(--t2); display:flex; align-items:center; gap:6px; padding-left:40px !important; }
    .fee-type-dot { width:6px; height:6px; border-radius:50%; background:var(--accent); flex-shrink:0; }
    .detail-due-date { font-size:11px; color:var(--t4); margin-left:8px; }

    /* Footer total row */
    .total-row td { background:var(--surface-2); font-size:13px; padding:10px 12px !important; border-top:2px solid var(--border); }

    .badge-unpaid  { padding:3px 9px; border-radius:12px; background:var(--red-s); color:var(--red); font-size:11.5px; font-weight:600; }
    .badge-partial { padding:3px 9px; border-radius:12px; background:var(--amber-s); color:var(--amber); font-size:11.5px; font-weight:600; }
    .badge-paid    { padding:3px 9px; border-radius:12px; background:var(--green-s); color:var(--green); font-size:11.5px; font-weight:600; }
    .badge-waived  { padding:3px 9px; border-radius:12px; background:var(--surface-2); color:var(--t4); font-size:11.5px; font-weight:600; }
    .badge-gray    { padding:3px 9px; border-radius:12px; background:var(--surface-2); color:var(--t4); font-size:11.5px; font-weight:600; }
    .badge-new  { padding:2px 7px; border-radius:10px; background:var(--green-s); color:var(--green); font-size:11px; font-weight:600; }
    .badge-skip { padding:2px 7px; border-radius:10px; background:var(--surface-2); color:var(--t4); font-size:11px; font-weight:600; }

    .actions { display:flex; gap:8px; align-items:center; }
    .btn-sm-primary  { padding:4px 10px; background:var(--accent); color:#fff; border:none; border-radius:5px; cursor:pointer; font-size:12px; font-family:inherit; }
    .btn-sm-receipt  { padding:4px 10px; background:var(--green-s); color:var(--green); border:1px solid var(--green); border-radius:5px; cursor:pointer; font-size:12px; font-family:inherit; font-weight:600; }
    .btn-link { background:none; border:none; cursor:pointer; font-size:12.5px; color:var(--accent); font-family:inherit; }
    .btn-link.danger { color:var(--red); }
    .empty { text-align:center; color:var(--t4); padding:24px 0; font-style:italic; }

    .fee-summary { background:var(--surface-2); border-radius:8px; padding:12px 14px; margin-bottom:16px;
      display:flex; gap:12px; align-items:center; flex-wrap:wrap; font-size:13px; color:var(--t2); }
    .balance-chip { background:var(--accent); color:#fff; padding:3px 10px; border-radius:12px; font-size:12px; }

    .row-2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }

    /* Bulk modal */
    .modal-xl { max-width:900px !important; width:90vw !important; }
    .bulk-form-grid { display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:12px; margin-bottom:16px; }
    .preview-section { border:1px solid var(--border); border-radius:8px; overflow:hidden; margin-bottom:14px; }
    .preview-header { display:flex; justify-content:space-between; align-items:center; padding:12px 16px; background:var(--surface-2); border-bottom:1px solid var(--border); }
    .preview-header h4 { margin:0; font-size:13px; font-weight:700; color:var(--t1); }
    .preview-stats { display:flex; gap:8px; }
    .ps-chip { padding:3px 9px; border-radius:10px; font-size:11px; font-weight:600; }
    .ps-new      { background:var(--green-s); color:var(--green); }
    .ps-skip     { background:var(--surface-2); color:var(--t4); }
    .ps-discount { background:#dbeafe; color:#1d4ed8; }
    .preview-table-wrap { max-height:320px; overflow-y:auto; }
    .table-sm td, .table-sm th { padding:7px 12px; font-size:12px; }
    .already-row { opacity:.55; }
    .discount-lines { display:flex; flex-wrap:wrap; gap:4px; }
    .dl-chip { padding:2px 7px; border-radius:8px; background:#dbeafe; color:#1d4ed8; font-size:11px; }

    .alert { padding:10px 14px; border-radius:6px; font-size:13px; margin-bottom:12px; }
    .alert.success { background:var(--green-s); color:var(--green); border:1px solid var(--green); }
    .alert.error   { background:var(--red-s); color:var(--red); border:1px solid var(--red); }

    .modal-footer { display:flex; justify-content:flex-end; gap:10px; padding-top:8px; border-top:1px solid var(--border); margin-top:8px; }

    /* Side panel */
    .panel-overlay { position:fixed; inset:0; background:rgba(0,0,0,.4); z-index:1000; }
    .side-panel { position:fixed; right:0; top:0; bottom:0; width:440px; background:var(--surface);
      box-shadow:-4px 0 24px rgba(0,0,0,.2); display:flex; flex-direction:column; z-index:1001; overflow:hidden; }
    .side-panel-wide { width:560px; }
    .panel-header { padding:18px 20px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:flex-start; flex-shrink:0; }
    .panel-header h3 { margin:0; font-size:16px; font-weight:700; color:var(--t1); }
    .panel-header p  { margin:4px 0 0; font-size:12px; color:var(--t4); }
    .panel-body { flex:1; overflow-y:auto; padding:16px 20px; }
    .close-btn { background:none; border:none; cursor:pointer; font-size:18px; color:var(--t3); font-family:inherit; }

    /* Payment history */
    .payment-row { border:1px solid var(--border); border-radius:8px; padding:12px 14px; margin-bottom:10px; background:var(--surface); }
    .pay-info { display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-bottom:4px; }
    .pay-date { font-size:12px; color:var(--t3); }
    .pay-method { padding:2px 8px; border-radius:10px; font-size:11px; font-weight:600; background:var(--accent-s); color:var(--accent); }
    .pay-receipt { font-size:11px; color:var(--t4); }
    .pay-amount { font-size:16px; font-weight:700; color:var(--green); }
    .pay-by { font-size:11px; color:var(--t4); margin-top:2px; }
    .pay-remarks { font-size:11.5px; color:var(--t4); margin-top:4px; font-style:italic; }

    /* Concessions */
    .concession-form { background:var(--surface-2); border-radius:8px; padding:16px; margin-bottom:16px; }
    .concession-filter { margin-bottom:12px; }
    .sd-row { border:1px solid var(--border); border-radius:8px; padding:12px 14px; margin-bottom:10px; }
    .sd-row.sd-inactive { opacity:.6; }
    .sd-top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px; }
    .sd-name { font-weight:600; font-size:13px; color:var(--t1); }
    .sd-details { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
    .sd-policy { font-size:12px; color:var(--t3); }
    .sd-value { font-size:13px; font-weight:700; color:var(--green); }
    .sd-year { font-size:11px; color:var(--t4); }
    .sd-remarks { font-size:11.5px; color:var(--t4); margin-top:6px; font-style:italic; }
    .sd-actions { display:flex; gap:8px; }
    .override-badge { font-size:10px; background:var(--amber-s); color:var(--amber); padding:1px 5px; border-radius:6px; font-weight:600; margin-left:4px; }

    .dt-chip { padding:2px 8px; border-radius:10px; font-size:11px; font-weight:600; }
    .dt-sibling      { background:#dbeafe; color:#1d4ed8; }
    .dt-teacherchild { background:#fce7f3; color:#be185d; }
    .dt-merit        { background:#d1fae5; color:#065f46; }
    .dt-needbased    { background:#fef9c3; color:#854d0e; }
    .dt-fullwaiver   { background:#fee2e2; color:#991b1b; }
    .dt-earlypayment { background:#ede9fe; color:#6d28d9; }
    .dt-custom       { background:#f3f4f6; color:#374151; }
  `]
})
export class StudentFeesComponent implements OnInit {
  private feeSvc       = inject(FeeService);
  private acadSvc      = inject(AcademicService);
  private instituteSvc = inject(InstituteService);
  private userSvc      = inject(UserService);
  private studentSvc   = inject(StudentService);
  private authSvc      = inject(AuthService);
  private route        = inject(ActivatedRoute);
  private fb           = inject(FormBuilder);

  get isSuperAdmin()    { return this.authSvc.hasRole('superadmin'); }
  get isInstituteAdmin(){ return this.authSvc.hasRole('admin'); }
  get isCampusAdmin()   { return this.authSvc.hasRole('principal', 'teacher', 'staff'); }
  /** Parent / teacher-as-parent fee view (not school-wide admin). */
  get isParentFeeView() {
    return this.authSvc.isAlsoParent()
      && !this.authSvc.hasRole('superadmin', 'admin', 'principal');
  }

  fees              = signal<StudentFeeDto[]>([]);
  years             = signal<AcademicYear[]>([]);
  institutes        = signal<InstituteDto[]>([]);
  campuses          = signal<CampusDto[]>([]);
  filterClasses     = signal<ClassDto[]>([]);
  bulkClasses       = signal<ClassDto[]>([]);
  bulkFeeStructures = signal<FeeStructureDto[]>([]);
  payments          = signal<FeePaymentDto[]>([]);
  selectedFee       = signal<StudentFeeDto | null>(null);
  selectedGroup     = signal<{ studentId: number; studentName: string; admissionNo: string; fees: StudentFeeDto[]; totalBalance: number } | null>(null);
  bulkPreview       = signal<FeeGenerationPreviewDto[]>([]);
  discountPolicies  = signal<DiscountPolicyDto[]>([]);
  studentDiscounts  = signal<StudentDiscountDto[]>([]);

  filterInstituteId: number | null = null;
  filterCampusId:    number | null = null;
  filterYearId:      number | null = null;
  filterClassId:     number | null = null;
  filterStatus:      string = '';
  concessionFilterYear: number | null = null;
  myChildren = signal<StudentListDto[]>([]);
  parentStudentId: number | null = null;

  showBulkModal       = signal(false);
  showPaymentModal    = signal(false);
  showHistoryPanel    = signal(false);
  showConcessionPanel = signal(false);
  saving              = signal(false);
  loadingPreview      = signal(false);
  bulkResult          = signal<{ assigned: number } | null>(null);
  bulkError           = signal('');
  payError            = signal('');
  concessionError     = signal('');

  expandedIds   = new Set<number>();
  schoolName    = '';
  schoolLogo    = '';
  schoolStampUrl = '';
  cashierName   = '';
  cashierSigUrl = '';

  studentGroups = computed(() => {
    const map = new Map<number, {
      studentId: number; studentName: string; admissionNo: string; className: string;
      fees: StudentFeeDto[]; totalDue: number; totalDiscount: number; totalPaid: number; totalBalance: number; hasOverdue: boolean;
    }>();
    for (const f of this.fees()) {
      if (!map.has(f.studentId)) {
        map.set(f.studentId, {
          studentId: f.studentId, studentName: f.studentName, admissionNo: f.admissionNo,
          className: f.className, fees: [], totalDue: 0, totalDiscount: 0, totalPaid: 0, totalBalance: 0, hasOverdue: false
        });
      }
      const g = map.get(f.studentId)!;
      g.fees.push(f);
      g.totalDue      += f.amountDue;
      g.totalDiscount += f.discount;
      g.totalPaid     += f.amountPaid;
      g.totalBalance  += f.balance;
      if (this.isOverdue(f)) g.hasOverdue = true;
    }
    return Array.from(map.values());
  });

  unpaidCount  = computed(() => this.studentGroups().filter(s => s.totalBalance > 0 && s.totalPaid === 0).length);
  partialCount = computed(() => this.studentGroups().filter(s => s.totalBalance > 0 && s.totalPaid > 0).length);
  paidCount    = computed(() => this.studentGroups().filter(s => s.totalBalance === 0).length);
  totalBalance    = computed(() => this.studentGroups().reduce((s, g) => s + g.totalBalance, 0));
  grandTotalDue     = computed(() => this.studentGroups().reduce((s, g) => s + g.totalDue, 0));
  grandTotalDiscount = computed(() => this.studentGroups().reduce((s, g) => s + g.totalDiscount, 0));
  grandTotalPaid    = computed(() => this.studentGroups().reduce((s, g) => s + g.totalPaid, 0));
  newCount     = computed(() => this.bulkPreview().filter(p => !p.alreadyAssigned).length);
  skippedCount = computed(() => this.bulkPreview().filter(p => p.alreadyAssigned).length);
  discountedCount = computed(() => this.bulkPreview().filter(p => p.totalDiscount > 0 && !p.alreadyAssigned).length);

  bulkForm = this.fb.group({
    academicYearId:  [null as number | null, Validators.required],
    classId:         [null as number | null, Validators.required],
    feeStructureId:  [null as number | null, Validators.required],
    dueDate:         ['', Validators.required]
  });

  paymentForm = this.fb.group({
    amountPaid:  [null as number | null, [Validators.required, Validators.min(1)]],
    paymentDate: [new Date().toISOString().slice(0, 10), Validators.required],
    method:      ['Cash'],
    receiptNo:   [''],
    remarks:     ['']
  });

  concessionForm = this.fb.group({
    academicYearId:   [null as number | null, Validators.required],
    studentId:        [null as number | null, Validators.required],
    studentSearch:    [''],
    discountPolicyId: [null as number | null, Validators.required],
    overrideValue:    [null as number | null],
    remarks:          ['']
  });

  bulkF(name: string) { return this.bulkForm.get(name); }
  pf(name: string)    { return this.paymentForm.get(name); }
  cf(name: string)    { return this.concessionForm.get(name); }

  discountTypeLabel(type: string) {
    return DISCOUNT_TYPES.find(d => d.value === type)?.label ?? type;
  }

  ngOnInit() {
    const user = this.authSvc.currentUser();
    const qpStudent = Number(this.route.snapshot.queryParamMap.get('studentId'));

    if (this.isParentFeeView) {
      this.studentSvc.getMyChildren().subscribe({
        next: kids => {
          this.myChildren.set(kids);
          this.parentStudentId = (qpStudent && kids.some(k => k.studentId === qpStudent))
            ? qpStudent
            : (kids[0]?.studentId ?? null);
          this.loadFees();
        },
        error: () => { this.myChildren.set([]); this.fees.set([]); }
      });
      return;
    }

    if (this.isSuperAdmin) {
      this.instituteSvc.getInstitutes().subscribe(i => this.institutes.set(i));
    } else if (user?.instituteId) {
      this.filterInstituteId = user.instituteId;
      this.instituteSvc.getCampuses(user.instituteId).subscribe(c => this.campuses.set(c));
      if (user.campusId) {
        this.filterCampusId = user.campusId;
      }
    }

    this.acadSvc.getYears().subscribe(y => this.years.set(y));
    this.feeSvc.getDiscountPolicies().subscribe({ next: d => this.discountPolicies.set(d), error: () => {} });
    this.loadFees();

    const jwtInstId = user?.instituteId;
    this.instituteSvc.getMyInstitute(jwtInstId).subscribe({
      next: resp => {
        if (resp.status === 200 && resp.body) {
          const base = environment.serverUrl;
          this.schoolName     = resp.body.name;
          this.schoolLogo     = resp.body.logoUrl    ? base + resp.body.logoUrl    : '';
          this.schoolStampUrl = resp.body.schoolStampUrl ? base + resp.body.schoolStampUrl : '';
        }
      }
    });
    this.userSvc.getMe().subscribe({
      next: me => {
        this.cashierName   = me.fullName;
        const base = environment.serverUrl;
        this.cashierSigUrl = me.signatureUrl ? base + me.signatureUrl : '';
      }
    });
  }

  onInstituteChange() {
    this.filterCampusId = null;
    this.campuses.set([]);
    if (this.filterInstituteId) {
      this.instituteSvc.getCampuses(this.filterInstituteId).subscribe(c => this.campuses.set(c));
    }
    this.loadFees();
  }

  loadFees() {
    if (this.isParentFeeView) {
      if (!this.parentStudentId) { this.fees.set([]); return; }
      this.feeSvc.getStudentFees({ studentId: this.parentStudentId }).subscribe({
        next: f => this.fees.set(f),
        error: () => this.fees.set([])
      });
      return;
    }
    this.feeSvc.getStudentFees({
      instituteId:    this.filterInstituteId ?? undefined,
      campusId:       this.filterCampusId    ?? undefined,
      classId:        this.filterClassId     ?? undefined,
      academicYearId: this.filterYearId      ?? undefined,
      status:         this.filterStatus      || undefined
    }).subscribe(f => this.fees.set(f));
  }

  loadConcessions() {
    this.feeSvc.getStudentDiscounts(undefined, this.concessionFilterYear ?? undefined)
      .subscribe(d => this.studentDiscounts.set(d));
  }

  onYearChange() {
    this.filterClassId = null;
    if (this.filterYearId) this.acadSvc.getClasses(this.filterYearId).subscribe(c => this.filterClasses.set(c));
    else this.filterClasses.set([]);
    this.loadFees();
  }

  statusOptions = [
    { label: 'Unpaid',  value: 'Unpaid' },
    { label: 'Partial', value: 'Partial' },
    { label: 'Paid',    value: 'Paid' },
    { label: 'Waived',  value: 'Waived' }
  ];
  methodOptions = [
    { label: 'Cash',                          value: 'Cash' },
    { label: 'Bank Transfer',                 value: 'Bank' },
    { label: 'Online / JazzCash / Easypaisa', value: 'Online' },
    { label: 'Cheque',                        value: 'Cheque' }
  ];

  myChildrenOptions = computed(() =>
    this.myChildren().map(c => ({ label: `${c.fullName} (${c.admissionNo})`, value: c.studentId })));
  filterClassOptions = computed(() =>
    this.filterClasses().map(c => ({ label: `${c.className} ${c.section ?? ''}`.trim(), value: c.classId })));
  bulkClassOptions = computed(() =>
    this.bulkClasses().map(c => ({ label: `${c.className} ${c.section ?? ''}`.trim(), value: c.classId })));
  bulkStructureOptions = computed(() =>
    this.bulkFeeStructures().map(fs => ({
      label: `${fs.feeTypeName} — ${Math.round(fs.amount).toLocaleString('en-US', { useGrouping: true })}`,
      value: fs.feeStructureId
    })));
  discountPolicyOptions = computed(() =>
    this.discountPolicies().map(dp => ({
      label: `${dp.name} (${dp.valueType === 'Percentage' ? dp.value + '%' : '' + dp.value})`,
      value: dp.discountPolicyId
    })));

  statusSeverity(s: string): 'success' | 'warn' | 'danger' | 'secondary' {
    switch (s) {
      case 'Paid':    return 'success';
      case 'Partial': return 'warn';
      case 'Unpaid':  return 'danger';
      default:        return 'secondary';
    }
  }

  statusClass(s: string) { return `badge-${s.toLowerCase()}`; }

  isOverdue(fee: StudentFeeDto) {
    return fee.status !== 'Paid' && fee.status !== 'Waived' && new Date(fee.dueDate) < new Date();
  }

  toggleExpand(studentId: number) {
    if (this.expandedIds.has(studentId)) this.expandedIds.delete(studentId);
    else this.expandedIds.add(studentId);
  }

  overallStatus(s: { totalBalance: number; totalPaid: number; fees: StudentFeeDto[] }) {
    if (s.totalBalance === 0) return 'Paid';
    if (s.totalPaid > 0)     return 'Partial';
    if (s.fees.every(f => f.status === 'Waived')) return 'Waived';
    return 'Unpaid';
  }

  overallStatusClass(s: { totalBalance: number; totalPaid: number; fees: StudentFeeDto[] }) {
    return `badge-${this.overallStatus(s).toLowerCase()}`;
  }

  // ── Bulk Assign ───────────────────────────────────────────────────────────

  openBulkModal() {
    this.bulkForm.reset();
    this.bulkClasses.set([]);
    this.bulkFeeStructures.set([]);
    this.bulkPreview.set([]);
    this.bulkResult.set(null);
    this.bulkError.set('');
    this.showBulkModal.set(true);
  }

  onBulkYearChange() {
    const yearId = this.bulkForm.value.academicYearId;
    this.bulkForm.patchValue({ classId: null, feeStructureId: null });
    this.bulkPreview.set([]);
    if (yearId) this.acadSvc.getClasses(yearId).subscribe(c => this.bulkClasses.set(c));
    else this.bulkClasses.set([]);
  }

  onBulkClassChange() {
    const yearId  = this.bulkForm.value.academicYearId;
    const classId = this.bulkForm.value.classId;
    this.bulkForm.patchValue({ feeStructureId: null });
    this.bulkPreview.set([]);
    if (yearId && classId) {
      this.feeSvc.getFeeStructures(yearId, classId).subscribe(s => this.bulkFeeStructures.set(s));
    }
  }

  onBulkStructureChange() { this.bulkPreview.set([]); }

  loadBulkPreview() {
    const v = this.bulkForm.value;
    if (!v.feeStructureId || !v.classId || !v.academicYearId) return;
    this.loadingPreview.set(true);
    this.feeSvc.previewBulkAssign(v.feeStructureId, v.classId, v.academicYearId).subscribe({
      next: (p) => { this.bulkPreview.set(p); this.loadingPreview.set(false); },
      error: (e: any) => { this.bulkError.set(e?.error?.error ?? 'Preview failed.'); this.loadingPreview.set(false); }
    });
  }

  saveBulk() {
    this.bulkForm.markAllAsTouched();
    if (this.bulkForm.invalid) return;
    this.saving.set(true); this.bulkError.set('');
    const v = this.bulkForm.value;
    const dueDate = v.dueDate!;
    const dto: BulkAssignFeeDto = {
      feeStructureId: v.feeStructureId!, classId: v.classId!,
      academicYearId: v.academicYearId!, dueDate,
      month: new Date(dueDate).getMonth() + 1   // billing month from due date
    };
    this.feeSvc.bulkAssign(dto).subscribe({
      next: (r) => {
        this.saving.set(false); this.bulkResult.set({ assigned: r.created ?? r.assigned });
        this.bulkPreview.set([]); this.loadFees();
      },
      error: (e: any) => { this.saving.set(false); this.bulkError.set(e?.error?.error ?? 'Bulk assign failed.'); }
    });
  }

  closeBulkModal() { this.showBulkModal.set(false); }

  // ── Payment ───────────────────────────────────────────────────────────────

  openGroupPaymentModal(s: { studentId: number; studentName: string; admissionNo: string; fees: StudentFeeDto[]; totalBalance: number }) {
    this.selectedGroup.set(s);
    this.selectedFee.set(null);
    this.paymentForm.reset({
      paymentDate: new Date().toISOString().slice(0, 10),
      method: 'Cash',
      amountPaid: s.totalBalance
    });
    this.payError.set('');
    this.showPaymentModal.set(true);
  }

  openPaymentModal(fee: StudentFeeDto) {
    this.selectedGroup.set(null);
    this.selectedFee.set(fee);
    this.paymentForm.reset({ paymentDate: new Date().toISOString().slice(0, 10), method: 'Cash' });
    this.payError.set(''); this.showPaymentModal.set(true);
  }

  savePayment() {
    this.paymentForm.markAllAsTouched();
    if (this.paymentForm.invalid) return;
    const v = this.paymentForm.value;
    const group = this.selectedGroup();

    if (group) {
      // Distribute payment across unpaid fees in order
      let remaining = v.amountPaid!;
      const unpaidFees = group.fees.filter(f => f.balance > 0);
      const calls = unpaidFees
        .filter(() => remaining > 0)
        .map(fee => {
          const amount = Math.min(remaining, fee.balance);
          remaining -= amount;
          return { studentFeeId: fee.studentFeeId, amountPaid: amount };
        })
        .filter(x => x.amountPaid > 0);

      if (!calls.length) return;
      this.saving.set(true); this.payError.set('');

      from(calls).pipe(
        concatMap(c => this.feeSvc.recordPayment({
          studentFeeId: c.studentFeeId, amountPaid: c.amountPaid,
          paymentDate: v.paymentDate!, method: v.method ?? 'Cash',
          receiptNo: v.receiptNo || undefined, remarks: v.remarks || undefined
        })),
        last()
      ).subscribe({
        next: () => { this.saving.set(false); this.closePaymentModal(); this.loadFees(); },
        error: (e: any) => { this.saving.set(false); this.payError.set(e?.error?.error ?? 'Payment failed.'); }
      });
    } else {
      const fee = this.selectedFee();
      if (!fee) return;
      this.saving.set(true); this.payError.set('');
      this.feeSvc.recordPayment({
        studentFeeId: fee.studentFeeId, amountPaid: v.amountPaid!,
        paymentDate: v.paymentDate!, method: v.method ?? 'Cash',
        receiptNo: v.receiptNo || undefined, remarks: v.remarks || undefined
      }).subscribe({
        next: () => { this.saving.set(false); this.closePaymentModal(); this.loadFees(); },
        error: (e: any) => { this.saving.set(false); this.payError.set(e?.error?.error ?? 'Payment failed.'); }
      });
    }
  }

  closePaymentModal() { this.showPaymentModal.set(false); this.selectedGroup.set(null); }

  viewPayments(fee: StudentFeeDto) {
    this.selectedFee.set(fee);
    this.feeSvc.getPayments(fee.studentFeeId).subscribe(p => this.payments.set(p));
    this.showHistoryPanel.set(true);
  }

  // ── Fee Paid Receipts ─────────────────────────────────────────────────────

  printGroupReceipt(s: { studentId: number; studentName: string; admissionNo: string; className: string; fees: StudentFeeDto[]; totalDue: number; totalDiscount: number; totalPaid: number; totalBalance: number }) {
    this.openReceiptWindow(
      s.studentName, s.admissionNo, s.className,
      s.fees,
      s.totalDue, s.totalDiscount, s.totalPaid
    );
  }

  printFeeReceipt(fee: StudentFeeDto) {
    this.openReceiptWindow(
      fee.studentName, fee.admissionNo, fee.className,
      [fee],
      fee.amountDue, fee.discount, fee.amountPaid
    );
  }

  private openReceiptWindow(
    studentName: string, admissionNo: string, className: string,
    fees: StudentFeeDto[],
    totalDue: number, totalDiscount: number, totalPaid: number
  ) {
    const win = window.open('', '_blank');
    if (!win) { alert('Allow popups to print receipts.'); return; }

    const initials = (this.schoolName || 'S').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
    const logoHtml = this.schoolLogo
      ? `<img src="${this.schoolLogo}" class="logo" alt="logo"/>`
      : `<div class="logo-av">${initials}</div>`;

    const cashierSigHtml = this.cashierSigUrl
      ? `<img src="${this.cashierSigUrl}" style="height:36px;display:block;margin-bottom:2px;object-fit:contain;" />`
      : `<div class="sig-line"></div>`;
    const stampHtml = this.schoolStampUrl
      ? `<img src="${this.schoolStampUrl}" style="height:48px;display:block;margin-bottom:2px;object-fit:contain;" />`
      : `<div class="sig-line"></div>`;

    const today = new Date().toLocaleDateString('en-PK', { year:'numeric', month:'long', day:'numeric' });
    const receiptNo = fees[0]?.studentFeeId ? `SF-${fees[0].studentFeeId}` : '—';

    const feeRows = fees.map(f => `
      <tr>
        <td>${f.feeTypeName}</td>
        <td class="r">${f.amountDue.toLocaleString()}</td>
        <td class="r">${f.discount > 0 ? f.discount.toLocaleString() : '—'}</td>
        <td class="r paid-amt">${f.amountPaid.toLocaleString()}</td>
      </tr>`).join('');

    win.document.write(`<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"/>
<title>Fee Receipt — ${studentName}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#f4f4f4;padding:24px;}

  .toolbar{display:flex;justify-content:space-between;align-items:center;
    background:#065f46;color:#fff;padding:12px 20px;border-radius:8px;
    margin-bottom:20px;position:sticky;top:0;z-index:99;box-shadow:0 4px 12px rgba(0,0,0,.2);}
  .toolbar h2{font-size:15px;font-weight:700;}
  .toolbar p{font-size:11px;color:rgba(255,255,255,.7);margin-top:2px;}
  .tbr{display:flex;gap:8px;}
  .btn-p{padding:8px 20px;background:#fff;color:#065f46;border:none;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;}
  .btn-c{padding:8px 16px;background:rgba(255,255,255,.15);color:#fff;border:1.5px solid rgba(255,255,255,.35);border-radius:6px;font-size:13px;cursor:pointer;}

  .receipt{background:#fff;max-width:520px;margin:0 auto;border-radius:10px;
    overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.12);border:1px solid #ddd;}

  /* Header */
  .rec-header{background:linear-gradient(135deg,#065f46,#047857);padding:20px 24px;
    display:flex;align-items:center;gap:14px;}
  .logo{width:52px;height:52px;object-fit:contain;border-radius:8px;
    border:2px solid rgba(255,255,255,.3);flex-shrink:0;}
  .logo-av{width:52px;height:52px;border-radius:8px;background:rgba(255,255,255,.2);
    color:#fff;display:flex;align-items:center;justify-content:center;
    font-size:18px;font-weight:800;flex-shrink:0;}
  .rec-title{color:#fff;}
  .school-name{font-size:16px;font-weight:800;text-transform:uppercase;letter-spacing:.4px;}
  .rec-sub{font-size:11px;color:rgba(255,255,255,.75);margin-top:3px;letter-spacing:1px;text-transform:uppercase;}

  /* PAID stamp */
  .paid-banner{background:#dcfce7;border-bottom:2px solid #86efac;
    padding:10px 24px;display:flex;align-items:center;justify-content:space-between;}
  .paid-stamp{display:flex;align-items:center;gap:8px;}
  .paid-circle{width:36px;height:36px;border-radius:50%;background:#16a34a;
    color:#fff;display:flex;align-items:center;justify-content:center;
    font-size:16px;font-weight:900;border:3px solid #15803d;}
  .paid-text{font-size:14px;font-weight:800;color:#15803d;letter-spacing:.5px;text-transform:uppercase;}
  .rec-no{font-size:11px;color:#166534;font-weight:600;}

  /* Student info */
  .rec-body{padding:18px 24px;}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;margin-bottom:18px;}
  .info-item{display:flex;flex-direction:column;gap:2px;}
  .info-item.wide{grid-column:1/-1;}
  .lbl{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#9ca3af;}
  .val{font-size:13px;font-weight:600;color:#111;}
  .val.name{font-size:15px;font-weight:800;color:#065f46;}

  /* Fee table */
  .fee-tbl{width:100%;border-collapse:collapse;font-size:12.5px;margin-bottom:16px;}
  .fee-tbl thead tr{background:#f0fdf4;border-bottom:2px solid #86efac;}
  .fee-tbl th{padding:8px 10px;text-align:left;font-size:10px;font-weight:700;
    text-transform:uppercase;letter-spacing:.4px;color:#374151;}
  .fee-tbl th.r,.fee-tbl td.r{text-align:right;}
  .fee-tbl td{padding:8px 10px;border-bottom:1px solid #f3f4f6;color:#374151;}
  .fee-tbl tbody tr:last-child td{border-bottom:none;}
  .paid-amt{font-weight:700;color:#15803d;}
  .total-row{background:#f0fdf4 !important;border-top:2px solid #86efac;}
  .total-row td{padding:10px;font-weight:700;}
  .total-amt{font-size:15px;font-weight:800;color:#065f46;}

  /* Footer */
  .rec-footer{border-top:1px solid #f3f4f6;padding:14px 24px;
    display:flex;justify-content:space-between;align-items:flex-end;}
  .sig-block{text-align:center;}
  .sig-line{width:120px;border-bottom:1.5px solid #9ca3af;margin-bottom:4px;}
  .sig-name{font-size:11px;font-weight:600;color:#374151;margin-bottom:2px;}
  .sig-lbl{font-size:9px;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;}
  .print-note{font-size:9px;color:#d1d5db;text-align:right;}

  @media print{
    body{background:#fff!important;padding:0!important;}
    .toolbar{display:none!important;}
    .receipt{box-shadow:none!important;border-radius:0!important;border:none!important;max-width:100%;}
    @page{size:A5 portrait;margin:8mm;}
  }
</style>
</head><body>
<div class="toolbar">
  <div><h2>Fee Receipt</h2><p>${studentName} — ${admissionNo}</p></div>
  <div class="tbr">
    <button class="btn-p" onclick="window.print()">🖨️ Print / Save PDF</button>
    <button class="btn-c" onclick="window.close()">✕ Close</button>
  </div>
</div>

<div class="receipt">
  <div class="rec-header">
    ${logoHtml}
    <div class="rec-title">
      <div class="school-name">${this.schoolName || 'School'}</div>
      <div class="rec-sub">Fee Payment Receipt</div>
    </div>
  </div>

  <div class="paid-banner">
    <div class="paid-stamp">
      <div class="paid-circle">✓</div>
      <div class="paid-text">Fee Paid</div>
    </div>
    <div class="rec-no">Receipt # ${receiptNo} &nbsp;·&nbsp; ${today}</div>
  </div>

  <div class="rec-body">
    <div class="info-grid">
      <div class="info-item wide">
        <span class="lbl">Student Name</span>
        <span class="val name">${studentName}</span>
      </div>
      <div class="info-item">
        <span class="lbl">Admission No</span>
        <span class="val">${admissionNo}</span>
      </div>
      <div class="info-item">
        <span class="lbl">Class</span>
        <span class="val">${className}</span>
      </div>
    </div>

    <table class="fee-tbl">
      <thead>
        <tr>
          <th>Fee Type</th>
          <th class="r">Amount</th>
          <th class="r">Discount</th>
          <th class="r">Paid</th>
        </tr>
      </thead>
      <tbody>${feeRows}</tbody>
      <tfoot>
        <tr class="total-row">
          <td><strong>TOTAL</strong></td>
          <td class="r"><strong>${totalDue.toLocaleString()}</strong></td>
          <td class="r">${totalDiscount > 0 ? totalDiscount.toLocaleString() : '—'}</td>
          <td class="r total-amt">${totalPaid.toLocaleString()}</td>
        </tr>
      </tfoot>
    </table>
  </div>

  <div class="rec-footer">
    <div class="sig-block">
      ${cashierSigHtml}
      <div class="sig-name">${this.cashierName || 'Cashier'}</div>
      <div class="sig-lbl">Received By</div>
    </div>
    <div class="sig-block">
      ${stampHtml}
      <div class="sig-lbl">School Stamp</div>
    </div>
    <div class="print-note">This is a computer-generated receipt.</div>
  </div>
</div>
</body></html>`);
    win.document.close();
  }

  // ── Concessions ───────────────────────────────────────────────────────────

  openConcessionPanel() {
    this.concessionForm.reset();
    this.concessionError.set('');
    this.loadConcessions();
    this.showConcessionPanel.set(true);
  }

  onStudentSearch(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    const match = this.fees().find(f =>
      val === `${f.studentName} (${f.admissionNo})`
    );
    if (match) this.concessionForm.patchValue({ studentId: match.studentId });
  }

  saveConcesssion() {
    this.concessionForm.markAllAsTouched();
    if (this.concessionForm.invalid) return;
    this.saving.set(true); this.concessionError.set('');
    const v = this.concessionForm.value;
    this.feeSvc.assignStudentDiscount({
      studentId: v.studentId!, discountPolicyId: v.discountPolicyId!,
      academicYearId: v.academicYearId!,
      overrideValue: v.overrideValue ?? undefined,
      remarks: v.remarks || undefined
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.concessionForm.reset();
        this.loadConcessions();
      },
      error: (e: any) => { this.saving.set(false); this.concessionError.set(e?.error?.error ?? 'Failed to assign discount.'); }
    });
  }

  deleteConcesssion(id: number) {
    if (!confirm('Remove this discount from the student?')) return;
    this.feeSvc.deleteStudentDiscount(id).subscribe(() => this.loadConcessions());
  }
}
