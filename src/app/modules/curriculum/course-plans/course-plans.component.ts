import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CurriculumService } from '../../../core/services/curriculum.service';
import { AcademicService } from '../../../core/services/academic.service';
import { MenuService } from '../../../core/services/menu.service';
import { CoursePlanListDto } from '../../../core/models/curriculum.model';
import { AcademicYear, ClassDto, SubjectDto } from '../../../core/models/academic.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { OsSelectComponent, OsSelectOption } from '../../../shared/components/os-select/os-select.component';
import { classDisplay, courseHeading } from '../curriculum-ui.util';

@Component({
  selector: 'app-course-plans',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, LoadingComponent, EmptyStateComponent, OsSelectComponent],
  template: `
    <div class="os-page compact">
      <app-page-header [dense]="true" [title]="pageTitle()">
        <button type="button" class="btn-primary" (click)="showCreate.set(true)">+ New Course</button>
      </app-page-header>

      <div class="os-toolbar">
        <div class="os-toolbar-group">
          <div class="os-field inline grow">
            <label class="os-field-label">Year</label>
            <app-os-select placeholder="All years" [options]="yearOptions()" [value]="yearId" (valueChange)="yearId = $event; load()" />
          </div>
          <div class="os-field inline grow">
            <label class="os-field-label">Class</label>
            <app-os-select placeholder="All classes" [options]="classOptions()" [value]="classId" (valueChange)="classId = $event; load()" />
          </div>
          <div class="os-field inline grow">
            <label class="os-field-label">Subject</label>
            <app-os-select placeholder="All subjects" [options]="subjectOptions()" [value]="subjectId" (valueChange)="subjectId = $event; load()" />
          </div>
          <div class="os-field inline grow">
            <label class="os-field-label">Status</label>
            <app-os-select placeholder="All statuses" [options]="statusOptions" [value]="status" (valueChange)="status = $event; load()" />
          </div>
        </div>
      </div>

      @if (showCreate()) {
        <div class="os-panel create-panel">
          <h3>Create Course</h3>
          <div class="create-grid">
            <div class="os-field">
              <label class="os-field-label">Academic Year *</label>
              <app-os-select placeholder="Select year" [options]="yearRequiredOptions()" [value]="newYearId" (valueChange)="newYearId = $event" />
            </div>
            <div class="os-field">
              <label class="os-field-label">Class *</label>
              <app-os-select placeholder="Select class" [options]="classRequiredOptions()" [value]="newClassId" (valueChange)="newClassId = $event" />
            </div>
            <div class="os-field">
              <label class="os-field-label">Subject *</label>
              <app-os-select placeholder="Select subject" [options]="subjectRequiredOptions()" [value]="newSubjectId" (valueChange)="newSubjectId = $event" />
            </div>
            <div class="os-field">
              <label class="os-field-label">Title</label>
              <input class="os-input" [(ngModel)]="newTitle" placeholder="Optional — auto-generated if blank" />
            </div>
          </div>
          @if (createError()) { <div class="os-error">{{ createError() }}</div> }
          <div class="create-actions">
            <button type="button" class="btn-secondary" (click)="showCreate.set(false)">Cancel</button>
            <button type="button" class="btn-primary" [disabled]="creating()" (click)="create()">Create Draft</button>
          </div>
        </div>
      }

      @if (loading()) { <app-loading /> }
      @else if (plans().length === 0) {
        <div class="os-panel"><app-empty-state message="No courses yet. Create one to start your digital textbook." icon="auto_stories" /></div>
      } @else {
        <div class="course-table" role="list">
          <div class="course-head">
            <span>Course</span>
            <span>Year</span>
            <span>Status</span>
            <span class="num">Chapters</span>
            <span class="num">Topics</span>
          </div>
          @for (p of plans(); track p.coursePlanId) {
            <a class="course-row" role="listitem" [routerLink]="['/curriculum/plans', p.coursePlanId]">
              <span class="course-main">
                <strong>{{ heading(p) }}</strong>
              </span>
              <span class="meta">{{ p.yearLabel }}</span>
              <span><span class="status" [attr.data-status]="p.status">{{ p.status }}</span></span>
              <span class="num">{{ p.chapterCount }}</span>
              <span class="num">{{ p.topicCount }}</span>
            </a>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .create-panel { margin-bottom: 1rem; padding: 1rem 1.25rem; }
    .create-panel h3 { margin: 0 0 .85rem; font-size: 1rem; font-weight: 700; }
    .create-grid {
      display: grid; grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 14px 16px; width: 100%; align-items: start;
    }
    .create-grid .os-field { width: 100%; min-width: 0; }
    .create-grid app-os-select, .create-grid .os-input {
      display: block; width: 100%; min-width: 0; max-width: 100%;
    }
    .create-grid .os-input {
      box-sizing: border-box; height: 34px; padding: 0 10px;
      border: 1px solid var(--border, #e5e7eb); border-radius: 10px;
      background: var(--surface, #fff); color: var(--t1, #111827);
      font: inherit; font-size: 13px; font-weight: 600;
    }
    .create-grid .os-input:focus {
      outline: none; border-color: var(--accent, #2563eb);
      box-shadow: 0 0 0 3px var(--accent-g, rgba(37, 99, 235, .15));
    }
    .create-grid .os-input::placeholder { font-weight: 500; color: var(--t4, #9ca3af); }
    :host ::ng-deep .create-grid .os-dd { min-width: 0; width: 100%; }
    .create-actions {
      display: flex; gap: .5rem; justify-content: flex-end; align-items: center;
      margin-top: 1rem; padding-top: .85rem; border-top: 1px solid var(--border, #e5e7eb);
    }
    .os-error { color: #b91c1c; font-size: .85rem; margin-top: .65rem; }

    .course-table {
      background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;
    }
    .course-head, .course-row {
      display: grid;
      grid-template-columns: minmax(0, 2.2fr) minmax(0, 1fr) auto minmax(4rem, .7fr) minmax(4rem, .7fr);
      gap: .65rem; align-items: center; padding: .7rem 1rem;
    }
    .course-head {
      font-size: .7rem; font-weight: 700; text-transform: uppercase; letter-spacing: .04em;
      color: #64748b; background: #f8fafc; border-bottom: 1px solid #e5e7eb;
    }
    .course-row {
      text-decoration: none; color: inherit; border-top: 1px solid #f1f5f9;
      transition: background .12s;
    }
    .course-row:first-of-type { border-top: none; }
    .course-row:hover { background: #f8fafc; }
    .course-main { min-width: 0; }
    .course-main strong { display: block; font-size: .95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .meta { font-size: .85rem; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .num { text-align: right; font-variant-numeric: tabular-nums; font-size: .9rem; color: #334155; }
    .status {
      font-size: .7rem; font-weight: 700; letter-spacing: .02em;
      padding: .2rem .5rem; border-radius: 999px; background: #f3f4f6; color: #4b5563;
      white-space: nowrap;
    }
    .status[data-status="Published"] { background: #dcfce7; color: #166534; }
    .status[data-status="Draft"] { background: #fef3c7; color: #92400e; }
    .status[data-status="Archived"] { background: #e5e7eb; color: #4b5563; }

    @media (max-width: 960px) {
      .create-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 720px) {
      .course-head { display: none; }
      .course-row {
        grid-template-columns: 1fr auto;
        grid-template-areas:
          "main status"
          "meta meta"
          "counts counts";
        gap: .35rem .65rem; padding: .85rem 1rem;
      }
      .course-main { grid-area: main; }
      .course-row > .meta { grid-area: meta; }
      .course-row > span:nth-child(3) { grid-area: status; justify-self: end; }
      .course-row > .num:nth-child(4),
      .course-row > .num:nth-child(5) {
        grid-area: counts; display: inline;
      }
      .course-row > .num:nth-child(4)::after { content: " chapters · "; color: #94a3b8; }
      .course-row > .num:nth-child(5)::after { content: " topics"; color: #94a3b8; }
      .course-row > .num { text-align: left; color: #64748b; font-size: .8rem; }
    }
    @media (max-width: 560px) {
      .create-grid { grid-template-columns: minmax(0, 1fr); }
      .create-actions { justify-content: stretch; }
      .create-actions .btn-primary,
      .create-actions .btn-secondary { flex: 1; }
    }
  `]
})
export class CoursePlansComponent implements OnInit {
  private curriculum = inject(CurriculumService);
  private academic = inject(AcademicService);
  private menuSvc = inject(MenuService);
  private router = inject(Router);

  plans = signal<CoursePlanListDto[]>([]);
  years = signal<AcademicYear[]>([]);
  classes = signal<ClassDto[]>([]);
  subjects = signal<SubjectDto[]>([]);
  loading = signal(false);
  showCreate = signal(false);
  creating = signal(false);
  createError = signal('');

  yearId: number | null = null;
  classId: number | null = null;
  subjectId: number | null = null;
  status: string | null = null;

  newYearId: number | null = null;
  newClassId: number | null = null;
  newSubjectId: number | null = null;
  newTitle = '';

  statusOptions: OsSelectOption<string | null>[] = [
    { value: null, label: 'All statuses' },
    { value: 'Draft', label: 'Draft' },
    { value: 'Published', label: 'Published' },
    { value: 'Archived', label: 'Archived' }
  ];

  pageTitle = computed(() => this.menuSvc.titleForRoute('/curriculum/plans', 'Courses'));

  yearOptions = computed<OsSelectOption<number | null>[]>(() => [
    { value: null, label: 'All years' },
    ...this.years().map(y => ({ value: y.academicYearId as number | null, label: y.yearLabel }))
  ]);
  classOptions = computed<OsSelectOption<number | null>[]>(() => [
    { value: null, label: 'All classes' },
    ...this.classes().map(c => ({
      value: c.classId as number | null,
      label: classDisplay(c.className, c.section)
    }))
  ]);
  subjectOptions = computed<OsSelectOption<number | null>[]>(() => [
    { value: null, label: 'All subjects' },
    ...this.subjects().map(s => ({ value: s.subjectId as number | null, label: s.subjectName }))
  ]);
  yearRequiredOptions = computed(() => this.years().map(y => ({ value: y.academicYearId as number | null, label: y.yearLabel })));
  classRequiredOptions = computed(() => this.classes().map(c => ({
    value: c.classId as number | null,
    label: classDisplay(c.className, c.section)
  })));
  subjectRequiredOptions = computed(() => this.subjects().map(s => ({ value: s.subjectId as number | null, label: s.subjectName })));

  heading(p: CoursePlanListDto) {
    return courseHeading(p.subjectName, p.className, p.section);
  }

  ngOnInit() {
    this.menuSvc.ensureLoaded().subscribe();
    this.academic.getYears().subscribe(y => this.years.set(y));
    this.academic.getClasses().subscribe(c => this.classes.set(c));
    this.academic.getSubjects().subscribe(s => this.subjects.set(s));
    this.load();
  }

  load() {
    this.loading.set(true);
    this.curriculum.getPlans({
      academicYearId: this.yearId,
      classId: this.classId,
      subjectId: this.subjectId,
      status: this.status
    }).subscribe({
      next: p => { this.plans.set(p); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  create() {
    if (!this.newYearId || !this.newClassId || !this.newSubjectId) {
      this.createError.set('Year, Class, and Subject are required.');
      return;
    }
    this.creating.set(true);
    this.createError.set('');
    this.curriculum.createPlan({
      academicYearId: this.newYearId,
      classId: this.newClassId,
      subjectId: this.newSubjectId,
      title: this.newTitle.trim()
    }).subscribe({
      next: created => {
        this.creating.set(false);
        this.showCreate.set(false);
        this.newTitle = '';
        this.router.navigate(['/curriculum/plans', created.coursePlanId]);
      },
      error: err => {
        this.creating.set(false);
        this.createError.set(err?.error?.error || 'Failed to create course.');
      }
    });
  }
}
