import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';

import { AcademicService } from '../../../core/services/academic.service';
import { UserService } from '../../../core/services/user.service';
import { UserListDto } from '../../../core/models/user.model';
import { ClassDto, ClassSubjectDto } from '../../../core/models/academic.model';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';

const COLORS = ['#7c3aed','#059669','#0891b2','#d97706','#db2777','#ea580c','#16a34a','#0284c7','#7c3aed','#dc2626'];
const ICONS  = ['menu_book','calculate','science','language','mosque','computer','sports_soccer','music_note','palette','biotech'];

@Component({
  selector: 'app-teacher-assignments',
  standalone: true,
  imports: [CommonModule, FormsModule, EmptyStateComponent, LoadingComponent],
  template: `
    <div class="page-header">
      <div>
        <h2>Teacher Assignments</h2>
        <p class="sub">Assign classes &amp; subjects to teachers</p>
      </div>
    </div>

    <div class="two-col">

      <!-- ═══ LEFT: Teacher List ═══ -->
      <div class="panel card">
        <div class="panel-head">
          <div class="panel-title">
            <span class="material-icons-round">people</span>
            Teachers
          </div>
        </div>

        <div class="search-wrap" style="padding: 10px 12px;">
          <span class="material-icons-round search-icon">search</span>
          <input class="search-input" placeholder="Search teacher..." [(ngModel)]="teacherSearch" />
        </div>

        @if (loadingTeachers()) {
          <app-loading />
        } @else if (filteredTeachers().length === 0) {
          <app-empty-state icon="people" title="No teachers" message="No teachers found." />
        } @else {
          <div class="teacher-list">
            @for (t of filteredTeachers(); track t.userId) {
              <button class="teacher-row" [class.active]="selectedTeacher()?.userId === t.userId"
                      (click)="selectTeacher(t)">
                <div class="t-av" [style.background]="avatarColor(t.fullName)">{{ initials(t.fullName) }}</div>
                <div class="t-info">
                  <span class="t-name">{{ t.fullName }}</span>
                  <span class="t-meta">{{ t.specialization || t.qualification || 'Teacher' }}</span>
                </div>
                <div class="t-count" [class.has]="assignmentCountFor(t.userId) > 0">
                  {{ assignmentCountFor(t.userId) }}
                </div>
              </button>
            }
          </div>
        }
      </div>

      <!-- ═══ RIGHT: Assignments Panel ═══ -->
      <div class="panel card">

        @if (!selectedTeacher()) {
          <div class="panel-head">
            <div class="panel-title">
              <span class="material-icons-round">assignment_ind</span>
              Assignments
            </div>
          </div>
          <app-empty-state icon="touch_app" title="Select a teacher" message="Pick a teacher on the left to manage their class & subject assignments" />

        } @else {
          <div class="panel-head">
            <div class="teacher-selected-info">
              <div class="t-av lg" [style.background]="avatarColor(selectedTeacher()!.fullName)">{{ initials(selectedTeacher()!.fullName) }}</div>
              <div>
                <div class="sel-name">{{ selectedTeacher()!.fullName }}</div>
                <div class="sel-meta">{{ selectedTeacher()!.specialization || selectedTeacher()!.qualification || 'Teacher' }}</div>
              </div>
            </div>
            <button class="btn-primary btn-sm" (click)="openAssignModal()">
              <span class="material-icons-round">add</span> Assign
            </button>
          </div>

          @if (loadingAssignments()) {
            <app-loading />
          } @else if (assignments().length === 0) {
            <app-empty-state icon="assignment_ind" title="No assignments yet"
              message="Click Assign to give this teacher classes and subjects" />
          } @else {
            <!-- Group by class -->
            @for (group of groupedAssignments(); track group.classId) {
              <div class="class-group">
                <div class="class-group-header">
                  <span class="material-icons-round">class</span>
                  {{ group.className }}{{ group.classSection ? ' — ' + group.classSection : '' }}
                  <span class="group-count">{{ group.subjects.length }} subject{{ group.subjects.length !== 1 ? 's' : '' }}</span>
                </div>
                <div class="assignment-list">
                  @for (a of group.subjects; track a.id; let i = $index) {
                    <div class="assignment-row">
                      <div class="a-icon" [style.background]="COLORS[i % COLORS.length]">
                        <span class="material-icons-round">{{ ICONS[i % ICONS.length] }}</span>
                      </div>
                      <span class="a-subject">{{ a.subjectName }}</span>
                      <span class="badge ml-auto" [class.active]="a.isActive" [class.inactive]="!a.isActive">
                        {{ a.isActive ? 'Active' : 'Inactive' }}
                      </span>
                      <button class="icon-act danger" (click)="unassign(a)" title="Remove assignment">
                        <span class="material-icons-round">person_remove</span>
                      </button>
                    </div>
                  }
                </div>
              </div>
            }
          }
        }
      </div>
    </div>

    <!-- ═══ Assign Modal ═══ -->
    @if (showAssign()) {
      <div class="modal-overlay" (click)="showAssign.set(false)">
        <div class="modal assign-modal" (click)="$event.stopPropagation()">

          <div class="assign-modal-header">
            <div>
              <h3>Assign Classes &amp; Subjects</h3>
              <p class="assign-sub">{{ selectedTeacher()?.fullName }} — tick subjects across any class</p>
            </div>
            <button class="icon-act" (click)="showAssign.set(false)">
              <span class="material-icons-round">close</span>
            </button>
          </div>

          @if (loadingModalSubjects()) {
            <div style="padding:24px"><app-loading /></div>
          } @else {
            <div class="modal-class-list">
              @for (cls of modalClassList(); track cls.classId) {
                <div class="mcl-class" [class.has-selection]="classSelectionCount(cls.classId) > 0">

                  <div class="mcl-class-header" (click)="toggleClassExpand(cls.classId)">
                    <span class="material-icons-round expand-icon">
                      {{ expandedClasses.has(cls.classId) ? 'expand_less' : 'expand_more' }}
                    </span>
                    <span class="mcl-class-name">{{ cls.className }}{{ cls.section ? ' ' + cls.section : '' }}</span>
                    @if (cls.availableSubjects.length === 0) {
                      <span class="mcl-all-done">All assigned</span>
                    } @else {
                      <button class="sel-all-btn" (click)="$event.stopPropagation(); toggleClassSelectAll(cls)">
                        {{ classSelectionCount(cls.classId) === cls.availableSubjects.length ? 'Deselect All' : 'Select All' }}
                      </button>
                      @if (classSelectionCount(cls.classId) > 0) {
                        <span class="mcl-count">{{ classSelectionCount(cls.classId) }} selected</span>
                      }
                    }
                  </div>

                  @if (expandedClasses.has(cls.classId) && cls.availableSubjects.length > 0) {
                    <div class="mcl-subjects">
                      @for (s of cls.availableSubjects; track s.id; let i = $index) {
                        <label class="mcl-subject-row" [class.checked]="modalSelectedSubjectIds.has(s.id)">
                          <input type="checkbox" [checked]="modalSelectedSubjectIds.has(s.id)"
                                 (change)="toggleModalSubjectWithClass(s.id, cls.classId)" />
                          <div class="mcl-s-icon" [style.background]="COLORS[i % COLORS.length]">
                            <span class="material-icons-round">{{ ICONS[i % ICONS.length] }}</span>
                          </div>
                          <span class="mcl-s-name">{{ s.subjectName }}</span>
                          @if (modalSelectedSubjectIds.has(s.id)) {
                            <span class="material-icons-round mcl-check">check_circle</span>
                          }
                        </label>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          }

          @if (assignError()) {
            <p class="error-msg" style="padding: 0 22px 8px">{{ assignError() }}</p>
          }

          <div class="modal-actions">
            <span class="total-selected">
              @if (totalSelectedCount() > 0) {
                {{ totalSelectedCount() }} subject{{ totalSelectedCount() > 1 ? 's' : '' }} selected
              }
            </span>
            <button class="btn-secondary" (click)="showAssign.set(false)">Cancel</button>
            <button class="btn-primary" [disabled]="totalSelectedCount() === 0 || assigning()" (click)="doAssign()">
              @if (assigning()) { Assigning… }
              @else { Assign {{ totalSelectedCount() > 0 ? totalSelectedCount() + ' Subject' + (totalSelectedCount() > 1 ? 's' : '') : '' }} }
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .page-header { display: flex; align-items: flex-start; margin-bottom: 24px; }
    .page-header h2 { font-size: 22px; font-weight: 800; color: var(--t1); }
    .page-header .sub { font-size: 13px; color: var(--t4); margin-top: 3px; }

    .two-col {
      display: grid;
      grid-template-columns: 300px 1fr;
      gap: 20px;
      align-items: start;
    }
    @media (max-width: 860px) { .two-col { grid-template-columns: 1fr; } }

    .panel { overflow: hidden; }
    .panel-head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 16px; border-bottom: 1px solid var(--border);
    }
    .panel-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 13px; font-weight: 700; color: var(--t1);
    }
    .panel-title .material-icons-round { font-size: 18px; color: var(--accent); }

    /* Teacher list */
    .teacher-list { display: flex; flex-direction: column; max-height: 560px; overflow-y: auto; }
    .teacher-row {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 14px; border: none; background: transparent;
      cursor: pointer; text-align: left; width: 100%;
      border-bottom: 1px solid var(--border); font-family: inherit;
      transition: background 0.12s;
    }
    .teacher-row:last-child { border-bottom: none; }
    .teacher-row:hover { background: var(--surface-2); }
    .teacher-row.active { background: var(--accent-s); }

    .t-av {
      width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 800; color: #fff;
    }
    .t-av.lg { width: 42px; height: 42px; border-radius: 12px; font-size: 15px; }
    .t-info { flex: 1; min-width: 0; }
    .t-name { display: block; font-size: 13.5px; font-weight: 700; color: var(--t1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .t-meta { display: block; font-size: 11.5px; color: var(--t4); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .t-count {
      min-width: 22px; height: 22px; border-radius: 99px;
      background: var(--surface-3); color: var(--t4);
      font-size: 11px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .t-count.has { background: var(--accent-s); color: var(--accent); }

    /* Selected teacher header */
    .teacher-selected-info { display: flex; align-items: center; gap: 10px; }
    .sel-name { font-size: 14px; font-weight: 800; color: var(--t1); }
    .sel-meta { font-size: 12px; color: var(--t4); }

    /* Class groups */
    .class-group { border-bottom: 1px solid var(--border); }
    .class-group:last-child { border-bottom: none; }
    .class-group-header {
      display: flex; align-items: center; gap: 7px;
      padding: 10px 16px; background: var(--surface-2);
      font-size: 12.5px; font-weight: 700; color: var(--t2);
      border-bottom: 1px solid var(--border);
    }
    .class-group-header .material-icons-round { font-size: 16px; color: var(--accent); }
    .group-count {
      margin-left: auto; font-size: 11px; font-weight: 600;
      color: var(--t4); background: var(--surface-3);
      padding: 2px 8px; border-radius: 99px;
    }

    .assignment-list { display: flex; flex-direction: column; }
    .assignment-row {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 16px; border-bottom: 1px solid var(--border);
      transition: background 0.1s;
    }
    .assignment-row:last-child { border-bottom: none; }
    .assignment-row:hover { background: var(--surface-2); }

    .a-icon {
      width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .a-icon .material-icons-round { font-size: 17px; color: #fff; font-variation-settings: 'FILL' 1; }
    .a-subject { font-size: 13.5px; font-weight: 600; color: var(--t1); flex: 1; }
    .ml-auto { margin-left: auto; }

    .icon-act {
      width: 30px; height: 30px; border-radius: 8px;
      border: none; background: transparent; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      color: var(--t4); transition: background 0.15s, color 0.15s; flex-shrink: 0;
    }
    .icon-act:hover { background: var(--surface-3); color: var(--t1); }
    .icon-act.danger:hover { background: color-mix(in srgb, #ef4444 12%, transparent); color: #ef4444; }
    .icon-act .material-icons-round { font-size: 17px; }

    .btn-sm { padding: 6px 13px; font-size: 12px; }
    .btn-sm .material-icons-round { font-size: 15px; }

    /* Assign modal */
    .assign-modal { max-width: 560px; width: 100%; padding: 0; overflow: hidden; }
    .assign-modal-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      padding: 18px 22px 14px; border-bottom: 1px solid var(--border);
    }
    .assign-modal-header h3 { font-size: 16px; font-weight: 800; color: var(--t1); margin: 0; }
    .assign-sub { font-size: 12px; color: var(--t4); margin-top: 3px; }

    /* Class list inside modal */
    .modal-class-list { max-height: 420px; overflow-y: auto; }

    .mcl-class { border-bottom: 1px solid var(--border); }
    .mcl-class:last-child { border-bottom: none; }
    .mcl-class.has-selection > .mcl-class-header { background: var(--accent-s); }

    .mcl-class-header {
      display: flex; align-items: center; gap: 10px;
      padding: 11px 18px; cursor: pointer;
      background: var(--surface-2); transition: background 0.15s;
      user-select: none;
    }
    .mcl-class-header:hover { background: var(--surface-3); }
    .expand-icon { font-size: 18px; color: var(--t4); flex-shrink: 0; }
    .mcl-class-name { font-size: 13.5px; font-weight: 700; color: var(--t1); flex: 1; }
    .mcl-all-done { font-size: 11px; color: var(--green); font-weight: 600; background: var(--green-s); padding: 2px 8px; border-radius: 99px; }
    .mcl-count { font-size: 11px; font-weight: 700; color: var(--accent); background: var(--accent-s); padding: 2px 8px; border-radius: 99px; }

    .sel-all-btn {
      font-size: 11.5px; font-weight: 600; color: var(--accent);
      background: none; border: none; cursor: pointer; font-family: inherit; flex-shrink: 0;
    }
    .sel-all-btn:hover { text-decoration: underline; }

    .mcl-subjects { display: flex; flex-direction: column; background: var(--surface); }
    .mcl-subject-row {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 18px 9px 38px;
      cursor: pointer; transition: background 0.1s;
      border-top: 1px solid var(--border);
    }
    .mcl-subject-row:hover { background: var(--surface-2); }
    .mcl-subject-row.checked { background: var(--accent-s); }
    .mcl-subject-row input[type="checkbox"] { display: none; }
    .mcl-s-icon {
      width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .mcl-s-icon .material-icons-round { font-size: 15px; color: #fff; font-variation-settings: 'FILL' 1; }
    .mcl-s-name { font-size: 13px; font-weight: 600; color: var(--t1); flex: 1; }
    .mcl-check { font-size: 16px; color: var(--accent); flex-shrink: 0; }

    .modal-actions {
      padding: 12px 22px; border-top: 1px solid var(--border);
      display: flex; align-items: center; gap: 10px;
    }
    .total-selected { font-size: 12px; font-weight: 600; color: var(--accent); flex: 1; }

    .search-wrap { position: relative; }
    .search-icon { position: absolute; left: 22px; top: 50%; transform: translateY(-50%); font-size: 17px; color: var(--t4); pointer-events: none; }
    .search-input {
      width: 100%; padding: 8px 12px 8px 42px;
      background: var(--surface-2); border: 1.5px solid var(--border);
      border-radius: 8px; font-size: 13px; font-family: inherit; color: var(--t1);
      outline: none; transition: border-color 0.15s;
    }
    .search-input:focus { border-color: var(--accent); }
  `]
})
export class TeacherAssignmentsComponent implements OnInit {
  private svc     = inject(AcademicService);
  private userSvc = inject(UserService);

  readonly COLORS = COLORS;
  readonly ICONS  = ICONS;

  teachers        = signal<UserListDto[]>([]);
  classes         = signal<ClassDto[]>([]);
  assignments     = signal<ClassSubjectDto[]>([]);
  allAssignments  = signal<Map<number, number>>(new Map()); // teacherId -> count

  loadingTeachers    = signal(true);
  loadingAssignments = signal(false);

  selectedTeacher = signal<UserListDto | null>(null);
  teacherSearch   = '';

  showAssign              = signal(false);
  loadingModalSubjects    = signal(false);
  modalClassList          = signal<{ classId: number; className: string; section: string | null; availableSubjects: ClassSubjectDto[] }[]>([]);
  modalSelectedSubjectIds = new Set<number>();           // classSubject ids
  modalSubjectClassMap    = new Map<number, number>();   // classSubjectId -> classId
  expandedClasses         = new Set<number>();
  assignError             = signal('');
  assigning               = signal(false);

  filteredTeachers = computed(() =>
    this.teachers().filter(t =>
      !this.teacherSearch ||
      t.fullName.toLowerCase().includes(this.teacherSearch.toLowerCase())
    )
  );

  groupedAssignments = computed(() => {
    const map = new Map<number, { classId: number; className: string; classSection: string | undefined; subjects: ClassSubjectDto[] }>();
    for (const a of this.assignments()) {
      if (!map.has(a.classId)) {
        map.set(a.classId, { classId: a.classId, className: a.className ?? '', classSection: a.classSection ?? undefined, subjects: [] });
      }
      map.get(a.classId)!.subjects.push(a);
    }
    return Array.from(map.values()).sort((a, b) => a.className.localeCompare(b.className));
  });

  classSelectionCount(classId: number) {
    return this.modalClassList()
      .find(c => c.classId === classId)
      ?.availableSubjects.filter(s => this.modalSelectedSubjectIds.has(s.id)).length ?? 0;
  }

  totalSelectedCount() {
    return this.modalSelectedSubjectIds.size;
  }

  ngOnInit() {
    this.userSvc.getAll().subscribe({
      next: users => {
        const teachers = users.filter(u => u.roleName?.toLowerCase() === 'teacher' && u.isActive);
        this.teachers.set(teachers);
        this.loadingTeachers.set(false);
        // pre-load counts for all teachers
        if (teachers.length > 0) {
          forkJoin(teachers.map(t => this.svc.getAssignmentsByTeacher(t.userId))).subscribe({
            next: results => {
              const m = new Map<number, number>();
              teachers.forEach((t, i) => m.set(t.userId, results[i].length));
              this.allAssignments.set(m);
            }
          });
        }
      },
      error: () => this.loadingTeachers.set(false)
    });

    this.svc.getClasses().subscribe({ next: d => this.classes.set(d) });
  }

  assignmentCountFor(teacherId: number) {
    return this.allAssignments().get(teacherId) ?? 0;
  }

  selectTeacher(t: UserListDto) {
    this.selectedTeacher.set(t);
    this.loadingAssignments.set(true);
    this.svc.getAssignmentsByTeacher(t.userId).subscribe({
      next: d => { this.assignments.set(d); this.loadingAssignments.set(false); },
      error: () => this.loadingAssignments.set(false)
    });
  }

  openAssignModal() {
    this.modalSelectedSubjectIds = new Set<number>();
    this.modalSubjectClassMap    = new Map<number, number>();
    this.expandedClasses         = new Set<number>();
    this.assignError.set('');
    this.loadingModalSubjects.set(true);
    this.showAssign.set(true);

    // Load all class subjects in parallel
    const classes = this.classes();
    const alreadyAssigned = new Set(this.assignments().map(a => a.id));

    forkJoin(classes.map(c => this.svc.getClassSubjects(c.classId))).subscribe({
      next: results => {
        const list = classes.map((c, i) => ({
          classId: c.classId,
          className: c.className,
          section: c.section,
          availableSubjects: results[i].filter(s => !alreadyAssigned.has(s.id))
        })).filter(c => c.availableSubjects.length > 0);

        // Build reverse map and auto-expand all classes
        list.forEach(c => {
          c.availableSubjects.forEach(s => this.modalSubjectClassMap.set(s.id, c.classId));
          this.expandedClasses.add(c.classId);
        });

        this.modalClassList.set(list);
        this.loadingModalSubjects.set(false);
      },
      error: () => this.loadingModalSubjects.set(false)
    });
  }

  toggleClassExpand(classId: number) {
    const s = new Set(this.expandedClasses);
    s.has(classId) ? s.delete(classId) : s.add(classId);
    this.expandedClasses = s;
  }

  toggleModalSubjectWithClass(subjectId: number, _classId: number) {
    const s = new Set(this.modalSelectedSubjectIds);
    s.has(subjectId) ? s.delete(subjectId) : s.add(subjectId);
    this.modalSelectedSubjectIds = s;
  }

  toggleClassSelectAll(cls: { classId: number; availableSubjects: ClassSubjectDto[] }) {
    const s = new Set(this.modalSelectedSubjectIds);
    const allSelected = cls.availableSubjects.every(sub => s.has(sub.id));
    cls.availableSubjects.forEach(sub => allSelected ? s.delete(sub.id) : s.add(sub.id));
    this.modalSelectedSubjectIds = s;
  }

  doAssign() {
    const teacher = this.selectedTeacher();
    if (!teacher || this.modalSelectedSubjectIds.size === 0) return;

    this.assigning.set(true);

    // Group selected subjects by class
    const byClass = new Map<number, ClassSubjectDto[]>();
    for (const cls of this.modalClassList()) {
      const selected = cls.availableSubjects.filter(s => this.modalSelectedSubjectIds.has(s.id));
      if (selected.length > 0) byClass.set(cls.classId, selected);
    }

    const calls: import('rxjs').Observable<ClassSubjectDto>[] = [];
    byClass.forEach((subjects, classId) => {
      subjects.forEach(s => {
        calls.push(this.svc.assignSubjectToClass(classId, { subjectId: s.subjectId, teacherId: teacher.userId }));
      });
    });

    forkJoin(calls).subscribe({
      next: (results: ClassSubjectDto[]) => {
        this.assignments.update(list => [...list, ...results]);
        const m = new Map(this.allAssignments());
        m.set(teacher.userId, (m.get(teacher.userId) ?? 0) + results.length);
        this.allAssignments.set(m);
        this.showAssign.set(false);
        this.assigning.set(false);
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
      this.svc.unassignTeacherFromSubject(a.classId, a.id).subscribe({
        next: () => {
          const teacher = this.selectedTeacher();
          this.assignments.update(list => list.filter(x => x.id !== a.id));
          if (teacher) {
            const m = new Map(this.allAssignments());
            m.set(teacher.userId, Math.max(0, (m.get(teacher.userId) ?? 1) - 1));
            this.allAssignments.set(m);
          }
          Swal.fire({
            html: `<div style="display:flex;flex-direction:column;align-items:center;gap:12px;padding:8px 0">
              <div style="width:50px;height:50px;border-radius:14px;background:#dcfce7;display:flex;align-items:center;justify-content:center">
                <span class="material-icons-round" style="font-size:24px;color:#16a34a;font-variation-settings:'FILL' 1">check_circle</span>
              </div>
              <div style="font-size:15px;font-weight:700;color:${colors.t1}">Assignment Removed</div>
            </div>`,
            background: colors.bg, timer: 1600, showConfirmButton: false,
            customClass: { popup: 'swal-app-popup', timerProgressBar: 'swal-progress-green' },
            timerProgressBar: true, buttonsStyling: false,
            showClass: { popup: 'swal-show' }, hideClass: { popup: 'swal-hide' },
          });
        },
        error: () => Swal.fire({ text: 'Failed to remove. Please try again.', icon: 'error' })
      });
    });
  }

  initials(name: string) {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }

  avatarColor(name: string) {
    const palette = ['#7c3aed','#0891b2','#059669','#d97706','#db2777','#ea580c','#0284c7'];
    let hash = 0;
    for (const c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash);
    return palette[Math.abs(hash) % palette.length];
  }
}
