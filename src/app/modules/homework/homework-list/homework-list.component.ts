import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HomeworkService } from '../../../core/services/homework.service';
import { AcademicService } from '../../../core/services/academic.service';
import { AuthService } from '../../../core/services/auth.service';
import { HomeworkDto, SubmissionDto } from '../../../core/models/homework.model';
import { ClassDto, AcademicYear, SubjectDto } from '../../../core/models/academic.model';
import { RouterModule } from '@angular/router';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ConfirmDeleteComponent } from '../../../shared/components/confirm-delete/confirm-delete.component';
import { ConfirmDeleteService } from '../../../shared/components/confirm-delete/confirm-delete.service';

type Tab = 'diary' | 'manage';

@Component({
  selector: 'app-homework-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, LoadingComponent, EmptyStateComponent, ConfirmDeleteComponent, DatePickerComponent],
  template: `
    <app-page-header title="Homework / Diary" subtitle="View and manage homework assignments">
      @if (isTeacher()) {
        <a class="btn-primary" routerLink="/homework/assign">+ Assign Homework</a>
      }
    </app-page-header>

    <!-- Tabs (teacher only sees Manage tab) -->
    @if (isTeacher()) {
      <div class="tab-bar">
        <button [class.active]="tab() === 'diary'"  (click)="tab.set('diary')">📖 Diary (Student View)</button>
        <button [class.active]="tab() === 'manage'" (click)="tab.set('manage')">📋 Manage Assignments</button>
      </div>
    }

    <!-- ── FILTERS ─────────────────────────────────────────────────────────── -->
    <div class="filters card">
      <div class="filter-row">
        <select [(ngModel)]="selectedYear" (change)="onYearChange()">
          <option [ngValue]="null">All Years</option>
          @for (y of years(); track y.academicYearId) {
            <option [ngValue]="y.academicYearId">{{ y.yearLabel }}</option>
          }
        </select>
        <select [(ngModel)]="selectedClass" (change)="load()">
          <option [ngValue]="null">Select Class</option>
          @for (c of classes(); track c.classId) {
            <option [ngValue]="c.classId">{{ c.className }} {{ c.section }}</option>
          }
        </select>
        <select [(ngModel)]="selectedSubject" (change)="load()">
          <option [ngValue]="null">All Subjects</option>
          @for (s of subjects(); track s.subjectId) {
            <option [ngValue]="s.subjectId">{{ s.subjectName }}</option>
          }
        </select>
        <app-date-picker [(ngModel)]="fromDate" (dateChange)="load()" />
        <app-date-picker [(ngModel)]="toDate"   (dateChange)="load()" />
        <button class="btn-clear" (click)="clearFilters()">Clear</button>
      </div>
    </div>

    <!-- ── DIARY TAB ──────────────────────────────────────────────────────── -->
    @if (tab() === 'diary') {
      @if (loading()) { <app-loading /> }
      @else if (!selectedClass) {
        <app-empty-state message="Select a class to view homework." icon="📖" />
      } @else if (homework().length === 0) {
        <app-empty-state message="No homework found for selected filters." icon="📝" />
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
                  <span class="tag">{{ hw.className }} {{ hw.section }}</span>
                  <span class="tag">{{ hw.teacherName }}</span>
                </div>
                <span class="assigned">Assigned: {{ hw.assignedDate }}</span>
              </div>
            </div>
          }
        </div>
      }
    }

    <!-- ── MANAGE TAB (teacher) ────────────────────────────────────────────── -->
    @if (tab() === 'manage' && isTeacher()) {
      @if (loading()) { <app-loading /> }
      @else if (!selectedClass) {
        <app-empty-state message="Select a class to manage homework." icon="📋" />
      } @else if (homework().length === 0) {
        <app-empty-state message="No homework found. Assign some!" icon="📝" />
      } @else {
        <div class="card">
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
                    <button class="btn-action view"   (click)="openSubmissions(hw)">👁 Submissions</button>
                    <button class="btn-action edit"   (click)="openEdit(hw)">✏️ Edit</button>
                    <button class="btn-action delete" (click)="confirmDelete(hw)">🗑 Delete</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    }

    <!-- ── SUBMISSIONS PANEL ───────────────────────────────────────────────── -->
    @if (submissionPanel()) {
      <div class="panel-overlay" (click)="closePanel()">
        <div class="panel" (click)="$event.stopPropagation()">
          <div class="panel-header">
            <div>
              <h3>Submissions</h3>
              <p class="panel-sub">{{ activeHw()?.title }} — {{ activeHw()?.subjectName }}</p>
            </div>
            <button class="close-btn" (click)="closePanel()">✕</button>
          </div>

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
                      <span class="status-pill" [class]="s.status.toLowerCase()">{{ s.status }}</span>
                    </td>
                    <td>
                      @if (s.status !== 'Reviewed') {
                        <button class="btn-review" (click)="markReviewed(s)">Mark Reviewed</button>
                      } @else {
                        <span class="reviewed-tick">✔ Reviewed</span>
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
      </div>
    }

    <!-- ── EDIT MODAL ──────────────────────────────────────────────────────── -->
    @if (editModal()) {
      <div class="modal-overlay" (click)="editModal.set(false)">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3>Edit Homework</h3>
          <div class="field"><label>Title *</label><input [(ngModel)]="editForm.title" /></div>
          <div class="field"><label>Description</label><textarea [(ngModel)]="editForm.description" rows="3"></textarea></div>
          <div class="field"><label>Due Date *</label><app-date-picker [(ngModel)]="editForm.dueDate" /></div>
          @if (editError()) { <p class="error-msg">{{ editError() }}</p> }
          <div class="modal-actions">
            <button class="btn-secondary" (click)="editModal.set(false)">Cancel</button>
            <button class="btn-primary" (click)="saveEdit()" [disabled]="saving()">{{ saving() ? 'Saving...' : 'Save' }}</button>
          </div>
        </div>
      </div>
    }

    <app-confirm-delete />
  `,
  styles: [`
    .tab-bar { display:flex; gap:0; margin-bottom:20px; border-bottom:2px solid var(--border); }
    .tab-bar button { padding:10px 24px; border:none; background:none; cursor:pointer; font-size:14px; color:var(--t4); font-family:inherit; }
    .tab-bar button.active { color:var(--accent); font-weight:700; border-bottom:2px solid var(--accent); margin-bottom:-2px; }

    .filters { padding:14px 16px; margin-bottom:20px; }
    .filter-row { display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
    select, input[type=date] { padding:8px 12px; border:1px solid var(--border); border-radius:6px; font-size:13px; min-width:130px; background:var(--surface); color:var(--t1); }
    .btn-clear { padding:8px 14px; border:1px solid var(--border); border-radius:6px; background:var(--surface-2); cursor:pointer; font-size:13px; color:var(--t3); font-family:inherit; }

    .summary-strip { display:flex; gap:14px; margin-bottom:20px; }
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
    .tag { font-size:11px; padding:2px 8px; background:var(--surface-2); border-radius:8px; color:var(--t3); }
    .assigned { font-size:12px; color:var(--t4); }

    /* Manage tab */
    .subject-badge-sm { padding:2px 8px; background:var(--accent-s); color:var(--accent); border-radius:8px; font-size:11px; font-weight:600; }
    .due-normal { color:var(--green); font-size:12px; font-weight:600; }
    .due-warn   { color:var(--amber); font-size:12px; font-weight:600; }
    .due-late   { color:var(--red); font-size:12px; font-weight:600; }
    .sub-badge  { padding:3px 10px; border-radius:10px; font-size:12px; background:var(--surface-2); color:var(--t4); }
    .sub-badge.good { background:var(--green-s); color:var(--green); }
    .actions { display:flex; gap:6px; }
    .btn-action { padding:5px 10px; border:none; border-radius:5px; cursor:pointer; font-size:12px; font-weight:500; font-family:inherit; }
    .btn-action.view   { background:var(--accent-s); color:var(--accent); }
    .btn-action.edit   { background:var(--amber-s); color:var(--amber); }
    .btn-action.delete { background:var(--red-s); color:var(--red); }

    /* Submissions panel */
    .panel-overlay { position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:1000; display:flex; justify-content:flex-end; }
    .panel { width:680px; max-width:100vw; background:var(--surface); display:flex; flex-direction:column;
      height:100vh; overflow-y:auto; box-shadow:-4px 0 32px rgba(0,0,0,.2); }
    .panel-header { display:flex; justify-content:space-between; align-items:flex-start;
      padding:24px 24px 16px; border-bottom:1px solid var(--border); }
    .panel-header h3 { color:var(--t1); font-size:18px; }
    .panel-sub { color:var(--t4); font-size:13px; margin-top:4px; }
    .close-btn { border:1px solid var(--border); background:var(--surface-2); font-size:16px; cursor:pointer; color:var(--t3); padding:4px 8px; border-radius:6px; }
    .panel-stats { display:flex; gap:16px; padding:16px 24px; border-top:1px solid var(--border);
      color:var(--t4); font-size:13px; margin-top:auto; }

    .status-pill { padding:3px 10px; border-radius:12px; font-size:12px; font-weight:600; }
    .status-pill.pending   { background:var(--surface-2); color:var(--t4); }
    .status-pill.submitted { background:var(--accent-s); color:var(--accent); }
    .status-pill.reviewed  { background:var(--green-s); color:var(--green); }
    .btn-review { padding:4px 10px; border:1px solid var(--border-2); border-radius:5px;
      background:none; color:var(--t2); font-size:12px; cursor:pointer; font-family:inherit; }
    .reviewed-tick { color:var(--green); font-size:12px; font-weight:600; }

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
  auth = inject(AuthService);
  private confirmDeleteSvc = inject(ConfirmDeleteService);

  years     = signal<AcademicYear[]>([]);
  classes   = signal<ClassDto[]>([]);
  subjects  = signal<SubjectDto[]>([]);
  homework  = signal<HomeworkDto[]>([]);
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

  ngOnInit() {
    this.academicSvc.getYears().subscribe(y => this.years.set(y));
    this.academicSvc.getSubjects().subscribe(s => this.subjects.set(s));
  }

  onYearChange() {
    this.selectedClass = null; this.homework.set([]);
    if (this.selectedYear) this.academicSvc.getClasses(this.selectedYear).subscribe(c => this.classes.set(c));
    else this.classes.set([]);
  }

  clearFilters() {
    this.selectedYear = null; this.selectedClass = null;
    this.selectedSubject = null; this.fromDate = ''; this.toDate = '';
    this.homework.set([]); this.classes.set([]);
  }

  load() {
    if (!this.selectedClass) { this.homework.set([]); return; }
    this.loading.set(true);
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
