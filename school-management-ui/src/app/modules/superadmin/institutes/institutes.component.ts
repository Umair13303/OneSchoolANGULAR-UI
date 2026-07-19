import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { InstituteService } from '../../../core/services/institute.service';
import { environment } from '../../../../environments/environment';
import {
  InstituteDto, CampusDto, CampusAdminDto,
  CreateInstituteDto, CreateCampusDto, CreateCampusAdminDto
} from '../../../core/models/institute.model';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';

type View = 'list' | 'new-institute' | 'edit-institute' | 'manage';

@Component({
  selector: 'app-institutes',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, DatePickerComponent],
  template: `

<!-- ══════════════════════ LIST VIEW ══════════════════════ -->
@if (view() === 'list') {
  <div class="page-header">
    <div>
      <h1 class="page-title">Institute Management</h1>
      <p class="page-sub">Manage schools, campuses, module access and admin users</p>
    </div>
    <button class="btn-primary" (click)="startNewInstitute()">
      <span class="material-icons-round">add</span> New Institute
    </button>
  </div>

  <div class="inst-grid">
    @if (institutes().length === 0 && !loading()) {
      <div class="empty-state">
        <span class="material-icons-round">domain</span>
        <p>No institutes yet. Click <strong>New Institute</strong> to add one.</p>
      </div>
    }
    @for (inst of institutes(); track inst.instituteId) {
      <div class="inst-card" [class.inactive]="!inst.isActive">
        <div class="inst-card-header">
          @if (inst.logoUrl) {
            <img [src]="logoSrc(inst.logoUrl)" class="inst-logo" alt="logo"/>
          } @else {
            <div class="inst-avatar" [style.background]="instColor(inst.name)">
              {{ instInitials(inst.name) }}
            </div>
          }
          <div class="inst-meta">
            <h3>{{ inst.name }}</h3>
            @if (inst.address) { <p>{{ inst.address }}</p> }
            <span class="badge" [class.badge-success]="inst.isActive" [class.badge-muted]="!inst.isActive">
              {{ inst.isActive ? 'Active' : 'Inactive' }}
            </span>
            @if (inst.licenseValidUntil) {
              <span class="badge" [class.badge-danger]="isLicenseExpired(inst)" [class.badge-info]="!isLicenseExpired(inst)">
                {{ isLicenseExpired(inst) ? 'License Expired' : 'License till ' + (inst.licenseValidUntil | date:'dd MMM yyyy') }}
              </span>
            } @else {
              <span class="badge badge-info">Unlimited License</span>
            }
          </div>
        </div>
        <div class="inst-stats">
          <span><strong>{{ inst.campusCount }}</strong> Campus(es)</span>
          <span>{{ activeModuleCount(inst) }} / 7 Modules</span>
        </div>
        <div class="module-chips">
          <span class="chip" [class.chip-on]="inst.moduleAttendance">Attendance</span>
          <span class="chip" [class.chip-on]="inst.moduleFees">Fees</span>
          <span class="chip" [class.chip-on]="inst.moduleHomework">Homework</span>
          <span class="chip" [class.chip-on]="inst.moduleExams">Exams</span>
          <span class="chip" [class.chip-on]="inst.moduleTimetable">Timetable</span>
          <span class="chip" [class.chip-on]="inst.moduleHR">HR</span>
          <span class="chip" [class.chip-on]="inst.moduleReports">Reports</span>
        </div>
        <div class="inst-actions">
          <button class="btn-outline btn-sm" (click)="startManage(inst)">
            <span class="material-icons-round">settings</span> Manage
          </button>
          <button class="btn-outline btn-sm" (click)="startEditInstitute(inst)">
            <span class="material-icons-round">edit</span> Edit
          </button>
          <button class="btn-danger btn-sm" (click)="deleteInstitute(inst)">
            <span class="material-icons-round">delete</span>
          </button>
        </div>
      </div>
    }
  </div>
}

<!-- ══════════════════════ NEW / EDIT INSTITUTE WIZARD ══════════════════════ -->
@if (view() === 'new-institute' || view() === 'edit-institute') {
  <div class="admission-card">

    <!-- Header -->
    <div class="adm-header">
      <div class="adm-header-left">
        <div class="adm-avatar" [style.background]="instColor(instForm.get('name')?.value || '')">
          {{ instInitials(instForm.get('name')?.value || '') }}
        </div>
        <div>
          <h2 class="adm-title">
            {{ view() === 'edit-institute' ? 'Edit Institute' : 'New Institute' }}
            <span class="adm-name">{{ instForm.get('name')?.value }}</span>
          </h2>
          <p class="adm-sub">{{ view() === 'edit-institute' ? 'Update institute details' : 'Fill in the steps to register a new school' }}</p>
        </div>
      </div>
      <div class="adm-header-right">
        <span class="adm-step-badge">Step {{ instStep() + 1 }} / {{ view() === 'edit-institute' ? 2 : 3 }}</span>
        <button class="adm-back-btn" (click)="view.set('list')">
          <span class="material-icons-round">close</span>
        </button>
      </div>
    </div>

    <!-- Progress bar -->
    <div class="progress-bar">
      <div class="progress-fill" [style.width.%]="(instStep() + 1) / (view() === 'edit-institute' ? 2 : 3) * 100"></div>
    </div>

    <!-- Stepper -->
    <div class="adm-tabs">
      <button class="adm-tab" [class.active]="instStep() === 0" [class.done]="instStep() > 0" (click)="instStep.set(0)">
        <span class="tab-dot">
          @if (instStep() > 0) { <span class="material-icons-round">check</span> } @else { 1 }
        </span>
        <span class="tab-label">Basic Info</span>
      </button>
      <div class="tab-connector" [class.done]="instStep() > 0"></div>
      <button class="adm-tab" [class.active]="instStep() === 1" [class.done]="instStep() > 1" (click)="instStep.set(1)">
        <span class="tab-dot">
          @if (instStep() > 1) { <span class="material-icons-round">check</span> } @else { 2 }
        </span>
        <span class="tab-label">Modules</span>
      </button>
      @if (view() === 'new-institute') {
        <div class="tab-connector" [class.done]="instStep() > 1"></div>
        <button class="adm-tab" [class.active]="instStep() === 2" (click)="instStep.set(2)">
          <span class="tab-dot">3</span>
          <span class="tab-label">Admin Account</span>
        </button>
      }
    </div>

    <!-- Body -->
    <div class="adm-body">
      <form [formGroup]="instForm" (ngSubmit)="saveInstitute()">

        <!-- Step 0: Basic Info -->
        @if (instStep() === 0) {
          <div class="tab-pane">
            <div class="section-hint">
              <span class="material-icons-round">info</span>
              Enter the school's name, contact details and address.
            </div>

            <div class="fg two">
              <div class="fi">
                <div class="fi-icon"><span class="material-icons-round">domain</span></div>
                <div class="fi-content">
                  <label>Institute Name <span class="req">*</span></label>
                  <input formControlName="name" placeholder="e.g. Bright Future School"/>
                  @if (instForm.get('name')!.invalid && instForm.get('name')!.touched) {
                    <span class="ferr">Name is required</span>
                  }
                </div>
              </div>
              <div class="fi">
                <div class="fi-icon"><span class="material-icons-round">email</span></div>
                <div class="fi-content">
                  <label>Email</label>
                  <input formControlName="email" type="email" placeholder="info@school.com"/>
                </div>
              </div>
            </div>

            <div class="fg two">
              <div class="fi">
                <div class="fi-icon"><span class="material-icons-round">call</span></div>
                <div class="fi-content">
                  <label>Phone</label>
                  <input formControlName="phone" placeholder="+92 300 0000000"/>
                </div>
              </div>
              <div class="fi">
                <div class="fi-icon"><span class="material-icons-round">language</span></div>
                <div class="fi-content">
                  <label>Website</label>
                  <input formControlName="website" placeholder="https://school.com"/>
                </div>
              </div>
            </div>

            <div class="fg two">
              <div class="fi">
                <div class="fi-icon"><span class="material-icons-round">location_on</span></div>
                <div class="fi-content">
                  <label>Address</label>
                  <input formControlName="address" placeholder="Street, City, Country"/>
                </div>
              </div>
              <div class="fi">
                <div class="fi-icon"><span class="material-icons-round">verified_user</span></div>
                <div class="fi-content">
                  <div class="lic-label-row">
                    <label>License Valid Until <span class="req">*</span></label>
                    <label class="lic-unlimited">
                      <input type="checkbox" formControlName="unlimitedLicense"/> Unlimited
                    </label>
                  </div>
                  @if (!instForm.get('unlimitedLicense')!.value) {
                    <app-date-picker formControlName="licenseValidUntil"/>
                    @if (instForm.get('licenseValidUntil')!.invalid && instForm.get('licenseValidUntil')!.touched) {
                      <span class="ferr">Expiry date is required unless the license is unlimited</span>
                    } @else {
                      <span class="fhint">School logins are blocked after this date.</span>
                    }
                  } @else {
                    <input type="text" value="Never expires" disabled/>
                    <span class="fhint">This school's license will never expire.</span>
                  }
                </div>
              </div>
            </div>

            @if (view() === 'edit-institute') {
              <div class="fg two">
                <div class="fi">
                  <div class="fi-icon"><span class="material-icons-round">image</span></div>
                  <div class="fi-content">
                    <label>Logo</label>
                    <input type="file" accept="image/*" (change)="onLogoSelected($event)"/>
                  </div>
                </div>
                <div class="fi" style="align-items:center; padding-top:20px;">
                  <div class="fi-icon"><span class="material-icons-round">toggle_on</span></div>
                  <div class="fi-content">
                    <label class="checkbox-label">
                      <input type="checkbox" formControlName="isActive"/> Active
                    </label>
                  </div>
                </div>
              </div>
            }

            <div class="tab-nav">
              <span></span>
              <button type="button" class="btn-primary" (click)="instNextStep()">
                Next <span class="material-icons-round">arrow_forward</span>
              </button>
            </div>
          </div>
        }

        <!-- Step 1: Modules -->
        @if (instStep() === 1) {
          <div class="tab-pane">
            <div class="section-hint">
              <span class="material-icons-round">info</span>
              Choose which modules this institute can access.
            </div>

            <div class="module-toggles">
              @for (m of moduleList; track m.key) {
                <label class="toggle-row">
                  <div class="toggle-info">
                    <div class="fi-icon"><span class="material-icons-round">{{ m.icon }}</span></div>
                    <div>
                      <strong>{{ m.label }}</strong>
                      <p>{{ m.desc }}</p>
                    </div>
                  </div>
                  <div class="toggle-switch" [class.on]="moduleValues[m.key]" (click)="toggleModule(m.key)">
                    <div class="toggle-knob"></div>
                  </div>
                </label>
              }
            </div>

            @if (formError()) {
              <div class="tm-alert error">
                <span class="material-icons-round">error_outline</span> {{ formError() }}
              </div>
            }

            <div class="tab-nav">
              <button type="button" class="btn-secondary" (click)="instStep.set(0)">
                <span class="material-icons-round">arrow_back</span> Back
              </button>
              @if (view() === 'edit-institute') {
                <button type="submit" class="btn-primary" [disabled]="instForm.invalid || saving()">
                  @if (saving()) { <span class="material-icons-round spin">refresh</span> Saving… }
                  @else { <span class="material-icons-round">save</span> Save Changes }
                </button>
              } @else {
                <button type="button" class="btn-primary" (click)="instStep.set(2)">
                  Next <span class="material-icons-round">arrow_forward</span>
                </button>
              }
            </div>
          </div>
        }

        <!-- Step 2: Admin Account (new only) -->
        @if (instStep() === 2 && view() === 'new-institute') {
          <div class="tab-pane">
            <div class="section-hint">
              <span class="material-icons-round">info</span>
              Create the default admin user for this institute. They will use these credentials to log in.
            </div>

            <div class="fg two">
              <div class="fi">
                <div class="fi-icon"><span class="material-icons-round">badge</span></div>
                <div class="fi-content">
                  <label>Admin Full Name <span class="req">*</span></label>
                  <input [formControl]="adminFullName" placeholder="e.g. Muhammad Tariq"/>
                  @if (adminFullName.invalid && adminFullName.touched) {
                    <span class="ferr">Full name is required</span>
                  }
                </div>
              </div>
              <div class="fi">
                <div class="fi-icon"><span class="material-icons-round">email</span></div>
                <div class="fi-content">
                  <label>Admin Email <span class="req">*</span></label>
                  <input type="email" [formControl]="adminEmail" placeholder="admin@school.com"/>
                  @if (adminEmail.invalid && adminEmail.touched) {
                    <span class="ferr">Valid email is required</span>
                  }
                </div>
              </div>
            </div>

            <div class="fg two">
              <div class="fi">
                <div class="fi-icon"><span class="material-icons-round">lock</span></div>
                <div class="fi-content">
                  <label>Password <span class="req">*</span></label>
                  <input type="password" [formControl]="adminPassword" placeholder="Minimum 6 characters"/>
                  @if (adminPassword.invalid && adminPassword.touched) {
                    <span class="ferr">Minimum 6 characters</span>
                  }
                </div>
              </div>
              <div class="fi">
                <div class="fi-icon"><span class="material-icons-round">person</span></div>
                <div class="fi-content">
                  <label>Preview</label>
                  <div class="admin-preview">
                    <div class="adm-avatar sm" [style.background]="instColor(adminFullName.value || '')">
                      {{ instInitials(adminFullName.value || '') }}
                    </div>
                    <div>
                      <strong>{{ adminFullName.value || 'Admin Name' }}</strong>
                      <p>{{ adminEmail.value || 'email@school.com' }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            @if (formError()) {
              <div class="tm-alert error">
                <span class="material-icons-round">error_outline</span> {{ formError() }}
              </div>
            }

            <div class="tab-nav">
              <button type="button" class="btn-secondary" (click)="instStep.set(1)">
                <span class="material-icons-round">arrow_back</span> Back
              </button>
              <button type="submit" class="btn-primary" [disabled]="instForm.invalid || adminFullName.invalid || adminEmail.invalid || adminPassword.invalid || saving()">
                @if (saving()) { <span class="material-icons-round spin">refresh</span> Creating… }
                @else { <span class="material-icons-round">domain</span> Create Institute }
              </button>
            </div>
          </div>
        }

      </form>
    </div>
  </div>
}

<!-- ══════════════════════ MANAGE VIEW ══════════════════════ -->
@if (view() === 'manage' && selectedInstitute) {
  <div class="admission-card">

    <!-- Header -->
    <div class="adm-header">
      <div class="adm-header-left">
        <div class="adm-avatar" [style.background]="instColor(selectedInstitute.name)">
          {{ instInitials(selectedInstitute.name) }}
        </div>
        <div>
          <h2 class="adm-title">{{ selectedInstitute.name }}</h2>
          <p class="adm-sub">{{ selectedInstitute.campusCount }} campus(es) · {{ activeModuleCount(selectedInstitute) }}/7 modules active</p>
        </div>
      </div>
      <div class="adm-header-right">
        <button class="adm-back-btn" (click)="view.set('list')">
          <span class="material-icons-round">close</span>
        </button>
      </div>
    </div>

    <!-- Tab bar -->
    <div class="adm-tabs flat">
      <button class="adm-tab" [class.active]="manageTab() === 'campuses'" (click)="setManageTab('campuses')">
        <span class="material-icons-round">location_city</span>
        <span class="tab-label">Campuses</span>
      </button>
      <div class="tab-connector"></div>
      <button class="adm-tab" [class.active]="manageTab() === 'modules'" (click)="setManageTab('modules')">
        <span class="material-icons-round">extension</span>
        <span class="tab-label">Module Access</span>
      </button>
      <div class="tab-connector"></div>
      <button class="adm-tab" [class.active]="manageTab() === 'challan'" (click)="setManageTab('challan')">
        <span class="material-icons-round">receipt_long</span>
        <span class="tab-label">Challan Setup</span>
      </button>
    </div>

    <div class="adm-body">

      <!-- ── Campuses Tab ── -->
      @if (manageTab() === 'campuses') {
        <div class="tab-pane">
          <div class="section-hint">
            <span class="material-icons-round">info</span>
            Manage campuses and their admin users for this institute.
          </div>

          <div class="sub-section-header">
            <span class="sub-section-title">Campuses</span>
            <button class="btn-primary btn-sm" (click)="openCampusModal()">
              <span class="material-icons-round">add</span> Add Campus
            </button>
          </div>

          @if (campuses().length > 0) {
            <table class="data-table">
              <thead>
                <tr><th>Name</th><th>Address</th><th>Phone</th><th>Users</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                @for (c of campuses(); track c.campusId) {
                  <tr [class.row-selected]="selectedCampus?.campusId === c.campusId">
                    <td><strong>{{ c.name }}</strong></td>
                    <td>{{ c.address || '—' }}</td>
                    <td>{{ c.phone || '—' }}</td>
                    <td>{{ c.userCount }}</td>
                    <td>
                      <span class="badge" [class.badge-success]="c.isActive" [class.badge-muted]="!c.isActive">
                        {{ c.isActive ? 'Active' : 'Inactive' }}
                      </span>
                    </td>
                    <td class="actions-cell">
                      <button class="btn-outline btn-sm" (click)="manageCampusAdmins(c)">
                        <span class="material-icons-round">people</span> Admins
                      </button>
                      <button class="btn-outline btn-sm" (click)="openCampusModal(c)">
                        <span class="material-icons-round">edit</span>
                      </button>
                      <button class="btn-danger btn-sm" (click)="deleteCampus(c)">
                        <span class="material-icons-round">delete</span>
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          } @else {
            <p class="empty-text">No campuses yet.</p>
          }

          <!-- Campus Admins sub-panel -->
          @if (selectedCampus) {
            <div class="admins-panel">
              <div class="sub-section-header">
                <div>
                  <span class="sub-section-title">Admins</span>
                  <span class="sub-section-sub"> — {{ selectedCampus.name }}</span>
                </div>
                <button class="btn-primary btn-sm" (click)="openAdminModal()">
                  <span class="material-icons-round">person_add</span> Add Admin
                </button>
              </div>
              @if (campusAdmins().length > 0) {
                <table class="data-table">
                  <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead>
                  <tbody>
                    @for (a of campusAdmins(); track a.userId) {
                      <tr>
                        <td>{{ a.fullName }}</td>
                        <td>{{ a.email }}</td>
                        <td><span class="role-badge">{{ a.role }}</span></td>
                        <td>
                          <span class="badge" [class.badge-success]="a.isActive" [class.badge-muted]="!a.isActive">
                            {{ a.isActive ? 'Active' : 'Inactive' }}
                          </span>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              } @else {
                <p class="empty-text">No admins yet.</p>
              }
            </div>
          }
        </div>
      }

      <!-- ── Modules Tab ── -->
      @if (manageTab() === 'modules') {
        <div class="tab-pane">
          <div class="section-hint">
            <span class="material-icons-round">info</span>
            Toggle which modules this institute can access. Changes take effect immediately after saving.
          </div>

          <div class="module-toggles">
            @for (m of moduleList; track m.key) {
              <label class="toggle-row">
                <div class="toggle-info">
                  <div class="fi-icon"><span class="material-icons-round">{{ m.icon }}</span></div>
                  <div>
                    <strong>{{ m.label }}</strong>
                    <p>{{ m.desc }}</p>
                  </div>
                </div>
                <div class="toggle-switch" [class.on]="moduleValues[m.key]" (click)="toggleModule(m.key)">
                  <div class="toggle-knob"></div>
                </div>
              </label>
            }
          </div>

          <div class="tab-nav">
            <span></span>
            <button class="btn-primary" (click)="saveModules()" [disabled]="saving()">
              @if (saving()) { <span class="material-icons-round spin">refresh</span> Saving… }
              @else { <span class="material-icons-round">save</span> Save Module Settings }
            </button>
          </div>
        </div>
      }

      <!-- ── Challan Setup Tab ── -->
      @if (manageTab() === 'challan') {
        <div class="tab-pane">
          <div class="section-hint">
            <span class="material-icons-round">info</span>
            Select the challan print design for this school. School users will see this layout when they print fee challans.
          </div>

          <div class="challan-templates">
            @for (t of challanTemplates; track t.key) {
              <div class="challan-card" [class.selected]="selectedChallanTemplate === t.key" (click)="selectedChallanTemplate = t.key">
                <div class="challan-card-preview">
                  <span class="material-icons-round">{{ t.icon }}</span>
                </div>
                <div class="challan-card-info">
                  <strong>{{ t.label }}</strong>
                  <p>{{ t.desc }}</p>
                </div>
                <div class="challan-radio">
                  <div class="radio-dot" [class.on]="selectedChallanTemplate === t.key"></div>
                </div>
              </div>
            }
          </div>

          <!-- School Stamp -->
          <div class="stamp-section">
            <div class="sub-section-header" style="margin-top:14px">
              <span class="sub-section-title">School Stamp</span>
            </div>
            <p style="font-size:12px;color:var(--t4);margin:0 0 10px">Upload the school's official stamp image. It will appear on fee paid receipts.</p>
            <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
              @if (selectedInstitute?.schoolStampUrl) {
                <img [src]="logoSrc(selectedInstitute!.schoolStampUrl!)" style="height:60px;border:1px solid var(--border);border-radius:8px;padding:4px;background:#fff" />
              }
              <div>
                <input type="file" accept="image/*" (change)="onStampSelected($event)" />
                <p style="font-size:11px;color:var(--t4);margin:4px 0 0">PNG or JPG recommended. Will be resized on the receipt.</p>
              </div>
            </div>
          </div>

          @if (formError()) {
            <div class="tm-alert error">
              <span class="material-icons-round">error_outline</span> {{ formError() }}
            </div>
          }

          <div class="tab-nav">
            <span class="challan-current-hint">
              Current: <strong>{{ challanTemplateLabel(selectedInstitute?.challanTemplate) }}</strong>
            </span>
            <button class="btn-primary" (click)="saveChallanTemplate()" [disabled]="saving()">
              @if (saving()) { <span class="material-icons-round spin">refresh</span> Saving… }
              @else { <span class="material-icons-round">save</span> Save Challan Design }
            </button>
          </div>
        </div>
      }

    </div>
  </div>
}

<!-- ══════════════════════ CAMPUS MODAL ══════════════════════ -->
@if (showCampusModal) {
  <div class="modal-backdrop" (click)="showCampusModal=false"></div>
  <div class="modal">
    <div class="modal-header">
      <div class="adm-header-left">
        <div class="adm-avatar sm" style="background:#7c3aed">
          <span class="material-icons-round" style="font-size:14px;color:#fff">location_city</span>
        </div>
        <h3>{{ editingCampus ? 'Edit Campus' : 'New Campus' }}</h3>
      </div>
      <button class="adm-back-btn" (click)="showCampusModal=false">
        <span class="material-icons-round">close</span>
      </button>
    </div>
    <form [formGroup]="campusForm" (ngSubmit)="saveCampus()" class="modal-body">
      <div class="fg">
        <div class="fi">
          <div class="fi-icon"><span class="material-icons-round">location_city</span></div>
          <div class="fi-content">
            <label>Campus Name <span class="req">*</span></label>
            <input formControlName="name" placeholder="e.g. Main Campus"/>
            @if (campusForm.get('name')!.invalid && campusForm.get('name')!.touched) {
              <span class="ferr">Name is required</span>
            }
          </div>
        </div>
      </div>
      <div class="fg two">
        <div class="fi">
          <div class="fi-icon"><span class="material-icons-round">location_on</span></div>
          <div class="fi-content">
            <label>Address</label>
            <input formControlName="address" placeholder="Campus address"/>
          </div>
        </div>
        <div class="fi">
          <div class="fi-icon"><span class="material-icons-round">call</span></div>
          <div class="fi-content">
            <label>Phone</label>
            <input formControlName="phone" placeholder="+92 300 0000000"/>
          </div>
        </div>
      </div>
      @if (editingCampus) {
        <div class="fg">
          <div class="fi" style="align-items:center; padding-top:12px;">
            <div class="fi-icon"><span class="material-icons-round">toggle_on</span></div>
            <div class="fi-content">
              <label class="checkbox-label">
                <input type="checkbox" formControlName="isActive"/> Active
              </label>
            </div>
          </div>
        </div>
      }
      <div class="modal-footer">
        <button type="button" class="btn-secondary" (click)="showCampusModal=false">Cancel</button>
        <button type="submit" class="btn-primary" [disabled]="campusForm.invalid || saving()">
          @if (saving()) { <span class="material-icons-round spin">refresh</span> Saving… }
          @else { <span class="material-icons-round">{{ editingCampus ? 'save' : 'add_circle' }}</span> {{ editingCampus ? 'Update' : 'Create' }} }
        </button>
      </div>
    </form>
  </div>
}

<!-- ══════════════════════ ADMIN MODAL ══════════════════════ -->
@if (showAdminModal) {
  <div class="modal-backdrop" (click)="showAdminModal=false"></div>
  <div class="modal">
    <div class="modal-header">
      <div class="adm-header-left">
        <div class="adm-avatar sm" style="background:#059669">
          <span class="material-icons-round" style="font-size:14px;color:#fff">person_add</span>
        </div>
        <h3>Create Admin User</h3>
      </div>
      <button class="adm-back-btn" (click)="showAdminModal=false">
        <span class="material-icons-round">close</span>
      </button>
    </div>
    <form [formGroup]="adminForm" (ngSubmit)="saveAdmin()" class="modal-body">
      <div class="fg">
        <div class="fi">
          <div class="fi-icon"><span class="material-icons-round">badge</span></div>
          <div class="fi-content">
            <label>Full Name <span class="req">*</span></label>
            <input formControlName="fullName" placeholder="Admin full name"/>
          </div>
        </div>
      </div>
      <div class="fg two">
        <div class="fi">
          <div class="fi-icon"><span class="material-icons-round">email</span></div>
          <div class="fi-content">
            <label>Email <span class="req">*</span></label>
            <input formControlName="email" type="email" placeholder="admin@school.com"/>
            @if (adminForm.get('email')!.invalid && adminForm.get('email')!.touched) {
              <span class="ferr">Valid email required</span>
            }
          </div>
        </div>
        <div class="fi">
          <div class="fi-icon"><span class="material-icons-round">lock</span></div>
          <div class="fi-content">
            <label>Password <span class="req">*</span></label>
            <input formControlName="password" type="password" placeholder="Min 6 characters"/>
            @if (adminForm.get('password')!.invalid && adminForm.get('password')!.touched) {
              <span class="ferr">Min 6 characters</span>
            }
          </div>
        </div>
      </div>
      @if (formError()) {
        <div class="tm-alert error">
          <span class="material-icons-round">error_outline</span> {{ formError() }}
        </div>
      }
      <div class="modal-footer">
        <button type="button" class="btn-secondary" (click)="showAdminModal=false">Cancel</button>
        <button type="submit" class="btn-primary" [disabled]="adminForm.invalid || saving()">
          @if (saving()) { <span class="material-icons-round spin">refresh</span> Creating… }
          @else { <span class="material-icons-round">person_add</span> Create Admin }
        </button>
      </div>
    </form>
  </div>
}
  `,
  styles: [`
    /* ── Page header ── */
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .page-title { font-size: 22px; font-weight: 700; color: var(--t1); }
    .page-sub { font-size: 13px; color: var(--t4); margin-top: 2px; }

    /* ── Institute cards ── */
    .inst-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
    .inst-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg); padding: 18px; transition: box-shadow .2s, border-color .2s; box-shadow: var(--sh); }
    .inst-card:hover { border-color: var(--accent); box-shadow: 0 4px 20px rgba(var(--accent-rgb),.1); }
    .inst-card.inactive { opacity: .55; }
    .inst-card-header { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 12px; }
    .inst-logo { width: 48px; height: 48px; border-radius: 10px; object-fit: contain; border: 1px solid var(--border); flex-shrink: 0; }
    .inst-avatar { width: 48px; height: 48px; border-radius: 11px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 800; color: #fff; box-shadow: 0 2px 8px rgba(0,0,0,.15); }
    .inst-meta h3 { font-size: 15px; font-weight: 700; color: var(--t1); margin: 0 0 2px; }
    .inst-meta p { font-size: 12px; color: var(--t4); margin: 0 0 6px; }
    .inst-stats { display: flex; gap: 14px; font-size: 12px; color: var(--t3); margin-bottom: 10px; }
    .inst-stats strong { color: var(--t1); }
    .module-chips { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 14px; }
    .chip { font-size: 10px; padding: 2px 8px; border-radius: 20px; background: var(--surface-3); color: var(--t4); font-weight: 600; }
    .chip.chip-on { background: var(--accent-s); color: var(--accent); }
    .inst-actions { display: flex; gap: 6px; flex-wrap: wrap; }
    .empty-state { grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--t5); }
    .empty-state .material-icons-round { font-size: 48px; display: block; margin-bottom: 12px; color: var(--border-2); }

    /* ── Admission card (teacher-form pattern) ── */
    .admission-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; box-shadow: var(--sh); overflow: hidden; }

    .adm-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; background: linear-gradient(135deg, var(--accent-s) 0%, var(--surface) 100%); border-bottom: 1px solid var(--border); gap: 12px; }
    .adm-header-left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
    .adm-header-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .adm-avatar { width: 40px; height: 40px; border-radius: 11px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800; color: #fff; box-shadow: 0 2px 8px rgba(0,0,0,.15); transition: background .3s; }
    .adm-avatar.sm { width: 32px; height: 32px; border-radius: 8px; font-size: 12px; }
    .adm-title { font-size: 14px; font-weight: 700; color: var(--t1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .adm-name { color: var(--accent); margin-left: 4px; }
    .adm-sub { font-size: 11.5px; color: var(--t4); margin-top: 1px; }
    .adm-step-badge { padding: 4px 12px; border-radius: 99px; background: var(--accent); color: #fff; font-size: 11.5px; font-weight: 700; white-space: nowrap; }
    .adm-back-btn { width: 30px; height: 30px; border-radius: 8px; border: 1px solid var(--border-2); background: var(--surface); color: var(--t3); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all .15s; }
    .adm-back-btn .material-icons-round { font-size: 16px; }
    .adm-back-btn:hover { background: var(--red-s); border-color: var(--red); color: var(--red); }

    .progress-bar { height: 3px; background: var(--border); }
    .progress-fill { height: 100%; background: var(--accent); transition: width .4s cubic-bezier(.22,1,.36,1); }

    .adm-tabs { display: flex; align-items: center; padding: 10px 20px; background: var(--surface-2); border-bottom: 1px solid var(--border); overflow-x: auto; }
    .adm-tabs.flat { padding: 0 20px; background: var(--surface); }
    .adm-tab { display: flex; align-items: center; gap: 6px; background: none; border: none; cursor: pointer; padding: 10px 0; white-space: nowrap; }
    .adm-tabs.flat .adm-tab { padding: 12px 4px; border-bottom: 2px solid transparent; margin-bottom: -1px; }
    .adm-tabs.flat .adm-tab.active { border-bottom-color: var(--accent); }
    .tab-dot { width: 24px; height: 24px; border-radius: 50%; border: 2px solid var(--border-2); background: var(--surface); color: var(--t4); font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; transition: all .2s; flex-shrink: 0; }
    .tab-dot .material-icons-round { font-size: 12px; }
    .tab-label { font-size: 12.5px; font-weight: 600; color: var(--t4); transition: color .2s; }
    .adm-tab.active .tab-dot { background: var(--accent); border-color: var(--accent); color: #fff; box-shadow: 0 0 0 3px var(--accent-g); }
    .adm-tab.active .tab-label { color: var(--accent); }
    .adm-tab.done .tab-dot { background: var(--green); border-color: var(--green); color: #fff; }
    .adm-tab.done .tab-label { color: var(--green); }
    .adm-tabs.flat .adm-tab .material-icons-round { font-size: 16px; color: var(--t4); }
    .adm-tabs.flat .adm-tab.active .material-icons-round { color: var(--accent); }
    .tab-connector { flex: 1; height: 2px; background: var(--border); min-width: 16px; margin: 0 5px; border-radius: 2px; transition: background .3s; }
    .tab-connector.done { background: var(--green); }

    .adm-body { padding: 0; }
    .tab-pane { padding: 16px 20px; display: flex; flex-direction: column; }

    /* ── Section hint ── */
    .section-hint { display: flex; align-items: center; gap: 7px; padding: 8px 12px; border-radius: 8px; background: var(--surface-2); border: 1px solid var(--border); font-size: 12px; color: var(--t3); font-weight: 500; margin-bottom: 14px; }
    .section-hint .material-icons-round { font-size: 14px; color: var(--accent); flex-shrink: 0; }

    /* ── Field groups (teacher-form pattern) ── */
    .fg { display: flex; gap: 10px; margin-bottom: 10px; }
    .fg.two .fi { flex: 1; min-width: 0; }
    .fi { display: flex; align-items: flex-start; gap: 8px; flex: 1; }
    .fi-icon { width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0; margin-top: 20px; background: var(--accent-s); display: flex; align-items: center; justify-content: center; }
    .fi-icon .material-icons-round { font-size: 14px; color: var(--accent); font-variation-settings: 'FILL' 1; }
    .fi-content { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }
    label { font-size: 10.5px; font-weight: 700; color: var(--t3); letter-spacing: .4px; text-transform: uppercase; }
    .req { color: var(--red); }
    input, select { width: 100%; padding: 8px 11px; border: 1.5px solid var(--border); border-radius: 8px; font-size: 13px; font-family: inherit; background: var(--surface); color: var(--t1); transition: border-color .15s, box-shadow .15s; box-sizing: border-box; }
    input:focus, select:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-g); }
    input::placeholder { color: var(--t5); }
    input[type=checkbox] { width: auto; }
    input[type=file] { padding: 6px 10px; font-size: 12px; }
    .ferr { font-size: 10.5px; color: var(--red); font-weight: 600; }
    .checkbox-label { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 500; color: var(--t2); cursor: pointer; text-transform: none; letter-spacing: 0; }
    .lic-label-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .lic-unlimited { display: flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 700; color: var(--t3); cursor: pointer; letter-spacing: .4px; text-transform: uppercase; }
    .lic-unlimited input[type=checkbox] { margin: 0; accent-color: var(--accent); }
    input:disabled { background: var(--surface-2); color: var(--t3); cursor: not-allowed; }

    /* ── Module toggles ── */
    .module-toggles { display: flex; flex-direction: column; gap: 8px; margin-bottom: 4px; }
    .toggle-row { display: flex; justify-content: space-between; align-items: center; padding: 11px 14px; border: 1px solid var(--border); border-radius: var(--r); background: var(--surface); cursor: pointer; }
    .toggle-row:hover { border-color: var(--border-2); background: var(--surface-2); }
    .toggle-info { display: flex; gap: 10px; align-items: center; }
    .toggle-info strong { font-size: 13px; font-weight: 600; color: var(--t1); display: block; }
    .toggle-info p { font-size: 11.5px; color: var(--t4); margin: 1px 0 0; }
    .toggle-switch { width: 42px; height: 23px; border-radius: 12px; background: var(--border-2); position: relative; cursor: pointer; transition: background .2s; flex-shrink: 0; }
    .toggle-switch.on { background: var(--accent); }
    .toggle-knob { position: absolute; top: 3px; left: 3px; width: 17px; height: 17px; border-radius: 50%; background: #fff; transition: left .2s; box-shadow: 0 1px 4px rgba(0,0,0,.25); }
    .toggle-switch.on .toggle-knob { left: 22px; }

    /* ── Manage panel sub-elements ── */
    .sub-section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .sub-section-title { font-size: 13px; font-weight: 700; color: var(--t1); }
    .sub-section-sub { font-size: 13px; color: var(--t4); }
    .data-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 6px; }
    .data-table th { background: var(--surface-2); padding: 8px 12px; text-align: left; font-weight: 700; color: var(--t4); font-size: 10.5px; text-transform: uppercase; letter-spacing: .5px; border-bottom: 1px solid var(--border); }
    .data-table td { padding: 9px 12px; border-bottom: 1px solid var(--border); color: var(--t2); }
    .data-table tr:last-child td { border-bottom: none; }
    .data-table tr:hover td { background: var(--surface-2); }
    .data-table tr.row-selected td { background: var(--accent-s); }
    .actions-cell { display: flex; gap: 5px; }
    .empty-text { padding: 18px; text-align: center; color: var(--t5); font-size: 13px; }
    .admins-panel { border-top: 1px solid var(--border); margin-top: 12px; padding-top: 12px; }

    /* ── Tab nav footer ── */
    .tab-nav { display: flex; justify-content: space-between; align-items: center; padding-top: 14px; margin-top: 6px; border-top: 1px solid var(--border); }
    .tab-nav .btn-primary, .tab-nav .btn-secondary { display: inline-flex; align-items: center; gap: 6px; }
    .tab-nav .btn-primary .material-icons-round, .tab-nav .btn-secondary .material-icons-round { font-size: 15px; }

    /* ── Alert ── */
    .tm-alert { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 8px; font-size: 12.5px; font-weight: 500; margin-bottom: 10px; }
    .tm-alert .material-icons-round { font-size: 16px; flex-shrink: 0; }
    .tm-alert.error { background: var(--red-s); color: var(--red); border: 1px solid var(--red-b); }

    /* ── Badges ── */
    .badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 20px; }
    .badge-success { background: #dcfce7; color: #166534; }
    .badge-muted { background: var(--surface-3); color: var(--t4); }
    .badge-danger { background: #fee2e2; color: #991b1b; margin-left: 4px; }
    .badge-info { background: #dbeafe; color: #1e40af; margin-left: 4px; }
    .fhint { font-size: 10.5px; color: var(--t4); margin-top: 2px; }
    .role-badge { font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 4px; background: var(--accent-s); color: var(--accent); }

    /* ── Buttons ── */
    .btn-primary { display: inline-flex; align-items: center; gap: 5px; padding: 9px 18px; background: var(--accent); color: #fff; border: none; border-radius: var(--r); font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all .15s; box-shadow: 0 1px 4px rgba(var(--accent-rgb),.35); }
    .btn-primary:hover:not(:disabled) { background: var(--accent-h); box-shadow: 0 4px 14px rgba(var(--accent-rgb),.4); }
    .btn-primary:disabled { opacity: .5; cursor: not-allowed; }
    .btn-primary .material-icons-round { font-size: 15px; }
    .btn-secondary { display: inline-flex; align-items: center; gap: 5px; padding: 9px 18px; background: var(--surface); color: var(--t2); border: 1px solid var(--border-2); border-radius: var(--r); font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all .15s; }
    .btn-secondary:hover { background: var(--surface-2); }
    .btn-secondary .material-icons-round { font-size: 15px; }
    .btn-outline { display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; background: var(--surface); color: var(--t2); border: 1px solid var(--border-2); border-radius: var(--r); font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all .15s; }
    .btn-outline:hover { background: var(--surface-2); color: var(--t1); }
    .btn-outline .material-icons-round { font-size: 13px; }
    .btn-danger { display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px; background: var(--surface); color: #dc2626; border: 1px solid #fca5a5; border-radius: var(--r); font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all .15s; }
    .btn-danger:hover { background: #fef2f2; }
    .btn-danger .material-icons-round { font-size: 13px; }
    .btn-sm { padding: 5px 10px; font-size: 12px; }

    /* ── Modal ── */
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 100; }
    .modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%); background: var(--surface); border: 1px solid var(--border); border-radius: 16px; width: 540px; max-width: 95vw; max-height: 90vh; overflow-y: auto; z-index: 101; box-shadow: 0 20px 60px rgba(0,0,0,.25); overflow: hidden; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; background: linear-gradient(135deg, var(--accent-s) 0%, var(--surface) 100%); border-bottom: 1px solid var(--border); }
    .modal-header h3 { font-size: 14px; font-weight: 700; color: var(--t1); margin: 0; }
    .modal-body { padding: 16px 20px; max-height: 75vh; overflow-y: auto; }
    .modal-footer { display: flex; gap: 10px; justify-content: flex-end; padding-top: 14px; border-top: 1px solid var(--border); margin-top: 4px; }

    .admin-preview { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; background: var(--accent-s); border: 1px solid var(--accent-g); margin-top: 2px; }
    .admin-preview strong { font-size: 12.5px; font-weight: 600; color: var(--accent); display: block; }
    .admin-preview p { font-size: 11px; color: var(--t4); margin: 1px 0 0; }

    /* ── Challan template selector ── */
    .challan-templates { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }
    .challan-card { display: flex; align-items: center; gap: 14px; padding: 14px 16px; border: 2px solid var(--border); border-radius: var(--r-lg); background: var(--surface); cursor: pointer; transition: border-color .2s, background .2s; }
    .challan-card:hover { border-color: var(--border-2); background: var(--surface-2); }
    .challan-card.selected { border-color: var(--accent); background: var(--accent-s); }
    .challan-card-preview { width: 44px; height: 44px; border-radius: 10px; background: var(--surface-2); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .challan-card.selected .challan-card-preview { background: var(--accent-s); border-color: var(--accent-g); }
    .challan-card-preview .material-icons-round { font-size: 22px; color: var(--t4); }
    .challan-card.selected .challan-card-preview .material-icons-round { color: var(--accent); }
    .challan-card-info { flex: 1; }
    .challan-card-info strong { font-size: 13.5px; font-weight: 700; color: var(--t1); display: block; margin-bottom: 2px; }
    .challan-card-info p { font-size: 12px; color: var(--t4); margin: 0; }
    .challan-radio { flex-shrink: 0; }
    .radio-dot { width: 18px; height: 18px; border-radius: 50%; border: 2px solid var(--border-2); background: var(--surface); transition: all .2s; }
    .radio-dot.on { border-color: var(--accent); background: var(--accent); box-shadow: 0 0 0 3px var(--accent-g); }
    .challan-current-hint { font-size: 12px; color: var(--t4); }
    .challan-current-hint strong { color: var(--t2); }

    @keyframes spin { to { transform: rotate(360deg); } }
    .spin { animation: spin .8s linear infinite; display: inline-block; }
  `]
})
export class InstitutesComponent implements OnInit {
  private svc = inject(InstituteService);
  private fb  = inject(FormBuilder);

  institutes   = signal<InstituteDto[]>([]);
  campuses     = signal<CampusDto[]>([]);
  campusAdmins = signal<CampusAdminDto[]>([]);
  loading      = signal(false);
  saving       = signal(false);
  formError    = signal('');

  view          = signal<View>('list');
  instStep      = signal(0);
  manageTab     = signal<'campuses' | 'modules' | 'challan'>('campuses');

  selectedInstitute: InstituteDto | null = null;
  selectedCampus:    CampusDto    | null = null;
  editingInstitute:  InstituteDto | null = null;
  editingCampus:     CampusDto    | null = null;

  showCampusModal = false;
  showAdminModal  = false;

  moduleValues: Record<string, boolean> = {};
  logoFile: File | null = null;
  stampFile: File | null = null;
  selectedChallanTemplate = 'cash_memo';

  readonly challanTemplates = [
    { key: 'cash_memo',   label: 'Cash Memo',        icon: 'receipt',      desc: 'Single-copy cash memo style — compact, minimal layout' },
    { key: 'bank_3copy',  label: 'Bank 3-Copy',       icon: 'receipt_long', desc: 'Three tear-off copies: Bank / School / Student' },
    { key: 'detailed',    label: 'Detailed Challan',  icon: 'description',  desc: 'Full breakdown with fee heads, due dates and remarks' },
  ];

  readonly COLORS = ['#7c3aed','#059669','#0891b2','#d97706','#db2777','#ea580c','#0284c7','#16a34a'];

  moduleList = [
    { key: 'moduleAttendance', label: 'Attendance',  icon: 'how_to_reg',  desc: 'Mark and view student attendance' },
    { key: 'moduleFees',       label: 'Fees',        icon: 'payments',    desc: 'Fee structure, student fees and challan' },
    { key: 'moduleHomework',   label: 'Homework',    icon: 'assignment',  desc: 'Assign and track homework submissions' },
    { key: 'moduleExams',      label: 'Exams',       icon: 'quiz',        desc: 'Exam papers, schedule and result cards' },
    { key: 'moduleTimetable',  label: 'Timetable',   icon: 'schedule',    desc: 'Class timetable builder and view' },
    { key: 'moduleHR',         label: 'HR',          icon: 'badge',       desc: 'Teaching and non-teaching staff management' },
    { key: 'moduleReports',    label: 'Reports',     icon: 'bar_chart',   desc: 'Attendance, fee and academic reports' },
  ];

  instForm!: FormGroup;
  campusForm!: FormGroup;
  adminForm!: FormGroup;

  // Standalone controls for step-3 admin creation (new institute only)
  adminFullName = new FormControl('', Validators.required);
  adminEmail    = new FormControl('', [Validators.required, Validators.email]);
  adminPassword = new FormControl('', [Validators.required, Validators.minLength(6)]);

  ngOnInit() {
    this.instForm = this.fb.group({
      name: ['', Validators.required],
      address: [''], phone: [''], email: [''], website: [''], isActive: [true],
      unlimitedLicense: [false],
      licenseValidUntil: ['', Validators.required]
    });
    // Unlimited license = no expiry date; otherwise a date is mandatory
    this.instForm.get('unlimitedLicense')!.valueChanges.subscribe(unlimited => {
      const ctrl = this.instForm.get('licenseValidUntil')!;
      if (unlimited) {
        ctrl.clearValidators();
        ctrl.setValue('', { emitEvent: false });
      } else {
        ctrl.setValidators(Validators.required);
      }
      ctrl.updateValueAndValidity({ emitEvent: false });
    });
    this.campusForm = this.fb.group({
      name: ['', Validators.required],
      address: [''], phone: [''], isActive: [true]
    });
    this.adminForm = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
    this.loadInstitutes();
  }

  logoSrc(url: string | null | undefined): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return environment.serverUrl + url;
  }

  instColor(name: string) {
    if (!name) return this.COLORS[0];
    let h = 0;
    for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h);
    return this.COLORS[Math.abs(h) % this.COLORS.length];
  }

  isLicenseExpired(inst: InstituteDto): boolean {
    if (!inst.licenseValidUntil) return false;
    const expiry = new Date(inst.licenseValidUntil.slice(0, 10) + 'T23:59:59');
    return expiry.getTime() < Date.now();
  }

  instInitials(name: string) {
    if (!name) return '?';
    return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  loadInstitutes() {
    this.loading.set(true);
    this.svc.getInstitutes().subscribe({
      next: d => { this.institutes.set(d); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  startNewInstitute() {
    this.editingInstitute = null;
    this.instForm.reset({ isActive: true, unlimitedLicense: false, licenseValidUntil: '' });
    this.initModuleValues(null);
    this.adminFullName.reset('');
    this.adminEmail.reset('');
    this.adminPassword.reset('');
    this.formError.set('');
    this.instStep.set(0);
    this.view.set('new-institute');
  }

  startEditInstitute(inst: InstituteDto) {
    this.editingInstitute = inst;
    this.instForm.reset({ name: inst.name, address: inst.address ?? '', phone: inst.phone ?? '', email: inst.email ?? '', website: inst.website ?? '', isActive: inst.isActive, unlimitedLicense: !inst.licenseValidUntil, licenseValidUntil: inst.licenseValidUntil ? inst.licenseValidUntil.slice(0, 10) : '' });
    this.initModuleValues(inst);
    this.instStep.set(0);
    this.view.set('edit-institute');
  }

  initModuleValues(inst: InstituteDto | null) {
    this.moduleValues = {
      moduleAttendance: inst?.moduleAttendance ?? true,
      moduleFees:       inst?.moduleFees       ?? true,
      moduleHomework:   inst?.moduleHomework   ?? true,
      moduleExams:      inst?.moduleExams      ?? true,
      moduleTimetable:  inst?.moduleTimetable  ?? true,
      moduleHR:         inst?.moduleHR         ?? true,
      moduleReports:    inst?.moduleReports    ?? true,
    };
  }

  instNextStep() {
    this.instForm.get('name')!.markAsTouched();
    this.instForm.get('licenseValidUntil')!.markAsTouched();
    if (this.instForm.get('name')!.invalid || this.instForm.get('licenseValidUntil')!.invalid) return;
    this.instStep.set(1);
  }

  saveInstitute() {
    if (this.instForm.invalid) { this.formError.set('Please fill in required fields.'); return; }
    this.saving.set(true);
    this.formError.set('');
    const dto = { ...this.instForm.value, ...this.moduleValues };
    dto.licenseValidUntil = dto.unlimitedLicense ? null : dto.licenseValidUntil || null;
    delete dto.unlimitedLicense;

    if (this.editingInstitute) {
      this.svc.updateInstitute(this.editingInstitute.instituteId, dto).subscribe({
        next: () => { this.saving.set(false); this.loadInstitutes(); this.view.set('list'); },
        error: (e: any) => { this.saving.set(false); this.formError.set(e?.error?.error ?? 'Failed to save.'); }
      });
    } else {
      // Step 1: create institute → Step 2: auto-create Main Campus → Step 3: create admin linked to campus
      this.svc.createInstitute(dto).subscribe({
        next: (res: any) => {
          const instituteId = res.instituteId;
          const mainCampus = {
            name:    'Main Campus',
            address: this.instForm.value.address || null,
            phone:   this.instForm.value.phone   || null,
          };
          this.svc.createCampus(instituteId, mainCampus).subscribe({
            next: (campusRes: any) => {
              this.svc.createInstituteAdmin(instituteId, {
                fullName: this.adminFullName.value!,
                email:    this.adminEmail.value!,
                password: this.adminPassword.value!,
                campusId: campusRes.campusId,
              }).subscribe({
                next: () => { this.saving.set(false); this.loadInstitutes(); this.view.set('list'); },
                error: (e: any) => {
                  this.saving.set(false);
                  this.loadInstitutes();
                  this.view.set('list');
                  this.formError.set(e?.error?.error ?? 'Institute created but admin creation failed.');
                }
              });
            },
            error: () => {
              // Campus creation failed — still create admin without campus
              this.svc.createInstituteAdmin(instituteId, {
                fullName: this.adminFullName.value!,
                email:    this.adminEmail.value!,
                password: this.adminPassword.value!,
              }).subscribe({
                next: () => { this.saving.set(false); this.loadInstitutes(); this.view.set('list'); },
                error: (e: any) => { this.saving.set(false); this.loadInstitutes(); this.view.set('list'); }
              });
            }
          });
        },
        error: (e: any) => { this.saving.set(false); this.formError.set(e?.error?.error ?? 'Failed to create institute.'); }
      });
    }
  }

  deleteInstitute(inst: InstituteDto) {
    if (!confirm(`Delete "${inst.name}"?`)) return;
    this.svc.deleteInstitute(inst.instituteId).subscribe(() => this.loadInstitutes());
  }

  startManage(inst: InstituteDto) {
    this.selectedInstitute = inst;
    this.selectedCampus = null;
    this.manageTab.set('campuses');
    this.loadCampuses(inst.instituteId);
    this.loadModuleValues(inst);
    this.selectedChallanTemplate = inst.challanTemplate ?? 'cash_memo';
    this.view.set('manage');
  }

  loadCampuses(instId: number) {
    this.svc.getCampuses(instId).subscribe(d => this.campuses.set(d));
  }

  loadModuleValues(inst: InstituteDto) {
    this.moduleValues = {
      moduleAttendance: inst.moduleAttendance,
      moduleFees:       inst.moduleFees,
      moduleHomework:   inst.moduleHomework,
      moduleExams:      inst.moduleExams,
      moduleTimetable:  inst.moduleTimetable,
      moduleHR:         inst.moduleHR,
      moduleReports:    inst.moduleReports,
    };
  }

  setManageTab(tab: 'campuses' | 'modules' | 'challan') { this.manageTab.set(tab); this.selectedCampus = null; }

  toggleModule(key: string) { this.moduleValues[key] = !this.moduleValues[key]; }

  saveModules() {
    if (!this.selectedInstitute) return;
    this.saving.set(true);
    this.svc.updateModules(this.selectedInstitute.instituteId, this.moduleValues).subscribe({
      next: () => { this.saving.set(false); this.loadInstitutes(); },
      error: () => this.saving.set(false)
    });
  }

  openCampusModal(c?: CampusDto) {
    this.editingCampus = c ?? null;
    this.campusForm.reset({ name: c?.name ?? '', address: c?.address ?? '', phone: c?.phone ?? '', isActive: c?.isActive ?? true });
    this.showCampusModal = true;
  }

  saveCampus() {
    if (!this.selectedInstitute || this.campusForm.invalid) return;
    this.saving.set(true);
    const dto = this.campusForm.value;
    const req = this.editingCampus
      ? this.svc.updateCampus(this.selectedInstitute.instituteId, this.editingCampus.campusId, dto)
      : this.svc.createCampus(this.selectedInstitute.instituteId, dto);
    req.subscribe({
      next: () => { this.showCampusModal = false; this.saving.set(false); this.loadCampuses(this.selectedInstitute!.instituteId); },
      error: () => this.saving.set(false)
    });
  }

  deleteCampus(c: CampusDto) {
    if (!this.selectedInstitute || !confirm(`Delete campus "${c.name}"?`)) return;
    this.svc.deleteCampus(this.selectedInstitute.instituteId, c.campusId).subscribe(() => this.loadCampuses(this.selectedInstitute!.instituteId));
  }

  manageCampusAdmins(c: CampusDto) {
    this.selectedCampus = c;
    if (!this.selectedInstitute) return;
    this.svc.getCampusAdmins(this.selectedInstitute.instituteId, c.campusId).subscribe(d => this.campusAdmins.set(d));
  }

  openAdminModal() { this.adminForm.reset(); this.formError.set(''); this.showAdminModal = true; }

  saveAdmin() {
    if (!this.selectedInstitute || !this.selectedCampus || this.adminForm.invalid) return;
    this.saving.set(true);
    this.svc.createCampusAdmin(this.selectedInstitute.instituteId, this.selectedCampus.campusId, this.adminForm.value).subscribe({
      next: () => { this.showAdminModal = false; this.saving.set(false); this.manageCampusAdmins(this.selectedCampus!); },
      error: (e: any) => { this.saving.set(false); this.formError.set(e?.error ?? 'Failed to create admin.'); }
    });
  }

  saveChallanTemplate() {
    if (!this.selectedInstitute) return;
    this.saving.set(true);
    this.svc.updateChallanTemplate(this.selectedInstitute.instituteId, this.selectedChallanTemplate).subscribe({
      next: () => {
        this.saving.set(false);
        this.selectedInstitute!.challanTemplate = this.selectedChallanTemplate;
        this.loadInstitutes();
      },
      error: () => this.saving.set(false)
    });
  }

  challanTemplateLabel(key?: string): string {
    return this.challanTemplates.find(t => t.key === (key ?? 'cash_memo'))?.label ?? 'Cash Memo';
  }

  onLogoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      this.logoFile = input.files[0];
      if (this.editingInstitute) {
        this.svc.uploadLogo(this.editingInstitute.instituteId, this.logoFile).subscribe(() => this.loadInstitutes());
      }
    }
  }

  onStampSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.[0] || !this.selectedInstitute) return;
    this.stampFile = input.files[0];
    this.svc.uploadStamp(this.selectedInstitute.instituteId, this.stampFile).subscribe({
      next: res => {
        this.selectedInstitute!.schoolStampUrl = res.schoolStampUrl;
        this.loadInstitutes();
      }
    });
  }

  activeModuleCount(inst: InstituteDto): number {
    return [inst.moduleAttendance, inst.moduleFees, inst.moduleHomework, inst.moduleExams, inst.moduleTimetable, inst.moduleHR, inst.moduleReports].filter(Boolean).length;
  }
}
