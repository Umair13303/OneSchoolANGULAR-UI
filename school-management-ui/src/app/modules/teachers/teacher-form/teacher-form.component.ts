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
                Enter the teacher's personal and demographic information.
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

          <!-- ── Tab 1: Professional ── -->
          @if (activeTab() === 1) {
            <div class="tab-pane">
              <div class="section-hint">
                <span class="material-icons-round">info</span>
                Enter the teacher's professional details and employment info.
              </div>

              <div class="fg two">
                <div class="fi">
                  <div class="fi-icon"><span class="material-icons-round">military_tech</span></div>
                  <div class="fi-content">
                    <label>Qualification</label>
                    <input formControlName="qualification" placeholder="e.g. M.Sc Mathematics" />
                  </div>
                </div>
                <div class="fi">
                  <div class="fi-icon"><span class="material-icons-round">auto_stories</span></div>
                  <div class="fi-content">
                    <label>Subject Specialization</label>
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

              <div class="fg two">
                <div class="fi">
                  <div class="fi-icon"><span class="material-icons-round">event_available</span></div>
                  <div class="fi-content">
                    <label>Joining Date</label>
                    <app-date-picker formControlName="joiningDate" />
                  </div>
                </div>
                <div class="fi">
                  <div class="fi-icon"><span class="material-icons-round">toggle_on</span></div>
                  <div class="fi-content">
                    <label>Employment Status</label>
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
                These credentials will be used by the teacher to log in to the system.
              </div>

              <div class="fg two">
                <div class="fi">
                  <div class="fi-icon"><span class="material-icons-round">email</span></div>
                  <div class="fi-content">
                    <label>Email Address <span class="req">*</span></label>
                    <input type="email" formControlName="email" placeholder="teacher@school.edu.pk" />
                    @if (f['email'].invalid && f['email'].touched) {
                      <span class="ferr">Please enter a valid email address</span>
                    }
                  </div>
                </div>
                <div class="fi">
                  <div class="fi-icon"><span class="material-icons-round">lock</span></div>
                  <div class="fi-content">
                    <label>Password <span class="req">*</span></label>
                    <input type="password" formControlName="password" placeholder="Minimum 6 characters" />
                    @if (f['password'].invalid && f['password'].touched) {
                      <span class="ferr">Password must be at least 6 characters</span>
                    }
                  </div>
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
    }

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

    .adm-avatar {
      width: 40px; height: 40px; border-radius: 11px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 15px; font-weight: 800; color: #fff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      transition: background 0.3s;
    }
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
    textarea { resize: none; }
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
