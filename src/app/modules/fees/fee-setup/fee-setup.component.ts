import { Component, inject, OnInit, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FeeService } from '../../../core/services/fee.service';
import { AcademicService } from '../../../core/services/academic.service';
import {
  FeeTypeDto, FeeStructureDto, DiscountPolicyDto,
  DISCOUNT_TYPES, VALUE_TYPES, FEE_CATEGORIES, FeeCategory
} from '../../../core/models/fee.model';
import { AcademicYear, ClassDto } from '../../../core/models/academic.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ConfirmDeleteComponent } from '../../../shared/components/confirm-delete/confirm-delete.component';
import { ConfirmDeleteService } from '../../../shared/components/confirm-delete/confirm-delete.service';

@Component({
  selector: 'app-fee-setup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, PageHeaderComponent, ConfirmDeleteComponent],
  template: `
    <app-page-header title="Fee Setup" subtitle="Manage fee types, class fee structures and discount policies" />

    <!-- ── SECTION 1: FEE TYPES ── -->
    <div class="section-card">
      <div class="section-head">
        <div class="section-meta">
          <div class="section-icon"><span class="material-icons-round">sell</span></div>
          <div>
            <h3>Fee Types</h3>
            <p>Define the categories of fees your school charges.</p>
          </div>
        </div>
        <button class="btn-primary" (click)="openTypeModal()">
          <span class="material-icons-round">add</span> Add Fee Type
        </button>
      </div>
      <table class="table">
        <thead><tr><th>Name</th><th>Category</th><th>Description</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          @for (ft of feeTypes(); track ft.feeTypeId) {
            <tr>
              <td><strong>{{ ft.name }}</strong></td>
              <td><span [class]="'cat-badge cat-' + ft.feeCategory.toLowerCase()">{{ feeCategoryLabel(ft.feeCategory) }}</span></td>
              <td class="desc-cell">{{ ft.description || '—' }}</td>
              <td><span [class]="'badge ' + (ft.isActive ? 'badge-green' : 'badge-gray')">{{ ft.isActive ? 'Active' : 'Inactive' }}</span></td>
              <td class="actions">
                <button class="icon-btn" (click)="editType(ft)" title="Edit"><span class="material-icons-round">edit</span></button>
                <button class="icon-btn danger" (click)="deleteType(ft.feeTypeId)" title="Delete"><span class="material-icons-round">delete</span></button>
              </td>
            </tr>
          }
          @if (!feeTypes().length) {
            <tr><td colspan="5" class="empty">No fee types defined yet. Add one to get started.</td></tr>
          }
        </tbody>
      </table>
    </div>

    <!-- ── SECTION 2: FEE STRUCTURES ── -->
    <div class="section-card">
      <div class="section-head">
        <div class="section-meta">
          <div class="section-icon purple"><span class="material-icons-round">receipt_long</span></div>
          <div>
            <h3>Fee Structures</h3>
            <p>Assign fee amounts to classes per academic year.</p>
          </div>
        </div>
        <div class="section-head-right">
          <div class="filters">
            <select [(ngModel)]="filterYearId" (change)="loadStructures()" [ngModelOptions]="{standalone: true}">
              <option [ngValue]="null">All Years</option>
              @for (y of years(); track y.academicYearId) {
                <option [ngValue]="y.academicYearId">{{ y.yearLabel }}</option>
              }
            </select>
            <select [(ngModel)]="filterClassId" (change)="loadStructures()" [ngModelOptions]="{standalone: true}">
              <option [ngValue]="null">All Classes</option>
              @for (c of classes(); track c.classId) {
                <option [ngValue]="c.classId">{{ c.className }}</option>
              }
            </select>
          </div>
          <button class="btn-primary" (click)="openStructureModal()">
            <span class="material-icons-round">add</span> Add Structure
          </button>
        </div>
      </div>

      @if (!feeStructures().length) {
        <div class="section-empty">
          <span class="material-icons-round">receipt_long</span>
          <p>No fee structures yet. Click <strong>Add Structure</strong> to create one.</p>
        </div>
      }

      @for (group of groupedStructures(); track group.classId) {
        <div class="fee-card" style="margin:0 0 1px">
          <div class="fee-card-header">
            <div>
              <div class="fee-card-title">{{ group.structureTitle || group.className }}</div>
              <div class="fee-card-sub">{{ group.className }} · {{ group.yearLabel }}</div>
            </div>
            <div class="fee-card-totals">
              @if (group.admissionTotal > 0) {
                <span class="total-chip admission">Admission: <strong>PKR {{ group.admissionTotal | number:'1.0-0' }}</strong></span>
              }
              @if (group.monthlyTotal > 0) {
                <span class="total-chip monthly">Monthly: <strong>PKR {{ group.monthlyTotal | number:'1.0-0' }}</strong></span>
              }
              <span class="total-chip grand">Total: <strong>PKR {{ group.grandTotal | number:'1.0-0' }}</strong></span>
            </div>
          </div>
          <table class="table">
            <thead>
              <tr><th>Fee Type</th><th>Category</th><th style="text-align:right">Amount (PKR)</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              @for (fs of group.items; track fs.feeStructureId) {
                <tr>
                  <td><strong>{{ fs.feeTypeName }}</strong></td>
                  <td><span [class]="'cat-badge cat-' + (fs.feeCategory || 'recurring').toLowerCase()">{{ feeCategoryLabel(fs.feeCategory || 'Recurring') }}</span></td>
                  <td style="text-align:right; font-family:monospace">{{ fs.amount | number:'1.0-0' }}</td>
                  <td><span [class]="'badge ' + (fs.isActive ? 'badge-green' : 'badge-gray')">{{ fs.isActive ? 'Active' : 'Inactive' }}</span></td>
                  <td class="actions">
                    <button class="icon-btn" (click)="editStructure(fs)" title="Edit"><span class="material-icons-round">edit</span></button>
                    <button class="icon-btn danger" (click)="deleteStructure(fs.feeStructureId)" title="Delete"><span class="material-icons-round">delete</span></button>
                  </td>
                </tr>
              }
            </tbody>
            <tfoot>
              <tr class="structure-total-row">
                <td colspan="2"><strong>Total</strong></td>
                <td style="text-align:right; font-family:monospace"><strong>PKR {{ group.grandTotal | number:'1.0-0' }}</strong></td>
                <td colspan="2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      }
    </div>

    <!-- ── SECTION 3: DISCOUNT POLICIES ── -->
    <div class="section-card">
      <div class="section-head">
        <div class="section-meta">
          <div class="section-icon green"><span class="material-icons-round">local_offer</span></div>
          <div>
            <h3>Discount Policies</h3>
            <p>Reusable discount rules — sibling, merit, need-based, full waiver, etc.</p>
          </div>
        </div>
        <button class="btn-primary" (click)="openDiscountModal()">
          <span class="material-icons-round">add</span> Add Policy
        </button>
      </div>

      @if (!discountPolicies().length) {
        <div class="section-empty">
          <span class="material-icons-round">local_offer</span>
          <p>No discount policies yet. Add one to enable automatic discounts during fee generation.</p>
        </div>
      } @else {
        <table class="table">
          <thead>
            <tr><th>Policy Name</th><th>Type</th><th>Value</th><th>Description</th><th>Sibling</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            @for (dp of discountPolicies(); track dp.discountPolicyId) {
              <tr>
                <td><strong>{{ dp.name }}</strong></td>
                <td><span class="dt-chip dt-{{ dp.discountType.toLowerCase() }}">{{ discountTypeLabel(dp.discountType) }}</span></td>
                <td class="value-cell">
                  <strong>{{ dp.valueType === 'Percentage' ? dp.value + '%' : 'PKR ' + (dp.value | number:'1.0-0') }}</strong>
                </td>
                <td class="desc-cell">{{ dp.description || '—' }}</td>
                <td>{{ dp.maxSiblingOrder ? dp.maxSiblingOrder + (dp.maxSiblingOrder === 1 ? 'st' : dp.maxSiblingOrder === 2 ? 'nd' : dp.maxSiblingOrder === 3 ? 'rd' : 'th') + ' child' : '—' }}</td>
                <td><span [class]="'badge ' + (dp.isActive ? 'badge-green' : 'badge-gray')">{{ dp.isActive ? 'Active' : 'Inactive' }}</span></td>
                <td class="actions">
                  <button class="icon-btn" (click)="editDiscount(dp)" title="Edit"><span class="material-icons-round">edit</span></button>
                  <button class="icon-btn danger" (click)="deleteDiscount(dp.discountPolicyId)" title="Delete"><span class="material-icons-round">delete</span></button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>

    <!-- ── FEE TYPE MODAL ── -->
    @if (showTypeModal()) {
      <div class="fs-overlay" (click)="closeModals()">
        <div class="fs-modal fs-modal-sm" (click)="$event.stopPropagation()">
          <div class="fs-header">
            <div class="fs-header-icon"><span class="material-icons-round">sell</span></div>
            <div class="fs-header-text">
              <h3>{{ editingTypeId() ? 'Edit' : 'Add' }} Fee Type</h3>
              <p>{{ editingTypeId() ? 'Update this fee type.' : 'Define a new fee category.' }}</p>
            </div>
            <button class="fs-close" (click)="closeModals()"><span class="material-icons-round">close</span></button>
          </div>
          <form [formGroup]="typeForm" (ngSubmit)="saveType()" class="fs-body">
            <div class="field" [class.invalid]="typeForm.get('name')?.invalid && typeForm.get('name')?.touched">
              <label>Name *</label>
              <input formControlName="name" placeholder="e.g. Tuition Fee" />
              @if (typeForm.get('name')?.invalid && typeForm.get('name')?.touched) {
                <span class="err">Name is required.</span>
              }
            </div>
            <div class="field" [class.invalid]="typeForm.get('feeCategory')?.invalid && typeForm.get('feeCategory')?.touched">
              <label>Fee Category *</label>
              <select formControlName="feeCategory" (change)="onFeeCategoryChange()">
                @for (cat of feeCategories; track cat.value) {
                  <option [value]="cat.value">{{ cat.label }}</option>
                }
              </select>
              @if (selectedCategoryDesc()) {
                <span class="field-hint">{{ selectedCategoryDesc() }}</span>
              }
            </div>
            <div class="field">
              <label>Description</label>
              <textarea formControlName="description" placeholder="Optional description" rows="3"></textarea>
            </div>
            @if (editingTypeId()) {
              <div class="field">
                <label>Status</label>
                <select formControlName="isActive">
                  <option [ngValue]="true">Active</option>
                  <option [ngValue]="false">Inactive</option>
                </select>
              </div>
            }
            @if (modalError()) { <div class="alert error">{{ modalError() }}</div> }
            <div class="fs-footer">
              <button type="button" class="btn-secondary" (click)="closeModals()">Cancel</button>
              <button type="submit" class="btn-primary" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save' }}</button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- ── FEE STRUCTURE MODAL ── -->
    @if (showStructureModal()) {
      <div class="fs-overlay" (click)="closeModals()">
        <div class="fs-modal" (click)="$event.stopPropagation()">

          <!-- Header -->
          <div class="fs-header">
            <div class="fs-header-icon">
              <span class="material-icons-round">{{ editingStructureId() ? 'edit_note' : 'receipt_long' }}</span>
            </div>
            <div class="fs-header-text">
              <h3>{{ editingStructureId() ? 'Edit Fee Structure' : 'Create Fee Structure' }}</h3>
              <p>{{ editingStructureId() ? 'Update amount or status for this fee line.' : 'Set up fee types and amounts for a class.' }}</p>
            </div>
            <button class="fs-close" (click)="closeModals()" title="Close">
              <span class="material-icons-round">close</span>
            </button>
          </div>

          <div class="fs-body">
            @if (!editingStructureId()) {

              <!-- Section: Class & Year -->
              <div class="fs-section-label">Class & Academic Year</div>
              <div class="form-row">
                <div class="field flex-1">
                  <label>Academic Year *</label>
                  <select [(ngModel)]="structureYearId" (change)="onStructureYearChange()" [ngModelOptions]="{standalone:true}">
                    <option [ngValue]="null">Select year</option>
                    @for (y of years(); track y.academicYearId) {
                      <option [ngValue]="y.academicYearId">{{ y.yearLabel }}</option>
                    }
                  </select>
                </div>
                <div class="field flex-1">
                  <label>Class *</label>
                  <select [(ngModel)]="structureClassId" (change)="onStructureClassChange()" [ngModelOptions]="{standalone:true}">
                    <option [ngValue]="null">Select class</option>
                    @for (c of modalClasses(); track c.classId) {
                      <option [ngValue]="c.classId">{{ c.className }} {{ c.section }}</option>
                    }
                  </select>
                </div>
              </div>

              <!-- Structure Title -->
              <div class="field">
                <label>Structure Title *</label>
                <input [(ngModel)]="structureTitle" [ngModelOptions]="{standalone:true}"
                  placeholder="e.g. Grade 1 — 2024-25" [class.row-invalid]="structureTitleError" />
                <span class="field-hint"><span class="material-icons-round" style="font-size:12px;vertical-align:-2px">info</span> Shown when selecting this structure for challan generation.</span>
                @if (structureTitleError) { <span class="err">Title is required.</span> }
              </div>

              <!-- Divider -->
              <div class="fs-divider">
                <span>Fee Lines</span>
              </div>

              <!-- Fee rows -->
              <div class="fee-rows-header">
                <span>Fee Type</span>
                <span>Amount (PKR)</span>
                <span></span>
              </div>
              @for (row of feeRows; track $index; let i = $index) {
                <div class="fee-row fee-row-3">
                  <div class="fee-row-type">
                    <select [(ngModel)]="row.feeTypeId" (change)="onRowFeeTypeChange(i)" [ngModelOptions]="{standalone:true}" [class.row-invalid]="rowErrors[i]?.feeTypeId">
                      <option [ngValue]="null">Select fee type</option>
                      @for (ft of feeTypes(); track ft.feeTypeId) {
                        <option [ngValue]="ft.feeTypeId">{{ ft.name }}</option>
                      }
                    </select>
                    @if (rowCategory(i)) {
                      <span [class]="'cat-badge cat-' + rowCategory(i).toLowerCase()">{{ feeCategoryLabel(rowCategory(i)) }}</span>
                    }
                  </div>
                  <input type="number" [(ngModel)]="row.amount" [ngModelOptions]="{standalone:true}"
                    placeholder="e.g. 5000" min="1" [class.row-invalid]="rowErrors[i]?.amount" />
                  <button class="btn-remove-row" (click)="removeFeeRow(i)" [disabled]="feeRows.length === 1" title="Remove">
                    <span class="material-icons-round">close</span>
                  </button>
                </div>
              }
              <button class="btn-add-row" type="button" (click)="addFeeRow()">
                <span class="material-icons-round">add</span> Add Fee Type
              </button>

              <!-- Live Summary -->
              @if (structureRowsTotal() > 0) {
                <div class="fs-summary">
                  <div class="fs-summary-head">
                    <span class="material-icons-round">summarize</span>
                    <strong>{{ structureTitle || 'Summary' }}</strong>
                    <span class="fs-summary-total">PKR {{ structureRowsTotal() | number:'1.0-0' }}</span>
                  </div>
                  <div class="fs-summary-lines">
                    @for (row of feeRows; track $index) {
                      @if (row.feeTypeId && row.amount) {
                        <div class="fs-summary-line">
                          <span>{{ feeTypeName(row.feeTypeId) }}</span>
                          <span>PKR {{ row.amount | number:'1.0-0' }}</span>
                        </div>
                      }
                    }
                  </div>
                  @if (admissionRowsTotal() > 0) {
                    <div class="fs-summary-sub">
                      <span>Payable on Admission</span>
                      <span>PKR {{ admissionRowsTotal() | number:'1.0-0' }}</span>
                    </div>
                    <div class="fs-summary-sub">
                      <span>Monthly / Recurring</span>
                      <span>PKR {{ structureRowsTotal() - admissionRowsTotal() | number:'1.0-0' }}</span>
                    </div>
                  }
                </div>
              }
            }

            @if (editingStructureId()) {
              <form [formGroup]="structureForm">
                <div class="field" [class.invalid]="sf('amount')?.invalid && sf('amount')?.touched">
                  <label>Amount (PKR) *</label>
                  <input type="number" formControlName="amount" placeholder="e.g. 5000" min="1" />
                  @if (sf('amount')?.invalid && sf('amount')?.touched) {
                    <span class="err">Valid amount required.</span>
                  }
                </div>
                <div class="field">
                  <label>Status</label>
                  <select formControlName="isActive">
                    <option [ngValue]="true">Active</option>
                    <option [ngValue]="false">Inactive</option>
                  </select>
                </div>
              </form>
            }

            @if (modalError()) { <div class="alert error">{{ modalError() }}</div> }
          </div>

          <!-- Footer -->
          <div class="fs-footer">
            <button type="button" class="btn-secondary" (click)="closeModals()">Cancel</button>
            <button type="button" class="btn-primary" [disabled]="saving()" (click)="saveStructure()">
              @if (saving()) {
                <span class="material-icons-round spin-sm">autorenew</span> Saving…
              } @else {
                <span class="material-icons-round">{{ editingStructureId() ? 'save' : 'add_circle' }}</span>
                {{ editingStructureId() ? 'Save Changes' : 'Create Structure' }}
              }
            </button>
          </div>

        </div>
      </div>
    }

    <!-- ── DISCOUNT POLICY MODAL ── -->
    @if (showDiscountModal()) {
      <div class="fs-overlay" (click)="closeModals()">
        <div class="fs-modal" (click)="$event.stopPropagation()">
          <div class="fs-header">
            <div class="fs-header-icon"><span class="material-icons-round">local_offer</span></div>
            <div class="fs-header-text">
              <h3>{{ editingDiscountId() ? 'Edit' : 'Add' }} Discount Policy</h3>
              <p>{{ editingDiscountId() ? 'Update this discount rule.' : 'Create a reusable discount rule.' }}</p>
            </div>
            <button class="fs-close" (click)="closeModals()"><span class="material-icons-round">close</span></button>
          </div>
          <form [formGroup]="discountForm" (ngSubmit)="saveDiscount()" class="fs-body">
            <div class="form-row">
              <div class="field flex-2" [class.invalid]="df('name')?.invalid && df('name')?.touched">
                <label>Policy Name *</label>
                <input formControlName="name" placeholder="e.g. Sibling Discount – 2nd Child" />
                @if (df('name')?.invalid && df('name')?.touched) { <span class="err">Name is required.</span> }
              </div>
              <div class="field flex-1" [class.invalid]="df('discountType')?.invalid && df('discountType')?.touched">
                <label>Discount Type *</label>
                <select formControlName="discountType" (change)="onDiscountTypeChange()">
                  <option value="">Select type</option>
                  @for (dt of discountTypes; track dt.value) {
                    <option [value]="dt.value">{{ dt.label }}</option>
                  }
                </select>
                @if (df('discountType')?.invalid && df('discountType')?.touched) { <span class="err">Type is required.</span> }
              </div>
            </div>

            <div class="form-row">
              <div class="field flex-1" [class.invalid]="df('valueType')?.invalid && df('valueType')?.touched">
                <label>Value Type *</label>
                <select formControlName="valueType">
                  @for (vt of valueTypes; track vt.value) {
                    <option [value]="vt.value">{{ vt.label }}</option>
                  }
                </select>
              </div>
              <div class="field flex-1" [class.invalid]="df('value')?.invalid && df('value')?.touched">
                <label>Value * {{ discountForm.value.valueType === 'Percentage' ? '(%)' : '(PKR)' }}</label>
                <input type="number" formControlName="value" min="0"
                  [max]="discountForm.value.valueType === 'Percentage' ? 100 : 9999999"
                  placeholder="{{ discountForm.value.valueType === 'Percentage' ? 'e.g. 25' : 'e.g. 1500' }}" />
                @if (df('value')?.invalid && df('value')?.touched) { <span class="err">Valid value required.</span> }
              </div>
              @if (showSiblingOrder) {
                <div class="field flex-1">
                  <label>Applies to (Child #)</label>
                  <select formControlName="maxSiblingOrder">
                    <option [ngValue]="null">Any sibling</option>
                    <option [ngValue]="2">2nd child</option>
                    <option [ngValue]="3">3rd child</option>
                    <option [ngValue]="4">4th child</option>
                    <option [ngValue]="5">5th child+</option>
                  </select>
                </div>
              }
            </div>

            <div class="field" [class.invalid]="df('description')?.invalid && df('description')?.touched">
              <label>Description</label>
              <input formControlName="description" placeholder="Brief description of this discount policy" />
            </div>

            @if (editingDiscountId()) {
              <div class="field">
                <label>Status</label>
                <select formControlName="isActive">
                  <option [ngValue]="true">Active</option>
                  <option [ngValue]="false">Inactive</option>
                </select>
              </div>
            }

            <!-- FullWaiver hint -->
            @if (discountForm.value.discountType === 'FullWaiver') {
              <div class="info-box">
                <strong>Full Waiver</strong> — set Value to 100% (Percentage) to waive the entire fee.
                Students assigned this policy will have their entire fee discounted automatically.
              </div>
            }

            @if (modalError()) { <div class="alert error">{{ modalError() }}</div> }
            <div class="fs-footer">
              <button type="button" class="btn-secondary" (click)="closeModals()">Cancel</button>
              <button type="submit" class="btn-primary" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save' }}</button>
            </div>
          </form>
        </div>
      </div>
    }

    <app-confirm-delete />
  `,
  styles: [`
    /* ── Section cards ───────────────────────────── */
    .section-card {
      background:var(--surface); border:1px solid var(--border);
      border-radius:14px; overflow:hidden; margin-top:20px;
    }
    .section-head {
      display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap;
      padding:16px 20px; border-bottom:1px solid var(--border);
      background:var(--surface-2);
    }
    .section-meta { display:flex; align-items:center; gap:14px; }
    .section-icon {
      width:42px; height:42px; border-radius:11px; flex-shrink:0;
      background:var(--accent-s); color:var(--accent);
      display:flex; align-items:center; justify-content:center;
    }
    .section-icon.purple { background:#ede9fe; color:#7c3aed; }
    .section-icon.green  { background:#d1fae5; color:#065f46; }
    .section-icon .material-icons-round { font-size:20px; }
    .section-meta h3 { font-size:15px; font-weight:700; color:var(--t1); margin:0; }
    .section-meta p  { font-size:12px; color:var(--t4); margin:2px 0 0; }

    .section-head-right { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
    .filters { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
    .filters select {
      padding:8px 10px; border:1.5px solid var(--border); border-radius:7px;
      font-size:13px; font-family:inherit; background:var(--surface); color:var(--t1);
    }
    .filters select:focus { outline:none; border-color:var(--accent); }

    .section-empty {
      display:flex; flex-direction:column; align-items:center; gap:8px; text-align:center;
      padding:36px 20px; color:var(--t4);
    }
    .section-empty .material-icons-round { font-size:36px; color:var(--border); }
    .section-empty p { font-size:13px; margin:0; }

    .btn-primary .material-icons-round,
    .btn-secondary .material-icons-round { font-size:16px; }

    .badge { padding:3px 9px; border-radius:12px; font-size:11.5px; font-weight:600; }
    .badge-green { background:var(--green-s); color:var(--green); }
    .badge-gray  { background:var(--surface-2); color:var(--t4); }

    .actions { display:flex; gap:2px; }
    .icon-btn { border:none; background:transparent; cursor:pointer; padding:6px; color:var(--t3); display:flex; align-items:center; border-radius:6px; transition:all .15s; }
    .icon-btn:hover { color:var(--t1); background:var(--surface-2); }
    .icon-btn .material-icons-round { font-size:18px; }
    .icon-btn.danger:hover { color:#ef4444; background:rgba(239,68,68,.08); }
    .empty { text-align:center; color:var(--t4); padding:24px 0; font-style:italic; }

    .field { display:flex; flex-direction:column; gap:5px; margin-bottom:14px; }
    .field.flex-1 { flex:1; }
    .field.flex-2 { flex:2; }
    label { font-size:11px; font-weight:600; color:var(--t3); text-transform:uppercase; letter-spacing:.5px; }
    input, select, textarea { padding:9px 12px; border:1.5px solid var(--border); border-radius:7px; font-size:13.5px; font-family:inherit; background:var(--surface); color:var(--t1); }
    input:focus, select:focus, textarea:focus { outline:none; border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-g); }
    textarea { resize:vertical; }
    .field.invalid input, .field.invalid select, .field.invalid textarea { border-color:var(--red); }
    .err { font-size:11.5px; color:var(--red); }

    .form-row { display:flex; gap:14px; align-items:flex-start; }

    .discount-type-legend { display:flex; flex-wrap:wrap; gap:6px; padding:12px 16px; border-bottom:1px solid var(--border); }
    .value-cell { font-size:13px; }
    .desc-cell { font-size:12.5px; color:var(--t3); max-width:200px; }

    .dt-chip { padding:2px 9px; border-radius:10px; font-size:11px; font-weight:600; white-space:nowrap; }
    .dt-sibling      { background:#dbeafe; color:#1d4ed8; }
    .dt-teacherchild { background:#fce7f3; color:#be185d; }
    .dt-merit        { background:#d1fae5; color:#065f46; }
    .dt-needbased    { background:#fef9c3; color:#854d0e; }
    .dt-fullwaiver   { background:#fee2e2; color:#991b1b; }
    .dt-earlypayment { background:#ede9fe; color:#6d28d9; }
    .dt-custom       { background:#f3f4f6; color:#374151; }

    .info-box { background:var(--accent-g); border:1px solid var(--accent); border-radius:6px;
      padding:10px 14px; font-size:12.5px; color:var(--t2); margin-bottom:14px; }

    .alert.error { background:var(--red-s); color:var(--red); border:1px solid var(--red);
      padding:10px 14px; border-radius:6px; font-size:13px; }

    .cat-badge { padding:2px 9px; border-radius:10px; font-size:11px; font-weight:600; white-space:nowrap; }
    .cat-recurring          { background:#dbeafe; color:#1d4ed8; }
    .cat-onetime            { background:#d1fae5; color:#065f46; }
    .cat-ondemand           { background:#fef9c3; color:#854d0e; }
    .cat-refundabledeposit  { background:#fce7f3; color:#be185d; }

    .field-hint { font-size:11px; color:var(--t4); font-style:italic; }

    /* ── Modal shell ──────────────────────────────── */
    .fs-overlay {
      position:fixed; inset:0; z-index:1000;
      background:rgba(0,0,0,0.45);
      display:flex; align-items:center; justify-content:center;
      padding:16px;
      animation:fsIn .15s ease;
    }
    @keyframes fsIn { from { opacity:0 } to { opacity:1 } }

    .fs-modal {
      background:var(--surface); border-radius:16px;
      width:100%; max-width:620px; max-height:90vh;
      display:flex; flex-direction:column;
      box-shadow:0 24px 48px rgba(0,0,0,.22), 0 4px 12px rgba(0,0,0,.12);
      overflow:hidden;
      animation:fsPop .18s cubic-bezier(.34,1.4,.64,1);
    }
    .fs-modal-sm { max-width:440px; }
    @keyframes fsPop { from { transform:scale(.93); opacity:0 } to { transform:scale(1); opacity:1 } }

    /* Header */
    .fs-header {
      display:flex; align-items:center; gap:12px;
      padding:18px 20px; border-bottom:1px solid var(--border);
      flex-shrink:0;
    }
    .fs-header-icon {
      width:40px; height:40px; border-radius:10px;
      background:var(--accent-s); color:var(--accent);
      display:flex; align-items:center; justify-content:center; flex-shrink:0;
    }
    .fs-header-icon .material-icons-round { font-size:20px; }
    .fs-header-text { flex:1; min-width:0; }
    .fs-header-text h3 { margin:0; font-size:15.5px; font-weight:700; color:var(--t1); }
    .fs-header-text p  { margin:2px 0 0; font-size:12px; color:var(--t4); }
    .fs-close {
      border:none; background:transparent; cursor:pointer;
      color:var(--t4); padding:6px; border-radius:8px;
      display:flex; align-items:center; transition:all .15s; flex-shrink:0;
    }
    .fs-close:hover { background:var(--surface-2); color:var(--t1); }
    .fs-close .material-icons-round { font-size:20px; }

    /* Body */
    .fs-body { padding:20px; overflow-y:auto; flex:1; }

    /* Footer */
    .fs-footer {
      display:flex; justify-content:flex-end; gap:10px;
      padding:14px 20px; border-top:1px solid var(--border);
      background:var(--surface-2); flex-shrink:0;
    }
    .fs-footer .btn-primary,
    .fs-footer .btn-secondary { display:inline-flex; align-items:center; gap:6px; }
    .fs-footer .btn-primary .material-icons-round,
    .fs-footer .btn-secondary .material-icons-round { font-size:16px; }

    /* Section divider */
    .fs-section-label {
      font-size:11px; font-weight:700; color:var(--t4);
      text-transform:uppercase; letter-spacing:.6px;
      margin-bottom:10px;
    }
    .fs-divider {
      display:flex; align-items:center; gap:8px;
      margin:16px 0 10px;
    }
    .fs-divider::before, .fs-divider::after {
      content:''; flex:1; height:1px; background:var(--border);
    }
    .fs-divider span {
      font-size:11px; font-weight:700; color:var(--t4);
      text-transform:uppercase; letter-spacing:.6px; white-space:nowrap;
    }

    /* Summary panel */
    .fs-summary {
      margin-top:14px; border:1.5px solid var(--border);
      border-radius:10px; overflow:hidden;
    }
    .fs-summary-head {
      display:flex; align-items:center; gap:8px;
      padding:10px 14px; background:var(--accent-s);
      border-bottom:1px solid var(--border);
      font-size:13px; font-weight:700; color:var(--accent);
    }
    .fs-summary-head .material-icons-round { font-size:16px; }
    .fs-summary-head .fs-summary-total { margin-left:auto; font-size:14px; }
    .fs-summary-lines { padding:4px 0; }
    .fs-summary-line {
      display:flex; justify-content:space-between;
      padding:6px 14px; font-size:12.5px; color:var(--t2);
    }
    .fs-summary-line:not(:last-child) { border-bottom:1px solid var(--border); }
    .fs-summary-sub {
      display:flex; justify-content:space-between;
      padding:5px 14px; font-size:11.5px; color:var(--t4);
      border-top:1px dashed var(--border);
    }

    /* Spin */
    @keyframes spin-anim { to { transform:rotate(360deg); } }
    .spin-sm { display:inline-block; animation:spin-anim .7s linear infinite; font-size:16px; }

    .empty-card { padding:32px; text-align:center; }

    .fee-card { border:1px solid var(--border); border-radius:12px; overflow:hidden; background:var(--surface); box-shadow:var(--sh); }
    .fee-card-header { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap;
      gap:12px; padding:14px 16px; background:var(--surface-2); border-bottom:1px solid var(--border); }
    .fee-card-title { font-size:15px; font-weight:700; color:var(--t1); }
    .fee-card-sub { font-size:12px; color:var(--t4); margin-top:2px; }
    .fee-card-totals { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
    .total-chip { font-size:12px; padding:4px 10px; border-radius:8px; white-space:nowrap; }
    .total-chip.admission { background:#dbeafe; color:#1d4ed8; }
    .total-chip.monthly   { background:#d1fae5; color:#065f46; }
    .total-chip.grand     { background:#1e3a5f; color:#fff; font-weight:600; }
    .structure-total-row td { background:var(--surface-2); border-top:2px solid var(--border); font-size:13px; padding:8px 10px; }
    .structure-sub-row td { font-size:12px; color:var(--t3); padding:5px 10px; border-top:1px dashed var(--border); }

    .fee-rows-header { display:grid; grid-template-columns:1fr 150px 36px; gap:8px;
      padding:6px 10px; background:var(--surface-2); border-radius:8px; margin-bottom:6px;
      font-size:11px; font-weight:600; color:var(--t3); text-transform:uppercase; letter-spacing:.5px; }
    .fee-row { display:grid; gap:8px; margin-bottom:6px; align-items:start; }
    .fee-row-3 { grid-template-columns:1fr 150px 36px; }
    .fee-row-type { display:flex; flex-direction:column; gap:4px; }
    .fee-row-type select { width:100%; }
    .fee-row input { padding:9px 10px; border:1.5px solid var(--border); border-radius:7px;
      font-size:13px; font-family:inherit; background:var(--surface); color:var(--t1); width:100%; }
    .fee-row select { padding:9px 10px; border:1.5px solid var(--border); border-radius:7px;
      font-size:13px; font-family:inherit; background:var(--surface); color:var(--t1); }
    .fee-row select:focus, .fee-row input:focus { outline:none; border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-g); }
    .row-invalid { border-color:var(--red) !important; }
    .btn-remove-row { background:none; border:1.5px solid var(--border); border-radius:7px; cursor:pointer;
      color:var(--t4); padding:0; width:36px; height:36px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .btn-remove-row .material-icons-round { font-size:16px; }
    .btn-remove-row:hover:not(:disabled) { border-color:var(--red); color:var(--red); background:rgba(239,68,68,.06); }
    .btn-remove-row:disabled { opacity:.3; cursor:not-allowed; }
    .btn-add-row { background:none; border:1.5px dashed var(--border); border-radius:8px; cursor:pointer;
      color:var(--accent); font-size:13px; font-family:inherit; padding:9px 14px; width:100%; margin-top:2px;
      display:flex; align-items:center; gap:6px; transition:all .15s; }
    .btn-add-row .material-icons-round { font-size:16px; }
    .btn-add-row:hover { background:var(--accent-g); border-color:var(--accent); }

    .structure-summary { margin-top:14px; border:1.5px solid var(--border); border-radius:8px; overflow:hidden; }
    .summary-title { padding:8px 12px; background:var(--surface-2); font-size:12px; font-weight:700;
      color:var(--t2); border-bottom:1px solid var(--border); }
    .summary-rows { padding:4px 0; }
    .summary-row { display:flex; justify-content:space-between; padding:5px 12px; font-size:12.5px; color:var(--t2); }
    .summary-row:not(:last-child) { border-bottom:1px solid var(--border); }
    .summary-total { display:flex; justify-content:space-between; padding:8px 12px;
      background:var(--surface-2); border-top:2px solid var(--border); font-size:13px; font-weight:700; color:var(--t1); }
    .summary-sub { display:flex; justify-content:space-between; padding:5px 12px;
      font-size:11.5px; color:var(--t3); border-top:1px dashed var(--border); }


    /* ── Mobile ─────────────────────────────────────── */
    @media (max-width: 768px) {
      .section-head { flex-direction: column; align-items: flex-start; }
      .section-head-right { width: 100%; justify-content: space-between; }
      .filters { flex-wrap: wrap; }
      .filters select { flex: 1; min-width: 120px; }
      .form-row { flex-direction: column; }
      .fee-rows-header { grid-template-columns: 1fr 110px 36px; }
      .fee-row-3 { grid-template-columns: 1fr 110px 36px; }
      .fee-card-totals { flex-direction: column; align-items: flex-start; gap: 6px; }
    }
    @media (max-width: 480px) {
      .fee-card-header { flex-direction: column; align-items: flex-start; }
      .fee-rows-header { grid-template-columns: 1fr 100px 36px; }
      .fee-row-3 { grid-template-columns: 1fr 100px 36px; }
    }
  `]
})
export class FeeSetupComponent implements OnInit {
  private feeSvc  = inject(FeeService);
  private confirmDelete = inject(ConfirmDeleteService);
  private acadSvc = inject(AcademicService);
  private fb      = inject(FormBuilder);
  private router  = inject(Router);

  feeTypes        = signal<FeeTypeDto[]>([]);
  feeStructures   = signal<FeeStructureDto[]>([]);
  discountPolicies = signal<DiscountPolicyDto[]>([]);
  years           = signal<AcademicYear[]>([]);
  classes         = signal<ClassDto[]>([]);
  modalClasses    = signal<ClassDto[]>([]);

  filterYearId:  number | null = null;
  filterClassId: number | null = null;

  showTypeModal      = signal(false);
  showStructureModal = signal(false);
  showDiscountModal  = signal(false);
  editingTypeId      = signal<number | null>(null);
  editingStructureId = signal<number | null>(null);
  editingDiscountId  = signal<number | null>(null);
  saving             = signal(false);
  modalError         = signal('');

  discountTypes  = DISCOUNT_TYPES;
  valueTypes     = VALUE_TYPES;
  feeCategories  = FEE_CATEGORIES;

  typeForm = this.fb.group({
    name:        ['', Validators.required],
    description: [''],
    feeCategory: ['Recurring' as FeeCategory, Validators.required],
    isActive:    [true]
  });

  structureForm = this.fb.group({
    amount:   [null as number | null, [Validators.required, Validators.min(1)]],
    isActive: [true]
  });

  // Multi-row add
  structureYearId:   number | null = null;
  structureClassId:  number | null = null;
  structureTitle:    string = '';
  structureTitleError = false;
  feeRows: { feeTypeId: number | null; amount: number | null }[] = [];
  rowErrors: { feeTypeId?: boolean; amount?: boolean }[] = [];

  discountForm = this.fb.group({
    name:            ['', Validators.required],
    discountType:    ['', Validators.required],
    description:     [''],
    valueType:       ['Percentage', Validators.required],
    value:           [null as number | null, [Validators.required, Validators.min(0)]],
    maxSiblingOrder: [null as number | null],
    isActive:        [true]
  });

  get showSiblingOrder() {
    return this.discountForm.value.discountType === 'Sibling';
  }

  sf(name: string) { return this.structureForm.get(name); }
  df(name: string) { return this.discountForm.get(name); }

  discountTypeLabel(type: string) {
    return DISCOUNT_TYPES.find(d => d.value === type)?.label ?? type;
  }

  feeCategoryLabel(cat: string) {
    return FEE_CATEGORIES.find(c => c.value === cat)?.label ?? cat;
  }

  selectedCategoryDesc() {
    return FEE_CATEGORIES.find(c => c.value === this.typeForm.value.feeCategory)?.description ?? '';
  }

  onFeeCategoryChange() { /* desc hint updates reactively via selectedCategoryDesc() */ }

  ngOnInit() {
    this.loadTypes();
    this.loadStructures();
    this.loadDiscountPolicies();
    this.acadSvc.getYears().subscribe(y => this.years.set(y));
    this.acadSvc.getClasses().subscribe(c => this.classes.set(c));
  }

  groupedStructures() {
    const map = new Map<string, {
      classId: number; className: string; yearLabel: string; structureTitle: string;
      items: FeeStructureDto[];
      admissionTotal: number; monthlyTotal: number; grandTotal: number;
    }>();
    for (const fs of this.feeStructures()) {
      const key = `${fs.classId}-${fs.academicYearId}`;
      if (!map.has(key)) {
        map.set(key, {
          classId: fs.classId, className: fs.className, yearLabel: fs.yearLabel,
          structureTitle: fs.dueDay || '', // title stored in dueDay
          items: [], admissionTotal: 0, monthlyTotal: 0, grandTotal: 0
        });
      }
      const g = map.get(key)!;
      if (!g.structureTitle && fs.dueDay) g.structureTitle = fs.dueDay;
      g.items.push(fs);
      g.grandTotal += fs.amount;
      if (fs.feeCategory === 'OneTime' || fs.feeCategory === 'RefundableDeposit') g.admissionTotal += fs.amount;
      if (fs.feeCategory === 'Recurring') g.monthlyTotal += fs.amount;
    }
    return Array.from(map.values());
  }

  loadTypes()            { this.feeSvc.getFeeTypes().subscribe(t => this.feeTypes.set(t)); }
  loadStructures()       {
    this.feeSvc.getFeeStructures(
      this.filterYearId ?? undefined, this.filterClassId ?? undefined
    ).subscribe(s => this.feeStructures.set(s));
  }
  loadDiscountPolicies() { this.feeSvc.getDiscountPolicies().subscribe(d => this.discountPolicies.set(d)); }

  // ── Fee Types ────────────────────────────────────────────────────────────

  openTypeModal() {
    this.editingTypeId.set(null);
    this.typeForm.reset({ isActive: true, feeCategory: 'Recurring' });
    this.modalError.set(''); this.showTypeModal.set(true);
  }

  editType(ft: FeeTypeDto) {
    this.editingTypeId.set(ft.feeTypeId);
    this.typeForm.patchValue({ name: ft.name, description: ft.description ?? '', feeCategory: ft.feeCategory, isActive: ft.isActive });
    this.modalError.set(''); this.showTypeModal.set(true);
  }

  saveType() {
    this.typeForm.markAllAsTouched();
    if (this.typeForm.invalid) return;
    this.saving.set(true); this.modalError.set('');
    const v = this.typeForm.value;
    const id = this.editingTypeId();
    const obs = id
      ? this.feeSvc.updateFeeType(id, { name: v.name!, description: v.description ?? undefined, feeCategory: v.feeCategory as FeeCategory, isActive: v.isActive! })
      : this.feeSvc.createFeeType({ name: v.name!, description: v.description ?? undefined, feeCategory: v.feeCategory as FeeCategory });
    obs.subscribe({
      next: () => { this.saving.set(false); this.closeModals(); this.loadTypes(); },
      error: (e: any) => { this.saving.set(false); this.modalError.set(e?.error?.error ?? 'Save failed.'); }
    });
  }

  deleteType(id: number) {
    this.confirmDelete.open(
      'Delete Fee Type?',
      'Are you sure you want to delete this fee type? This cannot be undone.',
      () => this.feeSvc.deleteFeeType(id),
      () => this.loadTypes()
    );
  }

  // ── Fee Structures ────────────────────────────────────────────────────────

  openStructureModal() {
    this.router.navigate(['/fees/structures/new']);
  }

  editStructure(fs: FeeStructureDto) {
    this.editingStructureId.set(fs.feeStructureId);
    this.structureForm.patchValue({ amount: fs.amount, isActive: fs.isActive });
    this.modalError.set(''); this.showStructureModal.set(true);
  }

  onStructureYearChange() {
    this.structureClassId = null;
    this.structureTitle   = '';
    if (this.structureYearId) this.acadSvc.getClasses(this.structureYearId).subscribe(c => this.modalClasses.set(c));
    else this.modalClasses.set([]);
  }

  onStructureClassChange() {
    const cls  = this.modalClasses().find(c => c.classId === this.structureClassId);
    const year = this.years().find(y => y.academicYearId === this.structureYearId);
    if (cls && year) {
      this.structureTitle = `${cls.className} (${year.yearLabel})`;
    }
  }

  onRowFeeTypeChange(i: number) {
    if (this.rowErrors[i]) this.rowErrors[i].feeTypeId = false;
  }

  rowCategory(i: number): string {
    return this.feeTypes().find(f => f.feeTypeId === this.feeRows[i]?.feeTypeId)?.feeCategory ?? '';
  }

  feeTypeName(id: number | null): string {
    return this.feeTypes().find(f => f.feeTypeId === id)?.name ?? '';
  }

  structureRowsTotal(): number {
    return this.feeRows.reduce((s, r) => s + (r.amount || 0), 0);
  }

  admissionRowsTotal(): number {
    return this.feeRows.reduce((s, r) => {
      const cat = this.feeTypes().find(f => f.feeTypeId === r.feeTypeId)?.feeCategory;
      return s + (cat === 'OneTime' || cat === 'RefundableDeposit' ? (r.amount || 0) : 0);
    }, 0);
  }

  addFeeRow() {
    this.feeRows.push({ feeTypeId: null, amount: null });
    this.rowErrors.push({});
  }

  removeFeeRow(i: number) {
    this.feeRows.splice(i, 1);
    this.rowErrors.splice(i, 1);
  }

  saveStructure() {
    const id = this.editingStructureId();

    if (id) {
      this.structureForm.markAllAsTouched();
      if (this.structureForm.invalid) return;
      this.saving.set(true); this.modalError.set('');
      const v = this.structureForm.value;
      this.feeSvc.updateFeeStructure(id, { amount: v.amount, isActive: v.isActive }).subscribe({
        next: () => { this.saving.set(false); this.closeModals(); this.loadStructures(); },
        error: (e: any) => { this.saving.set(false); this.modalError.set(e?.error?.error ?? 'Save failed.'); }
      });
      return;
    }

    // Validate
    this.structureTitleError = !this.structureTitle.trim();
    if (!this.structureYearId || !this.structureClassId) {
      this.modalError.set('Please select Academic Year and Class.'); return;
    }
    if (this.structureTitleError) { this.modalError.set('Please enter a structure title.'); return; }

    let valid = true;
    this.rowErrors = this.feeRows.map(r => {
      const e = { feeTypeId: !r.feeTypeId, amount: !r.amount || r.amount < 1 };
      if (e.feeTypeId || e.amount) valid = false;
      return e;
    });
    if (!valid) { this.modalError.set('Please fill all fee type rows correctly.'); return; }

    this.saving.set(true); this.modalError.set('');
    const yearId = this.structureYearId!;
    const classId = this.structureClassId!;
    const title = this.structureTitle;
    const requests = this.feeRows.map(r =>
      this.feeSvc.createFeeStructure({
        feeTypeId: r.feeTypeId!, classId, academicYearId: yearId, amount: r.amount!, dueDay: title
      })
    );
    forkJoin(requests).subscribe({
      next: () => { this.saving.set(false); this.closeModals(); this.loadStructures(); },
      error: (e: any) => { this.saving.set(false); this.modalError.set(e?.error?.error ?? 'Save failed.'); }
    });
  }

  deleteStructure(id: number) {
    this.confirmDelete.open(
      'Delete Fee Structure?',
      'Are you sure you want to delete this fee structure? This cannot be undone.',
      () => this.feeSvc.deleteFeeStructure(id),
      () => this.loadStructures()
    );
  }

  // ── Discount Policies ─────────────────────────────────────────────────────

  openDiscountModal() {
    this.editingDiscountId.set(null);
    this.discountForm.reset({ valueType: 'Percentage', isActive: true });
    this.modalError.set(''); this.showDiscountModal.set(true);
  }

  editDiscount(dp: DiscountPolicyDto) {
    this.editingDiscountId.set(dp.discountPolicyId);
    this.discountForm.patchValue({
      name: dp.name, discountType: dp.discountType, description: dp.description,
      valueType: dp.valueType, value: dp.value, maxSiblingOrder: dp.maxSiblingOrder ?? null,
      isActive: dp.isActive
    });
    this.modalError.set(''); this.showDiscountModal.set(true);
  }

  onDiscountTypeChange() {
    if (this.discountForm.value.discountType === 'FullWaiver') {
      this.discountForm.patchValue({ valueType: 'Percentage', value: 100 });
    }
    if (this.discountForm.value.discountType !== 'Sibling') {
      this.discountForm.patchValue({ maxSiblingOrder: null });
    }
  }

  saveDiscount() {
    this.discountForm.markAllAsTouched();
    if (this.discountForm.invalid) return;
    this.saving.set(true); this.modalError.set('');
    const v = this.discountForm.value;
    const id = this.editingDiscountId();
    const payload = {
      name: v.name!, discountType: v.discountType!, description: v.description ?? '',
      valueType: v.valueType!, value: v.value!, maxSiblingOrder: v.maxSiblingOrder ?? undefined,
      isActive: v.isActive!
    };
    const obs = id
      ? this.feeSvc.updateDiscountPolicy(id, payload)
      : this.feeSvc.createDiscountPolicy(payload);
    obs.subscribe({
      next: () => { this.saving.set(false); this.closeModals(); this.loadDiscountPolicies(); },
      error: (e: any) => { this.saving.set(false); this.modalError.set(e?.error?.error ?? 'Save failed.'); }
    });
  }

  deleteDiscount(id: number) {
    this.confirmDelete.open(
      'Delete Discount Policy?',
      'Students currently assigned this discount will no longer receive it on new fee generation.',
      () => this.feeSvc.deleteDiscountPolicy(id),
      () => this.loadDiscountPolicies()
    );
  }

  closeModals() {
    this.showTypeModal.set(false);
    this.showStructureModal.set(false);
    this.showDiscountModal.set(false);
  }
}
