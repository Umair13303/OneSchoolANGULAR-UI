import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { StudentService } from '../../../core/services/student.service';
import { FeeService } from '../../../core/services/fee.service';
import { AcademicService } from '../../../core/services/academic.service';
import { InstituteService } from '../../../core/services/institute.service';
import { environment } from '../../../../environments/environment';
import { ClassDto, AcademicYear } from '../../../core/models/academic.model';
import { FeeStructureDto } from '../../../core/models/fee.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';
import { PhotoUploadComponent } from '../../../shared/components/photo-upload/photo-upload.component';
import { SwalNotificationService } from '../../../core/services/swal-notification.service';
import { AuthService } from '../../../core/services/auth.service';

interface SelectedFee {
  feeStructureId: number;
  feeTypeName: string;
  dueDay: string;
  amountDue: number;
  discount: number;
  dueDate: string;
  isPaid: boolean;
  amountPaid: number;
}

@Component({
  selector: 'app-student-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, PageHeaderComponent, DatePickerComponent, PhotoUploadComponent],
  template: `
    <!-- Success screen after admission -->
    @if (success()) {
      <div class="success-screen">
        <div class="success-card">
          <div class="success-icon">
            <span class="material-icons-round">how_to_reg</span>
          </div>
          <h2>{{ editId() ? 'Profile Updated!' : 'Admission Successful!' }}</h2>
          <p class="success-sub">{{ editId() ? 'Student profile has been updated successfully.' : 'Student has been registered in the system.' }}</p>
          @if (!editId()) {
            <div class="admission-no">
              <span class="an-label">Admission No.</span>
              <span class="an-value">{{ admissionNo() }}</span>
            </div>
          }

          @if (!editId() && admittedStudentId()) {
            <div class="fee-summary-mini">
              @if (selectedFees().length > 0) {
                <p class="fsm-title">Fees Assigned ({{ selectedFees().length }})</p>
                @for (f of selectedFees(); track f.feeStructureId) {
                  <div class="fsm-row">
                    <span>{{ f.feeTypeName }}</span>
                    <span class="fsm-badge" [class.paid]="f.isPaid" [class.unpaid]="!f.isPaid">
                      {{ f.isPaid ? 'Paid' : 'Unpaid' }}
                    </span>
                  </div>
                }
              }
            </div>
          }

          <div class="success-actions">
            @if (!editId() && hasUnpaidFees()) {
              <button class="btn-warning" (click)="printChallan()">
                <span class="material-icons-round">print</span> Print Challan
              </button>
            }
            @if (!editId() && hasPaidFees()) {
              <button class="btn-success" (click)="printReceipt()">
                <span class="material-icons-round">receipt_long</span> Print Receipt
              </button>
            }
            <button class="btn-secondary" (click)="router.navigate(['/students/list'])">
              <span class="material-icons-round">list</span> View All
            </button>
            @if (!editId()) {
              <button class="btn-primary" (click)="resetForm()">
                <span class="material-icons-round">person_add</span> New Admission
              </button>
            }
          </div>
        </div>
      </div>
    } @else {

    <!-- Setup warning modal -->
    @if (yearsLoaded() && years().length === 0 && !setupWarningDismissed()) {
      <div class="sw-backdrop">
        <div class="sw-modal">

          <div class="sw-banner">
            <div class="sw-banner-icon">
              <span class="material-icons-round">build_circle</span>
            </div>
            <button class="sw-close" type="button" (click)="setupWarningDismissed.set(true)">
              <span class="material-icons-round">close</span>
            </button>
          </div>

          <div class="sw-body">
            <p class="sw-tag">Setup Required</p>
            <h3 class="sw-title">Before You Can Admit Students</h3>
            <p class="sw-desc">
              Your school hasn't been configured yet. Complete these two steps
              in the <strong>Academics</strong> section to get started.
            </p>

            <div class="sw-checklist">
              <div class="sw-item">
                <div class="sw-item-icon">
                  <span class="material-icons-round">calendar_month</span>
                </div>
                <div class="sw-item-text">
                  <div class="sw-item-title">Create an Academic Year</div>
                  <div class="sw-item-sub">e.g. 2024–2025 school year</div>
                </div>
                <span class="sw-badge">Pending</span>
              </div>
              <div class="sw-item">
                <div class="sw-item-icon">
                  <span class="material-icons-round">class</span>
                </div>
                <div class="sw-item-text">
                  <div class="sw-item-title">Add Classes to that Year</div>
                  <div class="sw-item-sub">e.g. Class 1 – Section A</div>
                </div>
                <span class="sw-badge">Pending</span>
              </div>
            </div>
          </div>

          <div class="sw-footer">
            <button class="btn-secondary" type="button" (click)="setupWarningDismissed.set(true)">
              Remind Me Later
            </button>
            <button class="btn-primary" type="button" (click)="router.navigate(['/academics/years'])">
              Start Setup <span class="material-icons-round">arrow_forward</span>
            </button>
          </div>

        </div>
      </div>
    }

    <!-- Form Card -->
    <div class="admission-card">

        <!-- Header -->
        <div class="adm-header">
          <div class="adm-header-left">
            <app-photo-upload
              variant="header"
              entityType="student-photo"
              [entityId]="editId()"
              [schoolName]="instituteName"
              [photoUrl]="photoUrl()"
              [fallbackColor]="previewColor()"
              [fallbackText]="previewInitials()"
              (uploaded)="onPhotoUploaded($event)" />
            <div>
              <h2 class="adm-title">{{ editId() ? 'Edit Student' : 'New Admission' }} <span class="adm-name">{{ previewFullName() }}</span></h2>
              <p class="adm-sub">{{ editId() ? 'Update student information' : 'Fill in all 5 steps to complete the admission' }}</p>
            </div>
          </div>
          <div class="adm-header-right">
            <span class="adm-step-badge">Step {{ activeTab() + 1 }}/{{ editId() ? 4 : 5 }}</span>
            <button class="adm-back-btn" (click)="router.navigate(['/students/list'])">
              <span class="material-icons-round">close</span>
            </button>
          </div>
        </div>

        <!-- Progress bar -->
        <div class="progress-bar">
          <div class="progress-fill" [style.width.%]="(activeTab() + 1) * 20"></div>
        </div>

        <!-- Tab bar -->
        <div class="adm-tabs">
          <button class="adm-tab" [class.active]="activeTab() === 0" [class.done]="activeTab() > 0" (click)="activeTab.set(0)">
            <span class="tab-dot">@if (activeTab() > 0) { <span class="material-icons-round">check</span> } @else { 1 }</span>
            <span class="tab-label">Personal</span>
          </button>
          <div class="tab-connector" [class.done]="activeTab() > 0"></div>
          <button class="adm-tab" [class.active]="activeTab() === 1" [class.done]="activeTab() > 1" (click)="activeTab.set(1)">
            <span class="tab-dot">@if (activeTab() > 1) { <span class="material-icons-round">check</span> } @else { 2 }</span>
            <span class="tab-label">Contact</span>
          </button>
          <div class="tab-connector" [class.done]="activeTab() > 1"></div>
          <button class="adm-tab" [class.active]="activeTab() === 2" [class.done]="activeTab() > 2" (click)="activeTab.set(2)">
            <span class="tab-dot">@if (activeTab() > 2) { <span class="material-icons-round">check</span> } @else { 3 }</span>
            <span class="tab-label">Admission</span>
          </button>
          <div class="tab-connector" [class.done]="activeTab() > 2"></div>
          <button class="adm-tab" [class.active]="activeTab() === 3" [class.done]="activeTab() > 3" (click)="activeTab.set(3)">
            <span class="tab-dot">@if (activeTab() > 3) { <span class="material-icons-round">check</span> } @else { 4 }</span>
            <span class="tab-label">Guardian</span>
          </button>
          @if (!editId()) {
            <div class="tab-connector" [class.done]="activeTab() > 3"></div>
            <button class="adm-tab" [class.active]="activeTab() === 4" (click)="activeTab.set(4); loadFeeStructures()">
              <span class="tab-dot">5</span>
              <span class="tab-label">Fees</span>
            </button>
          }
        </div>

        <!-- Form body -->
        <div class="adm-body">
          <form [formGroup]="form" (ngSubmit)="submit()">

            <!-- ── Tab 0: Personal ── -->
            @if (activeTab() === 0) {
              <div class="tab-pane">
                <div class="section-hint">
                  <span class="material-icons-round">info</span>
                  Enter the student's personal and demographic information.
                </div>

                <div class="fg two">
                  <div class="fi">
                    <div class="fi-icon"><span class="material-icons-round">badge</span></div>
                    <div class="fi-content">
                      <label>First Name <span class="req">*</span></label>
                      <input formControlName="firstName" placeholder="e.g. Muhammad" />
                      @if (f['firstName'].invalid && f['firstName'].touched) {
                        <span class="ferr">First name is required</span>
                      }
                    </div>
                  </div>
                  <div class="fi">
                    <div class="fi-icon"><span class="material-icons-round">badge</span></div>
                    <div class="fi-content">
                      <label>Last Name <span class="req">*</span></label>
                      <input formControlName="lastName" placeholder="e.g. Ali" />
                      @if (f['lastName'].invalid && f['lastName'].touched) {
                        <span class="ferr">Last name is required</span>
                      }
                    </div>
                  </div>
                </div>

                <div class="fg three">
                  <div class="fi">
                    <div class="fi-icon"><span class="material-icons-round">cake</span></div>
                    <div class="fi-content">
                      <label>Date of Birth</label>
                      <app-date-picker formControlName="dateOfBirth" />
                    </div>
                  </div>
                  <div class="fi">
                    <div class="fi-icon"><span class="material-icons-round">wc</span></div>
                    <div class="fi-content">
                      <label>Gender</label>
                      <select formControlName="gender">
                        <option value="">Select</option>
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                      </select>
                    </div>
                  </div>
                  <div class="fi">
                    <div class="fi-icon"><span class="material-icons-round">bloodtype</span></div>
                    <div class="fi-content">
                      <label>Blood Group</label>
                      <select formControlName="bloodGroup">
                        <option value="">Select</option>
                        @for (bg of bloodGroups; track bg) { <option>{{ bg }}</option> }
                      </select>
                    </div>
                  </div>
                </div>

                <div class="fg two">
                  <div class="fi">
                    <div class="fi-icon"><span class="material-icons-round">mosque</span></div>
                    <div class="fi-content">
                      <label>Religion</label>
                      <input formControlName="religion" placeholder="e.g. Islam" />
                    </div>
                  </div>
                  <div class="fi">
                    <div class="fi-icon"><span class="material-icons-round">flag</span></div>
                    <div class="fi-content">
                      <label>Nationality</label>
                      <input formControlName="nationality" placeholder="e.g. Pakistani" />
                    </div>
                  </div>
                </div>

                <div class="tab-nav">
                  <span></span>
                  <button type="button" class="btn-primary" (click)="next()">
                    Next <span class="material-icons-round">arrow_forward</span>
                  </button>
                </div>
              </div>
            }

            <!-- ── Tab 1: Contact ── -->
            @if (activeTab() === 1) {
              <div class="tab-pane">
                <div class="section-hint">
                  <span class="material-icons-round">info</span>
                  Provide the student's contact and address information.
                </div>

                <div class="fg">
                  <div class="fi full">
                    <div class="fi-icon"><span class="material-icons-round">home</span></div>
                    <div class="fi-content">
                      <label>Home Address</label>
                      <textarea formControlName="address" rows="2" placeholder="Street, City, Province"></textarea>
                    </div>
                  </div>
                </div>

                <div class="fg two">
                  <div class="fi">
                    <div class="fi-icon"><span class="material-icons-round">call</span></div>
                    <div class="fi-content">
                      <label>Phone Number</label>
                      <input formControlName="phone" placeholder="0300-1234567" />
                    </div>
                  </div>
                  <div class="fi">
                    <div class="fi-icon"><span class="material-icons-round">email</span></div>
                    <div class="fi-content">
                      <label>Email Address</label>
                      <input type="email" formControlName="email" placeholder="student@email.com" />
                    </div>
                  </div>
                </div>

                <div class="tab-nav">
                  <button type="button" class="btn-secondary" (click)="activeTab.set(0)">
                    <span class="material-icons-round">arrow_back</span> Back
                  </button>
                  <button type="button" class="btn-primary" (click)="next()">
                    Next <span class="material-icons-round">arrow_forward</span>
                  </button>
                </div>
              </div>
            }

            <!-- ── Tab 2: Admission ── -->
            @if (activeTab() === 2) {
              <div class="tab-pane">
                <div class="section-hint">
                  <span class="material-icons-round">info</span>
                  Select the academic year and class for this student.
                  @if (!editId() && nextAdmissionNo()) {
                    <span class="next-adm">Admission No. will be <strong>{{ nextAdmissionNo() }}</strong></span>
                  }
                </div>

                @if (yearsLoaded() && years().length === 0) {
                  <div class="setup-alert">
                    <span class="material-icons-round">warning</span>
                    <div class="sa-content">
                      <strong>No Academic Years found.</strong>
                      You must set up at least one Academic Year before you can admit a student.
                      <button type="button" class="sa-link" (click)="router.navigate(['/academics/years'])">
                        Go to Academic Years <span class="material-icons-round">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                }

                @if (f['academicYearId'].value && classesLoaded() && classes().length === 0) {
                  <div class="setup-alert">
                    <span class="material-icons-round">warning</span>
                    <div class="sa-content">
                      <strong>No Classes found for this Academic Year.</strong>
                      Add classes to the selected year before admitting a student.
                      <button type="button" class="sa-link" (click)="router.navigate(['/academics/classes'])">
                        Go to Classes <span class="material-icons-round">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                }

                <div class="fg three">
                  <div class="fi">
                    <div class="fi-icon"><span class="material-icons-round">event</span></div>
                    <div class="fi-content">
                      <label>Admission Date <span class="req">*</span></label>
                      <app-date-picker formControlName="admissionDate" />
                      @if (f['admissionDate'].invalid && f['admissionDate'].touched) {
                        <span class="ferr">Required</span>
                      }
                    </div>
                  </div>
                  <div class="fi">
                    <div class="fi-icon"><span class="material-icons-round">calendar_month</span></div>
                    <div class="fi-content">
                      <label>Academic Year <span class="req">*</span></label>
                      <select formControlName="academicYearId" (change)="onYearChange()">
                        <option [ngValue]="null">Select year</option>
                        @for (y of years(); track y.academicYearId) {
                          <option [ngValue]="y.academicYearId">{{ y.yearLabel }}</option>
                        }
                      </select>
                      @if (f['academicYearId'].invalid && f['academicYearId'].touched) {
                        <span class="ferr">Required</span>
                      }
                    </div>
                  </div>
                  <div class="fi">
                    <div class="fi-icon"><span class="material-icons-round">class</span></div>
                    <div class="fi-content">
                      <label>Class <span class="req">*</span></label>
                      <select formControlName="classId" (change)="onClassChange()">
                        <option [ngValue]="null">Select class</option>
                        @for (c of classes(); track c.classId) {
                          <option [ngValue]="c.classId">{{ c.className }}{{ c.section ? ' ' + c.section : '' }}</option>
                        }
                      </select>
                      @if (f['classId'].invalid && f['classId'].touched) {
                        <span class="ferr">Required</span>
                      }
                    </div>
                  </div>
                </div>

                @if (f['academicYearId'].value && f['classId'].value) {
                  <div class="admission-preview">
                    <div class="ap-row">
                      <span class="material-icons-round">person</span>
                      <span>{{ previewFullName() || 'Student' }}</span>
                    </div>
                    <div class="ap-divider"></div>
                    <div class="ap-row">
                      <span class="material-icons-round">calendar_month</span>
                      <span>{{ selectedYearLabel() }}</span>
                    </div>
                    <div class="ap-divider"></div>
                    <div class="ap-row">
                      <span class="material-icons-round">class</span>
                      <span>{{ selectedClassLabel() }}</span>
                    </div>
                  </div>
                }

                <div class="tab-nav">
                  <button type="button" class="btn-secondary" (click)="activeTab.set(1)">
                    <span class="material-icons-round">arrow_back</span> Back
                  </button>
                  <button type="button" class="btn-primary" (click)="next()">
                    Next <span class="material-icons-round">arrow_forward</span>
                  </button>
                </div>
              </div>
            }

            <!-- ── Tab 3: Guardian ── -->
            @if (activeTab() === 3) {
              <div class="tab-pane">
              <ng-container formGroupName="guardian">
                <div class="section-hint">
                  <span class="material-icons-round">info</span>
                  Enter the parent or guardian's contact details.
                </div>

                <div class="fg two">
                  <div class="fi">
                    <div class="fi-icon"><span class="material-icons-round">family_restroom</span></div>
                    <div class="fi-content">
                      <label>Relation <span class="req">*</span></label>
                      <select formControlName="relation">
                        <option>Father</option>
                        <option>Mother</option>
                        <option>Guardian</option>
                      </select>
                    </div>
                  </div>
                  <div class="fi">
                    <div class="fi-icon"><span class="material-icons-round">person</span></div>
                    <div class="fi-content">
                      <label>Full Name <span class="req">*</span></label>
                      <input formControlName="fullName" placeholder="Guardian's full name" />
                      @if (gf['fullName'].invalid && gf['fullName'].touched) {
                        <span class="ferr">Name is required</span>
                      }
                    </div>
                  </div>
                </div>

                <div class="fg three">
                  <div class="fi">
                    <div class="fi-icon"><span class="material-icons-round">call</span></div>
                    <div class="fi-content">
                      <label>Phone <span class="req">*</span></label>
                      <input formControlName="phone" placeholder="0300-1234567" />
                      @if (gf['phone'].invalid && gf['phone'].touched) {
                        <span class="ferr">Phone is required</span>
                      }
                    </div>
                  </div>
                  <div class="fi">
                    <div class="fi-icon"><span class="material-icons-round">credit_card</span></div>
                    <div class="fi-content">
                      <label>CNIC</label>
                      <input formControlName="cnic" placeholder="12345-1234567-1" (blur)="onCnicBlur()" />
                    </div>
                  </div>
                  <div class="fi">
                    <div class="fi-icon"><span class="material-icons-round">work</span></div>
                    <div class="fi-content">
                      <label>Occupation</label>
                      <input formControlName="occupation" placeholder="e.g. Business" />
                    </div>
                  </div>
                </div>

                <!-- Sibling Detection Banner -->
                @if (siblingCheckDone() && siblingCount() > 0) {
                  <div class="sibling-banner">
                    <span class="material-icons-round">people</span>
                    <div class="sb-content">
                      <strong>{{ siblingCount() }} sibling(s) found</strong> — This will be child #{{ siblingOrder() }} for this guardian.
                      <div class="sb-names">
                        @for (s of siblings(); track s.studentId) {
                          <span class="sb-chip">{{ s.name }} ({{ s.admissionNo }})</span>
                        }
                      </div>
                    </div>
                  </div>
                }
                @if (siblingCheckDone() && siblingCount() === 0) {
                  <div class="sibling-banner new">
                    <span class="material-icons-round">person_add</span>
                    <div class="sb-content">No existing siblings found for this CNIC.</div>
                  </div>
                }

                <div class="tab-nav">
                  <button type="button" class="btn-secondary" (click)="activeTab.set(2)">
                    <span class="material-icons-round">arrow_back</span> Back
                  </button>
                  <button type="button" class="btn-primary" (click)="next()" [disabled]="saving()">
                    @if (editId()) {
                      <span class="material-icons-round">save</span> {{ saving() ? 'Saving...' : 'Save Changes' }}
                    } @else {
                      Next <span class="material-icons-round">arrow_forward</span>
                    }
                  </button>
                </div>
              </ng-container>
              </div>
            }

            <!-- ── Tab 4: Fees & Discounts ── -->
            @if (activeTab() === 4) {
              <div class="tab-pane">
                <div class="section-hint">
                  <span class="material-icons-round">info</span>
                  Assign fees for this admission. Admission/one-time fees are shown first.
                  You can skip this step — fees can be assigned later.
                </div>

                @if (feeLoadError()) {
                  <div class="tm-alert error">
                    <span class="material-icons-round">error_outline</span> {{ feeLoadError() }}
                  </div>
                }

                @if (feeStructures().length === 0 && !loadingFees() && !feeLoadError()) {
                  <div class="no-fees-hint">
                    <span class="material-icons-round">info</span>
                    No fee structures found for <strong>{{ selectedClassLabel() }}</strong> / <strong>{{ selectedYearLabel() }}</strong>.
                    Go to <em>Fees → Fee Structures</em> to set them up, or skip and assign later.
                  </div>
                }

                @if (loadingFees()) {
                  <div class="fee-loading">
                    <span class="material-icons-round spin">refresh</span> Loading fee structures…
                  </div>
                }

                @if (feeStructures().length > 0) {
                  <div class="fee-list">
                    @for (fs of feeStructures(); track fs.feeStructureId) {
                      <div class="fee-row" [class.selected]="isFeeSelected(fs.feeStructureId)">
                        <div class="fee-row-top">
                          <input type="checkbox" class="fee-checkbox"
                            [id]="'fee_' + fs.feeStructureId"
                            [checked]="isFeeSelected(fs.feeStructureId)"
                            (change)="toggleFee(fs, $event)" />
                          <label [for]="'fee_' + fs.feeStructureId" style="display:flex;align-items:center;gap:8px;flex:1;cursor:pointer;margin:0;">
                            <div class="fee-name">
                              {{ fs.feeTypeName }}
                              @if (fs.dueDay === 'Once') {
                                <span class="fee-badge once">Admission Fee</span>
                              } @else {
                                <span class="fee-badge monthly">{{ fs.dueDay }}</span>
                              }
                            </div>
                            <div class="fee-amount">PKR {{ fs.amount | number:'1.0-0' }}</div>
                          </label>
                        </div>

                        @if (isFeeSelected(fs.feeStructureId)) {
                          <div class="fee-extra">
                            <div class="fee-extra-row">
                              <div class="fee-field">
                                <label>Discount (PKR)</label>
                                <input type="number" min="0"
                                  [value]="getFeeDiscount(fs.feeStructureId)"
                                  (input)="setFeeDiscount(fs.feeStructureId, $event)" />
                              </div>
                              <div class="fee-field">
                                <label>Due Date</label>
                                <app-date-picker
                                  [ngModel]="getFeeDueDate(fs.feeStructureId)"
                                  (dateChange)="setFeeDueDate(fs.feeStructureId, $event)"
                                  [ngModelOptions]="{standalone:true}" />
                              </div>
                              <div class="fee-field">
                                <label>Status</label>
                                <select (change)="setFeePaid(fs.feeStructureId, $event)">
                                  <option value="unpaid">Unpaid</option>
                                  <option value="paid">Paid</option>
                                </select>
                              </div>
                              @if (getFeeIsPaid(fs.feeStructureId)) {
                                <div class="fee-field">
                                  <label>Amount Paid (PKR)</label>
                                  <input type="number" min="0"
                                    [value]="getFeeAmountPaid(fs.feeStructureId)"
                                    (input)="setFeeAmountPaid(fs.feeStructureId, $event)" />
                                </div>
                              }
                            </div>
                            <div class="fee-net">
                              Net Payable: <strong>PKR {{ (fs.amount - getFeeDiscount(fs.feeStructureId)) | number:'1.0-0' }}</strong>
                            </div>
                          </div>
                        }
                      </div>
                    }
                  </div>

                  @if (selectedFees().length > 0) {
                    <div class="fee-total-bar">
                      <span>{{ selectedFees().length }} fee(s) selected</span>
                      <span>Total: <strong>PKR {{ feeTotal() | number:'1.0-0' }}</strong></span>
                    </div>
                  }
                }

                @if (error()) {
                  <div class="tm-alert error">
                    <span class="material-icons-round">error_outline</span> {{ error() }}
                  </div>
                }

                <div class="tab-nav">
                  <button type="button" class="btn-secondary" (click)="activeTab.set(3)">
                    <span class="material-icons-round">arrow_back</span> Back
                  </button>
                  <button type="submit" class="btn-primary" [disabled]="saving()">
                    @if (saving()) {
                      <span class="material-icons-round spin">refresh</span> Submitting…
                    } @else {
                      <span class="material-icons-round">how_to_reg</span> Submit Admission
                    }
                  </button>
                </div>
              </div>
            }

          </form>
        </div>

    </div>

    } <!-- end else -->
  `,
  styles: [`
    /* ── Success screen ── */
    .success-screen {
      display: flex; align-items: center; justify-content: center;
      min-height: 50vh;
    }
    .success-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 20px; padding: 40px 36px;
      text-align: center; max-width: 440px; width: 100%;
      box-shadow: var(--sh-xl); animation: slideUp 0.3s cubic-bezier(.22,1,.36,1);
    }
    .success-icon {
      width: 60px; height: 60px; border-radius: 16px;
      background: var(--green-s); border: 1px solid var(--green-b);
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 16px;
      .material-icons-round { font-size: 30px; color: var(--green); font-variation-settings: 'FILL' 1; }
    }
    .success-card h2 { font-size: 20px; font-weight: 800; color: var(--t1); margin-bottom: 6px; }
    .success-sub { font-size: 13px; color: var(--t4); margin-bottom: 20px; }
    .admission-no {
      display: inline-flex; flex-direction: column; align-items: center;
      padding: 12px 24px; border-radius: 10px;
      background: var(--accent-s); border: 1px solid var(--accent-g); margin-bottom: 16px;
    }
    .an-label { font-size: 10px; font-weight: 700; color: var(--accent); text-transform: uppercase; letter-spacing: 1px; }
    .an-value { font-size: 22px; font-weight: 800; color: var(--accent); }

    .fee-summary-mini {
      background: var(--surface-2); border: 1px solid var(--border);
      border-radius: 10px; padding: 10px 14px; margin-bottom: 16px; text-align: left;
    }
    .fsm-title { font-size: 11px; font-weight: 700; color: var(--t3); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
    .fsm-row { display: flex; justify-content: space-between; align-items: center; font-size: 12.5px; padding: 3px 0; color: var(--t2); }
    .fsm-badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 99px; }
    .fsm-badge.paid { background: var(--green-s); color: var(--green); border: 1px solid var(--green-b); }
    .fsm-badge.unpaid { background: var(--red-s); color: var(--red); border: 1px solid var(--red-b); }

    .success-actions { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;
      button { display: inline-flex; align-items: center; gap: 6px;
        .material-icons-round { font-size: 15px; } }
    }
    .btn-warning {
      padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer; font-size: 13px; font-weight: 600;
      background: #fef3c7; color: #b45309; border: 1px solid #fde68a;
    }
    .btn-success {
      padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer; font-size: 13px; font-weight: 600;
      background: var(--green-s); color: var(--green); border: 1px solid var(--green-b);
    }

    /* ── Admission card ── */
    .admission-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 16px; box-shadow: var(--sh);
    }

    /* ── Header ── */
    .adm-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 20px;
      background: linear-gradient(135deg, var(--accent-s) 0%, var(--surface) 100%);
      border-bottom: 1px solid var(--border);
      border-radius: 16px 16px 0 0;
      gap: 12px;
    }
    .adm-header-left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
    .adm-header-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

    .adm-title {
      font-size: 14px; font-weight: 700; color: var(--t1);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .adm-name { color: var(--accent); margin-left: 4px; }
    .adm-sub { font-size: 11.5px; color: var(--t4); margin-top: 1px; }

    .adm-step-badge {
      padding: 4px 12px; border-radius: 99px;
      background: var(--accent); color: #fff;
      font-size: 11.5px; font-weight: 700; white-space: nowrap;
    }
    .adm-back-btn {
      width: 30px; height: 30px; border-radius: 8px;
      border: 1px solid var(--border-2); background: var(--surface);
      color: var(--t3); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.15s;
      .material-icons-round { font-size: 16px; }
    }
    .adm-back-btn:hover { background: var(--red-s); border-color: var(--red); color: var(--red); }

    /* ── Progress bar ── */
    .progress-bar { height: 3px; background: var(--border); }
    .progress-fill { height: 100%; background: var(--accent); transition: width 0.4s cubic-bezier(.22,1,.36,1); }

    /* ── Tab stepper ── */
    .adm-tabs {
      display: flex; align-items: center;
      padding: 10px 20px;
      background: var(--surface-2);
      border-bottom: 1px solid var(--border);
      overflow-x: auto;
    }
    .adm-tab {
      display: flex; align-items: center; gap: 6px;
      background: none; border: none; cursor: pointer; padding: 0; white-space: nowrap;
    }
    .tab-dot {
      width: 24px; height: 24px; border-radius: 50%;
      border: 2px solid var(--border-2);
      background: var(--surface); color: var(--t4);
      font-size: 11px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s; flex-shrink: 0;
      .material-icons-round { font-size: 12px; }
    }
    .tab-label { font-size: 12.5px; font-weight: 600; color: var(--t4); transition: color 0.2s; }
    .adm-tab.active .tab-dot { background: var(--accent); border-color: var(--accent); color: #fff; box-shadow: 0 0 0 3px var(--accent-g); }
    .adm-tab.active .tab-label { color: var(--accent); }
    .adm-tab.done .tab-dot { background: var(--green); border-color: var(--green); color: #fff; }
    .adm-tab.done .tab-label { color: var(--green); }
    .tab-connector { flex: 1; height: 2px; background: var(--border); min-width: 16px; margin: 0 5px; border-radius: 2px; transition: background 0.3s; }
    .tab-connector.done { background: var(--green); }

    /* ── Body ── */
    .adm-body { padding: 0; }
    .tab-pane { padding: 16px 20px; display: flex; flex-direction: column; }

    .section-hint {
      display: flex; align-items: center; gap: 7px;
      padding: 8px 12px; border-radius: 8px;
      background: var(--surface-2); border: 1px solid var(--border);
      font-size: 12px; color: var(--t3); font-weight: 500;
      margin-bottom: 14px;
      .material-icons-round { font-size: 14px; color: var(--accent); flex-shrink: 0; }
    }
    .next-adm {
      margin-left: auto; font-family: monospace;
      strong { color: var(--accent); }
    }

    /* ── Field groups ── */
    .fg { display: flex; gap: 10px; margin-bottom: 10px; }
    .fg.two .fi, .fg.three .fi { flex: 1; min-width: 0; }

    .fi { display: flex; align-items: flex-start; gap: 8px; flex: 1; }
    .fi.full { width: 100%; }

    .fi-icon {
      width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0; margin-top: 20px;
      background: var(--accent-s);
      display: flex; align-items: center; justify-content: center;
      .material-icons-round { font-size: 14px; color: var(--accent); font-variation-settings: 'FILL' 1; }
    }
    .fi-content { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }

    label { font-size: 10.5px; font-weight: 700; color: var(--t3); letter-spacing: 0.4px; text-transform: uppercase; }
    .req { color: var(--red); }

    input, select, textarea {
      width: 100%; padding: 8px 11px;
      border: 1.5px solid var(--border); border-radius: 8px;
      font-size: 13px; font-family: inherit;
      background: var(--surface); color: var(--t1);
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    input:focus, select:focus, textarea:focus {
      outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-g);
    }
    input::placeholder, textarea::placeholder { color: var(--t5); }
    textarea { resize: none; }
    .ferr { font-size: 10.5px; color: var(--red); font-weight: 600; }

    /* ── Admission preview ── */
    .admission-preview {
      display: flex; align-items: center; flex-wrap: wrap; gap: 0;
      padding: 10px 14px; border-radius: 10px;
      background: var(--green-s); border: 1px solid var(--green-b);
      margin-bottom: 4px;
    }
    .ap-row {
      display: flex; align-items: center; gap: 5px;
      font-size: 12.5px; font-weight: 600; color: var(--green);
      .material-icons-round { font-size: 14px; }
    }
    .ap-divider { width: 1px; height: 16px; background: var(--green-b); margin: 0 12px; }

    /* ── Sibling banner ── */
    .sibling-banner {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 10px 14px; border-radius: 10px; margin-bottom: 10px;
      background: #fef3c7; border: 1px solid #fde68a; color: #92400e;
      .material-icons-round { font-size: 18px; margin-top: 1px; flex-shrink: 0; }
    }
    .sibling-banner.new { background: var(--surface-2); border-color: var(--border); color: var(--t3); }
    .sb-content { font-size: 12.5px; font-weight: 500; }
    .sb-names { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
    .sb-chip {
      font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px;
      background: rgba(0,0,0,0.08); color: inherit;
    }

    /* ── Fee list ── */
    .no-fees-hint {
      display: flex; align-items: center; gap: 8px;
      padding: 14px 16px; border-radius: 10px; margin-bottom: 12px;
      background: var(--surface-2); border: 1px solid var(--border);
      font-size: 12.5px; color: var(--t3);
      .material-icons-round { font-size: 16px; color: var(--accent); }
    }
    .fee-loading { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--t3); padding: 10px 0; }

    .fee-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }

    .fee-row {
      display: flex; flex-direction: column;
      border: 1.5px solid var(--border); border-radius: 10px; overflow: hidden;
      transition: border-color 0.15s;
    }
    .fee-row.selected { border-color: var(--accent); }

    .fee-row-top { display: flex; align-items: center; gap: 10px; padding: 10px 14px; }
    .fee-checkbox { width: 16px; height: 16px; cursor: pointer; flex-shrink: 0; }

    .fee-name { font-size: 13px; font-weight: 600; color: var(--t1); display: flex; align-items: center; gap: 7px; flex: 1; }
    .fee-badge {
      font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 5px;
    }
    .fee-badge.once { background: var(--accent-s); color: var(--accent); border: 1px solid var(--accent-g); }
    .fee-badge.monthly { background: var(--surface-2); color: var(--t3); border: 1px solid var(--border); }
    .fee-amount { font-size: 13px; font-weight: 700; color: var(--t2); white-space: nowrap; }

    .fee-extra {
      padding: 10px 14px 12px;
      border-top: 1px solid var(--border);
      background: var(--surface-2);
    }
    .fee-extra-row { display: flex; gap: 10px; flex-wrap: wrap; }
    .fee-field { display: flex; flex-direction: column; gap: 4px; min-width: 130px; flex: 1; }
    .fee-field label { font-size: 10px; font-weight: 700; color: var(--t3); text-transform: uppercase; letter-spacing: 0.4px; }
    .fee-field input, .fee-field select { font-size: 12px; padding: 6px 9px; }
    .fee-net { margin-top: 8px; font-size: 12px; color: var(--t3); }
    .fee-net strong { color: var(--accent); }

    .fee-total-bar {
      display: flex; justify-content: space-between; align-items: center;
      padding: 10px 14px; border-radius: 10px;
      background: var(--accent-s); border: 1px solid var(--accent-g);
      font-size: 13px; color: var(--accent); font-weight: 600;
      margin-bottom: 4px;
    }

    /* ── Tab nav ── */
    .tab-nav {
      display: flex; justify-content: space-between; align-items: center;
      padding-top: 14px; margin-top: 6px;
      border-top: 1px solid var(--border);
    }
    .tab-nav .btn-primary, .tab-nav .btn-secondary {
      display: inline-flex; align-items: center; gap: 6px;
      .material-icons-round { font-size: 15px; }
    }

    .tm-alert {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 14px; border-radius: 8px;
      font-size: 12.5px; font-weight: 500; margin-bottom: 10px;
      .material-icons-round { font-size: 16px; flex-shrink: 0; }
    }
    .tm-alert.error { background: var(--red-s); color: var(--red); border: 1px solid var(--red-b); }

    /* ── Setup warning modal ── */
    .sw-backdrop {
      position: fixed; inset: 0; z-index: 1000;
      background: rgba(0,0,0,0.4);
      display: flex; align-items: center; justify-content: center;
      padding: 16px;
      animation: fadeIn 0.18s ease;
    }
    .sw-modal {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 20px; width: 100%; max-width: 420px;
      box-shadow: var(--sh-xl); overflow: hidden;
      animation: slideUp 0.25s cubic-bezier(.22,1,.36,1);
    }
    .sw-banner {
      background: linear-gradient(135deg, var(--amber-s) 0%, #fde68a55 100%);
      border-bottom: 1px solid var(--amber-b);
      padding: 24px 20px 20px;
      display: flex; align-items: flex-start; justify-content: space-between;
    }
    .sw-banner-icon {
      width: 52px; height: 52px; border-radius: 14px;
      background: var(--amber);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 14px rgba(217,119,6,0.35);
      .material-icons-round { font-size: 26px; color: #fff; font-variation-settings: 'FILL' 1; }
    }
    .sw-close {
      width: 28px; height: 28px; border-radius: 8px; border: none;
      background: rgba(0,0,0,0.07); color: #92400e;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: background 0.15s;
      .material-icons-round { font-size: 16px; }
    }
    .sw-close:hover { background: rgba(0,0,0,0.14); }
    .sw-body { padding: 20px 20px 16px; }
    .sw-tag {
      font-size: 10.5px; font-weight: 700; color: var(--amber);
      text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;
    }
    .sw-title { font-size: 17px; font-weight: 800; color: var(--t1); margin-bottom: 8px; line-height: 1.3; }
    .sw-desc {
      font-size: 13px; color: var(--t3); line-height: 1.65; margin-bottom: 16px;
      strong { color: var(--t2); font-weight: 600; }
    }
    .sw-checklist { display: flex; flex-direction: column; gap: 8px; }
    .sw-item {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 14px; border-radius: 10px;
      background: var(--surface-2); border: 1px solid var(--border);
    }
    .sw-item-icon {
      width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
      background: var(--amber-s); border: 1px solid var(--amber-b);
      display: flex; align-items: center; justify-content: center;
      .material-icons-round { font-size: 17px; color: var(--amber); font-variation-settings: 'FILL' 1; }
    }
    .sw-item-text { flex: 1; min-width: 0; }
    .sw-item-title { font-size: 13px; font-weight: 700; color: var(--t1); }
    .sw-item-sub   { font-size: 11.5px; color: var(--t4); margin-top: 1px; }
    .sw-badge {
      flex-shrink: 0; font-size: 10.5px; font-weight: 700;
      padding: 3px 9px; border-radius: 99px;
      background: var(--amber-s); color: var(--amber); border: 1px solid var(--amber-b);
    }
    .sw-footer {
      display: flex; justify-content: flex-end; gap: 8px;
      padding: 14px 20px; border-top: 1px solid var(--border);
      background: var(--surface-2);
      .btn-primary .material-icons-round, .btn-secondary .material-icons-round { font-size: 15px; }
    }

    /* ── Setup alert (missing academic year / classes) ── */
    .setup-alert {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 12px 16px; border-radius: 10px; margin-bottom: 12px;
      background: #fef3c7; border: 1px solid #fde68a; color: #92400e;
      .material-icons-round { font-size: 20px; margin-top: 1px; flex-shrink: 0; }
    }
    .sa-content {
      font-size: 13px; font-weight: 500; line-height: 1.5;
      display: flex; flex-direction: column; gap: 6px;
      strong { font-weight: 700; }
    }
    .sa-link {
      display: inline-flex; align-items: center; gap: 4px;
      background: none; border: none; padding: 0;
      color: #92400e; font-size: 12.5px; font-weight: 700;
      cursor: pointer; text-decoration: underline;
      .material-icons-round { font-size: 13px; }
    }
    .sa-link:hover { color: #78350f; }

    @keyframes spin { to { transform: rotate(360deg); } }
    .spin { animation: spin 0.8s linear infinite; display: inline-block; }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class StudentFormComponent implements OnInit {
  private fb           = inject(FormBuilder);
  private studentSvc   = inject(StudentService);
  private feeSvc       = inject(FeeService);
  private academicSvc  = inject(AcademicService);
  private instituteSvc = inject(InstituteService);
  private route        = inject(ActivatedRoute);
  private swal         = inject(SwalNotificationService);
  router = inject(Router);

  editId = signal<number | null>(null);

  schoolName       = '';
  schoolLogo       = '';
  challanTemplate  = 'cash_memo';

  instituteName = inject(AuthService).currentUser()?.instituteName ?? null;
  photoUrl      = signal<string | null>(null);

  years          = signal<AcademicYear[]>([]);
  classes        = signal<ClassDto[]>([]);
  yearsLoaded           = signal(false);
  classesLoaded         = signal(false);
  setupWarningDismissed = signal(false);
  saving         = signal(false);
  success        = signal(false);
  error          = signal('');
  admissionNo    = signal('');
  nextAdmissionNo = signal('');  // suggestion from institute/campus settings
  activeTab      = signal(0);
  feeStructures  = signal<FeeStructureDto[]>([]);
  loadingFees    = signal(false);
  selectedFees   = signal<SelectedFee[]>([]);
  admittedStudentId = signal<number | null>(null);

  // Sibling detection
  siblingCheckDone = signal(false);
  siblingCount     = signal(0);
  siblingOrder     = signal(1);
  siblings         = signal<any[]>([]);

  readonly bloodGroups = ['A+','A-','B+','B-','O+','O-','AB+','AB-'];
  readonly COLORS = ['#7c3aed','#059669','#0891b2','#d97706','#db2777','#ea580c'];

  form = this.fb.group({
    firstName:      ['', Validators.required],
    lastName:       ['', Validators.required],
    dateOfBirth:    [null as string | null],
    gender:         [''],
    bloodGroup:     [''],
    religion:       [''],
    nationality:    [''],
    address:        [''],
    phone:          [''],
    email:          ['', Validators.email],
    admissionDate:  [new Date().toISOString().slice(0,10), Validators.required],
    academicYearId: [null as number | null, Validators.required],
    classId:        [null as number | null, Validators.required],
    photoFileId:    [null as number | null],
    guardian: this.fb.group({
      relation:   ['Father', Validators.required],
      fullName:   ['', Validators.required],
      phone:      ['', Validators.required],
      cnic:       [''],
      occupation: ['']
    })
  });

  get f()  { return this.form.controls; }
  get gf() { return (this.form.get('guardian') as any).controls; }

  previewFullName() {
    const fn = this.f['firstName'].value ?? '';
    const ln = this.f['lastName'].value ?? '';
    return [fn, ln].filter(Boolean).join(' ');
  }
  previewInitials() {
    const n = this.previewFullName();
    return n ? n.split(' ').filter(Boolean).map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) : '?';
  }
  previewColor() {
    const n = this.previewFullName() || 'S';
    let h = 0;
    for (const c of n) h = c.charCodeAt(0) + ((h << 5) - h);
    return this.COLORS[Math.abs(h) % this.COLORS.length];
  }

  selectedYearLabel() {
    const id = this.f['academicYearId'].value;
    return this.years().find(y => y.academicYearId === id)?.yearLabel ?? '';
  }
  selectedClassLabel() {
    const id = this.f['classId'].value;
    const c = this.classes().find(c => c.classId === id);
    return c ? `${c.className}${c.section ? ' ' + c.section : ''}` : '';
  }

  ngOnInit() {
    this.academicSvc.getYears().subscribe(y => { this.years.set(y); this.yearsLoaded.set(true); });
    this.instituteSvc.getMyInstitute().subscribe({
      next: (inst: any) => {
        this.schoolName      = inst?.name ?? '';
        this.challanTemplate = inst?.challanTemplate ?? 'cash_memo';
        this.schoolLogo      = inst?.logoUrl
          ? (inst.logoUrl.startsWith('http') ? inst.logoUrl : `${environment.serverUrl}${inst.logoUrl}`)
          : '';
      }
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      // New admission: show which number will be assigned (from settings)
      this.studentSvc.getNextAdmissionNo().subscribe({
        next: r => this.nextAdmissionNo.set(r.admissionNo),
        error: () => {},
      });
    }
    if (id) {
      const numId = +id;
      this.editId.set(numId);
      this.studentSvc.getById(numId).subscribe((s: any) => {
        // load classes for the student's academic year first
        if (s.currentAcademicYearId) {
          this.academicSvc.getClasses(s.currentAcademicYearId).subscribe(c => this.classes.set(c));
        }
        this.form.patchValue({
          firstName:      s.firstName,
          lastName:       s.lastName,
          dateOfBirth:    s.dateOfBirth ?? null,
          gender:         s.gender ?? '',
          bloodGroup:     s.bloodGroup ?? '',
          religion:       s.religion ?? '',
          nationality:    s.nationality ?? '',
          address:        s.address ?? '',
          phone:          s.phone ?? '',
          email:          s.email ?? '',
          admissionDate:  s.admissionDate ?? null,
          academicYearId: s.currentAcademicYearId ?? null,
          classId:        s.currentClassId ?? null,
          photoFileId:    s.photoFileId ?? null,
        });
        this.photoUrl.set(s.photoFileId ? `${environment.fileServerUrl}/files/${s.photoFileId}` : null);
        if (s.guardians?.length) {
          const g = s.guardians[0];
          this.form.get('guardian')!.patchValue({
            relation:   g.relation   ?? 'Father',
            fullName:   g.fullName   ?? '',
            phone:      g.phone      ?? '',
            cnic:       g.cnic       ?? '',
            occupation: g.occupation ?? '',
          });
        }
      });
    }
  }

  onYearChange() {
    const yearId = this.form.value.academicYearId;
    this.form.patchValue({ classId: null });
    this.selectedFees.set([]);
    this.feeStructures.set([]);
    this.classesLoaded.set(false);
    if (yearId) {
      this.academicSvc.getClasses(yearId).subscribe(c => { this.classes.set(c); this.classesLoaded.set(true); });
    } else {
      this.classes.set([]);
      this.classesLoaded.set(false);
    }
  }

  onClassChange() {
    this.selectedFees.set([]);
    this.feeStructures.set([]);
  }

  onCnicBlur() {
    const cnic = (this.form.get('guardian')?.get('cnic')?.value ?? '').trim();
    if (!cnic) { this.siblingCheckDone.set(false); return; }
    this.studentSvc.siblingCheck(cnic).subscribe({
      next: r => {
        this.siblingCheckDone.set(true);
        this.siblingCount.set(r.siblingCount);
        this.siblingOrder.set(r.siblingOrder);
        this.siblings.set(r.siblings);
      },
      error: () => this.siblingCheckDone.set(false)
    });
  }

  feeLoadError = signal('');

  loadFeeStructures() {
    const classId     = this.f['classId'].value;
    const academicYearId = this.f['academicYearId'].value;
    if (!classId || !academicYearId) return;
    this.loadingFees.set(true);
    this.feeLoadError.set('');
    this.feeSvc.getFeeStructures(academicYearId, classId).subscribe({
      next: structures => {
        const sorted = [...structures].sort((a, b) =>
          (a.dueDay === 'Once' ? 0 : 1) - (b.dueDay === 'Once' ? 0 : 1)
        );
        this.feeStructures.set(sorted);
        this.loadingFees.set(false);
      },
      error: (err: any) => {
        this.loadingFees.set(false);
        this.feeLoadError.set(err?.error?.message ?? 'Could not load fee structures.');
      }
    });
  }

  next() {
    if (this.activeTab() === 0) {
      this.f['firstName'].markAsTouched();
      this.f['lastName'].markAsTouched();
      if (this.f['firstName'].invalid || this.f['lastName'].invalid) return;
    }
    if (this.activeTab() === 2) {
      this.f['admissionDate'].markAsTouched();
      this.f['academicYearId'].markAsTouched();
      this.f['classId'].markAsTouched();
      if (this.f['admissionDate'].invalid || this.f['academicYearId'].invalid || this.f['classId'].invalid) return;
    }
    if (this.activeTab() === 3) {
      this.gf['fullName'].markAsTouched();
      this.gf['phone'].markAsTouched();
      if (this.gf['fullName'].invalid || this.gf['phone'].invalid) return;
      if (this.editId()) { this.submit(); return; }
      // Moving from Guardian to Fees — load fee structures
      this.loadFeeStructures();
    }
    this.activeTab.update(t => t + 1);
  }

  // ── Fee selection helpers ──────────────────────────────────────────────────
  isFeeSelected(id: number) { return this.selectedFees().some(f => f.feeStructureId === id); }
  getFee(id: number) { return this.selectedFees().find(f => f.feeStructureId === id); }

  toggleFee(fs: FeeStructureDto, evt: Event) {
    const checked = (evt.target as HTMLInputElement).checked;
    if (checked) {
      const today = new Date().toISOString().slice(0, 10);
      this.selectedFees.update(prev => [...prev, {
        feeStructureId: fs.feeStructureId,
        feeTypeName: fs.feeTypeName,
        dueDay: fs.dueDay,
        amountDue: fs.amount,
        discount: 0,
        dueDate: today,
        isPaid: false,
        amountPaid: 0
      }]);
    } else {
      this.selectedFees.update(prev => prev.filter(f => f.feeStructureId !== fs.feeStructureId));
    }
  }

  getFeeDiscount(id: number) { return this.getFee(id)?.discount ?? 0; }
  getFeeDueDate(id: number)  { return this.getFee(id)?.dueDate ?? new Date().toISOString().slice(0,10); }
  getFeeIsPaid(id: number)   { return this.getFee(id)?.isPaid ?? false; }
  getFeeAmountPaid(id: number) { return this.getFee(id)?.amountPaid ?? 0; }

  setFeeDiscount(id: number, evt: Event) {
    const val = parseFloat((evt.target as HTMLInputElement).value) || 0;
    this.selectedFees.update(prev => prev.map(f => f.feeStructureId === id ? { ...f, discount: val } : f));
  }
  setFeeDueDate(id: number, val: string) {
    this.selectedFees.update(prev => prev.map(f => f.feeStructureId === id ? { ...f, dueDate: val } : f));
  }
  setFeePaid(id: number, evt: Event) {
    const val = (evt.target as HTMLSelectElement).value === 'paid';
    this.selectedFees.update(prev => prev.map(f => f.feeStructureId === id ? { ...f, isPaid: val, amountPaid: val ? f.amountDue - f.discount : 0 } : f));
  }
  setFeeAmountPaid(id: number, evt: Event) {
    const val = parseFloat((evt.target as HTMLInputElement).value) || 0;
    this.selectedFees.update(prev => prev.map(f => f.feeStructureId === id ? { ...f, amountPaid: val } : f));
  }

  feeTotal() { return this.selectedFees().reduce((s, f) => s + (f.amountDue - f.discount), 0); }
  hasUnpaidFees() { return this.selectedFees().some(f => !f.isPaid); }
  hasPaidFees()   { return this.selectedFees().some(f => f.isPaid); }

  resetForm() {
    this.success.set(false);
    this.admissionNo.set('');
    this.admittedStudentId.set(null);
    this.error.set('');
    this.activeTab.set(0);
    this.classes.set([]);
    this.feeStructures.set([]);
    this.selectedFees.set([]);
    this.siblingCheckDone.set(false);
    this.siblingCount.set(0);
    this.siblingOrder.set(1);
    this.siblings.set([]);
    this.photoUrl.set(null);
    this.form.reset({ admissionDate: new Date().toISOString().slice(0,10), guardian: { relation: 'Father' } });
  }

  onPhotoUploaded(res: { fileId: number }) {
    this.form.patchValue({ photoFileId: res.fileId });
  }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.error.set('');
    const v = this.form.value;

    const basePayload = {
      firstName:      v.firstName,
      lastName:       v.lastName,
      dateOfBirth:    v.dateOfBirth || null,
      gender:         v.gender || null,
      bloodGroup:     v.bloodGroup || null,
      religion:       v.religion || null,
      nationality:    v.nationality || null,
      address:        v.address || null,
      phone:          v.phone || null,
      email:          v.email || null,
      admissionDate:  v.admissionDate || null,
      academicYearId: v.academicYearId,
      classId:        v.classId,
      photoFileId:    v.photoFileId ?? null,
      guardians:      [v.guardian],
    };

    if (this.editId()) {
      this.studentSvc.update(this.editId()!, basePayload).subscribe({
        next: () => {
          this.saving.set(false);
          this.success.set(true);
          this.swal.successToast('Profile Updated!', `${v.firstName} ${v.lastName} has been updated successfully.`);
        },
        error: (err: any) => {
          this.saving.set(false);
          this.error.set(err?.error?.error ?? 'Failed to update. Please try again.');
        }
      });
    } else {
      const fees = this.selectedFees().map(f => ({
        feeStructureId: f.feeStructureId,
        amountDue: f.amountDue,
        discount: f.discount,
        dueDate: f.dueDate,
        isPaid: f.isPaid,
        amountPaid: f.amountPaid
      }));
      this.studentSvc.create({ ...basePayload, fees } as any).subscribe({
        next: (res: any) => {
          this.saving.set(false);
          this.success.set(true);
          this.admissionNo.set(res.admissionNo ?? res.studentId ?? '');
          this.admittedStudentId.set(res.studentId ?? null);
          this.swal.successToast('Admission Successful!', `${v.firstName} ${v.lastName} has been registered in the system.`);
        },
        error: (err: any) => {
          this.saving.set(false);
          this.error.set(err?.error?.error ?? 'Failed to save. Please try again.');
        }
      });
    }
  }

  printChallan() {
    if (this.challanTemplate === 'bank_3copy') { this._printChallanBank3Copy(); return; }
    this._printChallanThreeStrip();
  }

  private _challanData() {
    const studentName = this.previewFullName();
    const admNo       = this.admissionNo();
    const className   = this.selectedClassLabel();
    const yearLabel   = this.selectedYearLabel();
    const unpaid      = this.selectedFees().filter(f => !f.isPaid);
    const totalDue    = unpaid.reduce((s, f) => s + f.amountDue, 0);
    const totalDisc   = unpaid.reduce((s, f) => s + f.discount, 0);
    const netPayable  = totalDue - totalDisc;
    const today       = new Date().toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' });
    const initials    = (this.schoolName || 'S').split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
    const logoHtml    = this.schoolLogo ? `<img src="${this.schoolLogo}" class="inst-logo" alt="logo"/>` : `<div class="inst-avatar">${initials}</div>`;
    const feeRows     = unpaid.map(f => ({ feeTypeName: f.feeTypeName, amountDue: f.amountDue, discount: f.discount, balance: f.amountDue - f.discount }));
    const dueDate     = unpaid[0]?.dueDate ?? '—';
    return { studentName, admNo, className, yearLabel, unpaid, totalDue, totalDisc, netPayable, today, initials, logoHtml, feeRows, dueDate };
  }

  private _printChallanThreeStrip() {
    const win = window.open('', '_blank');
    if (!win) { alert('Allow popups to print.'); return; }
    const d = this._challanData();

    const feeRowsHtml = d.feeRows.map(f => `
      <tr>
        <td>${f.feeTypeName}</td>
        <td class="r">${f.amountDue.toLocaleString()}</td>
        <td class="r">${f.discount > 0 ? f.discount.toLocaleString() : '—'}</td>
        <td class="r">${f.balance.toLocaleString()}</td>
      </tr>`).join('');

    const strip = (label: string, color: string, sig: string) => `
      <div class="strip">
        <div class="strip-inner">
          <div class="strip-left">
            <div class="inst-header">
              ${d.logoHtml}
              <div class="inst-header-text">
                <span class="copy-label" style="background:${color}">${label}</span>
                <div class="school-name">${this.schoolName || 'School'}</div>
                <div class="challan-heading">FEE CHALLAN</div>
              </div>
            </div>
            <div class="info-grid">
              <div class="info-item info-item--wide"><span class="info-lbl">Student Name</span><span class="info-val info-val--name">${d.studentName}</span></div>
              <div class="info-item"><span class="info-lbl">Admission No</span><span class="info-val">${d.admNo}</span></div>
              <div class="info-item"><span class="info-lbl">Class</span><span class="info-val">${d.className}</span></div>
              <div class="info-item"><span class="info-lbl">Academic Year</span><span class="info-val">${d.yearLabel}</span></div>
              <div class="info-item"><span class="info-lbl">Issue Date</span><span class="info-val">${d.today}</span></div>
              <div class="info-item"><span class="info-lbl">Due Date</span><span class="info-val info-val--due">${d.dueDate}</span></div>
            </div>
            <table class="fee-tbl"><colgroup><col/><col/><col/><col/></colgroup>
              <thead><tr><th>Fee Type</th><th>Amount</th><th>Discount</th><th>Payable</th></tr></thead>
              <tbody>${feeRowsHtml}</tbody>
              <tfoot><tr class="total-row">
                <td><strong>TOTAL</strong></td>
                <td class="r"><strong>${d.totalDue.toLocaleString()}</strong></td>
                <td class="r">${d.totalDisc > 0 ? '<strong>' + d.totalDisc.toLocaleString() + '</strong>' : '—'}</td>
                <td class="r net">${d.netPayable.toLocaleString()}</td>
              </tr></tfoot>
            </table>
          </div>
          <div class="strip-right">
            <div class="amt-box">
              <div class="amt-lbl">NET PAYABLE</div>
              <div class="amt-val">${d.netPayable.toLocaleString()}</div>
              ${d.totalDisc > 0 ? `<div class="amt-disc">Discount: ${d.totalDisc.toLocaleString()}</div>` : ''}
            </div>
            <div class="sig-block"><div class="sig-line"></div><div class="sig-lbl">${sig}</div></div>
          </div>
        </div>
      </div>`;

    win.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>Fee Challan — ${d.studentName}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Segoe UI',Arial,sans-serif;background:#f4f4f4;padding:20px;}
  .toolbar{display:flex;justify-content:space-between;align-items:center;background:#1e3a5f;color:#fff;padding:14px 24px;border-radius:10px;margin-bottom:24px;position:sticky;top:0;z-index:99;box-shadow:0 4px 12px rgba(0,0,0,.25);}
  .toolbar-info h2{font-size:16px;font-weight:700;}.toolbar-info p{font-size:12px;color:rgba(255,255,255,.7);margin-top:2px;}
  .toolbar-btns{display:flex;gap:10px;}
  .btn-print{padding:9px 22px;background:#fff;color:#1e3a5f;border:none;border-radius:7px;font-size:13px;font-weight:700;cursor:pointer;}
  .btn-close{padding:9px 18px;background:rgba(255,255,255,.15);color:#fff;border:1.5px solid rgba(255,255,255,.4);border-radius:7px;font-size:13px;font-weight:600;cursor:pointer;}
  .challan-page{background:#fff;max-width:800px;margin:0 auto 32px;border-radius:10px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.12);border:1px solid #ddd;}
  .strip{padding:14px 18px;}.strip-inner{display:flex;gap:16px;align-items:stretch;}.strip-left{flex:1;}
  .strip-right{width:160px;display:flex;flex-direction:column;justify-content:space-between;border-left:1.5px dashed #ccc;padding-left:16px;}
  .inst-header{display:flex;align-items:center;gap:10px;margin-bottom:8px;}
  .inst-logo{width:48px;height:48px;object-fit:contain;border-radius:6px;border:1px solid #e5e7eb;flex-shrink:0;}
  .inst-avatar{width:48px;height:48px;border-radius:6px;background:#1e3a5f;color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;flex-shrink:0;}
  .inst-header-text{display:flex;flex-direction:column;}
  .copy-label{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1.2px;color:#fff;padding:3px 10px;border-radius:3px;display:inline-block;margin-bottom:4px;}
  .school-name{font-size:14px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:#111;}
  .challan-heading{font-size:10px;font-weight:700;letter-spacing:2px;color:#666;text-transform:uppercase;}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px 10px;margin-bottom:10px;}
  .info-item{display:flex;flex-direction:column;background:#f8f9fb;border-left:3px solid #1e3a5f;border-radius:4px;padding:4px 8px;}.info-item--wide{grid-column:1/-1;}
  .info-lbl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#888;margin-bottom:1px;}
  .info-val{font-size:12px;font-weight:600;color:#111;}.info-val--name{font-size:13px;font-weight:800;color:#1e3a5f;}.info-val--due{color:#b91c1c;font-weight:700;}
  .fee-tbl{width:100%;border-collapse:collapse;font-size:11px;table-layout:fixed;}
  .fee-tbl colgroup col:nth-child(1){width:40%;}.fee-tbl colgroup col:nth-child(2){width:20%;}.fee-tbl colgroup col:nth-child(3){width:20%;}.fee-tbl colgroup col:nth-child(4){width:20%;}
  .fee-tbl thead tr{background:#1e3a5f;color:#fff;}.fee-tbl thead th{padding:5px 8px;text-align:left;font-weight:600;font-size:10px;letter-spacing:.3px;text-transform:uppercase;}
  .fee-tbl thead th:nth-child(2),.fee-tbl thead th:nth-child(3),.fee-tbl thead th:nth-child(4){text-align:right;}
  .fee-tbl td.r{text-align:right;}.fee-tbl tbody tr{border-bottom:1px solid #f0f0f0;}.fee-tbl tbody tr:nth-child(even){background:#fafafa;}.fee-tbl tbody td{padding:5px 8px;color:#333;}
  .fee-tbl tfoot .total-row{background:#f0f4ff;border-top:2px solid #1e3a5f;}.fee-tbl tfoot td{padding:6px 8px;}.fee-tbl .net{color:#1e3a5f;font-weight:800;font-size:13px;}
  .amt-box{text-align:center;border:2px solid #1e3a5f;border-radius:8px;padding:12px 8px;margin-bottom:12px;}
  .amt-lbl{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:4px;}
  .amt-val{font-size:20px;font-weight:800;color:#1e3a5f;line-height:1;}.amt-disc{font-size:10px;color:#059669;margin-top:4px;}
  .sig-block{text-align:center;}.sig-line{border-bottom:1px solid #aaa;margin:8px 0 4px;}.sig-lbl{font-size:9px;color:#888;}
  .cut{font-size:10px;color:#bbb;padding:1px 8px;border-top:1px dashed #ddd;border-bottom:1px dashed #ddd;line-height:18px;white-space:nowrap;overflow:hidden;background:#fafafa;}
  @media print{body{background:#fff!important;padding:0!important;}.toolbar{display:none!important;}.challan-page{box-shadow:none!important;border-radius:0!important;margin:0!important;border:none!important;}@page{size:A4 portrait;margin:8mm;}}
</style></head><body>
<div class="toolbar"><div class="toolbar-info"><h2>Fee Challan</h2><p>${d.studentName} — ${d.admNo}</p></div>
  <div class="toolbar-btns"><button class="btn-print" onclick="window.print()">🖨️ Print / Save PDF</button><button class="btn-close" onclick="window.close()">✕ Close</button></div>
</div>
<div class="challan-page">
  ${strip('SCHOOL COPY',  '#1e3a5f', 'Cashier Signature')}
  <div class="cut">✂ &nbsp;- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -</div>
  ${strip('PARENTS COPY', '#065f46', 'Cashier Signature')}
  <div class="cut">✂ &nbsp;- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -</div>
  ${strip('BANK COPY',    '#7c2d12', 'Bank Stamp & Signature')}
</div></body></html>`);
    win.document.close();
  }

  private _printChallanBank3Copy() {
    const win = window.open('', '_blank');
    if (!win) { alert('Allow popups to print.'); return; }
    const d = this._challanData();

    const logoHtml = this.schoolLogo ? `<img src="${this.schoolLogo}" class="logo" alt="logo"/>` : `<div class="logo-av">${d.initials}</div>`;

    const col = (label: string, labelColor: string, sig: string) => `
      <div class="col">
        <div class="col-header" style="background:${labelColor}"><span class="copy-tag">${label}</span></div>
        <div class="inst-block">${logoHtml}<div class="inst-text"><div class="inst-name">${this.schoolName}</div><div class="inst-sub">FEE CHALLAN</div></div></div>
        <div class="divider"></div>
        <div class="info-rows">
          <div class="info-row wide"><span class="lbl">Student</span><span class="val bold">${d.studentName}</span></div>
          <div class="info-row"><span class="lbl">Adm #</span><span class="val">${d.admNo}</span></div>
          <div class="info-row"><span class="lbl">Class</span><span class="val">${d.className}</span></div>
          <div class="info-row"><span class="lbl">Year</span><span class="val">${d.yearLabel}</span></div>
          <div class="info-row"><span class="lbl">Date</span><span class="val accent">${d.today}</span></div>
          <div class="info-row"><span class="lbl">Due Date</span><span class="val red">${d.dueDate}</span></div>
        </div>
        <div class="divider"></div>
        <table class="fee-tbl">
          <thead><tr><th>Fee Type</th><th class="r">Amt</th><th class="r">Disc</th><th class="r">Pay</th></tr></thead>
          <tbody>${d.feeRows.map(f => `<tr><td>${f.feeTypeName}</td><td class="r">${f.amountDue.toLocaleString()}</td><td class="r">${f.discount > 0 ? f.discount.toLocaleString() : '—'}</td><td class="r">${f.balance.toLocaleString()}</td></tr>`).join('')}</tbody>
          <tfoot><tr class="total-row"><td><strong>TOTAL</strong></td><td class="r"><strong>${d.totalDue.toLocaleString()}</strong></td><td class="r">${d.totalDisc > 0 ? d.totalDisc.toLocaleString() : '—'}</td><td class="r net">${d.netPayable.toLocaleString()}</td></tr></tfoot>
        </table>
        <div class="amt-box"><div class="amt-lbl">NET PAYABLE</div><div class="amt-val">${d.netPayable.toLocaleString()}</div>${d.totalDisc > 0 ? `<div class="amt-disc">Disc: ${d.totalDisc.toLocaleString()}</div>` : ''}</div>
        <div class="sig-block"><div class="sig-line"></div><div class="sig-lbl">${sig}</div></div>
      </div>`;

    win.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>Fee Challan — ${d.studentName}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Segoe UI',Arial,sans-serif;background:#f0f0f0;padding:16px;}
  .toolbar{display:flex;justify-content:space-between;align-items:center;background:#1e3a5f;color:#fff;padding:12px 20px;border-radius:8px;margin-bottom:20px;position:sticky;top:0;z-index:99;box-shadow:0 4px 12px rgba(0,0,0,.25);}
  .toolbar h2{font-size:15px;font-weight:700;}.toolbar p{font-size:11px;color:rgba(255,255,255,.7);margin-top:2px;}.tbr{display:flex;gap:8px;}
  .btn-p{padding:8px 20px;background:#fff;color:#1e3a5f;border:none;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;}
  .btn-c{padding:8px 16px;background:rgba(255,255,255,.15);color:#fff;border:1.5px solid rgba(255,255,255,.35);border-radius:6px;font-size:13px;cursor:pointer;}
  .challan-row{display:flex;align-items:stretch;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.1);margin-bottom:6px;}
  .vcut{width:18px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding-top:8px;font-size:10px;color:#bbb;background:#f8f8f8;border-left:1px dashed #ccc;border-right:1px dashed #ccc;letter-spacing:2px;writing-mode:vertical-lr;}
  .col{flex:1;display:flex;flex-direction:column;padding:0;min-width:0;}
  .col-header{padding:5px 10px;text-align:center;}.copy-tag{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#fff;}
  .inst-block{display:flex;align-items:center;gap:8px;padding:8px 10px 4px;}
  .logo{width:36px;height:36px;object-fit:contain;border-radius:5px;border:1px solid #e5e7eb;flex-shrink:0;}
  .logo-av{width:36px;height:36px;border-radius:5px;background:#1e3a5f;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;flex-shrink:0;}
  .inst-name{font-size:11px;font-weight:800;text-transform:uppercase;color:#111;line-height:1.2;}.inst-sub{font-size:8px;font-weight:700;letter-spacing:1.5px;color:#888;text-transform:uppercase;}
  .divider{height:1px;background:#eee;margin:4px 0;}
  .info-rows{padding:0 10px;display:flex;flex-direction:column;gap:3px;margin-bottom:4px;}
  .info-row{display:flex;justify-content:space-between;align-items:baseline;gap:4px;}.info-row.wide{flex-direction:column;gap:1px;}
  .lbl{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#999;white-space:nowrap;flex-shrink:0;}
  .val{font-size:11px;font-weight:600;color:#111;text-align:right;}.val.bold{font-size:12px;font-weight:800;color:#1e3a5f;text-align:left;}.val.accent{color:#065f46;}.val.red{color:#b91c1c;}
  .fee-tbl{width:100%;border-collapse:collapse;font-size:9px;margin:0 0 4px;}
  .fee-tbl th{background:#1e3a5f;color:#fff;padding:4px 6px;text-align:left;font-size:8px;font-weight:600;text-transform:uppercase;letter-spacing:.3px;}
  .fee-tbl th.r,.fee-tbl td.r{text-align:right;}.fee-tbl td{padding:3px 6px;border-bottom:1px solid #f0f0f0;color:#333;}
  .fee-tbl tbody tr:nth-child(even){background:#fafafa;}.total-row{background:#f0f4ff!important;border-top:1.5px solid #1e3a5f;}.total-row td{padding:4px 6px;}.net{color:#1e3a5f;font-weight:800;font-size:11px;}
  .amt-box{margin:4px 10px;text-align:center;border:2px solid #1e3a5f;border-radius:6px;padding:6px;}
  .amt-lbl{font-size:7px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#888;}.amt-val{font-size:17px;font-weight:800;color:#1e3a5f;line-height:1.1;}.amt-disc{font-size:9px;color:#059669;margin-top:2px;}
  .sig-block{margin:6px 10px 10px;text-align:center;}.sig-line{border-bottom:1px solid #aaa;margin-bottom:3px;}.sig-lbl{font-size:8px;color:#999;}
  @media print{body{background:#fff!important;padding:0!important;}.toolbar{display:none!important;}.challan-row{box-shadow:none!important;border-radius:0!important;margin-bottom:0!important;page-break-after:always;break-after:page;}.challan-row:last-child{page-break-after:avoid;}@page{size:A4 landscape;margin:5mm;}}
</style></head><body>
<div class="toolbar"><div><h2>Fee Challan — Bank 3-Copy</h2><p>${d.studentName} — ${d.admNo}</p></div>
  <div class="tbr"><button class="btn-p" onclick="window.print()">🖨️ Print / Save PDF</button><button class="btn-c" onclick="window.close()">✕ Close</button></div>
</div>
<div class="challan-row">
  ${col('SCHOOL COPY',  '#1e3a5f', 'Cashier Signature')}
  <div class="vcut">✂</div>
  ${col('STUDENT COPY', '#065f46', 'Cashier Signature')}
  <div class="vcut">✂</div>
  ${col('BANK COPY',    '#7c2d12', 'Bank Stamp & Signature')}
</div></body></html>`);
    win.document.close();
  }

  printReceipt() {
    const win = window.open('', '_blank');
    if (!win) { alert('Allow popups to print.'); return; }

    const studentName  = this.previewFullName();
    const admNo        = this.admissionNo();
    const className    = this.selectedClassLabel();
    const paid         = this.selectedFees().filter(f => f.isPaid);
    const totalDue     = paid.reduce((s, f) => s + f.amountDue, 0);
    const totalDisc    = paid.reduce((s, f) => s + f.discount, 0);
    const totalPaid    = paid.reduce((s, f) => s + f.amountPaid, 0);
    const today        = new Date().toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' });

    const initials = (this.schoolName || 'S').split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
    const logoHtml = this.schoolLogo
      ? `<img src="${this.schoolLogo}" class="logo" alt="logo"/>`
      : `<div class="logo-av">${initials}</div>`;

    const feeRows = paid.map(f => `
      <tr>
        <td>${f.feeTypeName}</td>
        <td class="r">${f.amountDue.toLocaleString()}</td>
        <td class="r">${f.discount > 0 ? f.discount.toLocaleString() : '—'}</td>
        <td class="r paid-amt">${f.amountPaid.toLocaleString()}</td>
      </tr>`).join('');

    win.document.write(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><title>Fee Receipt — ${studentName}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#f4f4f4;padding:24px;}
  .toolbar{display:flex;justify-content:space-between;align-items:center;background:#065f46;color:#fff;padding:12px 20px;border-radius:8px;margin-bottom:20px;position:sticky;top:0;z-index:99;box-shadow:0 4px 12px rgba(0,0,0,.2);}
  .toolbar h2{font-size:15px;font-weight:700;}.toolbar p{font-size:11px;color:rgba(255,255,255,.7);margin-top:2px;}
  .tbr{display:flex;gap:8px;}
  .btn-p{padding:8px 20px;background:#fff;color:#065f46;border:none;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;}
  .btn-c{padding:8px 16px;background:rgba(255,255,255,.15);color:#fff;border:1.5px solid rgba(255,255,255,.35);border-radius:6px;font-size:13px;cursor:pointer;}
  .receipt{background:#fff;max-width:520px;margin:0 auto;border-radius:10px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.12);border:1px solid #ddd;}
  .rec-header{background:linear-gradient(135deg,#065f46,#047857);padding:20px 24px;display:flex;align-items:center;gap:14px;}
  .logo{width:52px;height:52px;object-fit:contain;border-radius:8px;border:2px solid rgba(255,255,255,.3);flex-shrink:0;}
  .logo-av{width:52px;height:52px;border-radius:8px;background:rgba(255,255,255,.2);color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;flex-shrink:0;}
  .rec-title{color:#fff;}.school-name{font-size:16px;font-weight:800;text-transform:uppercase;letter-spacing:.4px;}
  .rec-sub{font-size:11px;color:rgba(255,255,255,.75);margin-top:3px;letter-spacing:1px;text-transform:uppercase;}
  .paid-banner{background:#dcfce7;border-bottom:2px solid #86efac;padding:10px 24px;display:flex;align-items:center;justify-content:space-between;}
  .paid-stamp{display:flex;align-items:center;gap:8px;}
  .paid-circle{width:36px;height:36px;border-radius:50%;background:#16a34a;color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:900;border:3px solid #15803d;}
  .paid-text{font-size:14px;font-weight:800;color:#15803d;letter-spacing:.5px;text-transform:uppercase;}
  .rec-no{font-size:11px;color:#166534;font-weight:600;}
  .rec-body{padding:18px 24px;}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;margin-bottom:18px;}
  .info-item{display:flex;flex-direction:column;gap:2px;}.info-item.wide{grid-column:1/-1;}
  .lbl{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#9ca3af;}
  .val{font-size:13px;font-weight:600;color:#111;}.val.name{font-size:15px;font-weight:800;color:#065f46;}
  .fee-tbl{width:100%;border-collapse:collapse;font-size:12.5px;margin-bottom:16px;}
  .fee-tbl thead tr{background:#f0fdf4;border-bottom:2px solid #86efac;}
  .fee-tbl th{padding:8px 10px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:#374151;}
  .fee-tbl th.r,.fee-tbl td.r{text-align:right;}
  .fee-tbl td{padding:8px 10px;border-bottom:1px solid #f3f4f6;color:#374151;}
  .fee-tbl tbody tr:last-child td{border-bottom:none;}
  .paid-amt{font-weight:700;color:#15803d;}
  .total-row{background:#f0fdf4!important;border-top:2px solid #86efac;}
  .total-row td{padding:10px;font-weight:700;}.total-amt{font-size:15px;font-weight:800;color:#065f46;}
  .rec-footer{border-top:1px solid #f3f4f6;padding:14px 24px;display:flex;justify-content:space-between;align-items:flex-end;}
  .sig-block{text-align:center;}.sig-line{width:120px;border-bottom:1.5px solid #9ca3af;margin-bottom:4px;}
  .sig-lbl{font-size:9px;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;}
  .print-note{font-size:9px;color:#d1d5db;text-align:right;}
  @media print{body{background:#fff!important;padding:0!important;}.toolbar{display:none!important;}.receipt{box-shadow:none!important;border-radius:0!important;border:none!important;max-width:100%;}@page{size:A5 portrait;margin:8mm;}}
</style></head><body>
<div class="toolbar">
  <div><h2>Fee Receipt</h2><p>${studentName} — ${admNo}</p></div>
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
    <div class="rec-no">Admission Receipt &nbsp;·&nbsp; ${today}</div>
  </div>
  <div class="rec-body">
    <div class="info-grid">
      <div class="info-item wide"><span class="lbl">Student Name</span><span class="val name">${studentName}</span></div>
      <div class="info-item"><span class="lbl">Admission No</span><span class="val">${admNo}</span></div>
      <div class="info-item"><span class="lbl">Class</span><span class="val">${className}</span></div>
    </div>
    <table class="fee-tbl">
      <thead><tr><th>Fee Type</th><th class="r">Amount</th><th class="r">Discount</th><th class="r">Paid</th></tr></thead>
      <tbody>${feeRows}</tbody>
      <tfoot>
        <tr class="total-row">
          <td><strong>TOTAL</strong></td>
          <td class="r"><strong>${totalDue.toLocaleString()}</strong></td>
          <td class="r">${totalDisc > 0 ? totalDisc.toLocaleString() : '—'}</td>
          <td class="r total-amt">${totalPaid.toLocaleString()}</td>
        </tr>
      </tfoot>
    </table>
  </div>
  <div class="rec-footer">
    <div class="sig-block"><div class="sig-line"></div><div class="sig-lbl">Cashier Signature</div></div>
    <div class="print-note">This is a computer-generated receipt.</div>
  </div>
</div>
</body></html>`);
    win.document.close();
  }
}
