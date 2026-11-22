import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators } from '@angular/forms';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { Tag } from 'primeng/tag';
import { Dialog } from 'primeng/dialog';
import { Tooltip } from 'primeng/tooltip';
import { Message } from 'primeng/message';
import { ExamService } from '../../../core/services/exam.service';
import { AcademicService } from '../../../core/services/academic.service';
import { MenuService } from '../../../core/services/menu.service';
import { ExamScheduleDto, EXAM_STATUSES } from '../../../core/models/exam.model';
import { ConfirmDeleteComponent } from '../../../shared/components/confirm-delete/confirm-delete.component';
import { ConfirmDeleteService } from '../../../shared/components/confirm-delete/confirm-delete.service';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

interface SelectOpt<T> { value: T; label: string; }

@Component({
  selector: 'app-exam-schedule',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, ConfirmDeleteComponent, DatePickerComponent,
    PageHeaderComponent, LoadingComponent, EmptyStateComponent,
    Button, Select, InputText, Tag, Dialog, Tooltip, Message
  ],
  template: `
    <div class="os-page compact exam-schedule-page">
    <app-page-header [dense]="true" [title]="pageTitle()" routeUrl="/exams/schedule">
      <p-button label="Schedule Exam" icon="pi pi-plus" (onClick)="openForm()" />
    </app-page-header>

    <div class="os-stage">
      <div class="os-stage-bar">
        <div class="flex flex-wrap items-end gap-3 w-full">
          <div class="flex min-w-[200px] flex-1 flex-col gap-1">
            <label class="os-field-label">Class</label>
            <p-select
              class="w-full"
              placeholder="All classes"
              [options]="classFilterOptions()"
              optionLabel="label"
              optionValue="value"
              [filter]="classFilterOptions().length > 6"
              filterBy="label"
              [ngModel]="filterClass"
              [ngModelOptions]="{standalone:true}"
              (ngModelChange)="filterClass = $event ?? ''; load()" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="os-field-label">From</label>
            <div class="os-date-wrap"><app-date-picker [(ngModel)]="filterFrom" (dateChange)="load()" [ngModelOptions]="{standalone:true}" /></div>
          </div>
          <div class="flex flex-col gap-1">
            <label class="os-field-label">To</label>
            <div class="os-date-wrap"><app-date-picker [(ngModel)]="filterTo" (dateChange)="load()" [ngModelOptions]="{standalone:true}" /></div>
          </div>
        </div>
      </div>

      @if (loading()) {
        <div class="os-stage-body pad"><app-loading /></div>
      } @else if (schedules().length === 0) {
        <div class="os-stage-body pad">
          <app-empty-state title="No exams scheduled" message="No exams scheduled yet." icon="calendar_month" />
        </div>
      } @else {
        <div class="os-stage-body schedule-table-wrap">
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
                  <td><p-tag [value]="s.examType" severity="info" [rounded]="true" /></td>
                  <td>{{ s.roomOrHall || '—' }}</td>
                  <td><p-tag [value]="s.status" [severity]="statusSeverity(s.status)" [rounded]="true" /></td>
                  <td>
                    <div class="flex gap-1.5">
                      <p-button icon="pi pi-pencil" size="small" severity="secondary" [outlined]="true"
                        pTooltip="Edit" ariaLabel="Edit" (onClick)="openForm(s)" />
                      <p-button icon="pi pi-trash" size="small" severity="danger" [outlined]="true"
                        pTooltip="Delete" ariaLabel="Delete" (onClick)="deleteSchedule(s)" />
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>

    <!-- Form dialog -->
    <p-dialog
      [visible]="showForm()"
      (visibleChange)="$event ? null : closeForm()"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
      [header]="editSchedule() ? 'Edit Schedule' : 'Schedule Exam'"
      [style]="{ width: '36rem' }"
      [breakpoints]="{ '640px': '96vw' }">
      <form [formGroup]="form" (ngSubmit)="save()" class="flex flex-col gap-3">
        <div class="flex flex-col gap-1">
          <label class="fl">Exam Paper *</label>
          <p-select
            class="w-full"
            formControlName="examPaperId"
            placeholder="Select paper"
            [options]="paperOptions()"
            optionLabel="label"
            optionValue="value"
            [filter]="paperOptions().length > 6"
            filterBy="label"
            appendTo="body"
            [overlayOptions]="overlayOpts" />
        </div>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div class="flex flex-col gap-1">
            <label class="fl">Exam Date *</label>
            <app-date-picker formControlName="examDate" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="fl">Start Time *</label>
            <input pInputText class="w-full" type="time" formControlName="startTime" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="fl">End Time</label>
            <input pInputText class="w-full" type="time" formControlName="endTime" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="fl">Room / Hall</label>
            <input pInputText class="w-full" formControlName="roomOrHall" placeholder="e.g. Hall A" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="fl">Status</label>
            <p-select
              class="w-full"
              formControlName="status"
              [options]="statuses"
              appendTo="body"
              [overlayOptions]="overlayOpts" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="fl">Remarks</label>
            <input pInputText class="w-full" formControlName="remarks" placeholder="Optional remarks" />
          </div>
        </div>
        @if (formError()) {
          <p-message severity="error" icon="pi pi-exclamation-circle" [text]="formError()" />
        }
      </form>
      <ng-template #footer>
        <p-button label="Cancel" severity="secondary" [outlined]="true" (onClick)="closeForm()" />
        <p-button label="Save" icon="pi pi-save" [loading]="saving()" [disabled]="saving()" (onClick)="save()" />
      </ng-template>
    </p-dialog>

    <app-confirm-delete />
    </div>
  `,
  styles: [`
    :host { display:block; min-width:0; }
    .fl { font-size:11px; font-weight:700; color:var(--t3); text-transform:uppercase; letter-spacing:.4px; }

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
  `]
})
export class ExamScheduleComponent implements OnInit {
  private examSvc = inject(ExamService);
  private confirmDelete = inject(ConfirmDeleteService);
  private acSvc   = inject(AcademicService);
  private fb      = inject(FormBuilder);
  private menuSvc = inject(MenuService);

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
  /** Dialog-hosted selects: overlay must sit above p-dialog. */
  readonly overlayOpts = { baseZIndex: 1200 };

  pageTitle = computed(() =>
    this.menuSvc.titleForRoute('/exams/schedule', 'Exam Schedule')
  );

  classFilterOptions = computed<SelectOpt<string>[]>(() => [
    { value: '', label: 'All classes' },
    ...this.classes().map(c => ({ value: String(c.classId), label: c.className as string }))
  ]);

  paperOptions = computed<SelectOpt<number>[]>(() =>
    this.papers().map(p => ({ value: p.examPaperId as number, label: `${p.title} – ${p.className}` }))
  );

  form = this.fb.group({
    examPaperId: ['' as string | number | null, Validators.required],
    examDate:    ['', Validators.required],
    startTime:   ['', Validators.required],
    endTime:     [''],
    roomOrHall:  [''],
    status:      ['Scheduled'],
    remarks:     ['']
  });

  ngOnInit() {
    this.menuSvc.ensureLoaded().subscribe();
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

  statusSeverity(s: string): 'info' | 'warn' | 'success' | 'danger' | 'secondary' {
    const m: Record<string, 'info' | 'warn' | 'success' | 'danger'> = {
      Scheduled: 'info', Ongoing: 'warn', Completed: 'success', Postponed: 'danger', Cancelled: 'danger'
    };
    return m[s] ?? 'secondary';
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
