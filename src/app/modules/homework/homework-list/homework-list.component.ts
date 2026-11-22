import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { SelectButton } from 'primeng/selectbutton';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { Tag } from 'primeng/tag';
import { Dialog } from 'primeng/dialog';
import { Drawer } from 'primeng/drawer';
import { Message } from 'primeng/message';
import { HomeworkService } from '../../../core/services/homework.service';
import { AcademicService } from '../../../core/services/academic.service';
import { AuthService } from '../../../core/services/auth.service';
import { CurriculumService } from '../../../core/services/curriculum.service';
import { HomeworkDto, SubmissionDto } from '../../../core/models/homework.model';
import { TeachingLogDto } from '../../../core/models/curriculum.model';
import { ClassDto, AcademicYear, SubjectDto } from '../../../core/models/academic.model';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ConfirmDeleteComponent } from '../../../shared/components/confirm-delete/confirm-delete.component';
import { ConfirmDeleteService } from '../../../shared/components/confirm-delete/confirm-delete.service';
import { MenuService } from '../../../core/services/menu.service';
import {
  classroomReturnQueryFromParamMap,
  isFromClassroom
} from '../../classroom/classroom-context.util';

type Tab = 'diary' | 'manage';
interface SelectOpt<T> { value: T; label: string; }

@Component({
  selector: 'app-homework-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule, PageHeaderComponent, LoadingComponent, EmptyStateComponent,
    ConfirmDeleteComponent, DatePickerComponent,
    Button, Select, SelectButton, InputText, Textarea, Tag, Dialog, Drawer, Message
  ],
  template: `
    <div class="os-page compact hw-list-page">
      <app-page-header [dense]="true" [title]="pageTitle()" routeUrl="/homework/list">
        <div class="flex flex-wrap items-center gap-2">
          @if (fromClassroom()) {
            <p-button label="Back to class" icon="pi pi-arrow-left" severity="secondary" [outlined]="true"
              [routerLink]="['/classroom/today']" [queryParams]="classroomReturnQp()" />
          }
          @if (isTeacher()) {
            <p-button label="Assign Homework" icon="pi pi-plus" routerLink="/homework/assign"
              [queryParams]="fromClassroom() ? assignPrefill() : null" />
          }
        </div>
      </app-page-header>

    <div class="os-stage">
    @if (isTeacher()) {
      <div class="os-stage-bar">
        <p-selectbutton
          [options]="tabOptions"
          optionLabel="label"
          optionValue="value"
          [allowEmpty]="false"
          [ngModel]="tab()"
          (ngModelChange)="tab.set($event ?? 'diary')" />
      </div>
    }

    <div class="os-stage-bar hw-filters">
      <div class="flex w-full flex-wrap items-end gap-3">
        <div class="flex min-w-[140px] flex-1 flex-col gap-1">
          <label class="os-field-label">Year</label>
          <p-select
            class="w-full"
            placeholder="All years"
            [options]="yearOptions()"
            optionLabel="label"
            optionValue="value"
            [showClear]="true"
            [ngModel]="selectedYear"
            (ngModelChange)="selectedYear = $event ?? null; onYearChange()" />
        </div>
        <div class="flex min-w-[140px] flex-1 flex-col gap-1">
          <label class="os-field-label">Class</label>
          <p-select
            class="w-full"
            placeholder="Select class"
            [options]="classOptions()"
            optionLabel="label"
            optionValue="value"
            [filter]="classOptions().length > 6"
            filterBy="label"
            [showClear]="true"
            [ngModel]="selectedClass"
            (ngModelChange)="selectedClass = $event ?? null; load()" />
        </div>
        <div class="flex min-w-[140px] flex-1 flex-col gap-1">
          <label class="os-field-label">Subject</label>
          <p-select
            class="w-full"
            placeholder="All subjects"
            [options]="subjectOptions()"
            optionLabel="label"
            optionValue="value"
            [filter]="subjectOptions().length > 6"
            filterBy="label"
            [showClear]="true"
            [ngModel]="selectedSubject"
            (ngModelChange)="selectedSubject = $event ?? null; load()" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="os-field-label">From</label>
          <div class="os-date-wrap"><app-date-picker [(ngModel)]="fromDate" (dateChange)="load()" /></div>
        </div>
        <div class="flex flex-col gap-1">
          <label class="os-field-label">To</label>
          <div class="os-date-wrap"><app-date-picker [(ngModel)]="toDate" (dateChange)="load()" /></div>
        </div>
        <p-button label="Clear" icon="pi pi-filter-slash" size="small" severity="secondary" [outlined]="true"
          (onClick)="clearFilters()" />
      </div>
    </div>

    @if (tab() === 'diary') {
      @if (loading()) { <div class="os-stage-body pad"><app-loading /></div> }
      @else if (!selectedClass) {
        <div class="os-stage-body pad"><app-empty-state message="Select a class to view the diary." icon="menu_book" /></div>
      } @else {
        <div class="os-stage-body pad">
        <!-- Today's Learning (curriculum teaching) — separate from Homework -->
        <div class="learning-panel">
          <h3 class="section-title">Today's Learning</h3>
          @if (learning().length === 0) {
            <div class="muted-empty">No teaching recorded for the selected filters.</div>
          } @else {
            <div class="learning-list">
              @for (group of learningBySubject(); track group.subject) {
                <div class="learning-group">
                  <div class="learning-subject">{{ group.subject }}</div>
                  @for (item of group.items; track item.courseTeachingLogId) {
                    <div class="learning-item">
                      <span class="learning-type">{{ item.teachingType }}</span>
                      <span>{{ item.chapterTitle ? item.chapterTitle + ' — ' : '' }}{{ item.topicTitle }}</span>
                      @if (item.remarks) { <span class="learning-remark">{{ item.remarks }}</span> }
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>

        <h3 class="section-title hw-section-title">Homework</h3>
        @if (homework().length === 0) {
          <app-empty-state message="No homework found for selected filters." icon="edit_note" />
        } @else {
        <!-- Summary strip -->
        <div class="summary-strip">
          <div class="sum-item"><span class="num">{{ homework().length }}</span><span>Total</span></div>
          <div class="sum-item due-soon"><span class="num">{{ dueSoon() }}</span><span>Due ≤ 3 days</span></div>
          <div class="sum-item overdue"><span class="num">{{ overdueCount() }}</span><span>Overdue</span></div>
        </div>

        <div class="hw-list">
          @for (hw of homework(); track hw.homeworkId) {
            <div class="hw-card card" [class.overdue-card]="isOverdue(hw.dueDate)"
                 [class.due-soon-card]="isDueSoon(hw.dueDate) && !isOverdue(hw.dueDate)">
              <div class="hw-top">
                <div class="hw-left">
                  <span class="subject-badge">{{ hw.subjectName }}</span>
                  <h3>{{ hw.title }}</h3>
                  @if (hw.description) { <p class="desc">{{ hw.description }}</p> }
                </div>
                <div class="hw-right">
                  <div class="due-pill" [class.overdue]="isOverdue(hw.dueDate)" [class.soon]="isDueSoon(hw.dueDate)">
                    @if (isOverdue(hw.dueDate)) { ⚠️ } @else if (isDueSoon(hw.dueDate)) { 🔔 }
                    Due {{ hw.dueDate }}
                  </div>
                  <div class="sub-count">
                    <span class="sub-icon">📤</span> {{ hw.submissionCount }} submitted
                  </div>
                </div>
              </div>
              <div class="hw-footer">
                <div class="footer-left">
                  <p-tag [value]="(hw.className + ' ' + (hw.section ?? '')).trim()" severity="secondary" />
                  <p-tag [value]="hw.teacherName" severity="secondary" />
                </div>
                <span class="assigned">Assigned: {{ hw.assignedDate }}</span>
              </div>
            </div>
          }
        </div>
        }
        </div>
      }
    }

    <!-- ── MANAGE TAB (teacher) ────────────────────────────────────────────── -->
    @if (tab() === 'manage' && isTeacher()) {
      @if (loading()) { <div class="os-stage-body pad"><app-loading /></div> }
      @else if (!selectedClass) {
        <div class="os-stage-body pad"><app-empty-state message="Select a class to manage homework." icon="assignment" /></div>
      } @else if (homework().length === 0) {
        <div class="os-stage-body pad"><app-empty-state message="No homework found. Assign some!" icon="edit_note" /></div>
      } @else {
        <div class="os-stage-body pad">
          <table class="table">
            <thead>
              <tr>
                <th>Title</th><th>Subject</th><th>Assigned</th><th>Due</th>
                <th>Submissions</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (hw of homework(); track hw.homeworkId) {
                <tr>
                  <td><strong>{{ hw.title }}</strong></td>
                  <td><span class="subject-badge-sm">{{ hw.subjectName }}</span></td>
                  <td>{{ hw.assignedDate }}</td>
                  <td>
                    <span [class]="duePillClass(hw.dueDate)">{{ hw.dueDate }}</span>
                  </td>
                  <td>
                    <span class="sub-badge" [class.good]="hw.submissionCount > 0">
                      {{ hw.submissionCount }} / ?
                    </span>
                  </td>
                  <td class="actions">
                    <p-button label="Submissions" icon="pi pi-eye" size="small" severity="info" [outlined]="true"
                      (onClick)="openSubmissions(hw)" />
                    <p-button label="Edit" icon="pi pi-pencil" size="small" severity="secondary" [outlined]="true"
                      (onClick)="openEdit(hw)" />
                    <p-button label="Delete" icon="pi pi-trash" size="small" severity="danger" [outlined]="true"
                      (onClick)="confirmDelete(hw)" />
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    }
    </div>

    <!-- ── SUBMISSIONS PANEL ───────────────────────────────────────────────── -->
    <p-drawer
      [visible]="submissionPanel()"
      (visibleChange)="$event ? null : closePanel()"
      position="right"
      [modal]="true"
      [style]="{ width: '42rem', maxWidth: '100vw' }">
      <ng-template #header>
        <div>
          <h3 class="panel-title">Submissions</h3>
          <p class="panel-sub">{{ activeHw()?.title }} — {{ activeHw()?.subjectName }}</p>
        </div>
      </ng-template>
        <div class="panel">
          @if (loadingSubs()) { <app-loading /> }
          @else if (submissions().length === 0) {
            <app-empty-state message="No submissions yet." icon="📭" />
          } @else {
            <table class="table">
              <thead>
                <tr><th>Student</th><th>Admission No</th><th>Submitted At</th><th>Status</th><th>Review</th></tr>
              </thead>
              <tbody>
                @for (s of submissions(); track s.submissionId) {
                  <tr>
                    <td>{{ s.studentName }}</td>
                    <td>{{ s.admissionNo }}</td>
                    <td>{{ s.submittedAt ? (s.submittedAt | date:'medium') : '—' }}</td>
                    <td>
                      <p-tag [value]="s.status" [severity]="subStatusSeverity(s.status)" [rounded]="true" />
                    </td>
                    <td>
                      @if (s.status !== 'Reviewed') {
                        <p-button label="Mark Reviewed" icon="pi pi-check" size="small" severity="secondary"
                          [outlined]="true" (onClick)="markReviewed(s)" />
                      } @else {
                        <p-tag value="Reviewed" icon="pi pi-check" severity="success" />
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
            <div class="panel-stats">
              <span>{{ submissions().length }} submitted</span>
              <span>{{ reviewedCount() }} reviewed</span>
            </div>
          }
        </div>
    </p-drawer>

    <!-- ── EDIT DIALOG ─────────────────────────────────────────────────────── -->
    <p-dialog
      [visible]="editModal()"
      (visibleChange)="editModal.set($event)"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
      header="Edit Homework"
      [style]="{ width: '32rem' }"
      [breakpoints]="{ '640px': '96vw' }">
      <div class="flex flex-col gap-3">
        <div class="flex flex-col gap-1">
          <label class="os-field-label">Title *</label>
          <input pInputText class="w-full" [(ngModel)]="editForm.title" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="os-field-label">Description</label>
          <textarea pTextarea class="w-full" [(ngModel)]="editForm.description" rows="3"></textarea>
        </div>
        <div class="flex flex-col gap-1">
          <label class="os-field-label">Due Date *</label>
          <app-date-picker [(ngModel)]="editForm.dueDate" />
        </div>
        @if (editError()) { <p-message severity="error" icon="pi pi-exclamation-circle" [text]="editError()" /> }
      </div>
      <ng-template #footer>
        <p-button label="Cancel" severity="secondary" [outlined]="true" (onClick)="editModal.set(false)" />
        <p-button [label]="saving() ? 'Saving...' : 'Save'" icon="pi pi-save" [loading]="saving()"
          [disabled]="saving()" (onClick)="saveEdit()" />
      </ng-template>
    </p-dialog>

    <app-confirm-delete />
    </div>
  `,
  styles: [`
    :host { display:block; min-width:0; }

    .hw-filters {
      flex-wrap: wrap;
      row-gap: 10px;
    }
    @media (max-width: 640px) {
      .hw-filters .os-date-wrap { width: 100%; }
      .actions { flex-wrap: wrap; }
    }

    .tab-bar { display:flex; gap:0; margin-bottom:20px; border-bottom:2px solid var(--border); }
    .tab-bar button { padding:10px 24px; border:none; background:none; cursor:pointer; font-size:14px; color:var(--t4); font-family:inherit; }
    .tab-bar button.active { color:var(--accent); font-weight:700; border-bottom:2px solid var(--accent); margin-bottom:-2px; }

    .filters { padding:14px 16px; margin-bottom:20px; }
    .filter-row { display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
    select, input[type=date] { padding:8px 12px; border:1px solid var(--border); border-radius:6px; font-size:13px; min-width:130px; background:var(--surface); color:var(--t1); }
    .btn-clear { padding:8px 14px; border:1px solid var(--border); border-radius:6px; background:var(--surface-2); cursor:pointer; font-size:13px; color:var(--t3); font-family:inherit; }

    .summary-strip { display:flex; gap:14px; margin-bottom:20px; }
    .section-title { font-size: 1rem; font-weight: 700; margin: 0 0 .75rem; }
    .hw-section-title { margin: 1.25rem 0 .75rem; }
    .learning-panel { margin-bottom: .5rem; }
    .muted-empty { color: var(--t4, #9ca3af); font-size: .9rem; }
    .learning-list { display: grid; gap: .75rem; }
    .learning-subject { font-weight: 700; font-size: .9rem; margin-bottom: .35rem; }
    .learning-item { display: flex; flex-wrap: wrap; gap: .4rem .65rem; align-items: baseline; font-size: .9rem; padding: .25rem 0; }
    .learning-type { font-size: .7rem; font-weight: 600; background: #eff6ff; color: #1d4ed8; padding: .1rem .4rem; border-radius: 4px; }
    .learning-remark { color: var(--t3, #6b7280); font-size: .85rem; width: 100%; }

    .sum-item { background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:14px 22px; box-shadow:var(--sh);
      display:flex; flex-direction:column; align-items:center; gap:4px; }
    .sum-item .num { font-size:26px; font-weight:700; color:var(--accent); }
    .sum-item span:last-child { font-size:12px; color:var(--t4); }
    .sum-item.due-soon .num { color:var(--amber); }
    .sum-item.overdue .num  { color:var(--red); }

    .hw-list { display:flex; flex-direction:column; gap:14px; }
    .hw-card { padding:18px 20px; border-left:4px solid transparent; }
    .hw-card.overdue-card  { border-left-color:var(--red); }
    .hw-card.due-soon-card { border-left-color:var(--amber); }

    .hw-top { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; margin-bottom:12px; }
    .hw-left { flex:1; }
    .subject-badge { display:inline-block; padding:2px 10px; background:var(--accent-s); color:var(--accent);
      border-radius:10px; font-size:12px; font-weight:600; margin-bottom:6px; }
    .hw-left h3 { font-size:16px; color:var(--t1); }
    .desc { color:var(--t3); font-size:13.5px; margin-top:6px; }

    .hw-right { display:flex; flex-direction:column; align-items:flex-end; gap:8px; flex-shrink:0; }
    .due-pill { padding:4px 12px; border-radius:20px; font-size:12px; font-weight:600;
      background:var(--green-s); color:var(--green); }
    .due-pill.overdue { background:var(--red-s); color:var(--red); }
    .due-pill.soon    { background:var(--amber-s); color:var(--amber); }
    .sub-count { font-size:12px; color:var(--t4); display:flex; align-items:center; gap:4px; }

    .hw-footer { display:flex; justify-content:space-between; align-items:center;
      border-top:1px solid var(--border); padding-top:10px; }
    .footer-left { display:flex; gap:8px; }
    .assigned { font-size:12px; color:var(--t4); }

    /* Manage tab */
    .subject-badge-sm { padding:2px 8px; background:var(--accent-s); color:var(--accent); border-radius:8px; font-size:11px; font-weight:600; }
    .due-normal { color:var(--green); font-size:12px; font-weight:600; }
    .due-warn   { color:var(--amber); font-size:12px; font-weight:600; }
    .due-late   { color:var(--red); font-size:12px; font-weight:600; }
    .sub-badge  { padding:3px 10px; border-radius:10px; font-size:12px; background:var(--surface-2); color:var(--t4); }
    .sub-badge.good { background:var(--green-s); color:var(--green); }
    .actions { display:flex; gap:6px; }

    /* Submissions panel */
    .panel { display:flex; flex-direction:column; min-height:100%; }
    .panel-title { color:var(--t1); font-size:18px; font-weight:700; margin:0; }
    .panel-sub { color:var(--t4); font-size:13px; margin-top:4px; }
    .panel-stats { display:flex; gap:16px; padding:16px 0; border-top:1px solid var(--border);
      color:var(--t4); font-size:13px; margin-top:auto; }

    /* Confirm modal */
    .confirm-modal { text-align:center; }
    .confirm-icon { font-size:48px; margin-bottom:8px; }
    .confirm-modal p { color:var(--t3); font-size:14px; }
    .btn-danger { padding:9px 20px; background:var(--red); color:#fff; border:none;
      border-radius:7px; cursor:pointer; font-size:13.5px; font-weight:600; font-family:inherit; }
    .btn-danger:disabled { opacity:.6; }
  `]
})
export class HomeworkListComponent implements OnInit {
  private hwSvc       = inject(HomeworkService);
  private academicSvc = inject(AcademicService);
  private curriculumSvc = inject(CurriculumService);
  auth = inject(AuthService);
  private confirmDeleteSvc = inject(ConfirmDeleteService);
  private menuSvc = inject(MenuService);
  private route = inject(ActivatedRoute);

  years     = signal<AcademicYear[]>([]);
  classes   = signal<ClassDto[]>([]);
  subjects  = signal<SubjectDto[]>([]);
  homework  = signal<HomeworkDto[]>([]);
  learning  = signal<TeachingLogDto[]>([]);
  loading   = signal(false);

  tab = signal<Tab>('diary');

  // Submissions panel
  submissionPanel = signal(false);
  activeHw        = signal<HomeworkDto | null>(null);
  submissions     = signal<SubmissionDto[]>([]);
  loadingSubs     = signal(false);

  // Modals
  editModal  = signal(false);
  saving     = signal(false);
  editError  = signal('');
  editForm   = { title: '', description: '', dueDate: '' };

  // Filters
  selectedYear:    number | null = null;
  selectedClass:   number | null = null;
  selectedSubject: number | null = null;
  fromDate = '';
  toDate   = '';

  isTeacher = computed(() => this.auth.hasRole('teacher', 'superadmin', 'admin', 'principal'));

  fromClassroom = signal(false);
  private classroomReturn: Record<string, string | number> | null = null;

  pageTitle = computed(() =>
    this.menuSvc.titleForRoute('/homework/list', 'Diary / Homework')
  );

  classroomReturnQp() { return this.classroomReturn; }
  assignPrefill() {
    const q: Record<string, string | number> = { from: 'classroom' };
    if (this.selectedClass) q['classId'] = this.selectedClass;
    if (this.selectedSubject) q['subjectId'] = this.selectedSubject;
    if (this.classroomReturn) {
      Object.assign(q, this.classroomReturn);
      q['from'] = 'classroom';
    }
    return q;
  }

  readonly tabOptions: SelectOpt<Tab>[] = [
    { value: 'diary', label: 'Diary' },
    { value: 'manage', label: 'Manage' }
  ];

  yearOptions = computed<SelectOpt<number>[]>(() =>
    this.years().map(y => ({ value: y.academicYearId as number, label: y.yearLabel }))
  );

  classOptions = computed<SelectOpt<number>[]>(() =>
    this.classes().map(c => ({
      value: c.classId,
      label: `${c.className}${c.section ? ' ' + c.section : ''}`.trim()
    }))
  );

  subjectOptions = computed<SelectOpt<number>[]>(() =>
    this.subjects().map(s => ({ value: s.subjectId as number, label: s.subjectName }))
  );

  subStatusSeverity(status: string): 'secondary' | 'info' | 'success' {
    const s = status?.toLowerCase();
    return s === 'reviewed' ? 'success' : s === 'submitted' ? 'info' : 'secondary';
  }

  ngOnInit() {
    this.menuSvc.ensureLoaded().subscribe();
    const qp = this.route.snapshot.queryParamMap;
    this.fromClassroom.set(isFromClassroom(qp));
    this.classroomReturn = classroomReturnQueryFromParamMap(qp);
    const prefYear = Number(qp.get('academicYearId')) || null;
    const prefClass = Number(qp.get('classId')) || null;
    const prefSubject = Number(qp.get('subjectId')) || null;

    this.academicSvc.getSubjects().subscribe(s => this.subjects.set(s));
    this.academicSvc.getYears().subscribe(y => {
      this.years.set(y);
      if (!prefClass) return;
      const yearId = prefYear
        || y.find(x => (x as any).isActive)?.academicYearId
        || y[0]?.academicYearId
        || null;
      if (!yearId) return;
      this.selectedYear = yearId;
      this.academicSvc.getClasses(yearId).subscribe(classes => {
        this.classes.set(classes);
        if (classes.some(c => c.classId === prefClass)) {
          this.selectedClass = prefClass;
          this.selectedSubject = prefSubject;
          this.load();
        }
      });
    });
  }

  onYearChange() {
    this.selectedClass = null; this.homework.set([]);
    if (this.selectedYear) this.academicSvc.getClasses(this.selectedYear).subscribe(c => this.classes.set(c));
    else this.classes.set([]);
  }

  clearFilters() {
    this.selectedYear = null; this.selectedClass = null;
    this.selectedSubject = null; this.fromDate = ''; this.toDate = '';
    this.homework.set([]); this.learning.set([]); this.classes.set([]);
  }

  load() {
    if (!this.selectedClass) { this.homework.set([]); this.learning.set([]); return; }
    this.loading.set(true);

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const learningFrom = this.fromDate || todayStr;
    const learningTo = this.toDate || todayStr;

    this.curriculumSvc.getTeaching({
      classId: this.selectedClass,
      subjectId: this.selectedSubject,
      from: learningFrom,
      to: learningTo
    }).subscribe({
      next: logs => this.learning.set(logs),
      error: () => this.learning.set([])
    });

    this.hwSvc.getForClass(
      this.selectedClass,
      undefined,
      this.selectedSubject ?? undefined
    ).subscribe({
      next: h => {
        let list = h;
        if (this.fromDate) list = list.filter(x => x.dueDate >= this.fromDate);
        if (this.toDate)   list = list.filter(x => x.dueDate <= this.toDate);
        this.homework.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  learningBySubject = computed(() => {
    const map = new Map<string, TeachingLogDto[]>();
    for (const log of this.learning()) {
      const key = log.subjectName || 'Other';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(log);
    }
    return [...map.entries()].map(([subject, items]) => ({ subject, items }));
  });

  // ── Computed helpers ────────────────────────────────────────────────────────
  isOverdue(date: string)  { return new Date(date) < new Date(new Date().toDateString()); }
  isDueSoon(date: string)  {
    const d = new Date(date); const now = new Date();
    const diff = (d.getTime() - now.getTime()) / 86400000;
    return diff >= 0 && diff <= 3;
  }
  overdueCount() { return this.homework().filter(h => this.isOverdue(h.dueDate)).length; }
  dueSoon()      { return this.homework().filter(h => this.isDueSoon(h.dueDate) && !this.isOverdue(h.dueDate)).length; }
  reviewedCount() { return this.submissions().filter(s => s.status === 'Reviewed').length; }

  duePillClass(dueDate: string): string {
    if (this.isOverdue(dueDate))  return 'due-late';
    if (this.isDueSoon(dueDate))  return 'due-warn';
    return 'due-normal';
  }

  // ── Submissions panel ────────────────────────────────────────────────────────
  openSubmissions(hw: HomeworkDto) {
    this.activeHw.set(hw);
    this.submissions.set([]);
    this.submissionPanel.set(true);
    this.loadingSubs.set(true);
    this.hwSvc.getSubmissions(hw.homeworkId).subscribe({
      next: s => { this.submissions.set(s); this.loadingSubs.set(false); },
      error: () => this.loadingSubs.set(false)
    });
  }

  closePanel() { this.submissionPanel.set(false); this.activeHw.set(null); }

  markReviewed(sub: SubmissionDto) {
    this.hwSvc.review(sub.submissionId, 'Reviewed').subscribe({
      next: () => this.submissions.update(list =>
        list.map(s => s.submissionId === sub.submissionId ? { ...s, status: 'Reviewed' } : s)
      ),
      error: () => {}
    });
  }

  // ── Edit ─────────────────────────────────────────────────────────────────────
  openEdit(hw: HomeworkDto) {
    this.activeHw.set(hw);
    this.editForm = { title: hw.title, description: hw.description ?? '', dueDate: hw.dueDate };
    this.editError.set('');
    this.editModal.set(true);
  }

  saveEdit() {
    if (!this.editForm.title || !this.editForm.dueDate) { this.editError.set('Title and due date are required.'); return; }
    const hw = this.activeHw();
    if (!hw) return;
    this.saving.set(true);
    this.hwSvc.update(hw.homeworkId, {
      title: this.editForm.title,
      description: this.editForm.description || null,
      dueDate: this.editForm.dueDate,
      fileId: hw.fileId
    }).subscribe({
      next: () => { this.saving.set(false); this.editModal.set(false); this.load(); },
      error: (e: any) => { this.saving.set(false); this.editError.set(e?.error?.error ?? 'Failed to save.'); }
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────────────
  confirmDelete(hw: HomeworkDto) {
    this.confirmDeleteSvc.open(
      'Delete Homework?',
      `Are you sure you want to delete <strong>"${hw.title}"</strong>? This cannot be undone.`,
      () => this.hwSvc.delete(hw.homeworkId),
      () => this.load()
    );
  }
}
