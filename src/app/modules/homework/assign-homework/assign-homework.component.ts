import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { Message } from 'primeng/message';
import { HomeworkService } from '../../../core/services/homework.service';
import { AcademicService } from '../../../core/services/academic.service';
import { SettingsService } from '../../../core/services/settings.service';
import { AuthService } from '../../../core/services/auth.service';
import { MenuService } from '../../../core/services/menu.service';
import { ClassDto, SubjectDto, ClassSubjectDto } from '../../../core/models/academic.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';
import {
  classroomReturnQueryFromParamMap,
  isFromClassroom
} from '../../classroom/classroom-context.util';

interface SelectOpt<T> { value: T; label: string; }

@Component({
  selector: 'app-assign-homework',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, RouterModule, PageHeaderComponent, DatePickerComponent,
    Button, Select, InputText, Textarea, Message
  ],
  template: `
    <div class="os-page compact hw-assign-page">
      <div class="form-shell">
        <app-page-header [dense]="true" [title]="pageTitle()" routeUrl="/homework/assign">
          @if (fromClassroom()) {
            <p-button label="Back to class" icon="pi pi-arrow-left" severity="secondary" [outlined]="true"
              [routerLink]="['/classroom/today']" [queryParams]="classroomReturnQp()" />
          }
        </app-page-header>

        @if (success()) {
          <div class="alert success">
            <span class="material-icons-round">check_circle</span>
            <span class="alert-text">Homework assigned successfully.</span>
            @if (fromClassroom()) {
              <p-button label="Back to class" size="small" severity="secondary" [outlined]="true"
                [routerLink]="['/classroom/today']" [queryParams]="classroomReturnQp()" />
            }
            <p-button label="Assign another" icon="pi pi-plus" size="small" severity="secondary" [outlined]="true"
              (onClick)="assignAnother()" />
            <p-button label="View diary" icon="pi pi-book" size="small" severity="secondary" [outlined]="true"
              (onClick)="router.navigate(['/homework/list'])" />
          </div>
        }
        @if (errorMsg()) {
          <p-message severity="error" icon="pi pi-exclamation-circle" [text]="errorMsg()" styleClass="w-full" />
        }

        @if (!success()) {
          <form [formGroup]="form" (ngSubmit)="submit()" class="assign-form">
            <div class="os-toolbar">
              <div class="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
                <div class="flex min-w-0 flex-col gap-1">
                  <label class="os-field-label">Class</label>
                  <p-select
                    class="w-full"
                    placeholder="Select class…"
                    ariaLabel="Select class"
                    [options]="classOptions()"
                    optionLabel="label"
                    optionValue="value"
                    [filter]="classOptions().length > 6"
                    filterBy="label"
                    [invalid]="touched('classId')"
                    [ngModel]="form.value.classId ?? null"
                    [ngModelOptions]="{ standalone: true }"
                    (ngModelChange)="onClassSelect($event ?? null)" />
                </div>
                <div class="flex min-w-0 flex-col gap-1">
                  <label class="os-field-label">Subject</label>
                  <p-select
                    class="w-full"
                    placeholder="Select subject…"
                    ariaLabel="Select subject"
                    [options]="subjectOptions()"
                    optionLabel="label"
                    optionValue="value"
                    [invalid]="touched('subjectId')"
                    [ngModel]="form.value.subjectId ?? null"
                    [ngModelOptions]="{ standalone: true }"
                    (ngModelChange)="form.patchValue({ subjectId: $event ?? null }); form.controls.subjectId.markAsTouched()" />
                </div>
              </div>
            </div>

            <div class="os-panel details-panel">
              <div class="details-body">
                <div class="field" [class.invalid]="touched('title')">
                  <label class="field-label">Title</label>
                  <input pInputText class="w-full" formControlName="title" placeholder="e.g. Chapter 3 Exercise 1–10" />
                  @if (touched('title')) { <span class="err">Title is required.</span> }
                </div>

                <div class="field">
                  <label class="field-label">
                    Instructions
                    <span class="optional">optional</span>
                  </label>
                  <textarea pTextarea class="w-full" formControlName="description" rows="3"
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
                @if (fromClassroom()) {
                  <p-button label="Cancel" severity="secondary" [outlined]="true"
                    [routerLink]="['/classroom/today']" [queryParams]="classroomReturnQp()" />
                } @else {
                  <p-button label="Cancel" severity="secondary" [outlined]="true"
                    (onClick)="router.navigate(['/homework/list'])" />
                }
                <p-button type="submit" [label]="saving() ? 'Saving…' : 'Assign Homework'"
                  icon="pi pi-send" [loading]="saving()" [disabled]="saving()" />
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
    }

    /* Full content width — no unused side gutter */
    .form-shell {
      width: 100%;
      max-width: none;
      display: flex;
      flex-direction: column;
      gap: 8px;
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
      width: 100%;
      max-width: none;
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

    textarea { resize: vertical; min-height: 72px; }
    .field.invalid input,
    .field.invalid textarea { border-color: var(--red); }

    .form-footer {
      display: flex;
      justify-content: flex-start;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      padding: 12px 16px;
      margin-top: 0;
      border-top: 1px solid var(--border);
      background: var(--surface-2);
      position: relative;
      z-index: 1;
      border-radius: 0 0 var(--r-lg, 12px) var(--r-lg, 12px);
    }
    .hw-assign-page {
      padding-bottom: var(--fab-page-pad);
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
    @media (max-width: 640px) {
      .dates-row { grid-template-columns: 1fr; }
      .dates-row { max-width: none; }
      .form-footer {
        flex-direction: column-reverse;
        align-items: stretch;
      }
      .form-footer p-button { width: 100%; }
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
  private route       = inject(ActivatedRoute);
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

  classOptions = computed<SelectOpt<number>[]>(() =>
    this.classes().map(c => ({
      value: c.classId,
      label: `${c.className}${c.section ? ' ' + c.section : ''}`.trim()
    }))
  );

  subjectOptions = computed<SelectOpt<number>[]>(() =>
    this.subjects().map(s => ({ value: s.subjectId, label: s.subjectName }))
  );

  private workingDays = new Set<number>();
  private isTeacher = false;
  private teacherAssignments: ClassSubjectDto[] = [];
  fromClassroom = signal(false);
  private classroomReturn: Record<string, string | number> | null = null;

  classroomReturnQp() { return this.classroomReturn; }

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
    const qp = this.route.snapshot.queryParamMap;
    this.fromClassroom.set(isFromClassroom(qp));
    this.classroomReturn = classroomReturnQueryFromParamMap(qp);
    const prefClassId = Number(qp.get('classId')) || null;
    const prefSubjectId = Number(qp.get('subjectId')) || null;

    if (this.isTeacher && user) {
      this.academicSvc.getAssignmentsByTeacher(user.userId).subscribe(assignments => {
        this.teacherAssignments = assignments.filter(a => a.isActive);
        const unique = new Map<number, ClassDto>();
        this.teacherAssignments.forEach(a =>
          unique.set(a.classId, { classId: a.classId, className: a.className, section: a.classSection ?? '' } as any)
        );
        this.classes.set([...unique.values()]);
        if (prefClassId && unique.has(prefClassId)) {
          this.form.patchValue({ classId: prefClassId });
          this.onClassChange();
          if (prefSubjectId && this.subjects().some(s => s.subjectId === prefSubjectId)) {
            this.form.patchValue({ subjectId: prefSubjectId });
          }
        }
      });
    } else {
      this.academicSvc.getClasses().subscribe(c => {
        this.classes.set(c);
        if (prefClassId) {
          this.form.patchValue({ classId: prefClassId });
          this.onClassChange();
          if (prefSubjectId) this.form.patchValue({ subjectId: prefSubjectId });
        }
      });
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
