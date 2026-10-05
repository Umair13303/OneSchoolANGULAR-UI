import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { UserService } from '../../../core/services/user.service';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { AcademicService } from '../../../core/services/academic.service';
import { SubjectDto, ClassDto, ClassSubjectDto } from '../../../core/models/academic.model';
import { SwalNotificationService } from '../../../core/services/swal-notification.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-teacher-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePickerComponent, LoadingComponent],
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
            <p class="adm-sub">Fill in all steps to {{ editId() ? 'update the profile' : 'add a new teacher' }} — including class &amp; subject assignments</p>
          </div>
        </div>
        <div class="adm-header-right">
          <span class="adm-step-badge">Step {{ activeTab() + 1 }}/{{ totalSteps() }}</span>
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
        } @else {
          <div class="tab-connector" [class.done]="activeTab() > 1"></div>
          <button class="adm-tab" [class.active]="activeTab() === 2" [class.done]="false" (click)="goAssignments()">
            <span class="tab-dot">3</span>
            <span class="tab-label">Assignments</span>
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
                  <div class="tab-nav-end">
                    <button type="submit" class="btn-secondary" [disabled]="saving()">
                      @if (saving()) { <span class="material-icons-round spin">refresh</span> Saving… }
                      @else { <span class="material-icons-round">save</span> Save Changes }
                    </button>
                    <button type="button" class="btn-primary" (click)="goAssignments()">
                      Assignments <span class="material-icons-round">arrow_forward</span>
                    </button>
                  </div>
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
                  @else { <span class="material-icons-round">person_add</span> Add Teacher &amp; Assign }
                </button>
              </div>
            </div>
          }

          <!-- ── Tab 2: Assignments (after teacher exists) ── -->
          @if (activeTab() === 2 && editId()) {
            <div class="tab-pane assign-pane">
              <div class="assign-panel">
                <div class="assign-panel-head">
                  <div class="assign-panel-title">
                    <span class="material-icons-round">assignment_ind</span>
                    <div>
                      <div class="assign-title">Class &amp; subject load</div>
                      <div class="assign-meta">
                        @if (assignments().length === 0) {
                          Nothing assigned yet — add classes they will teach
                        } @else {
                          Teaching {{ assignments().length }} subject{{ assignments().length === 1 ? '' : 's' }}
                          across {{ groupedAssignments().length }} class{{ groupedAssignments().length === 1 ? '' : 'es' }}
                        }
                      </div>
                    </div>
                  </div>
                  <button type="button" class="btn-primary btn-sm" (click)="openAssignModal()">
                    <span class="material-icons-round">add</span> Add assignment
                  </button>
                </div>

                @if (loadingAssignments()) {
                  <div class="assign-body"><app-loading /></div>
                } @else if (assignments().length === 0) {
                  <div class="assign-empty">
                    <div class="assign-empty-icon">
                      <span class="material-icons-round">school</span>
                    </div>
                    <h4>No teaching load yet</h4>
                    <p>Pick the classes and subjects this teacher will handle. You can change this later anytime.</p>
                    <button type="button" class="btn-primary" (click)="openAssignModal()">
                      <span class="material-icons-round">add</span> Assign first class
                    </button>
                  </div>
                } @else {
                  <div class="assign-body">
                    @for (g of groupedAssignments(); track g.classId) {
                      <div class="assign-class">
                        <div class="assign-class-label">
                          <span class="material-icons-round">class</span>
                          <span>{{ g.className }}{{ g.classSection ? ' — ' + g.classSection : '' }}</span>
                          <span class="assign-class-badge">{{ g.subjects.length }} subject{{ g.subjects.length === 1 ? '' : 's' }}</span>
                        </div>
                        <div class="assign-chips">
                          @for (a of g.subjects; track a.id; let i = $index) {
                            <div class="assign-chip">
                              <span class="assign-chip-icon" [style.background]="subjectColor(i)">
                                <span class="material-icons-round">{{ subjectIcon(i) }}</span>
                              </span>
                              <span class="assign-chip-name">{{ a.subjectName }}</span>
                              <button type="button" class="assign-remove" title="Remove assignment" (click)="unassign(a)">
                                <span class="material-icons-round">person_remove</span>
                                Remove
                              </button>
                            </div>
                          }
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>

              <div class="tab-nav">
                <button type="button" class="btn-secondary" (click)="activeTab.set(1)">
                  <span class="material-icons-round">arrow_back</span> Back
                </button>
                <div class="tab-nav-end">
                  @if (assignments().length === 0) {
                    <button type="button" class="btn-secondary" (click)="finish()">
                      Skip for now
                    </button>
                  }
                  <button type="button" class="btn-primary" (click)="finish()">
                    <span class="material-icons-round">check</span>
                    {{ assignments().length === 0 ? 'Finish without assigning' : 'Done' }}
                  </button>
                </div>
              </div>
            </div>
          }

        </form>
      </div>

    </div>

    @if (showAssign()) {
      <div class="modal-overlay" (click)="showAssign.set(false)">
        <div class="modal assign-modal" (click)="$event.stopPropagation()">
          <div class="assign-modal-header">
            <div>
              <h3>Add classes &amp; subjects</h3>
              <p class="assign-sub">Tap subjects to select — search or use quick picks to go faster</p>
            </div>
            <button type="button" class="icon-act" (click)="showAssign.set(false)">
              <span class="material-icons-round">close</span>
            </button>
          </div>

          @if (loadingModalSubjects()) {
            <div style="padding:24px"><app-loading /></div>
          } @else if (modalClassList().length === 0) {
            <div class="assign-empty soft">
              <div class="assign-empty-icon">
                <span class="material-icons-round">task_alt</span>
              </div>
              <h4>All set</h4>
              <p>Every available class subject is already assigned to this teacher.</p>
            </div>
          } @else {
            <div class="assign-tools">
              <div class="assign-search">
                <span class="material-icons-round">search</span>
                <input
                  type="search"
                  [value]="assignSearch()"
                  (input)="assignSearch.set($any($event.target).value)"
                  placeholder="Search class or subject (e.g. English, Class 3)"
                  autofocus
                />
                @if (assignSearch()) {
                  <button type="button" class="search-clear" (click)="assignSearch.set('')" title="Clear">
                    <span class="material-icons-round">close</span>
                  </button>
                }
              </div>

              @if (quickSubjectFilters().length) {
                <div class="quick-picks">
                  <span class="quick-label">Quick pick</span>
                  @for (name of quickSubjectFilters(); track name) {
                    <button type="button" class="quick-chip"
                            [class.active]="assignSearch().toLowerCase() === name.toLowerCase()"
                            (click)="applyQuickFilter(name)">
                      {{ name }}
                    </button>
                  }
                  @if (assignSearch()) {
                    <button type="button" class="quick-chip ghost" (click)="assignSearch.set('')">Show all</button>
                  }
                </div>
              }

              <div class="bulk-bar">
                <span class="bulk-meta">
                  {{ visibleSubjectCount() }} shown
                  @if (totalSelectedCount() > 0) {
                    · {{ totalSelectedCount() }} selected
                  }
                </span>
                <div class="bulk-actions">
                  <button type="button" class="link-btn" (click)="selectAllVisible()" [disabled]="visibleSubjectCount() === 0">
                    Select all shown
                  </button>
                  <button type="button" class="link-btn" (click)="clearSelection()" [disabled]="totalSelectedCount() === 0">
                    Clear
                  </button>
                </div>
              </div>
            </div>

            <div class="modal-class-list">
              @if (filteredModalClassList().length === 0) {
                <div class="assign-empty soft">
                  <p>No matches for “{{ assignSearch() }}”. Try another class or subject name.</p>
                  <button type="button" class="btn-secondary btn-sm" (click)="assignSearch.set('')">Clear search</button>
                </div>
              } @else {
                @for (cls of filteredModalClassList(); track cls.classId) {
                  <div class="mcl-class" [class.has-selection]="classSelectionCount(cls.classId) > 0">
                    <div class="mcl-class-header">
                      <span class="material-icons-round mcl-class-icon">class</span>
                      <span class="mcl-class-name">{{ cls.className }}{{ cls.section ? ' — ' + cls.section : '' }}</span>
                      @if (classSelectionCount(cls.classId) > 0) {
                        <span class="mcl-count">{{ classSelectionCount(cls.classId) }}</span>
                      }
                      <button type="button" class="sel-all-btn" (click)="toggleClassSelectAll(cls)">
                        {{ classAllSelected(cls) ? 'Deselect' : 'All' }}
                      </button>
                    </div>
                    <div class="mcl-chip-grid">
                      @for (s of cls.availableSubjects; track s.id; let i = $index) {
                        <button type="button" class="subj-chip"
                                [class.selected]="isSubjectSelected(s.id)"
                                (click)="toggleModalSubject(s.id)">
                          <span class="subj-dot" [style.background]="subjectColor(i)"></span>
                          {{ s.subjectName }}
                          @if (isSubjectSelected(s.id)) {
                            <span class="material-icons-round subj-check">check</span>
                          }
                        </button>
                      }
                    </div>
                  </div>
                }
              }
            </div>
          }

          @if (assignError()) {
            <p class="error-msg">{{ assignError() }}</p>
          }

          <div class="modal-actions">
            <span class="total-selected">
              @if (totalSelectedCount() > 0) {
                Ready to assign {{ totalSelectedCount() }} subject{{ totalSelectedCount() === 1 ? '' : 's' }}
              } @else {
                Tap subjects above, or search then Select all shown
              }
            </span>
            <button type="button" class="btn-secondary" (click)="showAssign.set(false)">Cancel</button>
            <button type="button" class="btn-primary" [disabled]="totalSelectedCount() === 0 || assigning()" (click)="doAssign()">
              @if (assigning()) { Assigning… }
              @else if (totalSelectedCount() > 0) { Assign {{ totalSelectedCount() }} }
              @else { Assign }
            </button>
          </div>
        </div>
      </div>
    }
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

    .tab-nav-end { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

    .btn-sm {
      height: 36px !important; padding: 0 14px !important; font-size: 13px !important;
      display: inline-flex !important; align-items: center; gap: 6px;
      .material-icons-round { font-size: 16px !important; }
    }

    .assign-pane { gap: 18px !important; }
    .assign-panel {
      border: 1px solid var(--border); border-radius: 14px; overflow: hidden;
      background: var(--surface); box-shadow: 0 1px 2px rgba(15,23,42,.04);
    }
    .assign-panel-head {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      padding: 14px 16px; background: linear-gradient(135deg, var(--accent-s), var(--surface));
      border-bottom: 1px solid var(--border); flex-wrap: wrap;
    }
    .assign-panel-title {
      display: flex; align-items: flex-start; gap: 10px; min-width: 0;
      > .material-icons-round {
        font-size: 22px; color: var(--accent); margin-top: 1px;
      }
    }
    .assign-title { font-size: 14px; font-weight: 800; color: var(--t1); }
    .assign-meta { font-size: 12.5px; color: var(--t3); margin-top: 2px; line-height: 1.4; }

    .assign-body { display: flex; flex-direction: column; gap: 0; padding: 6px 0; }
    .assign-class { padding: 10px 14px 12px; border-top: 1px solid var(--border); }
    .assign-class:first-child { border-top: none; }
    .assign-class-label {
      display: flex; align-items: center; gap: 6px; margin-bottom: 8px;
      font-size: 12px; font-weight: 800; color: var(--t2); letter-spacing: .2px;
      .material-icons-round { font-size: 16px; color: var(--accent); }
    }
    .assign-class-badge {
      margin-left: auto; font-size: 11px; font-weight: 700; color: var(--t3);
      background: var(--surface-2); border: 1px solid var(--border);
      padding: 2px 8px; border-radius: 99px;
    }
    .assign-chips { display: flex; flex-direction: column; gap: 6px; }
    .assign-chip {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 10px; border-radius: 10px;
      background: var(--surface-2); border: 1px solid var(--border);
      transition: border-color .15s ease, background .15s ease;
    }
    .assign-chip:hover { border-color: var(--border-2); background: var(--surface); }
    .assign-chip-icon {
      width: 32px; height: 32px; border-radius: 9px; flex-shrink: 0;
      display: inline-flex; align-items: center; justify-content: center; color: #fff;
      .material-icons-round { font-size: 17px; }
    }
    .assign-chip-name {
      flex: 1; min-width: 0; font-size: 13.5px; font-weight: 700; color: var(--t1);
    }
    .assign-remove {
      display: inline-flex; align-items: center; gap: 4px;
      height: 30px; padding: 0 10px; border-radius: 8px;
      border: 1px solid transparent; background: transparent;
      color: var(--t3); font-size: 12px; font-weight: 700; font-family: inherit;
      cursor: pointer; transition: all .15s ease; flex-shrink: 0;
      .material-icons-round { font-size: 16px; }
    }
    .assign-remove:hover {
      background: var(--red-s); border-color: var(--red-b, #fecaca); color: var(--red);
    }

    .assign-empty {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 8px; padding: 40px 20px; text-align: center;
      h4 { margin: 4px 0 0; font-size: 15px; font-weight: 800; color: var(--t1); }
      p { margin: 0 0 8px; font-size: 13px; color: var(--t3); max-width: 320px; line-height: 1.5; }
    }
    .assign-empty.soft { padding: 36px 24px; }
    .assign-empty-icon {
      width: 56px; height: 56px; border-radius: 16px;
      background: var(--accent-s); color: var(--accent);
      display: flex; align-items: center; justify-content: center;
      .material-icons-round { font-size: 28px; }
    }

    .icon-act {
      width: 32px; height: 32px; border: none; border-radius: 8px; background: transparent;
      color: var(--t4); cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
      .material-icons-round { font-size: 18px; }
    }
    .icon-act:hover { background: var(--surface-2); color: var(--t2); }

    .modal-overlay {
      position: fixed; inset: 0; z-index: 1000; background: rgba(15,23,42,.45);
      display: flex; align-items: center; justify-content: center; padding: 16px;
    }
    .assign-modal {
      width: min(720px, 100%); max-height: min(88vh, 820px); overflow: hidden;
      background: var(--surface); border: 1px solid var(--border); border-radius: 16px;
      box-shadow: var(--sh-xl); display: flex; flex-direction: column;
    }
    .assign-modal-header {
      display: flex; justify-content: space-between; gap: 12px; padding: 16px 18px;
      border-bottom: 1px solid var(--border);
      h3 { margin: 0; font-size: 16px; font-weight: 800; color: var(--t1); }
    }
    .assign-sub { margin: 3px 0 0; font-size: 12.5px; color: var(--t4); }

    .assign-tools {
      display: flex; flex-direction: column; gap: 10px;
      padding: 12px 14px 0;
    }
    .assign-search {
      position: relative; display: flex; align-items: center;
      > .material-icons-round {
        position: absolute; left: 12px; font-size: 18px; color: var(--t4); pointer-events: none;
      }
      input {
        width: 100%; height: 42px; padding: 0 36px 0 40px;
        border: 1.5px solid var(--border); border-radius: 10px;
        background: var(--surface-2); color: var(--t1); font-size: 13.5px; font-family: inherit;
      }
      input:focus {
        outline: none; border-color: var(--accent); background: var(--surface);
        box-shadow: var(--input-shadow-focus);
      }
    }
    .search-clear {
      position: absolute; right: 8px; width: 28px; height: 28px; border: none;
      border-radius: 8px; background: transparent; color: var(--t4); cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center;
      .material-icons-round { font-size: 16px; }
    }
    .quick-picks {
      display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
    }
    .quick-label {
      font-size: 11px; font-weight: 800; color: var(--t4); text-transform: uppercase; letter-spacing: .4px;
      margin-right: 2px;
    }
    .quick-chip {
      height: 28px; padding: 0 10px; border-radius: 99px;
      border: 1px solid var(--border); background: var(--surface);
      color: var(--t2); font-size: 12px; font-weight: 700; font-family: inherit; cursor: pointer;
    }
    .quick-chip:hover { border-color: var(--accent); color: var(--accent); }
    .quick-chip.active { background: var(--accent); border-color: var(--accent); color: #fff; }
    .quick-chip.ghost { background: transparent; color: var(--accent); border-color: transparent; }

    .bulk-bar {
      display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;
      padding: 2px 2px 0;
    }
    .bulk-meta { font-size: 12px; font-weight: 600; color: var(--t3); }
    .bulk-actions { display: flex; align-items: center; gap: 10px; }
    .link-btn {
      border: none; background: none; padding: 0; cursor: pointer; font-family: inherit;
      font-size: 12.5px; font-weight: 700; color: var(--accent);
    }
    .link-btn:disabled { opacity: .4; cursor: default; }

    .modal-class-list { overflow: auto; flex: 1; padding: 8px 10px 10px; display: flex; flex-direction: column; gap: 8px; }
    .mcl-class {
      border: 1px solid var(--border); border-radius: 12px; background: var(--surface);
      padding: 10px 12px 12px;
    }
    .mcl-class.has-selection { border-color: var(--accent-g); background: color-mix(in srgb, var(--accent-s) 35%, var(--surface)); }
    .mcl-class-header {
      display: flex; align-items: center; gap: 8px; margin-bottom: 8px;
    }
    .mcl-class-icon { font-size: 18px; color: var(--accent); }
    .mcl-class-name { font-size: 13px; font-weight: 800; color: var(--t1); }
    .sel-all-btn {
      margin-left: auto; border: 1px solid var(--border); background: var(--surface);
      color: var(--accent); font-size: 11.5px; font-weight: 800; cursor: pointer; font-family: inherit;
      height: 26px; padding: 0 10px; border-radius: 99px;
    }
    .sel-all-btn:hover { border-color: var(--accent); background: var(--accent-s); }
    .mcl-count {
      min-width: 22px; height: 22px; padding: 0 6px;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 800; color: #fff; background: var(--accent);
      border-radius: 99px;
    }
    .mcl-chip-grid {
      display: flex; flex-wrap: wrap; gap: 6px;
    }
    .subj-chip {
      display: inline-flex; align-items: center; gap: 6px;
      height: 34px; padding: 0 12px 0 10px; border-radius: 99px;
      border: 1.5px solid var(--border); background: var(--surface);
      color: var(--t2); font-size: 12.5px; font-weight: 700; font-family: inherit;
      cursor: pointer; transition: all .12s ease;
    }
    .subj-chip:hover { border-color: var(--accent); color: var(--accent); }
    .subj-chip.selected {
      background: var(--accent); border-color: var(--accent); color: #fff;
      box-shadow: 0 2px 8px var(--accent-g);
    }
    .subj-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .subj-chip.selected .subj-dot { background: #fff !important; }
    .subj-check { font-size: 15px !important; }

    .error-msg { margin: 0; padding: 0 18px 8px; color: var(--red); font-size: 13px; }
    .modal-actions {
      display: flex; align-items: center; gap: 8px; padding: 12px 16px;
      border-top: 1px solid var(--border); background: var(--surface-2);
    }
    .total-selected { flex: 1; font-size: 12.5px; font-weight: 600; color: var(--t3); }

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
  classes    = signal<ClassDto[]>([]);
  assignments = signal<ClassSubjectDto[]>([]);
  saving     = signal(false);
  formError  = signal('');
  activeTab  = signal(0);
  editId     = signal<number | null>(null);
  loadingAssignments = signal(false);

  showAssign = signal(false);
  loadingModalSubjects = signal(false);
  modalClassList = signal<{ classId: number; className: string; section: string | null; availableSubjects: ClassSubjectDto[] }[]>([]);
  selectedSubjectIds = signal<number[]>([]);
  assignSearch = signal('');
  assignError = signal('');
  assigning = signal(false);

  readonly COLORS = ['#7c3aed','#059669','#0891b2','#d97706','#db2777','#ea580c','#0284c7','#16a34a'];
  readonly SUBJECT_ICONS = ['menu_book','calculate','science','language','mosque','computer','sports_soccer','music_note','palette','biotech'];

  totalSteps = computed(() => 3);

  subjectColor(i: number) { return this.COLORS[i % this.COLORS.length]; }
  subjectIcon(i: number) { return this.SUBJECT_ICONS[i % this.SUBJECT_ICONS.length]; }

  filteredModalClassList = computed(() => {
    const q = this.assignSearch().trim().toLowerCase();
    const list = this.modalClassList();
    if (!q) return list;
    return list
      .map(c => {
        const classHit = `${c.className} ${c.section ?? ''}`.toLowerCase().includes(q);
        return {
          ...c,
          availableSubjects: classHit
            ? c.availableSubjects
            : c.availableSubjects.filter(s => s.subjectName.toLowerCase().includes(q))
        };
      })
      .filter(c => c.availableSubjects.length > 0);
  });

  quickSubjectFilters = computed(() => {
    const names = new Set<string>();
    const spec = (this.f['specialization'].value || '').trim();
    if (spec && spec !== 'Other') names.add(spec);
    for (const c of this.modalClassList()) {
      for (const s of c.availableSubjects) names.add(s.subjectName);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b)).slice(0, 8);
  });

  visibleSubjectCount = computed(() =>
    this.filteredModalClassList().reduce((n, c) => n + c.availableSubjects.length, 0)
  );

  groupedAssignments = computed(() => {
    const map = new Map<number, { classId: number; className: string; classSection?: string; subjects: ClassSubjectDto[] }>();
    for (const a of this.assignments()) {
      if (!map.has(a.classId)) {
        map.set(a.classId, {
          classId: a.classId,
          className: a.className ?? '',
          classSection: a.classSection ?? undefined,
          subjects: []
        });
      }
      map.get(a.classId)!.subjects.push(a);
    }
    return Array.from(map.values()).sort((a, b) => a.className.localeCompare(b.className));
  });

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
    return ((this.activeTab() + 1) / this.totalSteps()) * 100;
  }

  ngOnInit() {
    this.acSvc.getSubjects().subscribe(s => this.subjects.set(s));
    this.acSvc.getClasses().subscribe(c => this.classes.set(c));

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const numId = +id;
      this.editId.set(numId);
      this.form.get('email')!.clearValidators();
      this.form.get('password')!.clearValidators();
      this.form.get('email')!.updateValueAndValidity();
      this.form.get('password')!.updateValueAndValidity();
      this.loadAssignments(numId);
      if (this.route.snapshot.queryParamMap.get('tab') === 'assignments') {
        this.activeTab.set(2);
      }

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

  goAssignments() {
    if (!this.editId()) return;
    this.activeTab.set(2);
    this.loadAssignments(this.editId()!);
  }

  finish() {
    this.router.navigate(['/teachers']);
  }

  loadAssignments(teacherId: number) {
    this.loadingAssignments.set(true);
    this.acSvc.getAssignmentsByTeacher(teacherId).subscribe({
      next: d => { this.assignments.set(d); this.loadingAssignments.set(false); },
      error: () => this.loadingAssignments.set(false)
    });
  }

  openAssignModal() {
    this.selectedSubjectIds.set([]);
    this.assignError.set('');
    this.loadingModalSubjects.set(true);
    this.showAssign.set(true);

    const classes = this.classes();
    const alreadyAssigned = new Set(this.assignments().map(a => a.id));
    const spec = (this.f['specialization'].value || '').trim();
    this.assignSearch.set(spec && spec !== 'Other' ? spec : '');

    if (!classes.length) {
      this.modalClassList.set([]);
      this.loadingModalSubjects.set(false);
      return;
    }

    forkJoin(classes.map(c => this.acSvc.getClassSubjects(c.classId))).subscribe({
      next: results => {
        const list = classes.map((c, i) => ({
          classId: c.classId,
          className: c.className,
          section: c.section,
          availableSubjects: results[i].filter(s => !alreadyAssigned.has(s.id))
        })).filter(c => c.availableSubjects.length > 0);

        this.modalClassList.set(list);
        this.loadingModalSubjects.set(false);

        // If specialization filter hides everything, fall back to all
        if (this.assignSearch() && this.filteredModalClassList().length === 0) {
          this.assignSearch.set('');
        }
      },
      error: () => this.loadingModalSubjects.set(false)
    });
  }

  applyQuickFilter(name: string) {
    this.assignSearch.set(this.assignSearch().toLowerCase() === name.toLowerCase() ? '' : name);
  }

  isSubjectSelected(id: number) {
    return this.selectedSubjectIds().includes(id);
  }

  toggleModalSubject(subjectRowId: number) {
    this.selectedSubjectIds.update(ids =>
      ids.includes(subjectRowId) ? ids.filter(id => id !== subjectRowId) : [...ids, subjectRowId]
    );
  }

  classAllSelected(cls: { availableSubjects: ClassSubjectDto[] }) {
    const selected = new Set(this.selectedSubjectIds());
    return cls.availableSubjects.length > 0 && cls.availableSubjects.every(s => selected.has(s.id));
  }

  toggleClassSelectAll(cls: { classId: number; availableSubjects: ClassSubjectDto[] }) {
    const ids = cls.availableSubjects.map(s => s.id);
    const allSelected = this.classAllSelected(cls);
    this.selectedSubjectIds.update(current => {
      if (allSelected) return current.filter(id => !ids.includes(id));
      const set = new Set(current);
      ids.forEach(id => set.add(id));
      return Array.from(set);
    });
  }

  selectAllVisible() {
    const ids = this.filteredModalClassList().flatMap(c => c.availableSubjects.map(s => s.id));
    this.selectedSubjectIds.update(current => Array.from(new Set([...current, ...ids])));
  }

  clearSelection() {
    this.selectedSubjectIds.set([]);
  }

  classSelectionCount(classId: number) {
    const selected = new Set(this.selectedSubjectIds());
    return this.modalClassList()
      .find(c => c.classId === classId)
      ?.availableSubjects.filter(s => selected.has(s.id)).length ?? 0;
  }

  totalSelectedCount() {
    return this.selectedSubjectIds().length;
  }

  doAssign() {
    const teacherId = this.editId();
    const selected = new Set(this.selectedSubjectIds());
    if (!teacherId || selected.size === 0) return;
    this.assigning.set(true);

    const calls = [];
    for (const cls of this.modalClassList()) {
      for (const s of cls.availableSubjects) {
        if (selected.has(s.id)) {
          calls.push(this.acSvc.assignSubjectToClass(cls.classId, { subjectId: s.subjectId, teacherId }));
        }
      }
    }

    forkJoin(calls).subscribe({
      next: (results: ClassSubjectDto[]) => {
        this.assignments.update(list => {
          const byId = new Map(list.map(a => [a.id, a]));
          for (const r of results) byId.set(r.id, r);
          return Array.from(byId.values());
        });
        this.showAssign.set(false);
        this.assigning.set(false);
        this.swal.successToast('Assigned!', `${results.length} subject${results.length === 1 ? '' : 's'} added to teaching load.`);
        this.loadAssignments(teacherId);
      },
      error: err => {
        this.assignError.set(err?.error?.error ?? 'Failed to assign. Please try again.');
        this.assigning.set(false);
      }
    });
  }

  unassign(a: ClassSubjectDto) {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const colors = isDark
      ? { bg: '#161922', t1: '#f1f5f9', t3: '#94a3b8' }
      : { bg: '#ffffff', t1: '#0f172a', t3: '#475569' };

    Swal.fire({
      html: `
        <div style="display:flex;flex-direction:column;align-items:center;gap:16px;padding:8px 0 4px">
          <div style="width:58px;height:58px;border-radius:16px;background:#fee2e2;display:flex;align-items:center;justify-content:center">
            <span class="material-icons-round" style="font-size:27px;color:#dc2626;font-variation-settings:'FILL' 1">person_remove</span>
          </div>
          <div style="text-align:center">
            <div style="font-size:17px;font-weight:800;color:${colors.t1};margin-bottom:6px">Remove Assignment?</div>
            <div style="font-size:13.5px;color:${colors.t3};line-height:1.6">
              Remove <b>${a.subjectName}</b> from<br>
              <b>${a.className}${a.classSection ? ' — ' + a.classSection : ''}</b>?
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Yes, Remove',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      focusCancel: true,
      customClass: { popup: 'swal-app-popup', confirmButton: 'swal-btn-danger', cancelButton: 'swal-btn-cancel', actions: 'swal-actions' },
      buttonsStyling: false,
      background: colors.bg,
      showClass: { popup: 'swal-show' },
      hideClass: { popup: 'swal-hide' },
    }).then(result => {
      if (!result.isConfirmed) return;
      this.acSvc.unassignTeacherFromSubject(a.classId, a.id).subscribe({
        next: () => {
          this.assignments.update(list => list.filter(x => x.id !== a.id));
          this.swal.successToast('Removed', `${a.subjectName} unassigned from ${a.className}${a.classSection ? ' — ' + a.classSection : ''}.`);
        },
        error: () => Swal.fire({
          icon: 'error',
          title: 'Remove failed',
          text: 'Please try again.',
          customClass: { popup: 'swal-app-popup', confirmButton: 'swal-btn-primary', actions: 'swal-actions' },
          buttonsStyling: false,
        })
      });
    });
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
          this.goAssignments();
        },
        error: (e: any) => { this.saving.set(false); this.formError.set(e?.error?.error ?? 'Failed to update.'); }
      });
    } else {
      this.svc.create({ fullName: v.fullName!, email: v.email!, password: v.password!, roleId: 4, ...profile } as any).subscribe({
        next: (created) => {
          this.saving.set(false);
          this.swal.successToast('Teacher Added!', `${v.fullName} has been registered. Assign classes next.`);
          // Continue wizard on Assignments (edit route so refresh keeps the teacher)
          this.router.navigate(['/teachers/edit', created.userId], {
            replaceUrl: true,
            queryParams: { tab: 'assignments' }
          });
        },
        error: (e: any) => { this.saving.set(false); this.formError.set(e?.error?.error ?? 'Failed to add teacher.'); }
      });
    }
  }
}
