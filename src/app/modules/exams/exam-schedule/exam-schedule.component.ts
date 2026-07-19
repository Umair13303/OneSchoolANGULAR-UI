import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators } from '@angular/forms';
import { ExamService } from '../../../core/services/exam.service';
import { AcademicService } from '../../../core/services/academic.service';
import { ExamScheduleDto, EXAM_STATUSES } from '../../../core/models/exam.model';
import { ConfirmDeleteComponent } from '../../../shared/components/confirm-delete/confirm-delete.component';
import { ConfirmDeleteService } from '../../../shared/components/confirm-delete/confirm-delete.service';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';

@Component({
  selector: 'app-exam-schedule',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ConfirmDeleteComponent, DatePickerComponent],
  template: `
    <div class="page-header">
      <div class="ph-left">
        <div class="ph-icon"><span class="material-icons-round">calendar_month</span></div>
        <div>
          <h1>Exam Schedule</h1>
          <p>View and manage exam timetable</p>
        </div>
      </div>
      <button class="btn-primary" (click)="openForm()">
        <span class="material-icons-round">add</span> Schedule Exam
      </button>
    </div>

    <!-- Filters -->
    <div class="filter-bar">
      <select [(ngModel)]="filterClass" (ngModelChange)="load()" [ngModelOptions]="{standalone:true}">
        <option value="">All Classes</option>
        @for (c of classes(); track c.classId) { <option [value]="c.classId">{{ c.className }}</option> }
      </select>
      <app-date-picker [(ngModel)]="filterFrom" (dateChange)="load()" [ngModelOptions]="{standalone:true}" />
      <app-date-picker [(ngModel)]="filterTo"   (dateChange)="load()" [ngModelOptions]="{standalone:true}" />
    </div>

    @if (loading()) {
      <div class="loading-state"><span class="material-icons-round spin">refresh</span> Loading…</div>
    } @else if (schedules().length === 0) {
      <div class="empty-state">
        <span class="material-icons-round">calendar_month</span>
        <p>No exams scheduled yet.</p>
      </div>
    } @else {
      <div class="schedule-table-wrap">
        <table class="schedule-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Paper / Subject</th>
              <th>Class</th>
              <th>Type</th>
              <th>Room</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (s of schedules(); track s.examScheduleId) {
              <tr>
                <td class="date-cell">
                  <span class="material-icons-round">event</span>
                  {{ s.examDate | date:'dd MMM yyyy' }}
                </td>
                <td>{{ s.startTime }}{{ s.endTime ? ' – ' + s.endTime : '' }}</td>
                <td>
                  <div class="paper-info">
                    <span class="paper-name">{{ s.paperTitle }}</span>
                    <span class="subject-name">{{ s.subjectName }}</span>
                  </div>
                </td>
                <td>{{ s.className }}</td>
                <td><span class="type-badge">{{ s.examType }}</span></td>
                <td>{{ s.roomOrHall || '—' }}</td>
                <td><span class="status-badge" [ngClass]="statusClass(s.status)">{{ s.status }}</span></td>
                <td>
                  <div class="row-actions">
                    <button class="btn-sm btn-outline" (click)="openForm(s)" title="Edit"><span class="material-icons-round">edit</span></button>
                    <button class="btn-sm btn-danger"  (click)="deleteSchedule(s)" title="Delete"><span class="material-icons-round">delete</span></button>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    <!-- Form Modal -->
    @if (showForm()) {
      <div class="modal-backdrop" (click)="closeForm()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ editSchedule() ? 'Edit Schedule' : 'Schedule Exam' }}</h2>
            <button class="icon-btn" (click)="closeForm()"><span class="material-icons-round">close</span></button>
          </div>
          <div class="modal-body">
            <form [formGroup]="form" (ngSubmit)="save()">
              <div class="fg">
                <div class="fi full">
                  <label>Exam Paper *</label>
                  <select formControlName="examPaperId">
                    <option value="">Select paper</option>
                    @for (p of papers(); track p.examPaperId) { <option [value]="p.examPaperId">{{ p.title }} – {{ p.className }}</option> }
                  </select>
                </div>
              </div>
              <div class="fg two">
                <div class="fi">
                  <label>Exam Date *</label>
                  <app-date-picker formControlName="examDate" />
                </div>
                <div class="fi">
                  <label>Start Time *</label>
                  <input type="time" formControlName="startTime" />
                </div>
              </div>
              <div class="fg two">
                <div class="fi">
                  <label>End Time</label>
                  <input type="time" formControlName="endTime" />
                </div>
                <div class="fi">
                  <label>Room / Hall</label>
                  <input formControlName="roomOrHall" placeholder="e.g. Hall A" />
                </div>
              </div>
              <div class="fg two">
                <div class="fi">
                  <label>Status</label>
                  <select formControlName="status">
                    @for (s of statuses; track s) { <option [value]="s">{{ s }}</option> }
                  </select>
                </div>
                <div class="fi">
                  <label>Remarks</label>
                  <input formControlName="remarks" placeholder="Optional remarks" />
                </div>
              </div>
              @if (formError()) { <div class="alert-error"><span class="material-icons-round">error_outline</span> {{ formError() }}</div> }
              <div class="modal-footer">
                <button type="button" class="btn-secondary" (click)="closeForm()">Cancel</button>
                <button type="submit" class="btn-primary" [disabled]="saving()">
                  @if (saving()) { <span class="material-icons-round spin">refresh</span> Saving… }
                  @else { <span class="material-icons-round">save</span> Save }
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    }

    <app-confirm-delete />
  `,
  styles: [`
    .page-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; }
    .ph-left { display:flex; align-items:center; gap:12px; }
    .ph-icon { width:44px; height:44px; border-radius:12px; background:var(--accent-s); display:flex; align-items:center; justify-content:center; }
    .ph-icon .material-icons-round { color:var(--accent); font-size:22px; }
    .ph-left h1 { font-size:18px; font-weight:700; color:var(--t1); margin:0 0 2px; }
    .ph-left p  { font-size:12px; color:var(--t3); margin:0; }

    .filter-bar { display:flex; gap:10px; margin-bottom:20px; flex-wrap:wrap; }
    .filter-bar select, .filter-bar input { padding:8px 12px; border:1.5px solid var(--border); border-radius:8px; font-size:13px; background:var(--surface); color:var(--t1); outline:none; }
    .filter-bar select:focus, .filter-bar input:focus { border-color:var(--accent); }

    .loading-state, .empty-state { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:60px; color:var(--t4); gap:10px; }
    .empty-state .material-icons-round { font-size:48px; opacity:.3; }

    .schedule-table-wrap { background:var(--surface); border:1px solid var(--border); border-radius:12px; overflow:auto; }
    .schedule-table { width:100%; border-collapse:collapse; font-size:13px; }
    .schedule-table th { padding:10px 14px; background:var(--surface-2); font-size:11px; font-weight:700; color:var(--t3); text-transform:uppercase; letter-spacing:.4px; text-align:left; border-bottom:1px solid var(--border); }
    .schedule-table td { padding:12px 14px; border-bottom:1px solid var(--border); color:var(--t1); vertical-align:middle; }
    .schedule-table tr:last-child td { border-bottom:none; }
    .schedule-table tr:hover td { background:var(--surface-2); }

    .date-cell { display:flex; align-items:center; gap:6px; white-space:nowrap; }
    .date-cell .material-icons-round { font-size:14px; color:var(--accent); }
    .paper-info { display:flex; flex-direction:column; }
    .paper-name { font-weight:600; }
    .subject-name { font-size:11.5px; color:var(--t3); }
    .type-badge { font-size:11px; font-weight:700; padding:3px 8px; border-radius:99px; background:var(--accent-s); color:var(--accent); }
    .status-badge { font-size:11px; font-weight:700; padding:3px 8px; border-radius:99px; }
    .status-scheduled { background:#dbeafe; color:#1d4ed8; }
    .status-ongoing   { background:#fef3c7; color:#92400e; }
    .status-completed { background:var(--green-s); color:var(--green); }
    .status-postponed, .status-cancelled { background:var(--red-s); color:var(--red); }

    .row-actions { display:flex; gap:6px; }
    .btn-sm { display:flex; align-items:center; gap:4px; padding:5px 8px; border-radius:7px; font-size:12px; border:none; cursor:pointer; transition:all .15s; }
    .btn-sm .material-icons-round { font-size:14px; }
    .btn-outline { background:var(--surface); color:var(--t2); border:1px solid var(--border) !important; }
    .btn-outline:hover { border-color:var(--accent) !important; color:var(--accent); }
    .btn-danger  { background:var(--red-s); color:var(--red); border:1px solid var(--red-b) !important; }
    .btn-danger:hover  { background:var(--red); color:#fff; }

    .modal-backdrop { position:fixed; inset:0; background:rgba(0,0,0,.5); display:flex; align-items:center; justify-content:center; z-index:1000; padding:16px; }
    .modal { background:var(--surface); border-radius:16px; width:100%; max-width:560px; max-height:90vh; overflow-y:auto; box-shadow:var(--sh-xl); }
    .modal-header { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid var(--border); }
    .modal-header h2 { font-size:16px; font-weight:700; color:var(--t1); margin:0; }
    .modal-body { padding:20px; }
    .modal-footer { display:flex; justify-content:flex-end; gap:10px; padding-top:16px; border-top:1px solid var(--border); margin-top:8px; }
    .icon-btn { width:30px; height:30px; border-radius:8px; border:1px solid var(--border); background:var(--surface); color:var(--t3); cursor:pointer; display:flex; align-items:center; justify-content:center; }
    .icon-btn .material-icons-round { font-size:16px; }

    .fg { display:flex; gap:12px; margin-bottom:12px; }
    .fg.two .fi { flex:1; }
    .fi { display:flex; flex-direction:column; gap:5px; }
    .fi.full { flex:1; }
    label { font-size:11px; font-weight:700; color:var(--t3); text-transform:uppercase; letter-spacing:.4px; }
    input, select { padding:8px 11px; border:1.5px solid var(--border); border-radius:8px; font-size:13px; font-family:inherit; background:var(--surface); color:var(--t1); outline:none; width:100%; transition:border-color .15s; }
    input:focus, select:focus { border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-g); }
    .alert-error { display:flex; align-items:center; gap:8px; padding:10px 14px; background:var(--red-s); border:1px solid var(--red-b); border-radius:8px; font-size:12.5px; color:var(--red); margin-bottom:10px; }
    .alert-error .material-icons-round { font-size:16px; }
    @keyframes spin { to { transform:rotate(360deg); } }
    .spin { animation:spin .8s linear infinite; display:inline-block; }
  `]
})
export class ExamScheduleComponent implements OnInit {
  private examSvc = inject(ExamService);
  private confirmDelete = inject(ConfirmDeleteService);
  private acSvc   = inject(AcademicService);
  private fb      = inject(FormBuilder);

  schedules    = signal<ExamScheduleDto[]>([]);
  papers       = signal<any[]>([]);
  classes      = signal<any[]>([]);
  loading      = signal(false);
  saving       = signal(false);
  showForm     = signal(false);
  editSchedule = signal<ExamScheduleDto | null>(null);
  formError    = signal('');

  filterClass = '';
  filterFrom  = '';
  filterTo    = '';

  readonly statuses = EXAM_STATUSES;

  form = this.fb.group({
    examPaperId: ['', Validators.required],
    examDate:    ['', Validators.required],
    startTime:   ['', Validators.required],
    endTime:     [''],
    roomOrHall:  [''],
    status:      ['Scheduled'],
    remarks:     ['']
  });

  ngOnInit() {
    this.acSvc.getClasses().subscribe(c => this.classes.set(c));
    this.examSvc.getPapers().subscribe(p => this.papers.set(p));
    this.load();
  }

  load() {
    this.loading.set(true);
    this.examSvc.getSchedules(
      this.filterClass ? +this.filterClass : undefined,
      this.filterFrom || undefined,
      this.filterTo   || undefined
    ).subscribe({ next: s => { this.schedules.set(s); this.loading.set(false); }, error: () => this.loading.set(false) });
  }

  statusClass(s: string) {
    const m: Record<string, string> = { Scheduled:'status-scheduled', Ongoing:'status-ongoing', Completed:'status-completed', Postponed:'status-postponed', Cancelled:'status-cancelled' };
    return m[s] ?? '';
  }

  openForm(schedule?: ExamScheduleDto) {
    this.editSchedule.set(schedule ?? null);
    this.formError.set('');
    if (schedule) {
      this.form.patchValue({ examPaperId: schedule.examPaperId as any, examDate: schedule.examDate, startTime: schedule.startTime, endTime: schedule.endTime ?? '', roomOrHall: schedule.roomOrHall ?? '', status: schedule.status, remarks: schedule.remarks ?? '' });
    } else {
      this.form.reset({ status: 'Scheduled' });
    }
    this.showForm.set(true);
  }

  closeForm() { this.showForm.set(false); }

  save() {
    this.form.markAllAsTouched();
    if (this.form.invalid) { this.formError.set('Please fill all required fields.'); return; }
    this.saving.set(true);
    this.formError.set('');
    const v = this.form.value as any;
    const dto = { ...v, examPaperId: +v.examPaperId };

    const req = (this.editSchedule()
      ? this.examSvc.updateSchedule(this.editSchedule()!.examScheduleId, dto)
      : this.examSvc.createSchedule(dto)) as import('rxjs').Observable<unknown>;

    req.subscribe({
      next: () => { this.saving.set(false); this.closeForm(); this.load(); },
      error: (e: any) => { this.saving.set(false); this.formError.set(e?.error?.error ?? 'Failed to save.'); }
    });
  }

  deleteSchedule(s: ExamScheduleDto) {
    this.confirmDelete.open(
      'Delete Schedule?',
      'Are you sure you want to delete this exam schedule? This cannot be undone.',
      () => this.examSvc.deleteSchedule(s.examScheduleId),
      () => this.load()
    );
  }
}
