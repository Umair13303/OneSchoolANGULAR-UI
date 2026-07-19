import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { HomeworkService } from '../../../core/services/homework.service';
import { AcademicService } from '../../../core/services/academic.service';
import { SettingsService } from '../../../core/services/settings.service';
import { AuthService } from '../../../core/services/auth.service';
import { ClassDto, SubjectDto, ClassSubjectDto } from '../../../core/models/academic.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';

@Component({
  selector: 'app-assign-homework',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageHeaderComponent, DatePickerComponent],
  template: `
    <app-page-header title="Assign Homework" subtitle="Create a new homework assignment for a class" />

    @if (success()) {
      <div class="alert success">
        ✅ Homework assigned successfully!
        <button class="link-btn" (click)="assignAnother()">Assign Another</button>
        <button class="link-btn" (click)="router.navigate(['/homework/list'])">View Diary</button>
      </div>
    }
    @if (errorMsg()) { <div class="alert error">⚠️ {{ errorMsg() }}</div> }

    @if (!success()) {
      <form [formGroup]="form" (ngSubmit)="submit()" class="form-wrap">

        <!-- Section 1: Class & Subject -->
        <div class="card form-section">
          <h3 class="section-title">📚 Class & Subject</h3>
          <div class="row-2">
            <div class="field" [class.invalid]="touched('classId')">
              <label>Class *</label>
              <select formControlName="classId" (change)="onClassChange()">
                <option [ngValue]="null">Select class</option>
                @for (c of classes(); track c.classId) {
                  <option [ngValue]="c.classId">{{ c.className }} {{ c.section }}</option>
                }
              </select>
              @if (touched('classId')) { <span class="err">Class is required.</span> }
            </div>
            <div class="field" [class.invalid]="touched('subjectId')">
              <label>Subject *</label>
              <select formControlName="subjectId">
                <option [ngValue]="null">Select subject</option>
                @for (s of subjects(); track s.subjectId) {
                  <option [ngValue]="s.subjectId">{{ s.subjectName }}</option>
                }
              </select>
              @if (touched('subjectId')) { <span class="err">Subject is required.</span> }
            </div>
          </div>
        </div>

        <!-- Section 2: Assignment Details -->
        <div class="card form-section">
          <h3 class="section-title">📝 Assignment Details</h3>
          <div class="field full" [class.invalid]="touched('title')">
            <label>Title *</label>
            <input formControlName="title" placeholder="e.g. Chapter 3 Exercise 1-10" />
            @if (touched('title')) { <span class="err">Title is required.</span> }
          </div>
          <div class="field full">
            <label>Description / Instructions</label>
            <textarea formControlName="description" rows="4"
              placeholder="Add detailed instructions, page numbers, or any notes for students..."></textarea>
          </div>
          <div class="row-2">
            <div class="field" [class.invalid]="touched('assignedDate')">
              <label>Assigned Date *</label>
              <app-date-picker formControlName="assignedDate" (dateChange)="onAssignedDateChange()" />
              @if (touched('assignedDate')) { <span class="err">Required.</span> }
              @if (assignedOffDay()) {
                <span class="err off-warn">
                  <span class="material-icons-round">event_busy</span> Off day — homework cannot be assigned on this date
                </span>
              }
            </div>
            <div class="field" [class.invalid]="touched('dueDate') || dateError()">
              <label>Due Date *</label>
              <app-date-picker formControlName="dueDate" />
              @if (touched('dueDate')) { <span class="err">Required.</span> }
              @if (dateError()) { <span class="err">Due date must be on or after assigned date.</span> }
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="form-actions">
          <button type="button" class="btn-secondary" (click)="router.navigate(['/homework/list'])">Cancel</button>
          <button type="submit" class="btn-primary" [disabled]="saving()">
            @if (saving()) { <span class="spinner-sm"></span> Saving... }
            @else { 📤 Assign Homework }
          </button>
        </div>
      </form>
    }
  `,
  styles: [`
    .form-wrap { display:flex; flex-direction:column; gap:20px; max-width:860px; }
    .form-section { padding:22px 24px; }
    .section-title { font-size:15px; font-weight:700; color:var(--t1); margin-bottom:18px;
      padding-bottom:10px; border-bottom:1px solid var(--border); }

    .row-3 { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
    .row-2 { display:grid; grid-template-columns:repeat(2,1fr); gap:16px; }
    @media(max-width:680px) { .row-3,.row-2 { grid-template-columns:1fr; } }

    .field { display:flex; flex-direction:column; gap:5px; }
    .field.full { margin-bottom:14px; }
    label { font-size:11px; font-weight:600; color:var(--t3); text-transform:uppercase; letter-spacing:.5px; }
    input, select, textarea {
      padding:9px 12px; border:1.5px solid var(--border); border-radius:7px;
      font-size:13.5px; font-family:inherit; transition:border-color .15s;
      background:var(--surface); color:var(--t1);
    }
    input:focus, select:focus, textarea:focus {
      outline:none; border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-g);
    }
    .field.invalid input, .field.invalid select, .field.invalid textarea { border-color:var(--red); }
    textarea { resize:vertical; min-height:100px; }
    .err { font-size:11.5px; color:var(--red); }
    .off-warn { display:inline-flex; align-items:center; gap:4px; margin-top:2px; }
    .off-warn .material-icons-round { font-size:13px; }

    .form-actions { display:flex; justify-content:flex-end; gap:12px; padding-top:4px; }

    .alert { padding:14px 18px; border-radius:8px; margin-bottom:16px;
      font-size:13.5px; display:flex; align-items:center; gap:12px; max-width:860px; }
    .alert.success { background:var(--green-s); color:var(--green); border:1px solid var(--green); }
    .alert.error   { background:var(--red-s); color:var(--red); border:1px solid var(--red); }
    .link-btn { padding:4px 10px; border:1px solid currentColor; border-radius:5px;
      background:none; color:inherit; cursor:pointer; font-size:12px; font-family:inherit; }

    .spinner-sm { width:14px; height:14px; border:2px solid rgba(255,255,255,.4);
      border-top-color:#fff; border-radius:50%; animation:spin .7s linear infinite; display:inline-block; }
    @keyframes spin { to { transform:rotate(360deg); } }
  `]
})
export class AssignHomeworkComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private hwSvc       = inject(HomeworkService);
  private academicSvc = inject(AcademicService);
  private settingsSvc = inject(SettingsService);
  private authSvc     = inject(AuthService);
  private fb          = inject(FormBuilder);
  router = inject(Router);

  classes        = signal<ClassDto[]>([]);
  subjects       = signal<SubjectDto[]>([]);
  saving         = signal(false);
  success        = signal(false);
  errorMsg       = signal('');
  dateError      = signal(false);
  assignedOffDay = signal(false);

  private workingDays      = new Set<number>();
  private isTeacher        = false;
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
    const user = this.authSvc.currentUser();
    this.isTeacher = this.authSvc.hasRole('teacher');

    if (this.isTeacher && user) {
      // Teacher: load only their assigned classes; subjects filtered per class on selection
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

  onClassChange() {
    this.form.patchValue({ subjectId: null });
    const classId = this.form.value.classId;
    if (!classId) { this.subjects.set([]); return; }

    if (this.isTeacher) {
      // Only subjects this teacher teaches in the selected class
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
    // Auto-set due date to next working day after assigned date
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
    // advance until we land on a working day (max 14 days to avoid infinite loop)
    for (let i = 0; i < 14; i++) {
      if (this.settingsSvc.isWorkingDate(d, this.workingDays)) break;
      d.setDate(d.getDate() + 1);
    }
    // use local date parts to avoid UTC timezone shift
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
