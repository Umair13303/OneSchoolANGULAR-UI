import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Tag } from 'primeng/tag';
import { Dialog } from 'primeng/dialog';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { Tooltip } from 'primeng/tooltip';

import { AcademicService } from '../../../core/services/academic.service';
import { UserService } from '../../../core/services/user.service';
import { UserListDto } from '../../../core/models/user.model';
import { ClassDto, ClassSubjectDto } from '../../../core/models/academic.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';

const COLORS = ['#7c3aed','#059669','#0891b2','#d97706','#db2777','#ea580c','#16a34a','#0284c7','#7c3aed','#dc2626'];
const ICONS  = ['menu_book','calculate','science','language','mosque','computer','sports_soccer','music_note','palette','biotech'];

@Component({
  selector: 'app-teacher-assignments',
  standalone: true,
  imports: [
    CommonModule, FormsModule, PageHeaderComponent, EmptyStateComponent, LoadingComponent,
    Button, InputText, Tag, Dialog, IconField, InputIcon, Tooltip
  ],
  template: `
    <div class="os-page compact">
    <app-page-header title="Teacher Assignments" [dense]="true" routeUrl="/academics/teacher-assignments" />
    <p class="flow-hint">Subject teachers per class. Use Class Teachers only for homeroom / unassigned subjects — it does not replace specialists.</p>

    <div class="two-col">

      <!-- ═══ LEFT: Teacher List ═══ -->
      <div class="os-stage">
        <div class="os-stage-bar">
          <div class="os-toolbar-group grow">
            <p-iconfield class="search-field">
              <p-inputicon class="pi pi-search" />
              <input pInputText class="w-full" placeholder="Search teacher…" [ngModel]="teacherSearch()" (ngModelChange)="teacherSearch.set($event)" />
            </p-iconfield>
          </div>
          <span class="count">{{ filteredTeachers().length }} of {{ teachers().length }}</span>
        </div>

        <div class="os-stage-body">
        @if (loadingTeachers()) {
          <div class="state-pad"><app-loading /></div>
        } @else if (filteredTeachers().length === 0) {
          <div class="state-pad">
            <app-empty-state icon="people" title="No teachers" message="No teachers found." />
          </div>
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
                <p-tag
                  [value]="'' + assignmentCountFor(t.userId)"
                  [severity]="assignmentCountFor(t.userId) > 0 ? 'info' : 'secondary'"
                  [rounded]="true" />
              </button>
            }
          </div>
        }
        </div>
      </div>

      <!-- ═══ RIGHT: Assignments Panel ═══ -->
      <div class="os-stage">

        @if (!selectedTeacher()) {
          <div class="os-stage-bar">
            <div class="panel-title">
              <span class="material-icons-round">assignment_ind</span>
              Assignments
            </div>
          </div>
          <div class="os-stage-body">
            <div class="state-pad">
              <app-empty-state icon="touch_app" title="Select a teacher" message="Pick a teacher on the left to manage their class & subject assignments" />
            </div>
          </div>

        } @else {
          <div class="os-stage-bar">
            <div class="teacher-selected-info">
              <div class="t-av lg" [style.background]="avatarColor(selectedTeacher()!.fullName)">{{ initials(selectedTeacher()!.fullName) }}</div>
              <div>
                <div class="sel-name">{{ selectedTeacher()!.fullName }}</div>
                <div class="sel-meta">{{ selectedTeacher()!.specialization || selectedTeacher()!.qualification || 'Teacher' }}</div>
              </div>
            </div>
            <p-button label="Assign" icon="pi pi-plus" size="small" (onClick)="openAssignModal()" />
          </div>

          <div class="os-stage-body">
          @if (loadingAssignments()) {
            <div class="state-pad"><app-loading /></div>
          } @else if (assignments().length === 0) {
            <div class="state-pad">
              <app-empty-state icon="assignment_ind" title="No assignments yet"
                message="Click Assign to give this teacher classes and subjects" />
            </div>
          } @else {
            <!-- Group by class -->
            @for (group of groupedAssignments(); track group.classId) {
              <div class="class-group">
                <div class="class-group-header">
                  <span class="material-icons-round">class</span>
                  {{ group.className }}{{ group.classSection ? ' — ' + group.classSection : '' }}
                  <p-tag class="ml-auto"
                    [value]="group.subjects.length + ' subject' + (group.subjects.length !== 1 ? 's' : '')"
                    severity="secondary" [rounded]="true" />
                </div>
                <div class="assignment-list">
                  @for (a of group.subjects; track a.id; let i = $index) {
                    <div class="assignment-row">
                      <div class="a-icon" [style.background]="COLORS[i % COLORS.length]">
                        <span class="material-icons-round">{{ ICONS[i % ICONS.length] }}</span>
                      </div>
                      <span class="a-subject">{{ a.subjectName }}</span>
                      <p-tag class="ml-auto"
                        [value]="a.isActive ? 'Active' : 'Inactive'"
                        [severity]="a.isActive ? 'success' : 'danger'"
                        [rounded]="true" />
                      <p-button
                        icon="pi pi-user-minus"
                        [text]="true"
                        [rounded]="true"
                        size="small"
                        severity="danger"
                        ariaLabel="Remove assignment"
                        pTooltip="Remove assignment"
                        (onClick)="unassign(a)" />
                    </div>
                  }
                </div>
              </div>
            }
          }
          </div>
        }
      </div>
    </div>
    </div>

    <!-- ═══ Assign Modal ═══ -->
    <p-dialog
      [visible]="showAssign()"
      (visibleChange)="showAssign.set($event)"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
      [contentStyle]="{ padding: '0' }"
      [style]="{ width: '36rem' }"
      [breakpoints]="{ '640px': '96vw' }">

          <ng-template #header>
            <div>
              <h3 class="assign-title">Assign Classes &amp; Subjects</h3>
              <p class="assign-sub">{{ selectedTeacher()?.fullName }} — tick subjects across any class</p>
            </div>
          </ng-template>

          @if (loadingModalSubjects()) {
            <div class="p-6"><app-loading /></div>
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
                      <p-tag value="All assigned" severity="success" [rounded]="true" />
                    } @else {
                      <p-button
                        [label]="classSelectionCount(cls.classId) === cls.availableSubjects.length ? 'Deselect All' : 'Select All'"
                        [link]="true"
                        size="small"
                        (onClick)="toggleClassSelectAll(cls)"
                        (click)="$event.stopPropagation()" />
                      @if (classSelectionCount(cls.classId) > 0) {
                        <p-tag [value]="classSelectionCount(cls.classId) + ' selected'" severity="info" [rounded]="true" />
                      }
                    }
                  </div>

                  @if (expandedClasses.has(cls.classId) && cls.availableSubjects.length > 0) {
                    <div class="mcl-subjects">
                      @for (s of cls.availableSubjects; track s.id; let i = $index) {
                        <label class="mcl-subject-row" [class.checked]="modalSelectedSubjectIds.has(s.id)"
                               [class.has-other]="isHeldByOther(s)">
                          <input type="checkbox" [checked]="modalSelectedSubjectIds.has(s.id)"
                                 (change)="toggleModalSubjectWithClass(s.id, cls.classId)" />
                          <div class="mcl-s-icon" [style.background]="COLORS[i % COLORS.length]">
                            <span class="material-icons-round">{{ ICONS[i % ICONS.length] }}</span>
                          </div>
                          <div class="mcl-s-text">
                            <span class="mcl-s-name">{{ s.subjectName }}</span>
                            @if (isHeldByOther(s)) {
                              <span class="mcl-s-held">Assigned to {{ s.teacherName }}</span>
                            }
                          </div>
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
            <p class="error-msg px-5 py-2">{{ assignError() }}</p>
          }

          <ng-template #footer>
            <div class="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
              <span class="total-selected">
                @if (totalSelectedCount() > 0) {
                  {{ totalSelectedCount() }} subject{{ totalSelectedCount() > 1 ? 's' : '' }} selected
                }
              </span>
              <p-button label="Cancel" severity="secondary" [outlined]="true" (onClick)="showAssign.set(false)" />
              <p-button
                [label]="assigning()
                  ? 'Assigning…'
                  : 'Assign ' + (totalSelectedCount() > 0 ? totalSelectedCount() + ' Subject' + (totalSelectedCount() > 1 ? 's' : '') : '')"
                icon="pi pi-check"
                [loading]="assigning()"
                [disabled]="totalSelectedCount() === 0 || assigning()"
                (onClick)="doAssign()" />
            </div>
          </ng-template>
    </p-dialog>
  `,
  styles: [`
    :host { display: block; width: 100%; }
    .flow-hint {
      margin: -4px 0 8px;
      font-size: 12px;
      font-weight: 550;
      color: var(--t3);
      line-height: 1.35;
    }

    .two-col {
      display: grid;
      grid-template-columns: minmax(260px, 320px) 1fr;
      gap: 12px;
      align-items: start;
      width: 100%;
    }
    .two-col > .os-stage { min-width: 0; }
    @media (max-width: 860px) {
      .two-col {
        grid-template-columns: 1fr !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 16px !important;
        width: 100% !important;
        align-items: stretch !important;
      }
      .two-col > .os-stage {
        width: 100% !important;
        max-width: 100% !important;
      }
      .search-field { max-width: none; }
    }

    .os-toolbar-group.grow { flex: 1 1 auto; min-width: 0; display: flex; align-items: center; gap: 8px; }
    .search-field { flex: 1 1 160px; min-width: 0; max-width: 360px; display: block; }
    .count {
      flex-shrink: 0; font-size: 12px; font-weight: 650; color: var(--t4);
      font-variant-numeric: tabular-nums;
    }
    .state-pad { padding: 28px 16px; }
    .panel-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 13px; font-weight: 700; color: var(--t1);
    }
    .panel-title .material-icons-round { font-size: 18px; color: var(--accent); }

    /* Teacher list */
    .teacher-list { display: flex; flex-direction: column; max-height: 560px; overflow-y: auto; }
    .teacher-row {
      display: flex; align-items: center; gap: 10px;
      padding: 7px 14px; border: none; background: transparent;
      cursor: pointer; text-align: left; width: 100%;
      border-bottom: 1px solid var(--border); font-family: inherit;
      transition: background 0.12s;
    }
    .teacher-row:last-child { border-bottom: none; }
    .teacher-row:hover { background: var(--surface-2); }
    .teacher-row.active { background: var(--accent-s); }

    .t-av {
      width: 32px; height: 32px; border-radius: 4px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 800; color: #fff;
    }
    .t-av.lg { width: 36px; height: 36px; border-radius: 4px; font-size: 13px; }
    .t-info { flex: 1; min-width: 0; }
    .t-name { display: block; font-size: 13.5px; font-weight: 700; color: var(--t1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .t-meta { display: block; font-size: 11.5px; color: var(--t4); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    /* Selected teacher header */
    .teacher-selected-info { display: flex; align-items: center; gap: 10px; }
    .sel-name { font-size: 14px; font-weight: 800; color: var(--t1); }
    .sel-meta { font-size: 12px; color: var(--t4); }

    /* Class groups */
    .class-group { border-bottom: 1px solid var(--border); }
    .class-group:last-child { border-bottom: none; }
    .class-group-header {
      display: flex; align-items: center; gap: 7px;
      padding: 7px 14px; background: var(--surface-2);
      font-size: 12.5px; font-weight: 700; color: var(--t2);
      border-bottom: 1px solid var(--border);
    }
    .class-group-header .material-icons-round { font-size: 16px; color: var(--accent); }
    .assignment-list { display: flex; flex-direction: column; }
    .assignment-row {
      display: flex; align-items: center; gap: 10px;
      padding: 6px 14px; border-bottom: 1px solid var(--border);
      transition: background 0.1s;
    }
    .assignment-row:last-child { border-bottom: none; }
    .assignment-row:hover { background: var(--surface-2); }

    .a-icon {
      width: 28px; height: 28px; border-radius: 4px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .a-icon .material-icons-round { font-size: 16px; color: #fff; font-variation-settings: 'FILL' 1; }
    .a-subject { font-size: 13.5px; font-weight: 600; color: var(--t1); flex: 1; }
    .ml-auto { margin-left: auto; }

    /* Assign dialog */
    .assign-title { font-size: 16px; font-weight: 800; color: var(--t1); margin: 0; }
    .assign-sub { font-size: 12px; color: var(--t4); margin: 3px 0 0; }

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
    .mcl-s-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
    .mcl-s-name { font-size: 13px; font-weight: 600; color: var(--t1); }
    .mcl-s-held { font-size: 11px; font-weight: 600; color: var(--t4); }
    .mcl-subject-row.has-other { background: color-mix(in srgb, #f59e0b 8%, var(--surface)); }
    .mcl-check { font-size: 16px; color: var(--accent); flex-shrink: 0; }

    .total-selected { font-size: 12px; font-weight: 600; color: var(--accent); flex: 1; }
    .error-msg { color: #ef4444; font-size: 12.5px; margin: 0; }

    @media (max-width: 768px) {
      .two-col { display: flex !important; flex-direction: column !important; gap: 12px !important; }
    }
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
  teacherSearch   = signal('');

  showAssign              = signal(false);
  loadingModalSubjects    = signal(false);
  modalClassList          = signal<{ classId: number; className: string; section: string | null; availableSubjects: ClassSubjectDto[] }[]>([]);
  modalSelectedSubjectIds = new Set<number>();           // classSubject ids
  modalSubjectClassMap    = new Map<number, number>();   // classSubjectId -> classId
  expandedClasses         = new Set<number>();
  assignError             = signal('');
  assigning               = signal(false);

  filteredTeachers = computed(() => {
    const q = this.teacherSearch().trim().toLowerCase();
    return this.teachers().filter(t => !q || t.fullName.toLowerCase().includes(q));
  });

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

  isHeldByOther(s: ClassSubjectDto): boolean {
    const teacher = this.selectedTeacher();
    return !!s.teacherId && s.teacherId > 0 && (!teacher || s.teacherId !== teacher.userId);
  }

  doAssign() {
    const teacher = this.selectedTeacher();
    if (!teacher || this.modalSelectedSubjectIds.size === 0) return;

    const selected: ClassSubjectDto[] = [];
    for (const cls of this.modalClassList()) {
      for (const s of cls.availableSubjects) {
        if (this.modalSelectedSubjectIds.has(s.id)) selected.push(s);
      }
    }
    const conflicts = selected.filter(s => this.isHeldByOther(s));

    if (conflicts.length > 0) {
      const names = conflicts.slice(0, 3).map(s => s.subjectName + (s.teacherName ? ` (${s.teacherName})` : '')).join(', ');
      const more = conflicts.length > 3 ? ` +${conflicts.length - 3} more` : '';
      Swal.fire({
        title: 'Replace existing teachers?',
        html: `<p style="font-size:13.5px;line-height:1.5;margin:0">${conflicts.length} selected subject${conflicts.length > 1 ? 's are' : ' is'} already assigned:<br><b>${names}${more}</b></p>`,
        showCancelButton: true,
        confirmButtonText: `Replace ${conflicts.length}`,
        cancelButtonText: 'Cancel',
        reverseButtons: true,
        focusCancel: true,
        customClass: { popup: 'swal-app-popup', confirmButton: 'swal-btn-danger', cancelButton: 'swal-btn-cancel', actions: 'swal-actions' },
        buttonsStyling: false,
      }).then(result => {
        if (result.isConfirmed) this.runAssign(teacher.userId, selected, true);
      });
      return;
    }

    this.runAssign(teacher.userId, selected, false);
  }

  private runAssign(teacherId: number, selected: ClassSubjectDto[], replaceExisting: boolean) {
    this.assigning.set(true);
    this.assignError.set('');

    const calls = selected.map(s =>
      this.svc.assignSubjectToClass(s.classId, {
        subjectId: s.subjectId,
        teacherId,
        replaceExisting
      })
    );

    forkJoin(calls).subscribe({
      next: (results: ClassSubjectDto[]) => {
        this.assignments.update(list => [...list, ...results]);
        const m = new Map(this.allAssignments());
        m.set(teacherId, (m.get(teacherId) ?? 0) + results.length);
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
