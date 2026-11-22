import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { Tag } from 'primeng/tag';
import { Dialog } from 'primeng/dialog';
import { Tooltip } from 'primeng/tooltip';
import { AcademicService } from '../../../core/services/academic.service';
import { SubjectDto, ClassDto, ClassSubjectDto } from '../../../core/models/academic.model';
import { UserService } from '../../../core/services/user.service';
import { UserListDto } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { InstituteService } from '../../../core/services/institute.service';
import { InstituteDto } from '../../../core/models/institute.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { ConfirmDeleteComponent } from '../../../shared/components/confirm-delete/confirm-delete.component';
import { ConfirmDeleteService } from '../../../shared/components/confirm-delete/confirm-delete.service';

const PERIOD_ICONS = ['menu_book','calculate','science','language','mosque','computer','sports_soccer','music_note','palette','biotech'];

@Component({
  selector: 'app-subjects',
  standalone: true,
  imports: [
    CommonModule, FormsModule, PageHeaderComponent, EmptyStateComponent, LoadingComponent, ConfirmDeleteComponent,
    Button, Select, InputText, Tag, Dialog, Tooltip
  ],
  template: `
    <div class="os-page compact">
    <app-page-header title="Subjects" [dense]="true" routeUrl="/academics/subjects" />

    <div class="two-col">

      <!-- ═══ LEFT: Master Subject List ═══ -->
      <div class="os-stage">
        <div class="os-stage-bar">
          <div class="panel-title">
            <span class="material-icons-round">library_books</span>
            Master Subjects
          </div>
          @if (!showAdd()) {
            <p-button label="Add" icon="pi pi-plus" size="small" (onClick)="openAdd()" />
          }
        </div>
        <div class="os-stage-body">

        <!-- Add subject form — pinned below header -->
        @if (showAdd()) {
          <div class="add-form">
            <input pInputText class="add-input" [(ngModel)]="newName" placeholder="Subject name (e.g. Islamiat)"
                   (keyup.enter)="addSubject()" autofocus />
            @if (isSuperAdmin) {
              <p-select
                class="add-select"
                [options]="institutes()"
                optionLabel="name"
                optionValue="instituteId"
                placeholder="— Institute —"
                [showClear]="true"
                appendTo="body"
                [(ngModel)]="newInstituteId" />
            }
            <div class="flex items-center gap-1.5">
              <p-button
                icon="pi pi-check"
                size="small"
                ariaLabel="Add subject"
                pTooltip="Add"
                [disabled]="!newName.trim()"
                (onClick)="addSubject()" />
              <p-button
                icon="pi pi-times"
                size="small"
                severity="secondary"
                [outlined]="true"
                ariaLabel="Cancel"
                pTooltip="Cancel"
                (onClick)="showAdd.set(false)" />
            </div>
          </div>
        }

        @if (subjectError()) {
          <p class="error-msg px-4 pb-2">{{ subjectError() }}</p>
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
                    <input pInputText class="inline-input" [(ngModel)]="editName" (keyup.enter)="saveEdit(s)" (keyup.escape)="editId.set(0)" autofocus />
                  } @else {
                    <span class="subject-name">{{ s.subjectName }}</span>
                    @if (isSuperAdmin && s.instituteName) {
                      <p-tag [value]="s.instituteName" severity="secondary" [rounded]="true" />
                    }
                  }
                </div>
                <div class="flex shrink-0 gap-1">
                  @if (editId() === s.subjectId) {
                    <p-button icon="pi pi-check" [text]="true" [rounded]="true" size="small" severity="success"
                              ariaLabel="Save" pTooltip="Save" (onClick)="saveEdit(s)" />
                    <p-button icon="pi pi-times" [text]="true" [rounded]="true" size="small" severity="secondary"
                              ariaLabel="Cancel" pTooltip="Cancel" (onClick)="editId.set(0)" />
                  } @else {
                    <p-button icon="pi pi-pencil" [text]="true" [rounded]="true" size="small" severity="secondary"
                              ariaLabel="Edit" pTooltip="Edit" (onClick)="startEdit(s)" />
                  }
                </div>
              </div>
            }
          </div>
        }
        </div>
      </div>

      <!-- ═══ RIGHT: Class-wise Subject Assignment ═══ -->
      <div class="os-stage">
        <div class="os-stage-bar">
          <div class="panel-title">
            <span class="material-icons-round">class</span>
            Assign Subjects to Class
          </div>
        </div>
        <div class="os-stage-body">

        <!-- Class selector -->
        <div class="class-selector">
          <label class="sel-label">Select Class</label>
          <div class="flex flex-wrap gap-2">
            @for (c of classes(); track c.classId) {
              <p-button
                [label]="c.className + (c.section ? ' ' + c.section : '')"
                size="small"
                [rounded]="true"
                [outlined]="selectedClass()?.classId !== c.classId"
                [severity]="selectedClass()?.classId === c.classId ? 'primary' : 'secondary'"
                (onClick)="selectClass(c)" />
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
              <p-button label="Assign Subject" icon="pi pi-plus" size="small" (onClick)="openAssign()" />
            </div>

            @if (loadingClassSubjects()) {
              <app-loading />
            } @else if (classSubjects().length === 0) {
              <app-empty-state icon="library_books" title="No subjects assigned" message="Assign subjects to this class using the button above" />
            } @else {
              <div class="flex flex-col">
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
                    <div class="ml-auto flex shrink-0 items-center gap-2">
                      <p-tag
                        class="cursor-pointer"
                        [value]="cs.isActive ? 'Active' : 'Inactive'"
                        [severity]="cs.isActive ? 'success' : 'secondary'"
                        [rounded]="true"
                        [pTooltip]="cs.isActive ? 'Mark Inactive' : 'Mark Active'"
                        (click)="toggleSubjectStatus(cs)" />
                      <p-button icon="pi pi-trash" [text]="true" [rounded]="true" size="small" severity="danger"
                                ariaLabel="Remove subject" pTooltip="Remove subject" (onClick)="removeSubject(cs)" />
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
    </div>
    </div>

    <!-- Assign Subject Dialog -->
    <p-dialog
      [visible]="showAssign()"
      (visibleChange)="showAssign.set($event)"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
      [style]="{ width: '34rem' }"
      [breakpoints]="{ '640px': '96vw' }">

      <ng-template #header>
        <div>
          <h3 class="assign-title">Assign Subject</h3>
          <p class="assign-sub">{{ selectedClass()?.className }}{{ selectedClass()?.section ? ' — ' + selectedClass()?.section : '' }}</p>
        </div>
      </ng-template>

      @if (availableSubjects().length === 0) {
        <div class="assign-empty">
          <span class="material-icons-round">check_circle</span>
          <p>All subjects are already assigned to this class.</p>
        </div>
      } @else {
        <div class="pick-label-row">
          <p class="pick-label">Select subjects to assign</p>
          <p-button
            [label]="assignSubjectIds.size === availableSubjects().length ? 'Deselect All' : 'Select All'"
            [link]="true"
            size="small"
            (onClick)="toggleSelectAll()" />
        </div>
        <div class="subject-cards">
          @for (s of availableSubjects(); track s.subjectId; let i = $index) {
            <button type="button" class="subject-card" [class.selected]="assignSubjectIds.has(s.subjectId)"
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
        <p class="error-msg">{{ assignError() }}</p>
      }

      <ng-template #footer>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <p-button label="Cancel" severity="secondary" [outlined]="true" (onClick)="showAssign.set(false)" />
          @if (availableSubjects().length > 0) {
            <p-button
              [label]="assigning()
                ? 'Assigning…'
                : 'Assign ' + (assignSubjectIds.size > 0 ? assignSubjectIds.size + ' Subject' + (assignSubjectIds.size > 1 ? 's' : '') : 'Subjects')"
              icon="pi pi-check"
              [loading]="assigning()"
              [disabled]="assignSubjectIds.size === 0 || assigning()"
              (onClick)="assignSubjects()" />
          }
        </div>
      </ng-template>
    </p-dialog>

    <app-confirm-delete />
  `,
  styles: [`
    :host { display: block; width: 100%; }

    .two-col {
      display: grid;
      grid-template-columns: minmax(280px, 340px) 1fr;
      gap: 20px;
      align-items: start;
      width: 100%;
    }
    @media (max-width: 900px) {
      .two-col {
        grid-template-columns: 1fr !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 16px !important;
        width: 100% !important;
        align-items: stretch !important;
      }
    }

    .os-stage { width: 100%; box-sizing: border-box; min-width: 0; }
    .os-stage-bar { flex-wrap: nowrap; }
    .panel-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 13px; font-weight: 700; color: var(--t1);
    }
    .panel-title .material-icons-round { font-size: 18px; color: var(--accent); }

    /* Subject list */
    .subject-list { display: flex; flex-direction: column; }
    .subject-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 7px 14px; border-bottom: 1px solid var(--border);
      transition: background 0.1s; gap: 10px;
    }
    .subject-row:last-child { border-bottom: none; }
    .subject-row:hover, .subject-row.editing { background: var(--surface-2); }

    .subject-info { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
    .subject-icon {
      width: 34px; height: 34px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .subject-icon .material-icons-round { font-size: 17px; color: #fff; font-variation-settings: 'FILL' 1; }
    .subject-name { font-size: 13.5px; font-weight: 600; color: var(--t1); word-break: break-word; }
    .inline-input { flex: 1; min-width: 0; }

    .add-form {
      display: flex; gap: 8px; align-items: center; flex-wrap: wrap;
      padding: 12px 14px; border-bottom: 2px solid var(--accent);
      background: color-mix(in srgb, var(--accent) 5%, var(--surface));
    }
    .add-input { flex: 1 1 180px; }
    .add-select { flex: 1 1 130px; min-width: 0; }

    /* Class selector */
    .class-selector { padding: 10px 14px; border-bottom: 1px solid var(--border); }
    .sel-label { font-size: 11px; font-weight: 700; color: var(--t4); text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 10px; display: block; }
    .no-classes { font-size: 13px; color: var(--t4); }

    /* Periods section */
    .periods-section { padding: 0; }
    .periods-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 14px; border-bottom: 1px solid var(--border);
      background: var(--surface-2); gap: 10px; flex-wrap: wrap;
    }
    .periods-title { font-size: 13px; font-weight: 700; color: var(--t2); }

    .assigned-row {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 14px; border-bottom: 1px solid var(--border);
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

    /* Assign dialog */
    .assign-title { font-size: 16px; font-weight: 800; color: var(--t1); margin: 0; }
    .assign-sub { font-size: 12.5px; color: var(--t4); margin: 3px 0 0; }

    .pick-label-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 0 8px;
    }
    .pick-label {
      font-size: 11px; font-weight: 700; color: var(--t4);
      text-transform: uppercase; letter-spacing: 0.8px;
      margin: 0;
    }
    .subject-cards {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 10px; max-height: 280px; overflow-y: auto; padding: 2px;
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

    .assign-empty {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 24px 12px; color: var(--t4);
    }
    .assign-empty .material-icons-round { font-size: 36px; color: var(--green); }
    .assign-empty p { font-size: 13px; text-align: center; }

    .error-msg { color: #ef4444; font-size: 12.5px; margin: 8px 0 0; }

    @media (max-width: 768px) {
      .class-selector { padding: 10px 12px; }
      .periods-header { padding: 10px 12px; }
      .assigned-row { padding: 8px 12px; gap: 10px; }
      .add-form { flex-direction: column; align-items: stretch; gap: 8px; padding: 10px 12px; }
      .add-input { width: 100%; flex: 1 1 auto; }
      .add-select { max-width: 100%; width: 100%; flex: 1 1 auto; }
      .subject-cards { grid-template-columns: repeat(2, 1fr); }
    }
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
