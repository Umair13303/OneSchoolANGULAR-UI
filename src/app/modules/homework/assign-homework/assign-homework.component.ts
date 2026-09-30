import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HomeworkService } from '../../../core/services/homework.service';
import { AcademicService } from '../../../core/services/academic.service';
import { SettingsService } from '../../../core/services/settings.service';
import { AuthService } from '../../../core/services/auth.service';
import { MenuService } from '../../../core/services/menu.service';
import { ClassDto, SubjectDto, ClassSubjectDto } from '../../../core/models/academic.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';
import { OsSelectComponent, OsSelectOption } from '../../../shared/components/os-select/os-select.component';

@Component({
  selector: 'app-assign-homework',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageHeaderComponent, DatePickerComponent, OsSelectComponent],
  template: `
    <div class="os-page compact hw-assign-page">
      <div class="form-shell">
        <app-page-header [dense]="true" [title]="pageTitle()" />

        @if (success()) {
          <div class="alert success">
            <span class="material-icons-round">check_circle</span>
            <span class="alert-text">Homework assigned successfully.</span>
            <button type="button" class="link-btn" (click)="assignAnother()">Assign another</button>
            <button type="button" class="link-btn" (click)="router.navigate(['/homework/list'])">View diary</button>
          </div>
        }
        @if (errorMsg()) {
          <div class="alert error">
            <span class="material-icons-round">error</span>
            <span class="alert-text">{{ errorMsg() }}</span>
          </div>
        }

        @if (!success()) {
          <form [formGroup]="form" (ngSubmit)="submit()" class="assign-form">
            <div class="os-toolbar">
              <div class="os-toolbar-group fill">
                <div class="os-field stacked grow" [class.has-err]="touched('classId')">
                  <label class="os-field-label">Class</label>
                  <app-os-select
                    icon="school"
                    placeholder="Select class…"
                    ariaLabel="Select class"
                    [searchable]="classOptions().length > 6"
                    [options]="classOptions()"
                    [value]="form.value.classId ?? null"
                    (valueChange)="onClassSelect($event)" />
                </div>
                <div class="os-field stacked grow" [class.has-err]="touched('subjectId')">
                  <label class="os-field-label">Subject</label>
                  <app-os-select
                    icon="menu_book"
                    placeholder="Select subject…"
                    ariaLabel="Select subject"
                    [options]="subjectOptions()"
                    [value]="form.value.subjectId ?? null"
                    (valueChange)="form.patchValue({ subjectId: $event }); form.controls.subjectId.markAsTouched()" />
                </div>
              </div>
            </div>

            <div class="os-panel details-panel">
              <div class="details-body">
                <div class="field" [class.invalid]="touched('title')">
                  <label class="field-label">Title</label>
                  <input formControlName="title" placeholder="e.g. Chapter 3 Exercise 1–10" />
                  @if (touched('title')) { <span class="err">Title is required.</span> }
                </div>

                <div class="field">
                  <label class="field-label">
                    Instructions
                    <span class="optional">optional</span>
                  </label>
                  <textarea formControlName="description" rows="3"
                    placeholder="Page numbers, notes, or instructions for students…"></textarea>
                </div>

                <div class="dates-row">
                  <div class="field" [class.invalid]="touched('assignedDate')">
                    <label class="field-label">Assigned</label>
                    <app-date-picker formControlName="assignedDate" (dateChange)="onAssignedDateChange()" />
                    @if (touched('assignedDate')) { <span class="err">Required.</span> }
                    @if (assignedOffDay()) {
                      <span class="err off-warn">
                        <span class="material-icons-round">event_busy</span>
                        Off day — pick a working date
                      </span>
                    }
                  </div>
                  <div class="field" [class.invalid]="touched('dueDate') || dateError()">
                    <label class="field-label">Due</label>
                    <app-date-picker formControlName="dueDate" />
                    @if (touched('dueDate')) { <span class="err">Required.</span> }
                    @if (dateError()) { <span class="err">Due date must be on or after assigned date.</span> }
                  </div>
                </div>
              </div>

              <div class="form-footer">
                <button type="button" class="btn-secondary btn-sm"
                        (click)="router.navigate(['/homework/list'])">Cancel</button>
                <button type="submit" class="btn-primary btn-sm" [disabled]="saving()">
                  @if (saving()) {
                    <span class="spinner-sm"></span> Saving…
                  } @else {
                    <span class="material-icons-round act-ico">send</span>
                    Assign Homework
                  }
                </button>
              </div>
            </div>
          </form>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-width: 0;
      margin-top: -16px;
    }
    @media (max-width: 900px) { :host { margin-top: -6px; } }
    @media (max-width: 640px) { :host { margin-top: -4px; } }

    /* Full content width — no unused side gutter */
    .form-shell {
      width: 100%;
      max-width: none;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .act-ico {
      font-size: 16px;
      width: 16px;
      height: 16px;
      overflow: hidden;
    }

    .assign-form {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
    }

    .os-toolbar {
      width: 100%;
    }
    .os-toolbar-group.fill {
      width: 100%;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .os-field.stacked {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 4px;
      min-width: 0;
    }
    .os-field.stacked .os-field-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--t3);
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .os-toolbar app-os-select {
      width: 100%;
      min-width: 0;
    }
    .os-field.has-err app-os-select ::ng-deep .os-dd-trigger {
      border-color: var(--red);
    }

    .details-panel {
      width: 100%;
      overflow: visible !important;
      display: flex;
      flex-direction: column;
    }
    .details-body {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 14px 16px 12px;
    }

    .dates-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      max-width: 520px;
      position: relative;
      z-index: 5;
    }
    .dates-row app-date-picker {
      --input-h: 34px;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 5px;
      min-width: 0;
    }
    .field-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--t2);
    }
    .optional {
      margin-left: 4px;
      font-size: 11px;
      font-weight: 500;
      color: var(--t4);
    }

    input, textarea {
      width: 100%;
      box-sizing: border-box;
      padding: 8px 12px;
      border: 1px solid var(--border);
      border-radius: 10px;
      font: inherit;
      font-size: 13px;
      font-weight: 500;
      background: var(--surface);
      color: var(--t1);
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    input { height: 34px; }
    textarea {
      resize: vertical;
      min-height: 72px;
      line-height: 1.45;
    }
    input:hover, textarea:hover {
      border-color: var(--border-2, var(--border));
    }
    input:focus, textarea:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-g);
    }
    .field.invalid input,
    .field.invalid textarea { border-color: var(--red); }

    .form-footer {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      border-top: 1px solid var(--border);
      background: var(--surface-2);
      position: relative;
      z-index: 1;
      border-radius: 0 0 var(--r-lg, 12px) var(--r-lg, 12px);
    }

    .err {
      font-size: 11.5px;
      color: var(--red);
      font-weight: 500;
    }
    .off-warn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .off-warn .material-icons-round { font-size: 14px; }

    .alert {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px 12px;
      width: 100%;
      padding: 10px 14px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
    }
    .alert .material-icons-round { font-size: 18px; }
    .alert-text { flex: 1; min-width: 140px; }
    .alert.success {
      background: var(--green-s);
      color: var(--green);
      border: 1px solid var(--green-b, var(--green));
    }
    .alert.error {
      background: var(--red-s);
      color: var(--red);
      border: 1px solid var(--red);
    }
    .link-btn {
      padding: 4px 10px;
      border: 1px solid currentColor;
      border-radius: 6px;
      background: none;
      color: inherit;
      cursor: pointer;
      font: inherit;
      font-size: 12px;
      font-weight: 600;
    }

    .spinner-sm {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.4);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      display: inline-block;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 640px) {
      .os-toolbar-group.fill,
      .dates-row { grid-template-columns: 1fr; }
      .dates-row { max-width: none; }
      .form-footer {
        flex-direction: column-reverse;
        align-items: stretch;
      }
      .form-footer .btn-primary,
      .form-footer .btn-secondary {
        width: 100%;
        justify-content: center;
      }
    }
  `]
})
export class AssignHomeworkComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private hwSvc       = inject(HomeworkService);
  private academicSvc = inject(AcademicService);
  private settingsSvc = inject(SettingsService);
  private authSvc     = inject(AuthService);
  private menuSvc     = inject(MenuService);
  private fb          = inject(FormBuilder);
  router = inject(Router);

  classes        = signal<ClassDto[]>([]);
  subjects       = signal<SubjectDto[]>([]);
  saving         = signal(false);
  success        = signal(false);
  errorMsg       = signal('');
  dateError      = signal(false);
  assignedOffDay = signal(false);

  pageTitle = computed(() =>
    this.menuSvc.titleForRoute('/homework/assign', 'Assign Homework')
  );

  classOptions = computed<OsSelectOption<number>[]>(() =>
    this.classes().map(c => ({
      value: c.classId,
      label: `${c.className}${c.section ? ' ' + c.section : ''}`.trim()
    }))
  );

  subjectOptions = computed<OsSelectOption<number>[]>(() =>
    this.subjects().map(s => ({ value: s.subjectId, label: s.subjectName }))
  );

  private workingDays = new Set<number>();
  private isTeacher = false;
  private teacherAssignments: ClassSubjectDto[] = [];

  form = this.fb.group({
    classId:      [null as number | null, Validators.required],
    subjectId:    [null as number | null, Validators.required],
    title:        ['', [Validators.required, Validators.minLength(3)]],
    description:  [''],
    assignedDate: [new Date().toISOString().slice(0, 10), Validators.required],
    dueDate:      ['', Validators.required]
  });

  ngOnInit() {
    this.menuSvc.ensureLoaded().subscribe();
    const user = this.authSvc.currentUser();
    this.isTeacher = this.authSvc.hasRole('teacher');

    if (this.isTeacher && user) {
      this.academicSvc.getAssignmentsByTeacher(user.userId).subscribe(assignments => {
        this.teacherAssignments = assignments.filter(a => a.isActive);
        const unique = new Map<number, ClassDto>();
        this.teacherAssignments.forEach(a =>
          unique.set(a.classId, { classId: a.classId, className: a.className, section: a.classSection ?? '' } as any)
        );
        this.classes.set([...unique.values()]);
      });
    } else {
      this.academicSvc.getClasses().subscribe(c => this.classes.set(c));
      this.academicSvc.getSubjects().subscribe(s => this.subjects.set(s));
    }

    this.settingsSvc.getWorkingDays().subscribe(wd => {
      this.workingDays = wd;
      this.checkAssignedDate();
      const assigned = this.form.value.assignedDate;
      if (assigned && !this.assignedOffDay()) {
        this.form.patchValue({ dueDate: this.nextWorkingDay(assigned) }, { emitEvent: false });
      }
    });

    this.form.get('dueDate')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.validateDates());
    this.form.get('assignedDate')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.validateDates());
  }

  onClassSelect(classId: number | null) {
    this.form.patchValue({ classId });
    this.form.controls.classId.markAsTouched();
    this.onClassChange();
  }

  onClassChange() {
    this.form.patchValue({ subjectId: null });
    const classId = this.form.value.classId;
    if (!classId) { this.subjects.set([]); return; }

    if (this.isTeacher) {
      const subs = this.teacherAssignments
        .filter(a => a.classId === classId)
        .map(a => ({ subjectId: a.subjectId, subjectName: a.subjectName }) as SubjectDto);
      this.subjects.set(subs);
    } else {
      this.academicSvc.getClassSubjects(classId).subscribe(cs =>
        this.subjects.set(cs.filter(s => s.isActive).map(s => ({ subjectId: s.subjectId, subjectName: s.subjectName }) as SubjectDto))
      );
    }
  }

  onAssignedDateChange() {
    this.checkAssignedDate();
    const val = this.form.value.assignedDate;
    if (val && !this.assignedOffDay()) {
      this.form.patchValue({ dueDate: this.nextWorkingDay(val) }, { emitEvent: false });
      this.validateDates();
    }
  }

  private checkAssignedDate() {
    const val = this.form.value.assignedDate;
    if (!val) { this.assignedOffDay.set(false); return; }
    const d = new Date(val + 'T00:00:00');
    this.assignedOffDay.set(!this.settingsSvc.isWorkingDate(d, this.workingDays));
  }

  private nextWorkingDay(fromDateStr: string): string {
    const d = new Date(fromDateStr + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    for (let i = 0; i < 14; i++) {
      if (this.settingsSvc.isWorkingDate(d, this.workingDays)) break;
      d.setDate(d.getDate() + 1);
    }
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  validateDates() {
    const a = this.form.value.assignedDate;
    const d = this.form.value.dueDate;
    this.dateError.set(!!(a && d && d < a));
  }

  touched(field: string): boolean {
    const c = this.form.get(field);
    return !!(c?.invalid && c?.touched);
  }

  submit() {
    this.form.markAllAsTouched();
    this.validateDates();
    if (this.form.invalid || this.dateError() || this.assignedOffDay()) return;

    this.saving.set(true); this.errorMsg.set('');
    const v = this.form.value as any;

    this.hwSvc.create({
      classId:      v.classId,
      subjectId:    v.subjectId,
      title:        v.title.trim(),
      description:  v.description?.trim() || null,
      assignedDate: v.assignedDate,
      dueDate:      v.dueDate,
      fileId:       null
    }).subscribe({
      next: () => { this.saving.set(false); this.success.set(true); },
      error: (e: any) => { this.saving.set(false); this.errorMsg.set(e?.error?.error ?? 'Failed to assign homework. Please try again.'); }
    });
  }

  assignAnother() {
    this.success.set(false);
    this.form.reset({ assignedDate: new Date().toISOString().slice(0, 10) });
    this.dateError.set(false);
    this.assignedOffDay.set(false);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
