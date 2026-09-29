import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../../../core/services/user.service';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';
import { AcademicService } from '../../../core/services/academic.service';
import { SubjectDto } from '../../../core/models/academic.model';
import { SwalNotificationService } from '../../../core/services/swal-notification.service';

@Component({
  selector: 'app-teacher-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePickerComponent],
  template: `

    <div class="admission-card">

      <!-- Header -->
      <div class="adm-header">
        <div class="adm-header-left">
          <div class="adm-avatar" [style.background]="previewColor()">{{ previewInitials() }}</div>
          <div>
            <h2 class="adm-title">
              {{ editId() ? 'Edit Teacher' : 'New Teacher' }}
              <span class="adm-name">{{ previewName() }}</span>
            </h2>
            <p class="adm-sub">Fill in all steps to {{ editId() ? 'update the profile' : 'add a new teacher' }}</p>
          </div>
        </div>
        <div class="adm-header-right">
          <span class="adm-step-badge">Step {{ activeTab() + 1 }}/{{ editId() ? 2 : 3 }}</span>
          <button class="adm-back-btn" (click)="router.navigate(['/teachers'])">
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
          <span class="tab-label">Professional</span>
        </button>
        @if (!editId()) {
          <div class="tab-connector" [class.done]="activeTab() > 1"></div>
          <button class="adm-tab" [class.active]="activeTab() === 2" (click)="activeTab.set(2)">
            <span class="tab-dot">3</span>
            <span class="tab-label">Account</span>
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
                <span>Enter the teacher's personal and demographic information.</span>
              </div>

              <div class="form-grid-2">
                <div class="form-field" [class.has-error]="f['fullName'].invalid && f['fullName'].touched">
                  <label>Full Name <span class="req">*</span></label>
                  <div class="input-wrap">
                    <span class="material-icons-round field-icon">badge</span>
                    <input formControlName="fullName" placeholder="e.g. Muhammad Ahmed Khan" />
                  </div>
                  @if (f['fullName'].invalid && f['fullName'].touched) {
                    <span class="ferr">Full name is required</span>
                  }
                </div>
                <div class="form-field">
                  <label>Gender</label>
                  <div class="input-wrap select-wrap">
                    <span class="material-icons-round field-icon">wc</span>
                    <select formControlName="gender">
                      <option value="">Select gender</option>
                      <option>Male</option>
                      <option>Female</option>
                    </select>
                  </div>
                </div>
              </div>

              <div class="form-grid-2">
                <div class="form-field">
                  <label>Date of Birth</label>
                  <div class="input-wrap date-wrap">
                    <app-date-picker formControlName="dateOfBirth" />
                  </div>
                </div>
                <div class="form-field">
                  <label>Phone Number</label>
                  <div class="input-wrap">
                    <span class="material-icons-round field-icon">call</span>
                    <input formControlName="phone" placeholder="0300-1234567" />
                  </div>
                </div>
              </div>

              <div class="form-grid-2">
                <div class="form-field">
                  <label>CNIC</label>
                  <div class="input-wrap">
                    <span class="material-icons-round field-icon">credit_card</span>
                    <input formControlName="cnic" placeholder="12345-1234567-1" />
                  </div>
                </div>
                <div class="form-field">
                  <label>Home Address</label>
                  <div class="input-wrap">
                    <span class="material-icons-round field-icon">home</span>
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

          <!-- ── Tab 1: Professional ── -->
          @if (activeTab() === 1) {
            <div class="tab-pane">
              <div class="section-hint">
                <span class="material-icons-round">info</span>
                <span>Enter the teacher's professional details and employment info.</span>
              </div>

              <div class="form-grid-2">
                <div class="form-field">
                  <label>Qualification</label>
                  <div class="input-wrap">
                    <span class="material-icons-round field-icon">military_tech</span>
                    <input formControlName="qualification" placeholder="e.g. M.Sc Mathematics" />
                  </div>
                </div>
                <div class="form-field">
                  <label>Subject Specialization</label>
                  <div class="input-wrap select-wrap">
                    <span class="material-icons-round field-icon">auto_stories</span>
                    <select formControlName="specialization">
                      <option value="">Select subject</option>
                      @for (s of subjects(); track s.subjectId) {
                        <option [value]="s.subjectName">{{ s.subjectName }}</option>
                      }
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              <div class="form-grid-2">
                <div class="form-field">
                  <label>Joining Date</label>
                  <div class="input-wrap date-wrap">
                    <app-date-picker formControlName="joiningDate" />
                  </div>
                </div>
                <div class="form-field">
                  <label>Employment Status</label>
                  <div class="input-wrap select-wrap">
                    <span class="material-icons-round field-icon">toggle_on</span>
                    <select formControlName="isActive">
                      <option [ngValue]="true">Active</option>
                      <option [ngValue]="false">Inactive</option>
                    </select>
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
                  <span class="material-icons-round">auto_stories</span>
                  <span>{{ f['specialization'].value || 'No specialization' }}</span>
                </div>
                <div class="ap-divider"></div>
                <div class="ap-row">
                  <span class="material-icons-round">military_tech</span>
                  <span>{{ f['qualification'].value || 'No qualification' }}</span>
                </div>
              </div>

              @if (formError()) {
                <div class="tm-alert error">
                  <span class="material-icons-round">error_outline</span> {{ formError() }}
                </div>
              }

              <div class="tab-nav">
                <button type="button" class="btn-secondary" (click)="activeTab.set(0)">
                  <span class="material-icons-round">arrow_back</span> Back
                </button>
                @if (editId()) {
                  <button type="submit" class="btn-primary" [disabled]="saving()">
                    @if (saving()) { <span class="material-icons-round spin">refresh</span> Saving… }
                    @else { <span class="material-icons-round">save</span> Save Changes }
                  </button>
                } @else {
                  <button type="button" class="btn-primary" (click)="next()">
                    Next <span class="material-icons-round">arrow_forward</span>
                  </button>
                }
              </div>
            </div>
          }

          <!-- ── Tab 2: Account (new only) ── -->
          @if (activeTab() === 2 && !editId()) {
            <div class="tab-pane">
              <div class="section-hint">
                <span class="material-icons-round">info</span>
                <span>These credentials will be used by the teacher to log in to the system.</span>
              </div>

              <div class="form-grid-2">
                <div class="form-field" [class.has-error]="f['email'].invalid && f['email'].touched">
                  <label>Email Address <span class="req">*</span></label>
                  <div class="input-wrap">
                    <span class="material-icons-round field-icon">email</span>
                    <input type="email" formControlName="email" placeholder="teacher@school.edu.pk" />
                  </div>
                  @if (f['email'].invalid && f['email'].touched) {
                    <span class="ferr">Please enter a valid email address</span>
                  }
                </div>
                <div class="form-field" [class.has-error]="f['password'].invalid && f['password'].touched">
                  <label>Password <span class="req">*</span></label>
                  <div class="input-wrap">
                    <span class="material-icons-round field-icon">lock</span>
                    <input type="password" formControlName="password" placeholder="Minimum 6 characters" />
                  </div>
                  @if (f['password'].invalid && f['password'].touched) {
                    <span class="ferr">Password must be at least 6 characters</span>
                  }
                </div>
              </div>

              @if (formError()) {
                <div class="tm-alert error">
                  <span class="material-icons-round">error_outline</span> {{ formError() }}
                </div>
              }

              <div class="tab-nav">
                <button type="button" class="btn-secondary" (click)="activeTab.set(1)">
                  <span class="material-icons-round">arrow_back</span> Back
                </button>
                <button type="submit" class="btn-primary" [disabled]="saving()">
                  @if (saving()) { <span class="material-icons-round spin">refresh</span> Saving… }
                  @else { <span class="material-icons-round">person_add</span> Add Teacher }
                </button>
              </div>
            </div>
          }

        </form>
      </div>

    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }

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
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      transition: background 0.3s;
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
    select {
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
      background-repeat: no-repeat;
      background-position: right 12px center;
      background-size: 14px;
      padding-right: 34px;
    }
    .date-wrap app-date-picker {
      width: 100%;
    }

    input:focus, select:focus, textarea:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: var(--input-shadow-focus);
    }
    .input-wrap:focus-within .field-icon {
      color: var(--accent);
    }

    .form-field.has-error input,
    .form-field.has-error select {
      border-color: var(--red);
      box-shadow: var(--input-shadow-error);
    }
    .form-field.has-error .field-icon {
      color: var(--red);
    }

    .ferr {
      font-size: 11px;
      color: var(--red);
      font-weight: 600;
      margin-top: 2px;
    }

    .admission-preview {
      display: flex; align-items: center; flex-wrap: wrap; gap: 0;
      padding: 12px 16px; border-radius: var(--r-lg, 12px);
      background: var(--accent-s); border: 1.5px solid var(--accent-g);
    }
    .ap-row {
      display: flex; align-items: center; gap: 6px;
      font-size: 13px; font-weight: 600; color: var(--accent);
      .material-icons-round { font-size: 16px; }
    }
    .ap-divider { width: 1px; height: 18px; background: var(--accent-g); margin: 0 14px; }

    .tab-nav {
      display: flex; justify-content: space-between; align-items: center;
      padding-top: 16px; margin-top: 8px;
      border-top: 1px solid var(--border);
    }
    .tab-nav .btn-primary, .tab-nav .btn-secondary {
      height: var(--btn-h, 42px);
      padding: 0 20px;
      border-radius: var(--r-md, 8px);
      font-size: 13.5px;
      font-weight: 600;
      display: inline-flex; align-items: center; gap: 6px;
      cursor: pointer;
      .material-icons-round { font-size: 16px; }
    }

    .tm-alert {
      display: flex; align-items: center; gap: 8px;
      padding: 12px 16px; border-radius: var(--r-md, 8px);
      font-size: 13px; font-weight: 500;
      .material-icons-round { font-size: 18px; flex-shrink: 0; }
    }
    .tm-alert.error { background: var(--red-s); color: var(--red); border: 1.5px solid var(--red-b); }

    @keyframes spin { to { transform: rotate(360deg); } }
    .spin { animation: spin 0.8s linear infinite; display: inline-block; }
  `]
})
export class TeacherFormComponent implements OnInit {
  private fb     = inject(FormBuilder);
  private svc    = inject(UserService);
  private acSvc  = inject(AcademicService);
  private route  = inject(ActivatedRoute);
  private swal   = inject(SwalNotificationService);
  router         = inject(Router);

  subjects   = signal<SubjectDto[]>([]);
  saving     = signal(false);
  formError  = signal('');
  activeTab  = signal(0);
  editId     = signal<number | null>(null);

  readonly COLORS = ['#7c3aed','#059669','#0891b2','#d97706','#db2777','#ea580c','#0284c7','#16a34a'];

  form = this.fb.group({
    fullName:       ['', Validators.required],
    email:          ['', [Validators.email]],
    password:       ['', [Validators.minLength(6)]],
    gender:         [''],
    dateOfBirth:    [null as string | null],
    phone:          [''],
    cnic:           [''],
    address:        [''],
    qualification:  [''],
    specialization: [''],
    joiningDate:    [null as string | null],
    isActive:       [true],
  });

  get f() { return this.form.controls; }

  previewName() { return this.f['fullName'].value ?? ''; }
  previewInitials() {
    const n = this.previewName();
    return n ? n.split(' ').filter(Boolean).map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) : '?';
  }
  previewColor() {
    const n = this.previewName() || 'T';
    let h = 0;
    for (const c of n) h = c.charCodeAt(0) + ((h << 5) - h);
    return this.COLORS[Math.abs(h) % this.COLORS.length];
  }

  progressPct() {
    const total = this.editId() ? 2 : 3;
    return ((this.activeTab() + 1) / total) * 100;
  }

  ngOnInit() {
    this.acSvc.getSubjects().subscribe(s => this.subjects.set(s));

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const numId = +id;
      this.editId.set(numId);
      this.form.get('email')!.clearValidators();
      this.form.get('password')!.clearValidators();
      this.form.get('email')!.updateValueAndValidity();
      this.form.get('password')!.updateValueAndValidity();

      this.svc.getAll().subscribe(users => {
        const t = users.find(u => u.userId === numId);
        if (t) {
          this.form.patchValue({
            fullName:       t.fullName,
            email:          t.email,
            gender:         t.gender ?? '',
            dateOfBirth:    t.dateOfBirth ?? null,
            phone:          t.phone ?? '',
            cnic:           t.cnic ?? '',
            address:        t.address ?? '',
            qualification:  t.qualification ?? '',
            specialization: t.specialization ?? '',
            joiningDate:    t.joiningDate ?? null,
            isActive:       t.isActive,
          });
        }
      });
    } else {
      this.form.get('email')!.setValidators([Validators.required, Validators.email]);
      this.form.get('password')!.setValidators([Validators.required, Validators.minLength(6)]);
      this.form.get('email')!.updateValueAndValidity();
      this.form.get('password')!.updateValueAndValidity();
    }
  }

  next() {
    if (this.activeTab() === 0) {
      this.f['fullName'].markAsTouched();
      if (this.f['fullName'].invalid) return;
    }
    this.activeTab.update(t => t + 1);
  }

  submit() {
    this.form.markAllAsTouched();
    if (this.form.invalid) { this.formError.set('Please complete all required fields.'); return; }
    this.saving.set(true);
    this.formError.set('');

    const v = this.form.value;
    const profile = {
      phone:          v.phone || null,
      cnic:           v.cnic || null,
      gender:         v.gender || null,
      address:        v.address || null,
      qualification:  v.qualification || null,
      specialization: v.specialization || null,
      dateOfBirth:    v.dateOfBirth || null,
      joiningDate:    v.joiningDate || null,
    };

    if (this.editId()) {
      this.svc.update(this.editId()!, { fullName: v.fullName!, roleId: 4, isActive: v.isActive!, ...profile }).subscribe({
        next: () => {
          this.saving.set(false);
          this.swal.successToast('Profile Updated!', `${v.fullName} has been updated successfully.`);
          this.router.navigate(['/teachers']);
        },
        error: (e: any) => { this.saving.set(false); this.formError.set(e?.error?.error ?? 'Failed to update.'); }
      });
    } else {
      this.svc.create({ fullName: v.fullName!, email: v.email!, password: v.password!, roleId: 4, ...profile } as any).subscribe({
        next: () => {
          this.saving.set(false);
          this.swal.successToast('Teacher Added!', `${v.fullName} has been registered in the system.`);
          this.router.navigate(['/teachers']);
        },
        error: (e: any) => { this.saving.set(false); this.formError.set(e?.error?.error ?? 'Failed to add teacher.'); }
      });
    }
  }
}
