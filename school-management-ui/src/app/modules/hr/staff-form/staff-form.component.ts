import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { StaffService } from '../../../core/services/staff.service';
import { AuthService } from '../../../core/services/auth.service';
import { FileUploadService } from '../../../core/services/file-upload.service';
import { environment } from '../../../../environments/environment';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';
import { PhotoUploadComponent } from '../../../shared/components/photo-upload/photo-upload.component';
import { EMPLOYMENT_TYPES, STAFF_STATUSES, DEPARTMENTS, StaffDocumentDto } from '../../../core/models/staff.model';

@Component({
  selector: 'app-staff-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, DatePickerComponent, PhotoUploadComponent],
  template: `
    @if (success()) {
      <div class="success-screen">
        <div class="success-card">
          <div class="success-icon">
            <span class="material-icons-round">how_to_reg</span>
          </div>
          <h2>{{ isEdit ? 'Profile Updated!' : 'Staff Added!' }}</h2>
          <p class="success-sub">{{ isEdit ? 'Staff member profile has been updated successfully.' : 'Staff member has been registered in the system.' }}</p>
          <div class="success-actions">
            <button class="btn-secondary" (click)="router.navigate(['/hr/staff'])">
              <span class="material-icons-round">list</span> View All Staff
            </button>
            @if (!isEdit) {
              <button class="btn-primary" (click)="resetForm()">
                <span class="material-icons-round">person_add</span> Add Another
              </button>
            }
          </div>
        </div>
      </div>
    } @else {

    <div class="admission-card">

      <!-- Header -->
      <div class="adm-header">
        <div class="adm-header-left">
          <app-photo-upload
            variant="header"
            entityType="staff-photo"
            [entityId]="isEdit ? staffId : null"
            [schoolName]="instituteName"
            [photoUrl]="photoUrl()"
            [fallbackColor]="previewColor()"
            [fallbackText]="previewInitials()"
            (uploaded)="onPhotoUploaded($event)" />
          <div>
            <h2 class="adm-title">
              {{ isEdit ? 'Edit Staff' : 'New Staff' }}
              <span class="adm-name">{{ previewName() }}</span>
            </h2>
            <p class="adm-sub">Fill in all steps to {{ isEdit ? 'update the profile' : 'register a non-teaching staff member' }}</p>
          </div>
        </div>
        <div class="adm-header-right">
          <span class="adm-step-badge">Step {{ activeTab() + 1 }}/3</span>
          <button class="adm-back-btn" (click)="router.navigate(['/hr/staff'])">
            <span class="material-icons-round">close</span>
          </button>
        </div>
      </div>

      <!-- Progress bar -->
      <div class="progress-bar">
        <div class="progress-fill" [style.width.%]="progressPct()"></div>
      </div>

      <!-- Tab stepper -->
      <div class="adm-tabs">
        <button class="adm-tab" [class.active]="activeTab() === 0" [class.done]="activeTab() > 0" (click)="activeTab.set(0)">
          <span class="tab-dot">
            @if (activeTab() > 0) { <span class="material-icons-round">check</span> } @else { 1 }
          </span>
          <span class="tab-label">Personal</span>
        </button>
        <div class="tab-connector" [class.done]="activeTab() > 0"></div>
        <button class="adm-tab" [class.active]="activeTab() === 1" [class.done]="activeTab() > 1" (click)="activeTab.set(1)">
          <span class="tab-dot">
            @if (activeTab() > 1) { <span class="material-icons-round">check</span> } @else { 2 }
          </span>
          <span class="tab-label">Emergency</span>
        </button>
        <div class="tab-connector" [class.done]="activeTab() > 1"></div>
        <button class="adm-tab" [class.active]="activeTab() === 2" (click)="activeTab.set(2)">
          <span class="tab-dot">3</span>
          <span class="tab-label">Job Details</span>
        </button>
      </div>

      <!-- Form body -->
      <div class="adm-body">
        <form [formGroup]="form" (ngSubmit)="submit()">

          <!-- ── Tab 0: Personal ── -->
          @if (activeTab() === 0) {
            <div class="tab-pane">
              <div class="section-hint">
                <span class="material-icons-round">info</span>
                Enter the staff member's personal and demographic information.
              </div>

              <div class="fg two">
                <div class="fi">
                  <div class="fi-icon"><span class="material-icons-round">badge</span></div>
                  <div class="fi-content">
                    <label>Full Name <span class="req">*</span></label>
                    <input formControlName="fullName" placeholder="e.g. Muhammad Ahmed Khan" />
                    @if (f['fullName'].invalid && f['fullName'].touched) {
                      <span class="ferr">Full name is required</span>
                    }
                  </div>
                </div>
                <div class="fi">
                  <div class="fi-icon"><span class="material-icons-round">wc</span></div>
                  <div class="fi-content">
                    <label>Gender</label>
                    <select formControlName="gender">
                      <option value="">Select gender</option>
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>
              </div>

              <div class="fg two">
                <div class="fi">
                  <div class="fi-icon"><span class="material-icons-round">cake</span></div>
                  <div class="fi-content">
                    <label>Date of Birth</label>
                    <app-date-picker formControlName="dateOfBirth" />
                  </div>
                </div>
                <div class="fi">
                  <div class="fi-icon"><span class="material-icons-round">call</span></div>
                  <div class="fi-content">
                    <label>Phone Number</label>
                    <input formControlName="phone" placeholder="0300-1234567" />
                  </div>
                </div>
              </div>

              <div class="fg two">
                <div class="fi">
                  <div class="fi-icon"><span class="material-icons-round">credit_card</span></div>
                  <div class="fi-content">
                    <label>CNIC</label>
                    <input formControlName="cnic" placeholder="12345-1234567-1" />
                  </div>
                </div>
                <div class="fi">
                  <div class="fi-icon"><span class="material-icons-round">home</span></div>
                  <div class="fi-content">
                    <label>Home Address</label>
                    <input formControlName="address" placeholder="Street, City, Province" />
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

          <!-- ── Tab 1: Emergency Contact ── -->
          @if (activeTab() === 1) {
            <div class="tab-pane">
              <div class="section-hint">
                <span class="material-icons-round">info</span>
                Provide a reliable emergency contact such as a family member or close friend.
              </div>

              <div class="fg two">
                <div class="fi">
                  <div class="fi-icon"><span class="material-icons-round">person_add</span></div>
                  <div class="fi-content">
                    <label>Contact Name</label>
                    <input formControlName="emergencyContactName" placeholder="Relative or friend name" />
                  </div>
                </div>
                <div class="fi">
                  <div class="fi-icon"><span class="material-icons-round">phone_in_talk</span></div>
                  <div class="fi-content">
                    <label>Contact Phone</label>
                    <input formControlName="emergencyContactPhone" placeholder="0300-1234567" />
                  </div>
                </div>
              </div>

              <!-- Summary preview -->
              <div class="admission-preview">
                <div class="ap-row">
                  <span class="material-icons-round">person</span>
                  <span>{{ previewName() || '—' }}</span>
                </div>
                <div class="ap-divider"></div>
                <div class="ap-row">
                  <span class="material-icons-round">phone</span>
                  <span>{{ f['phone'].value || 'No phone' }}</span>
                </div>
                <div class="ap-divider"></div>
                <div class="ap-row">
                  <span class="material-icons-round">wc</span>
                  <span>{{ f['gender'].value || 'No gender' }}</span>
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

          <!-- ── Tab 2: Job Details ── -->
          @if (activeTab() === 2) {
            <div class="tab-pane">
              <div class="section-hint">
                <span class="material-icons-round">info</span>
                Enter the staff member's position, department and employment details.
              </div>

              <div class="fg two">
                <div class="fi">
                  <div class="fi-icon"><span class="material-icons-round">military_tech</span></div>
                  <div class="fi-content">
                    <label>Designation <span class="req">*</span></label>
                    <input formControlName="designation" placeholder="e.g. Lab Attendant, Peon, Driver" />
                    @if (f['designation'].invalid && f['designation'].touched) {
                      <span class="ferr">Designation is required</span>
                    }
                  </div>
                </div>
                <div class="fi">
                  <div class="fi-icon"><span class="material-icons-round">corporate_fare</span></div>
                  <div class="fi-content">
                    <label>Department</label>
                    <select formControlName="department">
                      <option value="">Select department</option>
                      @for (d of departments; track d) { <option [value]="d">{{ d }}</option> }
                    </select>
                  </div>
                </div>
              </div>

              <div class="fg two">
                <div class="fi">
                  <div class="fi-icon"><span class="material-icons-round">event_available</span></div>
                  <div class="fi-content">
                    <label>Joining Date</label>
                    <app-date-picker formControlName="joiningDate" />
                  </div>
                </div>
                <div class="fi">
                  <div class="fi-icon"><span class="material-icons-round">contract</span></div>
                  <div class="fi-content">
                    <label>Employment Type</label>
                    <select formControlName="employmentType">
                      @for (e of employmentTypes; track e) { <option [value]="e">{{ e }}</option> }
                    </select>
                  </div>
                </div>
              </div>

              <div class="fg two">
                <div class="fi">
                  <div class="fi-icon"><span class="material-icons-round">toggle_on</span></div>
                  <div class="fi-content">
                    <label>Status</label>
                    <select formControlName="status">
                      @for (s of statuses; track s) { <option [value]="s">{{ s }}</option> }
                    </select>
                  </div>
                </div>
              </div>

              @if (isEdit) {
                <div class="docs-section">
                  <label>Documents <span class="opt">(degree certificates, CNIC copy, etc.)</span></label>

                  @if (documents().length > 0) {
                    <div class="docs-list">
                      @for (d of documents(); track d.fileId) {
                        <div class="doc-row">
                          <span class="material-icons-round doc-icon">description</span>
                          <a [href]="d.fileUrl" target="_blank" class="doc-label">{{ d.label }}</a>
                          <button type="button" class="doc-remove" (click)="removeDocument(d)" title="Remove">
                            <span class="material-icons-round">close</span>
                          </button>
                        </div>
                      }
                    </div>
                  }

                  <div class="doc-add">
                    <input [(ngModel)]="newDocLabel" [ngModelOptions]="{standalone: true}"
                           placeholder="Label e.g. Degree Certificate" />
                    <label class="doc-upload-btn" [class.disabled]="!newDocLabel.trim() || addingDoc()">
                      @if (addingDoc()) { <span class="material-icons-round spin">refresh</span> }
                      @else { <span class="material-icons-round">upload_file</span> }
                      Upload
                      <input type="file" (change)="onDocFileSelected($event)" [disabled]="!newDocLabel.trim() || addingDoc()" />
                    </label>
                  </div>
                  @if (docError()) { <span class="ferr">{{ docError() }}</span> }
                </div>
              }

              @if (errorMsg()) {
                <div class="tm-alert error">
                  <span class="material-icons-round">error_outline</span> {{ errorMsg() }}
                </div>
              }

              <div class="tab-nav">
                <button type="button" class="btn-secondary" (click)="activeTab.set(1)">
                  <span class="material-icons-round">arrow_back</span> Back
                </button>
                <button type="submit" class="btn-primary" [disabled]="saving()">
                  @if (saving()) { <span class="material-icons-round spin">refresh</span> Saving… }
                  @else { <span class="material-icons-round">{{ isEdit ? 'save' : 'person_add' }}</span> {{ isEdit ? 'Save Changes' : 'Add Staff' }} }
                </button>
              </div>
            </div>
          }

        </form>
      </div>

    </div>
    }
  `,
  styles: [`
    .success-screen {
      display: flex; align-items: center; justify-content: center;
      min-height: 50vh;
    }
    .success-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 20px; padding: 40px 36px;
      text-align: center; max-width: 400px; width: 100%;
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
    .success-sub { font-size: 13px; color: var(--t4); margin-bottom: 24px; }
    .success-actions { display: flex; gap: 8px; justify-content: center;
      .btn-secondary, .btn-primary { display: inline-flex; align-items: center; gap: 6px;
        .material-icons-round { font-size: 15px; } }
    }

    .admission-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 16px; box-shadow: var(--sh);
      overflow: hidden;
    }

    .adm-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 20px;
      background: linear-gradient(135deg, var(--accent-s) 0%, var(--surface) 100%);
      border-bottom: 1px solid var(--border);
      gap: 12px;
    }
    .adm-header-left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
    .adm-header-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

    .adm-title { font-size: 14px; font-weight: 700; color: var(--t1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
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

    .progress-bar { height: 3px; background: var(--border); }
    .progress-fill { height: 100%; background: var(--accent); transition: width 0.4s cubic-bezier(.22,1,.36,1); }

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

    .fg { display: flex; gap: 10px; margin-bottom: 10px; }
    .fg.two .fi { flex: 1; min-width: 0; }

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
    .ferr { font-size: 10.5px; color: var(--red); font-weight: 600; }

    .admission-preview {
      display: flex; align-items: center; flex-wrap: wrap; gap: 0;
      padding: 10px 14px; border-radius: 10px;
      background: var(--accent-s); border: 1px solid var(--accent-g);
      margin-bottom: 4px;
    }
    .ap-row {
      display: flex; align-items: center; gap: 5px;
      font-size: 12.5px; font-weight: 600; color: var(--accent);
      .material-icons-round { font-size: 14px; }
    }
    .ap-divider { width: 1px; height: 16px; background: var(--accent-g); margin: 0 12px; }

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

    @keyframes spin { to { transform: rotate(360deg); } }
    .spin { animation: spin 0.8s linear infinite; display: inline-block; }

    .docs-section { margin-bottom: 14px; }
    .docs-section > label { display: block; margin-bottom: 8px; }
    .opt { font-weight: 400; color: var(--t5); text-transform: none; letter-spacing: 0; }
    .docs-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
    .doc-row {
      display: flex; align-items: center; gap: 8px;
      padding: 7px 10px; border-radius: 8px;
      background: var(--surface-2); border: 1px solid var(--border);
    }
    .doc-icon { font-size: 15px; color: var(--accent); }
    .doc-label { font-size: 12.5px; font-weight: 600; color: var(--t1); text-decoration: none; flex: 1; }
    .doc-label:hover { text-decoration: underline; }
    .doc-remove {
      width: 22px; height: 22px; border-radius: 6px; border: none;
      background: transparent; color: var(--t4); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      .material-icons-round { font-size: 14px; }
    }
    .doc-remove:hover { background: var(--red-s); color: var(--red); }
    .doc-add { display: flex; gap: 8px; }
    .doc-add input[type="text"], .doc-add input:not([type]) { flex: 1; }
    .doc-upload-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 14px; border-radius: 8px;
      background: var(--accent); color: #fff;
      font-size: 12.5px; font-weight: 700; cursor: pointer; white-space: nowrap;
      .material-icons-round { font-size: 15px; }
    }
    .doc-upload-btn.disabled { opacity: 0.5; cursor: not-allowed; }
    .doc-upload-btn input[type="file"] { display: none; }
  `]
})
export class StaffFormComponent implements OnInit {
  private staffSvc = inject(StaffService);
  private fb       = inject(FormBuilder);
  private route    = inject(ActivatedRoute);
  private auth     = inject(AuthService);
  private fileUploadSvc = inject(FileUploadService);
  router = inject(Router);

  readonly employmentTypes = EMPLOYMENT_TYPES;
  readonly statuses        = STAFF_STATUSES;
  readonly departments     = DEPARTMENTS;
  readonly COLORS = ['#7c3aed','#059669','#0891b2','#d97706','#db2777','#ea580c','#0284c7','#16a34a'];

  isEdit    = false;
  staffId   = 0;
  saving    = signal(false);
  success   = signal(false);
  errorMsg  = signal('');
  activeTab = signal(0);

  instituteName = this.auth.currentUser()?.instituteName ?? null;
  photoFileId = signal<number | null>(null);
  photoUrl    = signal<string | null>(null);

  documents   = signal<StaffDocumentDto[]>([]);
  newDocLabel = '';
  addingDoc   = signal(false);
  docError    = signal('');

  get f() { return this.form.controls; }

  previewName() { return this.f['fullName'].value ?? ''; }
  previewInitials() {
    const n = this.previewName();
    return n ? n.split(' ').filter(Boolean).map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) : '?';
  }
  previewColor() {
    const n = this.previewName() || 'S';
    let h = 0;
    for (const c of n) h = c.charCodeAt(0) + ((h << 5) - h);
    return this.COLORS[Math.abs(h) % this.COLORS.length];
  }
  progressPct() { return ((this.activeTab() + 1) / 3) * 100; }

  next() {
    if (this.activeTab() === 0) {
      this.f['fullName'].markAsTouched();
      if (this.f['fullName'].invalid) return;
    }
    if (this.activeTab() === 2) {
      this.f['designation'].markAsTouched();
      if (this.f['designation'].invalid) return;
    }
    this.activeTab.update(t => t + 1);
  }

  resetForm() {
    this.success.set(false);
    this.errorMsg.set('');
    this.activeTab.set(0);
    this.photoFileId.set(null);
    this.photoUrl.set(null);
    this.form.reset({ employmentType: 'Permanent', status: 'Active' });
  }

  form = this.fb.group({
    fullName:             ['', Validators.required],
    cnic:                 [''],
    gender:               [''],
    dateOfBirth:          [''],
    phone:                [''],
    address:              [''],
    emergencyContactName: [''],
    emergencyContactPhone:[''],
    designation:          ['', Validators.required],
    department:           [''],
    joiningDate:          [''],
    employmentType:       ['Permanent'],
    status:               ['Active']
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit  = true;
      this.staffId = +id;
      this.staffSvc.getById(this.staffId).subscribe({
        next: s => {
          this.form.patchValue({
            fullName:              s.fullName,
            cnic:                  s.cnic ?? '',
            gender:                s.gender ?? '',
            dateOfBirth:           s.dateOfBirth ?? '',
            phone:                 s.phone ?? '',
            address:               s.address ?? '',
            emergencyContactName:  s.emergencyContactName ?? '',
            emergencyContactPhone: s.emergencyContactPhone ?? '',
            designation:           s.designation,
            department:            s.department ?? '',
            joiningDate:           s.joiningDate ?? '',
            employmentType:        s.employmentType,
            status:                s.status
          });
          this.photoFileId.set(s.photoFileId ?? null);
          this.photoUrl.set(s.photoFileId ? `${environment.fileServerUrl}/files/${s.photoFileId}` : null);
          this.loadDocuments();
        },
        error: () => { this.router.navigate(['/hr/staff']); }
      });
    }
  }

  loadDocuments() {
    this.staffSvc.getDocuments(this.staffId).subscribe({ next: docs => this.documents.set(docs) });
  }

  onPhotoUploaded(res: { fileId: number }) {
    this.photoFileId.set(res.fileId);
    if (this.isEdit) {
      // Persist immediately so the photo sticks even if the user navigates away
      // without pressing "Save Changes" further down the wizard.
      const v = this.form.value as any;
      this.staffSvc.update(this.staffId, {
        fullName: v.fullName?.trim() || '', designation: v.designation?.trim() || '',
        cnic: v.cnic?.trim() || undefined, gender: v.gender || undefined,
        dateOfBirth: v.dateOfBirth || undefined, phone: v.phone?.trim() || undefined,
        address: v.address?.trim() || undefined,
        emergencyContactName: v.emergencyContactName?.trim() || undefined,
        emergencyContactPhone: v.emergencyContactPhone?.trim() || undefined,
        department: v.department || undefined, joiningDate: v.joiningDate || undefined,
        employmentType: v.employmentType, status: v.status,
        photoFileId: res.fileId
      }).subscribe();
    }
  }

  onDocFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !this.newDocLabel.trim()) return;

    this.docError.set('');
    this.addingDoc.set(true);
    this.fileUploadSvc.upload(file, 'staff-document', {
      entityId: this.staffId, schoolName: this.instituteName, label: this.newDocLabel.trim()
    }).subscribe({
      next: () => {
        this.addingDoc.set(false);
        this.newDocLabel = '';
        this.loadDocuments();
      },
      error: (e: any) => {
        this.addingDoc.set(false);
        this.docError.set(e?.error?.error ?? 'Upload failed. Please try again.');
      }
    });
  }

  removeDocument(doc: StaffDocumentDto) {
    this.staffSvc.removeDocument(this.staffId, doc.fileId).subscribe({
      next: () => this.documents.update(list => list.filter(d => d.fileId !== doc.fileId))
    });
  }

  submit() {
    this.form.markAllAsTouched();
    if (this.form.invalid) { this.errorMsg.set('Please complete all required fields.'); return; }
    this.saving.set(true);
    this.errorMsg.set('');
    const v = this.form.value as any;
    const dto = {
      fullName:             v.fullName.trim(),
      cnic:                 v.cnic?.trim() || undefined,
      gender:               v.gender || undefined,
      dateOfBirth:          v.dateOfBirth || undefined,
      phone:                v.phone?.trim() || undefined,
      address:              v.address?.trim() || undefined,
      emergencyContactName: v.emergencyContactName?.trim() || undefined,
      emergencyContactPhone:v.emergencyContactPhone?.trim() || undefined,
      designation:          v.designation.trim(),
      department:           v.department || undefined,
      photoFileId:          this.photoFileId() ?? undefined,
      joiningDate:          v.joiningDate || undefined,
      employmentType:       v.employmentType,
      status:               v.status
    };

    const req: import('rxjs').Observable<unknown> = this.isEdit
      ? this.staffSvc.update(this.staffId, dto)
      : this.staffSvc.create(dto);

    req.subscribe({
      next: () => { this.saving.set(false); this.success.set(true); },
      error: (e: any) => { this.saving.set(false); this.errorMsg.set(e?.error?.error ?? 'Failed to save.'); }
    });
  }
}
