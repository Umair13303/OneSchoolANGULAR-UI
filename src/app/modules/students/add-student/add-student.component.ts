import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { StudentService } from '../../../core/services/student.service';
import { AcademicService } from '../../../core/services/academic.service';
import { ClassDto, AcademicYear } from '../../../core/models/academic.model';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';
import { SwalNotificationService } from '../../../core/services/swal-notification.service';

@Component({
  selector: 'app-add-student',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, DatePickerComponent],
  template: `
    @if (success()) {
      <div class="success-screen">
        <div class="success-card">
          <div class="success-icon">
            <span class="material-icons-round">check_circle</span>
          </div>
          <h2>Student Added!</h2>
          <p class="success-sub">Student record has been saved in the system.</p>
          <div class="admission-no">
            <span class="an-label">Admission No.</span>
            <span class="an-value">{{ admissionNo() }}</span>
          </div>
          <div class="success-actions">
            <button class="btn-secondary" (click)="router.navigate(['/students/list'])">
              <span class="material-icons-round">list</span> View All
            </button>
            <button class="btn-primary" (click)="resetForm()">
              <span class="material-icons-round">person_add_alt</span> Add Another
            </button>
          </div>
        </div>
      </div>
    } @else {

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
            <h3 class="sw-title">Before You Can Add Students</h3>
            <p class="sw-desc">Create an Academic Year and Classes first.</p>
            <div class="sw-checklist">
              <div class="sw-item">
                <div class="sw-item-icon"><span class="material-icons-round">calendar_month</span></div>
                <div class="sw-item-text">
                  <div class="sw-item-title">Create an Academic Year</div>
                  <div class="sw-item-sub">e.g. 2024–2025 school year</div>
                </div>
                <span class="sw-badge">Pending</span>
              </div>
              <div class="sw-item">
                <div class="sw-item-icon"><span class="material-icons-round">class</span></div>
                <div class="sw-item-text">
                  <div class="sw-item-title">Add Classes to that Year</div>
                  <div class="sw-item-sub">e.g. Class 1 – Section A</div>
                </div>
                <span class="sw-badge">Pending</span>
              </div>
            </div>
          </div>
          <div class="sw-footer">
            <button class="btn-secondary" type="button" (click)="setupWarningDismissed.set(true)">Remind Me Later</button>
            <button class="btn-primary" type="button" (click)="router.navigate(['/academics/years'])">
              Start Setup <span class="material-icons-round">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    }

    <div class="admission-card">
      <div class="adm-header">
        <div class="adm-header-left">
          <div class="adm-avatar" [style.background]="previewColor()">{{ previewInitials() }}</div>
          <div>
            <h2 class="adm-title">Add Existing Student <span class="adm-name">{{ previewFullName() }}</span></h2>
            <p class="adm-sub">Enter existing student information — Step {{ activeTab() + 1 }}/4</p>
          </div>
        </div>
        <div class="adm-header-right">
          <span class="adm-step-badge">Step {{ activeTab() + 1 }}/4</span>
          <button class="adm-back-btn" (click)="router.navigate(['/students/list'])" title="Cancel & Exit">
            <span class="material-icons-round">close</span>
          </button>
        </div>
      </div>

      <div class="progress-bar">
        <div class="progress-fill" [style.width.%]="(activeTab() + 1) * 25"></div>
      </div>

      <div class="adm-tabs">
        <button type="button" class="adm-tab" [class.active]="activeTab() === 0" [class.done]="activeTab() > 0" (click)="activeTab.set(0)">
          <span class="tab-dot">@if (activeTab() > 0) { <span class="material-icons-round">check</span> } @else { 1 }</span>
          <span class="tab-label">Personal</span>
        </button>
        <div class="tab-connector" [class.done]="activeTab() > 0"></div>
        <button type="button" class="adm-tab" [class.active]="activeTab() === 1" [class.done]="activeTab() > 1" (click)="activeTab.set(1)">
          <span class="tab-dot">@if (activeTab() > 1) { <span class="material-icons-round">check</span> } @else { 2 }</span>
          <span class="tab-label">Contact</span>
        </button>
        <div class="tab-connector" [class.done]="activeTab() > 1"></div>
        <button type="button" class="adm-tab" [class.active]="activeTab() === 2" [class.done]="activeTab() > 2" (click)="activeTab.set(2)">
          <span class="tab-dot">@if (activeTab() > 2) { <span class="material-icons-round">check</span> } @else { 3 }</span>
          <span class="tab-label">Enrollment</span>
        </button>
        <div class="tab-connector" [class.done]="activeTab() > 2"></div>
        <button type="button" class="adm-tab" [class.active]="activeTab() === 3" (click)="activeTab.set(3)">
          <span class="tab-dot">4</span>
          <span class="tab-label">Guardian</span>
        </button>
      </div>

      <div class="adm-body">
        <form [formGroup]="form" (ngSubmit)="submit()">

          <!-- ── Tab 0: Personal ── -->
          @if (activeTab() === 0) {
            <div class="tab-pane">
              <div class="section-hint">
                <span class="material-icons-round">person</span>
                <span>Enter the student's personal information.</span>
              </div>

              <div class="form-grid-2">
                <div class="form-field" [class.has-error]="f['firstName'].invalid && f['firstName'].touched">
                  <label>First Name <span class="req">*</span></label>
                  <div class="input-wrap">
                    <span class="material-icons-round field-icon">badge</span>
                    <input formControlName="firstName" placeholder="e.g. Muhammad" />
                  </div>
                  @if (f['firstName'].invalid && f['firstName'].touched) {
                    <span class="ferr">
                      <span class="material-icons-round">error</span> First name is required
                    </span>
                  }
                </div>

                <div class="form-field" [class.has-error]="f['lastName'].invalid && f['lastName'].touched">
                  <label>Last Name <span class="req">*</span></label>
                  <div class="input-wrap">
                    <span class="material-icons-round field-icon">badge</span>
                    <input formControlName="lastName" placeholder="e.g. Ali" />
                  </div>
                  @if (f['lastName'].invalid && f['lastName'].touched) {
                    <span class="ferr">
                      <span class="material-icons-round">error</span> Last name is required
                    </span>
                  }
                </div>
              </div>

              <div class="form-grid-3">
                <div class="form-field">
                  <label>Date of Birth</label>
                  <app-date-picker formControlName="dateOfBirth" />
                </div>

                <div class="form-field">
                  <label>Gender</label>
                  <div class="input-wrap select-wrap">
                    <span class="material-icons-round field-icon">wc</span>
                    <select formControlName="gender">
                      <option value="">Select</option>
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>

                <div class="form-field">
                  <label>Blood Group</label>
                  <div class="input-wrap select-wrap">
                    <span class="material-icons-round field-icon">bloodtype</span>
                    <select formControlName="bloodGroup">
                      <option value="">Select</option>
                      @for (bg of bloodGroups; track bg) { <option>{{ bg }}</option> }
                    </select>
                  </div>
                </div>
              </div>

              <div class="form-grid-2">
                <div class="form-field">
                  <label>Religion</label>
                  <div class="input-wrap">
                    <span class="material-icons-round field-icon">mosque</span>
                    <input formControlName="religion" placeholder="e.g. Islam" />
                  </div>
                </div>

                <div class="form-field">
                  <label>Nationality</label>
                  <div class="input-wrap">
                    <span class="material-icons-round field-icon">flag</span>
                    <input formControlName="nationality" placeholder="e.g. Pakistani" />
                  </div>
                </div>
              </div>

              <div class="tab-nav">
                <span></span>
                <button type="button" class="btn-primary" (click)="next()">
                  Next Step <span class="material-icons-round">arrow_forward</span>
                </button>
              </div>
            </div>
          }

          <!-- ── Tab 1: Contact ── -->
          @if (activeTab() === 1) {
            <div class="tab-pane">
              <div class="section-hint">
                <span class="material-icons-round">contact_phone</span>
                <span>Provide the student's contact details.</span>
              </div>

              <div class="form-grid-2">
                <div class="form-field">
                  <label>Phone Number</label>
                  <div class="input-wrap">
                    <span class="material-icons-round field-icon">call</span>
                    <input formControlName="phone" placeholder="0300-1234567" type="tel" />
                  </div>
                </div>

                <div class="form-field">
                  <label>Email Address</label>
                  <div class="input-wrap">
                    <span class="material-icons-round field-icon">email</span>
                    <input type="email" formControlName="email" placeholder="student@email.com" />
                  </div>
                </div>
              </div>

              <div class="form-field">
                <label>Home Address</label>
                <div class="input-wrap textarea-wrap">
                  <span class="material-icons-round field-icon area-icon">home</span>
                  <textarea formControlName="address" rows="2" placeholder="Street, City, Province"></textarea>
                </div>
              </div>

              <div class="tab-nav">
                <button type="button" class="btn-secondary" (click)="activeTab.set(0)">
                  <span class="material-icons-round">arrow_back</span> Back
                </button>
                <button type="button" class="btn-primary" (click)="next()">
                  Next Step <span class="material-icons-round">arrow_forward</span>
                </button>
              </div>
            </div>
          }

          <!-- ── Tab 2: Enrollment ── -->
          @if (activeTab() === 2) {
            <div class="tab-pane">
              <div class="section-hint">
                <span class="material-icons-round">school</span>
                <span>Select the academic year and class. Optionally enter the student's existing admission number.</span>
              </div>

              @if (yearsLoaded() && years().length === 0) {
                <div class="setup-alert">
                  <span class="material-icons-round">warning</span>
                  <div class="sa-content">
                    <strong>No Academic Years found.</strong>
                    <button type="button" class="sa-link" (click)="router.navigate(['/academics/years'])">
                      Go to Academic Years <span class="material-icons-round">arrow_forward</span>
                    </button>
                  </div>
                </div>
              }

              <div class="form-grid-2">
                <div class="form-field">
                  <label>Existing Admission No. <span class="optional">(optional)</span></label>
                  <div class="input-wrap">
                    <span class="material-icons-round field-icon">tag</span>
                    <input formControlName="customAdmissionNo" placeholder="e.g. ADM-2022-0045 or leave blank" />
                  </div>
                  @if (nextAdmissionNo() && !f['customAdmissionNo'].value) {
                    <span class="fhint">Leave blank to auto-generate — next number: <strong>{{ nextAdmissionNo() }}</strong></span>
                  } @else {
                    <span class="fhint">Leave blank to auto-generate a new number</span>
                  }
                </div>

                <div class="form-field" [class.has-error]="f['admissionDate'].invalid && f['admissionDate'].touched">
                  <label>Admission Date <span class="req">*</span></label>
                  <app-date-picker formControlName="admissionDate" />
                  @if (f['admissionDate'].invalid && f['admissionDate'].touched) {
                    <span class="ferr">
                      <span class="material-icons-round">error</span> Admission date is required
                    </span>
                  }
                </div>
              </div>

              <div class="form-grid-2">
                <div class="form-field" [class.has-error]="f['academicYearId'].invalid && f['academicYearId'].touched">
                  <label>Academic Year <span class="req">*</span></label>
                  <div class="input-wrap select-wrap">
                    <span class="material-icons-round field-icon">calendar_month</span>
                    <select formControlName="academicYearId" (change)="onYearChange()">
                      <option [ngValue]="null">Select year</option>
                      @for (y of years(); track y.academicYearId) {
                        <option [ngValue]="y.academicYearId">{{ y.yearLabel }}</option>
                      }
                    </select>
                  </div>
                  @if (f['academicYearId'].invalid && f['academicYearId'].touched) {
                    <span class="ferr">
                      <span class="material-icons-round">error</span> Academic year is required
                    </span>
                  }
                </div>

                <div class="form-field" [class.has-error]="f['classId'].invalid && f['classId'].touched">
                  <label>Class <span class="req">*</span></label>
                  <div class="input-wrap select-wrap">
                    <span class="material-icons-round field-icon">class</span>
                    <select formControlName="classId">
                      <option [ngValue]="null">Select class</option>
                      @for (c of classes(); track c.classId) {
                        <option [ngValue]="c.classId">{{ c.className }}{{ c.section ? ' ' + c.section : '' }}</option>
                      }
                    </select>
                  </div>
                  @if (f['classId'].invalid && f['classId'].touched) {
                    <span class="ferr">
                      <span class="material-icons-round">error</span> Class is required
                    </span>
                  }
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
                  @if (f['customAdmissionNo'].value) {
                    <div class="ap-divider"></div>
                    <div class="ap-row">
                      <span class="material-icons-round">tag</span>
                      <span>{{ f['customAdmissionNo'].value }}</span>
                    </div>
                  }
                </div>
              }

              <div class="tab-nav">
                <button type="button" class="btn-secondary" (click)="activeTab.set(1)">
                  <span class="material-icons-round">arrow_back</span> Back
                </button>
                <button type="button" class="btn-primary" (click)="next()">
                  Next Step <span class="material-icons-round">arrow_forward</span>
                </button>
              </div>
            </div>
          }

          <!-- ── Tab 3: Guardian ── -->
          @if (activeTab() === 3) {
            <div class="tab-pane">
              <ng-container formGroupName="guardian">
                <div class="section-hint">
                  <span class="material-icons-round">family_restroom</span>
                  <span>Enter the parent or guardian's contact details.</span>
                </div>

                <div class="form-grid-2">
                  <div class="form-field">
                    <label>Relation <span class="req">*</span></label>
                    <div class="input-wrap select-wrap">
                      <span class="material-icons-round field-icon">family_restroom</span>
                      <select formControlName="relation">
                        <option>Father</option>
                        <option>Mother</option>
                        <option>Guardian</option>
                      </select>
                    </div>
                  </div>

                  <div class="form-field" [class.has-error]="gf['fullName'].invalid && gf['fullName'].touched">
                    <label>Full Name <span class="req">*</span></label>
                    <div class="input-wrap">
                      <span class="material-icons-round field-icon">person</span>
                      <input formControlName="fullName" placeholder="Guardian's full name" />
                    </div>
                    @if (gf['fullName'].invalid && gf['fullName'].touched) {
                      <span class="ferr">
                        <span class="material-icons-round">error</span> Guardian name is required
                      </span>
                    }
                  </div>
                </div>

                <div class="form-grid-3">
                  <div class="form-field" [class.has-error]="gf['phone'].invalid && gf['phone'].touched">
                    <label>Phone <span class="req">*</span></label>
                    <div class="input-wrap">
                      <span class="material-icons-round field-icon">call</span>
                      <input formControlName="phone" placeholder="0300-1234567" type="tel" />
                    </div>
                    @if (gf['phone'].invalid && gf['phone'].touched) {
                      <span class="ferr">
                        <span class="material-icons-round">error</span> Phone is required
                      </span>
                    }
                  </div>

                  <div class="form-field">
                    <label>CNIC</label>
                    <div class="input-wrap">
                      <span class="material-icons-round field-icon">credit_card</span>
                      <input formControlName="cnic" placeholder="12345-1234567-1" />
                    </div>
                  </div>

                  <div class="form-field">
                    <label>Occupation</label>
                    <div class="input-wrap">
                      <span class="material-icons-round field-icon">work</span>
                      <input formControlName="occupation" placeholder="e.g. Business" />
                    </div>
                  </div>
                </div>

                @if (error()) {
                  <div class="tm-alert error">
                    <span class="material-icons-round">error_outline</span> {{ error() }}
                  </div>
                }

                <div class="tab-nav">
                  <button type="button" class="btn-secondary" (click)="activeTab.set(2)">
                    <span class="material-icons-round">arrow_back</span> Back
                  </button>
                  <button type="submit" class="btn-primary" [disabled]="saving()">
                    @if (saving()) {
                      <span class="material-icons-round spin">sync</span> Saving...
                    } @else {
                      <span class="material-icons-round">save</span> Save Student
                    }
                  </button>
                </div>
              </ng-container>
            </div>
          }

        </form>
      </div>
    </div>

    } <!-- end else -->
  `,
  styles: [`
    .success-screen { display: flex; align-items: center; justify-content: center; min-height: 50vh; }
    .success-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--r-2xl, 20px); padding: 40px 36px;
      text-align: center; max-width: 420px; width: 100%;
      box-shadow: var(--sh-xl); animation: slideUp 0.3s cubic-bezier(.22,1,.36,1);
    }
    .success-icon {
      width: 60px; height: 60px; border-radius: 16px;
      background: var(--green-s); border: 1px solid var(--green-b);
      display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;
      .material-icons-round { font-size: 30px; color: var(--green); font-variation-settings: 'FILL' 1; }
    }
    .success-card h2 { font-size: 20px; font-weight: 800; color: var(--t1); margin-bottom: 6px; }
    .success-sub { font-size: 13px; color: var(--t4); margin-bottom: 20px; }
    .admission-no {
      display: inline-flex; flex-direction: column; align-items: center;
      padding: 12px 24px; border-radius: 10px;
      background: var(--accent-s); border: 1px solid var(--accent-g); margin-bottom: 20px;
    }
    .an-label { font-size: 10px; font-weight: 700; color: var(--accent); text-transform: uppercase; letter-spacing: 1px; }
    .an-value { font-size: 22px; font-weight: 800; color: var(--accent); }
    .success-actions { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;
      button { display: inline-flex; align-items: center; gap: 6px;
        .material-icons-round { font-size: 15px; } }
    }

    .admission-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--r-2xl, 20px);
      box-shadow: var(--sh);
      margin-bottom: var(--sp-6, 24px);
    }

    .adm-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 22px;
      background: linear-gradient(135deg, var(--accent-s) 0%, var(--surface) 100%);
      border-bottom: 1px solid var(--border);
      border-radius: var(--r-2xl, 20px) var(--r-2xl, 20px) 0 0;
      gap: 14px;
    }
    .adm-header-left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
    .adm-header-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
    .adm-avatar {
      width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; font-weight: 800; color: #fff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15); transition: background 0.3s;
    }
    .adm-title { font-size: 15px; font-weight: 700; color: var(--t1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 0; }
    .adm-name { color: var(--accent); margin-left: 4px; }
    .adm-sub { font-size: 12px; color: var(--t4); margin: 2px 0 0; }
    .adm-step-badge {
      padding: 5px 13px; border-radius: 99px;
      background: var(--accent); color: #fff;
      font-size: 12px; font-weight: 700; white-space: nowrap;
      box-shadow: 0 2px 8px var(--accent-g);
    }
    .adm-back-btn {
      width: 34px; height: 34px; border-radius: var(--r-md, 8px);
      border: 1px solid var(--border-2); background: var(--surface);
      color: var(--t3); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.15s ease;
      .material-icons-round { font-size: 18px; }
    }
    .adm-back-btn:hover { background: var(--red-s); border-color: var(--red); color: var(--red); }

    .progress-bar { height: 3px; background: var(--border); width: 100%; }
    .progress-fill { height: 100%; background: var(--accent); transition: width 0.35s cubic-bezier(.22,1,.36,1); }

    .adm-tabs {
      display: flex; align-items: center;
      padding: 12px 24px;
      background: var(--surface-2);
      border-bottom: 1px solid var(--border);
      gap: 4px;
      overflow-x: auto;
    }
    .adm-tab {
      display: flex; align-items: center; gap: 8px;
      background: none; border: none; cursor: pointer; padding: 6px 12px;
      border-radius: var(--r-lg, 12px);
      white-space: nowrap;
      transition: background 0.15s ease;
    }
    .adm-tab:hover { background: rgba(0,0,0,0.03); }
    .tab-dot {
      width: 26px; height: 26px; border-radius: 50%;
      border: 2px solid var(--border-2);
      background: var(--surface); color: var(--t4);
      font-size: 11.5px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s ease; flex-shrink: 0;
      .material-icons-round { font-size: 14px; }
    }
    .tab-label { font-size: 13px; font-weight: 600; color: var(--t4); transition: color 0.2s ease; }
    .adm-tab.active .tab-dot { background: var(--accent); border-color: var(--accent); color: #fff; box-shadow: 0 0 0 3px var(--accent-g); }
    .adm-tab.active .tab-label { color: var(--accent); font-weight: 700; }
    .adm-tab.done .tab-dot { background: var(--green); border-color: var(--green); color: #fff; }
    .adm-tab.done .tab-label { color: var(--t2); }
    .tab-connector { flex: 1; height: 2px; background: var(--border); min-width: 14px; margin: 0 6px; border-radius: 2px; transition: background 0.3s ease; }
    .tab-connector.done { background: var(--green); }

    .adm-body { padding: 0; }
    .tab-pane { padding: 22px 24px 36px; display: flex; flex-direction: column; gap: 16px; min-height: 380px; }

    .section-hint {
      display: flex; align-items: center; gap: 9px;
      padding: 10px 14px; border-radius: var(--r-md, 8px);
      background: var(--surface-2); border: 1px solid var(--border);
      font-size: 12.5px; color: var(--t3); font-weight: 500;
      .material-icons-round { font-size: 16px; color: var(--accent); flex-shrink: 0; }
    }

    .form-grid-2 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      width: 100%;
      box-sizing: border-box;
    }
    .form-grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      width: 100%;
      box-sizing: border-box;
    }
    @media (max-width: 768px) {
      .form-grid-3 { grid-template-columns: 1fr; }
    }
    @media (max-width: 640px) {
      .form-grid-2 { grid-template-columns: 1fr; }
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      width: 100%;
      box-sizing: border-box;
    }
    .form-field label {
      font-size: 11.5px;
      font-weight: 700;
      color: var(--t3);
      letter-spacing: 0.3px;
      text-transform: uppercase;
    }
    .req { color: var(--red); font-weight: 800; margin-left: 2px; }
    .optional { color: var(--t5); font-weight: 400; text-transform: none; font-size: 11px; }
    .fhint { font-size: 11px; color: var(--t4); margin-top: 2px; }

    .input-wrap {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
      box-sizing: border-box;
    }
    .field-icon {
      position: absolute;
      left: 12px;
      font-size: 17px;
      color: var(--t4);
      pointer-events: none;
      transition: color 0.15s ease;
      z-index: 1;
    }
    .area-icon {
      top: 12px;
    }

    input:not([type="checkbox"]):not([type="radio"]), select, textarea {
      width: 100%;
      height: var(--input-h, 42px);
      padding: 0 12px 0 38px;
      border: 1.5px solid var(--border);
      border-radius: var(--r-md, 8px);
      font-size: 13.5px;
      font-family: inherit;
      background: var(--surface);
      color: var(--t1);
      box-sizing: border-box;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    textarea {
      height: auto;
      min-height: 72px;
      padding: 10px 12px 10px 38px;
      resize: vertical;
    }
    select {
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
      background-repeat: no-repeat;
      background-position: right 12px center;
      background-size: 14px;
      padding-right: 34px;
    }
    input:focus, select:focus, textarea:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-g);
      background: var(--surface);
    }
    .input-wrap:focus-within .field-icon {
      color: var(--accent);
    }
    .form-field.has-error input,
    .form-field.has-error select,
    .form-field.has-error textarea {
      border-color: var(--red);
      background: var(--red-s);
    }
    .form-field.has-error .field-icon {
      color: var(--red);
    }

    .ferr {
      font-size: 11px;
      font-weight: 600;
      color: var(--red);
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 2px;
      .material-icons-round { font-size: 13px; }
    }

    .admission-preview {
      display: flex; align-items: center; flex-wrap: wrap; gap: 0;
      padding: 12px 16px; border-radius: var(--r-lg, 12px);
      background: var(--green-s); border: 1px solid var(--green-b); margin-top: 4px;
    }
    .ap-row { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: var(--green); .material-icons-round { font-size: 16px; } }
    .ap-divider { width: 1px; height: 16px; background: var(--green-b); margin: 0 14px; }

    .setup-alert {
      display: flex; align-items: flex-start; gap: 10px; padding: 12px 16px; border-radius: var(--r-md, 8px);
      background: #fef3c7; border: 1px solid #fde68a; color: #92400e;
      .material-icons-round { font-size: 20px; margin-top: 1px; flex-shrink: 0; }
    }
    .sa-content { font-size: 13px; font-weight: 500; line-height: 1.5; display: flex; flex-direction: column; gap: 6px; strong { font-weight: 700; } }
    .sa-link { display: inline-flex; align-items: center; gap: 4px; background: none; border: none; padding: 0; color: #92400e; font-size: 12.5px; font-weight: 700; cursor: pointer; text-decoration: underline; .material-icons-round { font-size: 13px; } }

    .tab-nav {
      display: flex; justify-content: space-between; align-items: center;
      padding-top: 16px; margin-top: 8px; border-top: 1px solid var(--border);
    }
    .btn-primary, .btn-secondary {
      display: inline-flex; align-items: center; justify-content: center; gap: 7px;
      height: var(--btn-h, 42px); padding: 0 20px;
      border-radius: var(--r-md, 8px); font-size: 13.5px; font-weight: 600;
      cursor: pointer; transition: all 0.15s ease; border: 1px solid transparent;
      .material-icons-round { font-size: 17px; }
    }
    .btn-primary {
      background: var(--accent); color: #fff;
      box-shadow: 0 2px 6px var(--accent-g);
    }
    .btn-primary:hover:not(:disabled) {
      filter: brightness(1.08); transform: translateY(-1px);
      box-shadow: 0 4px 12px var(--accent-g);
    }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-secondary {
      background: var(--surface); color: var(--t2); border-color: var(--border-2);
    }
    .btn-secondary:hover { background: var(--surface-2); border-color: var(--border); color: var(--t1); }

    .tm-alert {
      display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: var(--r-md, 8px);
      font-size: 12.5px; font-weight: 500;
      .material-icons-round { font-size: 16px; flex-shrink: 0; }
    }
    .tm-alert.error { background: var(--red-s); color: var(--red); border: 1px solid var(--red-b); }

    /* Setup warning modal */
    .sw-backdrop { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; padding: 16px; }
    .sw-modal { background: var(--surface); border: 1px solid var(--border); border-radius: 20px; width: 100%; max-width: 420px; box-shadow: var(--sh-xl); overflow: hidden; animation: slideUp 0.25s cubic-bezier(.22,1,.36,1); }
    .sw-banner { background: linear-gradient(135deg, var(--amber-s) 0%, #fde68a55 100%); border-bottom: 1px solid var(--amber-b); padding: 24px 20px 20px; display: flex; align-items: flex-start; justify-content: space-between; }
    .sw-banner-icon { width: 52px; height: 52px; border-radius: 14px; background: var(--amber); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(217,119,6,0.35); .material-icons-round { font-size: 26px; color: #fff; font-variation-settings: 'FILL' 1; } }
    .sw-close { width: 28px; height: 28px; border-radius: 8px; border: none; background: rgba(0,0,0,0.07); color: #92400e; cursor: pointer; display: flex; align-items: center; justify-content: center; .material-icons-round { font-size: 16px; } }
    .sw-body { padding: 20px 20px 16px; }
    .sw-tag { font-size: 10.5px; font-weight: 700; color: var(--amber); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
    .sw-title { font-size: 17px; font-weight: 800; color: var(--t1); margin-bottom: 8px; line-height: 1.3; }
    .sw-desc { font-size: 13px; color: var(--t3); line-height: 1.65; margin-bottom: 16px; }
    .sw-checklist { display: flex; flex-direction: column; gap: 8px; }
    .sw-item { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 10px; background: var(--surface-2); border: 1px solid var(--border); }
    .sw-item-icon { width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0; background: var(--amber-s); border: 1px solid var(--amber-b); display: flex; align-items: center; justify-content: center; .material-icons-round { font-size: 17px; color: var(--amber); font-variation-settings: 'FILL' 1; } }
    .sw-item-text { flex: 1; min-width: 0; }
    .sw-item-title { font-size: 13px; font-weight: 700; color: var(--t1); }
    .sw-item-sub { font-size: 11.5px; color: var(--t4); margin-top: 1px; }
    .sw-badge { flex-shrink: 0; font-size: 10.5px; font-weight: 700; padding: 3px 9px; border-radius: 99px; background: var(--amber-s); color: var(--amber); border: 1px solid var(--amber-b); }
    .sw-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 14px 20px; border-top: 1px solid var(--border); background: var(--surface-2); .btn-primary .material-icons-round, .btn-secondary .material-icons-round { font-size: 15px; } }

    @keyframes spin { to { transform: rotate(360deg); } }
    .spin { animation: spin 0.8s linear infinite; display: inline-block; }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class AddStudentComponent implements OnInit {
  private fb          = inject(FormBuilder);
  private studentSvc  = inject(StudentService);
  private academicSvc = inject(AcademicService);
  private swal        = inject(SwalNotificationService);
  router = inject(Router);

  years         = signal<AcademicYear[]>([]);
  classes       = signal<ClassDto[]>([]);
  yearsLoaded   = signal(false);
  setupWarningDismissed = signal(false);
  saving        = signal(false);
  success       = signal(false);
  error         = signal('');
  admissionNo   = signal('');
  activeTab     = signal(0);
  nextAdmissionNo = signal('');   // suggestion from institute/campus settings

  readonly bloodGroups = ['A+','A-','B+','B-','O+','O-','AB+','AB-'];
  readonly COLORS = ['#7c3aed','#059669','#0891b2','#d97706','#db2777','#ea580c'];

  form = this.fb.group({
    firstName:          ['', Validators.required],
    lastName:           ['', Validators.required],
    dateOfBirth:        [null as string | null],
    gender:             [''],
    bloodGroup:         [''],
    religion:           [''],
    nationality:        [''],
    address:            [''],
    phone:              [''],
    email:              ['', Validators.email],
    customAdmissionNo:  [''],
    admissionDate:      [new Date().toISOString().slice(0,10), Validators.required],
    academicYearId:     [null as number | null, Validators.required],
    classId:            [null as number | null, Validators.required],
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
    this.studentSvc.getNextAdmissionNo().subscribe({
      next: r => this.nextAdmissionNo.set(r.admissionNo),
      error: () => {},   // suggestion is a nicety — the form works without it
    });
  }

  onYearChange() {
    const yearId = this.form.value.academicYearId;
    this.form.patchValue({ classId: null });
    if (yearId) {
      this.academicSvc.getClasses(yearId).subscribe(c => this.classes.set(c));
    } else {
      this.classes.set([]);
    }
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
    this.activeTab.update(t => t + 1);
  }

  resetForm() {
    this.success.set(false);
    this.admissionNo.set('');
    this.error.set('');
    this.activeTab.set(0);
    this.classes.set([]);
    this.form.reset({ admissionDate: new Date().toISOString().slice(0,10), guardian: { relation: 'Father' } });
  }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.error.set('');
    const v = this.form.value;

    const payload: any = {
      firstName:        v.firstName,
      lastName:         v.lastName,
      dateOfBirth:      v.dateOfBirth || null,
      gender:           v.gender || null,
      bloodGroup:       v.bloodGroup || null,
      religion:         v.religion || null,
      nationality:      v.nationality || null,
      address:          v.address || null,
      phone:            v.phone || null,
      email:            v.email || null,
      admissionDate:    v.admissionDate || null,
      customAdmissionNo: v.customAdmissionNo?.trim() || null,
      academicYearId:   v.academicYearId,
      classId:          v.classId,
      photoFileId:      null,
      guardians:        [v.guardian],
      fees:             []
    };

    this.studentSvc.create(payload).subscribe({
      next: (res: any) => {
        this.saving.set(false);
        this.success.set(true);
        this.admissionNo.set(res.admissionNo ?? res.studentId ?? '');
        this.swal.successToast('Student Added!', `${v.firstName} ${v.lastName} has been registered in the system.`);
      },
      error: (err: any) => {
        this.saving.set(false);
        this.error.set(err?.error?.error ?? 'Failed to save. Please try again.');
      }
    });
  }
}
