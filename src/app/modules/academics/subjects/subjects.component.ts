import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AcademicService } from '../../../core/services/academic.service';
import { SubjectDto, ClassDto, ClassSubjectDto } from '../../../core/models/academic.model';
import { UserService } from '../../../core/services/user.service';
import { UserListDto } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { InstituteService } from '../../../core/services/institute.service';
import { InstituteDto } from '../../../core/models/institute.model';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { ConfirmDeleteComponent } from '../../../shared/components/confirm-delete/confirm-delete.component';
import { ConfirmDeleteService } from '../../../shared/components/confirm-delete/confirm-delete.service';

const PERIOD_ICONS = ['menu_book','calculate','science','language','mosque','computer','sports_soccer','music_note','palette','biotech'];

@Component({
  selector: 'app-subjects',
  standalone: true,
  imports: [CommonModule, FormsModule, EmptyStateComponent, LoadingComponent, ConfirmDeleteComponent],
  template: `
    <div class="page-header">
      <div>
        <h2>Subjects</h2>
        <p class="sub">Manage subjects and assign them class-wise</p>
      </div>
    </div>

    <div class="two-col">

      <!-- ═══ LEFT: Master Subject List ═══ -->
      <div class="panel card">
        <div class="panel-head">
          <div class="panel-title">
            <span class="material-icons-round">library_books</span>
            Master Subjects
          </div>
          @if (!showAdd()) {
            <button class="btn-primary btn-sm" (click)="openAdd()">
              <span class="material-icons-round">add</span> Add
            </button>
          }
        </div>

        <!-- Add subject form — pinned below header -->
        @if (showAdd()) {
          <div class="add-form">
            <input class="add-input" [(ngModel)]="newName" placeholder="Subject name (e.g. Islamiat)"
                   (keyup.enter)="addSubject()" autofocus />
            @if (isSuperAdmin) {
              <select class="add-select" [(ngModel)]="newInstituteId">
                <option [ngValue]="null">— Institute —</option>
                @for (inst of institutes(); track inst.instituteId) {
                  <option [ngValue]="inst.instituteId">{{ inst.name }}</option>
                }
              </select>
            }
            <button class="btn-primary btn-sm" (click)="addSubject()" [disabled]="!newName.trim()">
              <span class="material-icons-round">check</span>
            </button>
            <button class="btn-icon-only" (click)="showAdd.set(false)" title="Cancel">
              <span class="material-icons-round">close</span>
            </button>
          </div>
        }

        @if (subjectError()) {
          <p class="error-msg" style="padding: 0 16px 8px">{{ subjectError() }}</p>
        }

        @if (loadingSubjects()) {
          <app-loading />
        } @else if (subjects().length === 0) {
          <app-empty-state icon="library_books" title="No subjects yet" message="Add subjects like English, Urdu, Maths..." />
        } @else {
          <div class="subject-list">
            @for (s of subjects(); track s.subjectId; let i = $index) {
              <div class="subject-row" [class.editing]="editId() === s.subjectId">
                <div class="subject-info">
                  <div class="subject-icon" [style.background]="iconBg(i)">
                    <span class="material-icons-round">{{ PERIOD_ICONS[i % PERIOD_ICONS.length] }}</span>
                  </div>
                  @if (editId() === s.subjectId) {
                    <input class="inline-input" [(ngModel)]="editName" (keyup.enter)="saveEdit(s)" (keyup.escape)="editId.set(0)" autofocus />
                  } @else {
                    <span class="subject-name">{{ s.subjectName }}</span>
                    @if (isSuperAdmin && s.instituteName) {
                      <span class="inst-badge">{{ s.instituteName }}</span>
                    }
                  }
                </div>
                <div class="subject-actions">
                  @if (editId() === s.subjectId) {
                    <button class="icon-act green" (click)="saveEdit(s)" title="Save"><span class="material-icons-round">check</span></button>
                    <button class="icon-act" (click)="editId.set(0)" title="Cancel"><span class="material-icons-round">close</span></button>
                  } @else {
                    <button class="icon-act" (click)="startEdit(s)" title="Edit"><span class="material-icons-round">edit</span></button>
                  }
                </div>
              </div>
            }
          </div>
        }
      </div>

      <!-- ═══ RIGHT: Class-wise Subject Assignment ═══ -->
      <div class="panel card">
        <div class="panel-head">
          <div class="panel-title">
            <span class="material-icons-round">class</span>
            Assign Subjects to Class
          </div>
        </div>

        <!-- Class selector -->
        <div class="class-selector">
          <label class="sel-label">Select Class</label>
          <div class="class-chips">
            @for (c of classes(); track c.classId) {
              <button class="chip" [class.active]="selectedClass()?.classId === c.classId"
                      (click)="selectClass(c)">
                {{ c.className }}{{ c.section ? ' ' + c.section : '' }}
              </button>
            }
            @if (classes().length === 0 && !loadingClasses()) {
              <p class="no-classes">No classes found. Create classes first.</p>
            }
          </div>
        </div>

        @if (selectedClass()) {
          <div class="periods-section">
            <div class="periods-header">
              <span class="periods-title">{{ selectedClass()!.className }}{{ selectedClass()!.section ? ' — ' + selectedClass()!.section : '' }} Subjects</span>
              <button class="btn-primary btn-sm" (click)="openAssign()">
                <span class="material-icons-round">add</span> Assign Subject
              </button>
            </div>

            @if (loadingClassSubjects()) {
              <app-loading />
            } @else if (classSubjects().length === 0) {
              <app-empty-state icon="library_books" title="No subjects assigned" message="Assign subjects to this class using the button above" />
            } @else {
              <div class="subject-assigned-list">
                @for (cs of classSubjects(); track cs.id; let i = $index) {
                  <div class="assigned-row">
                    <div class="period-icon" [style.background]="iconBg(i)">
                      <span class="material-icons-round">{{ PERIOD_ICONS[i % PERIOD_ICONS.length] }}</span>
                    </div>
                    <div class="period-info">
                      <span class="period-subject">{{ cs.subjectName }}</span>
                      @if (cs.teacherName) {
                        <span class="period-teacher">
                          <span class="material-icons-round">person</span>
                          {{ cs.teacherName }}
                        </span>
                      }
                    </div>
                    <div class="row-actions">
                      <button class="toggle-btn" [class.active]="cs.isActive" (click)="toggleSubjectStatus(cs)" title="{{ cs.isActive ? 'Mark Inactive' : 'Mark Active' }}">
                        {{ cs.isActive ? 'Active' : 'Inactive' }}
                      </button>
                      <button class="icon-act danger" (click)="removeSubject(cs)" title="Remove subject">
                        <span class="material-icons-round">delete_outline</span>
                      </button>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        } @else {
          <app-empty-state icon="touch_app" title="Select a class" message="Choose a class above to view and assign subjects" />
        }
      </div>
    </div>

    <!-- Assign Subject Modal -->
    @if (showAssign()) {
      <div class="modal-overlay" (click)="showAssign.set(false)">
        <div class="modal assign-modal" (click)="$event.stopPropagation()">

          <div class="assign-modal-header">
            <div>
              <h3>Assign Subject</h3>
              <p class="assign-sub">{{ selectedClass()?.className }}{{ selectedClass()?.section ? ' — ' + selectedClass()?.section : '' }}</p>
            </div>
            <button class="icon-act" (click)="showAssign.set(false)"><span class="material-icons-round">close</span></button>
          </div>

          @if (availableSubjects().length === 0) {
            <div class="assign-empty">
              <span class="material-icons-round">check_circle</span>
              <p>All subjects are already assigned to this class.</p>
            </div>
          } @else {
            <div class="pick-label-row">
              <p class="pick-label">Select subjects to assign</p>
              <button class="sel-all-btn" (click)="toggleSelectAll()">
                {{ assignSubjectIds.size === availableSubjects().length ? 'Deselect All' : 'Select All' }}
              </button>
            </div>
            <div class="subject-cards">
              @for (s of availableSubjects(); track s.subjectId; let i = $index) {
                <button class="subject-card" [class.selected]="assignSubjectIds.has(s.subjectId)"
                        (click)="toggleSubject(s.subjectId)">
                  <div class="sc-icon" [style.background]="iconBg(i)">
                    <span class="material-icons-round">{{ PERIOD_ICONS[i % PERIOD_ICONS.length] }}</span>
                  </div>
                  <span class="sc-name">{{ s.subjectName }}</span>
                  @if (assignSubjectIds.has(s.subjectId)) {
                    <span class="sc-check material-icons-round">check_circle</span>
                  }
                </button>
              }
            </div>
          }

          @if (assignError()) {
            <p class="error-msg" style="padding: 0 22px 8px">{{ assignError() }}</p>
          }

          <div class="modal-actions">
            <button class="btn-secondary" (click)="showAssign.set(false)">Cancel</button>
            @if (availableSubjects().length > 0) {
              <button class="btn-primary" (click)="assignSubjects()" [disabled]="assignSubjectIds.size === 0 || assigning()">
                @if (assigning()) {
                  Assigning…
                } @else {
                  Assign {{ assignSubjectIds.size > 0 ? assignSubjectIds.size + ' Subject' + (assignSubjectIds.size > 1 ? 's' : '') : 'Subjects' }}
                }
              </button>
            }
          </div>
        </div>
      </div>
    }

    <app-confirm-delete />
  `,
  styles: [`
    .page-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      margin-bottom: 24px;
    }
    .page-header h2 { font-size: 22px; font-weight: 800; color: var(--t1); }
    .page-header .sub { font-size: 13px; color: var(--t4); margin-top: 3px; }

    .two-col {
      display: grid;
      grid-template-columns: 340px 1fr;
      gap: 20px;
      align-items: start;
    }
    @media (max-width: 900px) { .two-col { grid-template-columns: 1fr; } }

    .panel { overflow: hidden; }
    .panel-head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 18px;
      border-bottom: 1px solid var(--border);
    }
    .panel-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 13.5px; font-weight: 700; color: var(--t1);
    }
    .panel-title .material-icons-round { font-size: 18px; color: var(--accent); }

    .btn-sm { padding: 6px 13px; font-size: 12px; }
    .btn-sm .material-icons-round { font-size: 15px; }

    /* Subject list */
    .subject-list { display: flex; flex-direction: column; }
    .subject-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 16px; border-bottom: 1px solid var(--border);
      transition: background 0.1s;
    }
    .subject-row:last-child { border-bottom: none; }
    .subject-row:hover, .subject-row.editing { background: var(--surface-2); }

    .subject-info { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
    .subject-icon {
      width: 34px; height: 34px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .subject-icon .material-icons-round { font-size: 17px; color: #fff; font-variation-settings: 'FILL' 1; }
    .subject-name { font-size: 13.5px; font-weight: 600; color: var(--t1); }
    .inline-input {
      flex: 1; padding: 5px 9px; border: 1.5px solid var(--accent);
      border-radius: 6px; font-size: 13px; background: var(--surface); color: var(--t1);
      outline: none;
    }

    .subject-actions { display: flex; gap: 4px; }
    .icon-act {
      width: 28px; height: 28px; border-radius: 7px;
      border: none; background: transparent; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      color: var(--t4); transition: background 0.15s, color 0.15s;
    }
    .icon-act:hover { background: var(--surface-3); color: var(--t1); }
    .icon-act.green { color: var(--green); }
    .icon-act .material-icons-round { font-size: 16px; }

    .add-form {
      display: flex; gap: 8px; align-items: center;
      padding: 10px 14px; border-bottom: 2px solid var(--accent);
      background: color-mix(in srgb, var(--accent) 5%, var(--surface));
    }
    .add-input {
      flex: 1; padding: 8px 12px; border: 1.5px solid var(--accent);
      border-radius: 8px; font-size: 13px; font-family: inherit;
      background: var(--surface); color: var(--t1); outline: none;
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent);
    }
    .add-select {
      padding: 8px 10px; border: 1.5px solid var(--border);
      border-radius: 8px; font-size: 12.5px; font-family: inherit;
      background: var(--surface); color: var(--t1); outline: none;
      max-width: 140px;
    }
    .inst-badge {
      font-size: 10.5px; font-weight: 700; color: var(--t4);
      background: var(--surface-3); padding: 2px 7px; border-radius: 99px;
      margin-left: 6px;
    }
    .btn-icon-only {
      width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--border);
      background: var(--surface); cursor: pointer; display: flex; align-items: center;
      justify-content: center; color: var(--t4); flex-shrink: 0; transition: all .15s;
    }
    .btn-icon-only:hover { background: #fee2e2; color: #dc2626; border-color: #fca5a5; }
    .btn-icon-only .material-icons-round { font-size: 16px; }

    /* Class selector */
    .class-selector { padding: 14px 18px; border-bottom: 1px solid var(--border); }
    .sel-label { font-size: 11px; font-weight: 700; color: var(--t4); text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 10px; display: block; }
    .class-chips { display: flex; flex-wrap: wrap; gap: 7px; }
    .chip {
      padding: 6px 14px; border-radius: 99px;
      border: 1.5px solid var(--border); background: var(--surface);
      font-size: 12.5px; font-weight: 600; color: var(--t2);
      cursor: pointer; transition: all 0.15s;
    }
    .chip:hover { border-color: var(--accent); color: var(--accent); }
    .chip.active { border-color: var(--accent); background: var(--accent-s); color: var(--accent); }
    .no-classes { font-size: 13px; color: var(--t4); }

    /* Periods section */
    .periods-section { padding: 0; }
    .periods-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 18px; border-bottom: 1px solid var(--border);
      background: var(--surface-2);
    }
    .periods-title { font-size: 13px; font-weight: 700; color: var(--t2); }

    .subject-assigned-list { display: flex; flex-direction: column; }
    .assigned-row {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 18px; border-bottom: 1px solid var(--border);
      transition: background 0.1s;
    }
    .assigned-row:last-child { border-bottom: none; }
    .assigned-row:hover { background: var(--surface-2); }

    .period-icon {
      width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .period-icon .material-icons-round { font-size: 19px; color: #fff; font-variation-settings: 'FILL' 1; }

    .period-info { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
    .period-subject { font-size: 14px; font-weight: 700; color: var(--t1); }
    .period-teacher {
      display: flex; align-items: center; gap: 4px;
      font-size: 12px; color: var(--t3);
    }
    .period-teacher .material-icons-round { font-size: 13px; }
    .period-teacher.unassigned { color: var(--t5); font-style: italic; }

    .row-actions { display: flex; align-items: center; gap: 6px; margin-left: auto; }
    .toggle-btn {
      padding: 4px 10px; border-radius: 99px; font-size: 11.5px; font-weight: 700;
      border: 1.5px solid var(--border); background: var(--surface); color: var(--t4);
      cursor: pointer; transition: all 0.15s; font-family: inherit;
    }
    .toggle-btn.active { border-color: var(--green); color: var(--green); background: color-mix(in srgb, var(--green) 10%, transparent); }
    .toggle-btn:hover { opacity: 0.75; }
    .icon-act.danger:hover { background: color-mix(in srgb, #ef4444 12%, transparent); color: #ef4444; }

    /* Assign modal */
    .assign-modal { max-width: 540px; width: 100%; padding: 0; overflow: hidden; }
    .assign-modal-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      padding: 20px 22px 16px; border-bottom: 1px solid var(--border);
    }
    .assign-modal-header h3 { font-size: 16px; font-weight: 800; color: var(--t1); margin: 0; }
    .assign-sub { font-size: 12.5px; color: var(--t4); margin-top: 3px; }

    .pick-label-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 22px 8px;
    }
    .pick-label {
      font-size: 11px; font-weight: 700; color: var(--t4);
      text-transform: uppercase; letter-spacing: 0.8px;
      margin: 0;
    }
    .sel-all-btn {
      font-size: 12px; font-weight: 600; color: var(--accent);
      background: none; border: none; cursor: pointer; padding: 0;
      font-family: inherit;
    }
    .sel-all-btn:hover { text-decoration: underline; }
    .subject-cards {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 10px; padding: 0 22px 16px; max-height: 280px; overflow-y: auto;
    }
    .subject-card {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 14px 10px; border-radius: 12px;
      border: 2px solid var(--border); background: var(--surface);
      cursor: pointer; transition: all 0.15s; position: relative;
      font-family: inherit;
    }
    .subject-card:hover { border-color: var(--accent); background: var(--surface-2); }
    .subject-card.selected { border-color: var(--accent); background: var(--accent-s); }
    .sc-icon {
      width: 42px; height: 42px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
    }
    .sc-icon .material-icons-round { font-size: 20px; color: #fff; font-variation-settings: 'FILL' 1; }
    .sc-name { font-size: 13px; font-weight: 700; color: var(--t1); text-align: center; line-height: 1.3; }
    .sc-check {
      position: absolute; top: 6px; right: 6px;
      font-size: 16px; color: var(--accent);
    }

    .assign-teacher-field { padding: 0 22px 16px; margin: 0; }
    .assign-teacher-field label { font-size: 12px; font-weight: 700; color: var(--t3); margin-bottom: 6px; display: block; }
    .assign-teacher-field select {
      width: 100%; padding: 8px 10px; border: 1.5px solid var(--border);
      border-radius: 8px; font-size: 13px; font-family: inherit;
      background: var(--surface); color: var(--t1); outline: none;
    }
    .assign-teacher-field select:focus { border-color: var(--accent); }
    .optional { font-weight: 400; color: var(--t5); font-size: 11px; }

    .assign-empty {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 32px 22px; color: var(--t4);
    }
    .assign-empty .material-icons-round { font-size: 36px; color: var(--green); }
    .assign-empty p { font-size: 13px; text-align: center; }

    .modal-actions { padding: 14px 22px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 10px; }
  `]
})
export class SubjectsComponent implements OnInit {
  private svc = inject(AcademicService);
  private userSvc = inject(UserService);
  private confirmDelete = inject(ConfirmDeleteService);
  private auth = inject(AuthService);
  private instituteSvc = inject(InstituteService);

  isSuperAdmin = this.auth.hasRole('superadmin');
  institutes = signal<InstituteDto[]>([]);
  newInstituteId: number | null = null;

  readonly PERIOD_ICONS = PERIOD_ICONS;

  subjects   = signal<SubjectDto[]>([]);
  classes    = signal<ClassDto[]>([]);
  classSubjects = signal<ClassSubjectDto[]>([]);

  loadingSubjects     = signal(true);
  loadingClasses      = signal(true);
  loadingClassSubjects = signal(false);

  selectedClass = signal<ClassDto | null>(null);

  showAdd    = signal(false);
  newName    = '';
  editId     = signal(0);
  editName   = '';
  subjectError = signal('');

  teachers = signal<UserListDto[]>([]);

  showAssign      = signal(false);
  assignSubjectId = 0;
  assignSubjectIds = new Set<number>();
  assignTeacherId = 0;
  assignError     = signal('');
  assigning       = signal(false);

  availableSubjects = computed(() => {
    const assigned = new Set(this.classSubjects().map(cs => cs.subjectId));
    return this.subjects().filter(s => !assigned.has(s.subjectId));
  });

  readonly COLORS = ['#7c3aed','#059669','#0891b2','#d97706','#db2777','#ea580c','#16a34a','#0284c7','#7c3aed','#dc2626'];
  iconBg = (i: number) => this.COLORS[i % this.COLORS.length];

  ngOnInit() {
    this.loadSubjects();
    this.loadClasses();
    this.userSvc.getAll().subscribe({
      next: users => this.teachers.set(users.filter(u => u.roleName?.toLowerCase() === 'teacher'))
    });
    if (this.isSuperAdmin) {
      this.instituteSvc.getInstitutes().subscribe({ next: list => this.institutes.set(list) });
    }
  }

  loadSubjects() {
    this.loadingSubjects.set(true);
    this.svc.getSubjects().subscribe({
      next: d => { this.subjects.set(d); this.loadingSubjects.set(false); },
      error: () => this.loadingSubjects.set(false)
    });
  }

  loadClasses() {
    this.loadingClasses.set(true);
    this.svc.getClasses().subscribe({
      next: d => { this.classes.set(d); this.loadingClasses.set(false); },
      error: () => this.loadingClasses.set(false)
    });
  }

  selectClass(c: ClassDto) {
    this.selectedClass.set(c);
    this.loadClassSubjects(c.classId);
  }

  loadClassSubjects(classId: number) {
    this.loadingClassSubjects.set(true);
    this.svc.getClassSubjects(classId).subscribe({
      next: d => { this.classSubjects.set(d); this.loadingClassSubjects.set(false); },
      error: () => this.loadingClassSubjects.set(false)
    });
  }

  openAdd() {
    this.newName = '';
    this.newInstituteId = null;
    this.showAdd.set(true);
    this.subjectError.set('');
  }

  addSubject() {
    if (!this.newName.trim()) return;
    if (this.isSuperAdmin && !this.newInstituteId) { this.subjectError.set('Please select an institute.'); return; }
    this.svc.createSubject({ subjectName: this.newName.trim(), instituteId: this.newInstituteId }).subscribe({
      next: s => { this.subjects.update(list => [...list, s]); this.newName = ''; this.newInstituteId = null; this.showAdd.set(false); },
      error: (e: any) => this.subjectError.set(e?.error?.error ?? 'Failed to add subject. It may already exist.')
    });
  }

  startEdit(s: SubjectDto) {
    this.editId.set(s.subjectId);
    this.editName = s.subjectName;
  }

  saveEdit(s: SubjectDto) {
    if (!this.editName.trim()) return;
    this.svc.updateSubject(s.subjectId, { subjectName: this.editName.trim() }).subscribe({
      next: () => {
        this.subjects.update(list => list.map(x => x.subjectId === s.subjectId ? { ...x, subjectName: this.editName.trim() } : x));
        this.editId.set(0);
      },
      error: () => this.subjectError.set('Failed to update subject.')
    });
  }

  openAssign() {
    this.assignSubjectIds = new Set<number>();
    this.assignTeacherId = 0;
    this.assignError.set('');
    this.showAssign.set(true);
  }

  toggleSubject(id: number) {
    const s = new Set(this.assignSubjectIds);
    s.has(id) ? s.delete(id) : s.add(id);
    this.assignSubjectIds = s;
  }

  toggleSelectAll() {
    if (this.assignSubjectIds.size === this.availableSubjects().length) {
      this.assignSubjectIds = new Set<number>();
    } else {
      this.assignSubjectIds = new Set(this.availableSubjects().map(s => s.subjectId));
    }
  }

  toggleSubjectStatus(cs: ClassSubjectDto) {
    this.svc.toggleClassSubjectStatus(cs.classId, cs.id).subscribe({
      next: updated => this.classSubjects.update(list => list.map(x => x.id === updated.id ? updated : x)),
      error: () => {}
    });
  }

  removeSubject(cs: ClassSubjectDto) {
    this.confirmDelete.open(
      'Remove Subject?',
      `<strong>${cs.subjectName}</strong> will be removed from this class. This action cannot be undone.`,
      () => this.svc.removeClassSubject(cs.classId, cs.id),
      () => this.classSubjects.update(list => list.filter(x => x.id !== cs.id)),
      'Yes, Remove'
    );
  }

  assignSubjects() {
    if (!this.selectedClass() || this.assignSubjectIds.size === 0) return;
    this.assigning.set(true);
    const classId = this.selectedClass()!.classId;
    const calls = Array.from(this.assignSubjectIds).map(id =>
      this.svc.assignSubjectToClass(classId, { subjectId: id, teacherId: 0 })
    );
    forkJoin(calls).subscribe({
      next: results => {
        this.classSubjects.update(list => [...list, ...results]);
        this.showAssign.set(false);
        this.assigning.set(false);
      },
      error: (err) => {
        this.assignError.set(err?.error?.error ?? 'Failed to assign subjects.');
        this.assigning.set(false);
      }
    });
  }
}
