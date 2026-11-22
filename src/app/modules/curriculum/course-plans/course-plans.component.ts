import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { Tag } from 'primeng/tag';
import { Dialog } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { CurriculumService } from '../../../core/services/curriculum.service';
import { AcademicService } from '../../../core/services/academic.service';
import { MenuService } from '../../../core/services/menu.service';
import { CoursePlanListDto } from '../../../core/models/curriculum.model';
import { AcademicYear, ClassDto, SubjectDto } from '../../../core/models/academic.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { classDisplay, courseHeading } from '../curriculum-ui.util';

interface SelectOpt<T> { value: T; label: string; }

@Component({
  selector: 'app-course-plans',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule, PageHeaderComponent, LoadingComponent, EmptyStateComponent,
    Button, Select, InputText, Tag, Dialog, TableModule
  ],
  template: `
    <div class="os-page compact">
      <app-page-header [dense]="true" [title]="pageTitle()" routeUrl="/curriculum/plans">
        <p-button label="New Course" icon="pi pi-plus" size="small" (onClick)="openCreate()" />
      </app-page-header>

      <div class="card mb-3 grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
        <div class="flex min-w-0 flex-col gap-1">
          <label class="text-[11px] font-bold uppercase tracking-wide text-[var(--t4)]">Year</label>
          <p-select class="w-full" placeholder="All years" [options]="yearOptions()" optionLabel="label" optionValue="value"
            [showClear]="true" [(ngModel)]="yearId" (onChange)="load()" />
        </div>
        <div class="flex min-w-0 flex-col gap-1">
          <label class="text-[11px] font-bold uppercase tracking-wide text-[var(--t4)]">Class</label>
          <p-select class="w-full" placeholder="All classes" [options]="classOptions()" optionLabel="label" optionValue="value"
            [showClear]="true" [filter]="true" [(ngModel)]="classId" (onChange)="load()" />
        </div>
        <div class="flex min-w-0 flex-col gap-1">
          <label class="text-[11px] font-bold uppercase tracking-wide text-[var(--t4)]">Subject</label>
          <p-select class="w-full" placeholder="All subjects" [options]="subjectOptions()" optionLabel="label" optionValue="value"
            [showClear]="true" [filter]="true" [(ngModel)]="subjectId" (onChange)="load()" />
        </div>
        <div class="flex min-w-0 flex-col gap-1">
          <label class="text-[11px] font-bold uppercase tracking-wide text-[var(--t4)]">Status</label>
          <p-select class="w-full" placeholder="All statuses" [options]="statusOptions" optionLabel="label" optionValue="value"
            [showClear]="true" [(ngModel)]="status" (onChange)="load()" />
        </div>
      </div>

      @if (loading()) { <app-loading /> }
      @else if (plans().length === 0) {
        <div class="card"><app-empty-state message="No courses yet. Create one to start your digital textbook." icon="auto_stories" /></div>
      } @else {
        <div class="card overflow-hidden">
          <p-table [value]="plans()" dataKey="coursePlanId" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '40rem' }" [rowHover]="true">
            <ng-template #header>
              <tr>
                <th>Course</th>
                <th>Year</th>
                <th>Status</th>
                <th class="text-right">Chapters</th>
                <th class="text-right">Topics</th>
              </tr>
            </ng-template>
            <ng-template #body let-p>
              <tr class="cursor-pointer" [routerLink]="['/curriculum/plans', p.coursePlanId]">
                <td><strong>{{ heading(p) }}</strong></td>
                <td class="text-[var(--t3)]">{{ p.yearLabel }}</td>
                <td><p-tag [value]="p.status" [severity]="statusSeverity(p.status)" [rounded]="true" /></td>
                <td class="text-right tabular-nums">{{ p.chapterCount }}</td>
                <td class="text-right tabular-nums">{{ p.topicCount }}</td>
              </tr>
            </ng-template>
          </p-table>
        </div>
      }
    </div>

    <p-dialog
      header="Create Course"
      [visible]="showCreate()"
      (visibleChange)="showCreate.set($event)"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
      [style]="{ width: '34rem' }"
      [breakpoints]="{ '640px': '96vw' }">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold">Academic Year *</label>
          <p-select class="w-full" placeholder="Select year" [options]="yearOptions()" optionLabel="label" optionValue="value"
            appendTo="body" [overlayOptions]="{ baseZIndex: 10050 }" [(ngModel)]="newYearId" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold">Class *</label>
          <p-select class="w-full" placeholder="Select class" [options]="classOptions()" optionLabel="label" optionValue="value"
            [filter]="true" appendTo="body" [overlayOptions]="{ baseZIndex: 10050 }" [(ngModel)]="newClassId" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold">Subject *</label>
          <p-select class="w-full" placeholder="Select subject" [options]="subjectOptions()" optionLabel="label" optionValue="value"
            [filter]="true" appendTo="body" [overlayOptions]="{ baseZIndex: 10050 }" [(ngModel)]="newSubjectId" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold">Title</label>
          <input pInputText class="w-full" [(ngModel)]="newTitle" placeholder="Optional — auto-generated if blank" />
        </div>
      </div>
      @if (createError()) { <div class="mt-3 text-sm text-red-700">{{ createError() }}</div> }
      <ng-template #footer>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <p-button label="Cancel" severity="secondary" [outlined]="true" (onClick)="showCreate.set(false)" />
          <p-button label="Create Draft" icon="pi pi-check" [loading]="creating()" [disabled]="creating()" (onClick)="create()" />
        </div>
      </ng-template>
    </p-dialog>
  `
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

  statusOptions: SelectOpt<string>[] = [
    { value: 'Draft', label: 'Draft' },
    { value: 'Published', label: 'Published' },
    { value: 'Archived', label: 'Archived' }
  ];

  pageTitle = computed(() => this.menuSvc.titleForRoute('/curriculum/plans', 'Courses'));

  yearOptions = computed<SelectOpt<number>[]>(() =>
    this.years().map(y => ({ value: y.academicYearId, label: y.yearLabel })));
  classOptions = computed<SelectOpt<number>[]>(() =>
    this.classes().map(c => ({ value: c.classId, label: classDisplay(c.className, c.section) })));
  subjectOptions = computed<SelectOpt<number>[]>(() =>
    this.subjects().map(s => ({ value: s.subjectId, label: s.subjectName })));

  heading(p: CoursePlanListDto) {
    return courseHeading(p.subjectName, p.className, p.section);
  }

  statusSeverity(s: string): 'success' | 'warn' | 'secondary' {
    if (s === 'Published') return 'success';
    if (s === 'Draft') return 'warn';
    return 'secondary';
  }

  ngOnInit() {
    this.menuSvc.ensureLoaded().subscribe();
    this.academic.getYears().subscribe(y => this.years.set(y));
    this.academic.getClasses().subscribe(c => this.classes.set(c));
    this.academic.getSubjects().subscribe(s => this.subjects.set(s));
    this.load();
  }

  openCreate() {
    this.createError.set('');
    this.showCreate.set(true);
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
