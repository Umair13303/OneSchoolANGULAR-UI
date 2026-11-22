import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CurriculumService } from '../../../core/services/curriculum.service';
import { AcademicService } from '../../../core/services/academic.service';
import { MenuService } from '../../../core/services/menu.service';
import { CurriculumProgressSummaryDto } from '../../../core/models/curriculum.model';
import { AcademicYear, ClassDto, SubjectDto } from '../../../core/models/academic.model';
import { FormsModule } from '@angular/forms';
import { Select } from 'primeng/select';
import { ProgressBar } from 'primeng/progressbar';
import { Button } from 'primeng/button';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { classDisplay, courseHeading, progressDisplay } from '../curriculum-ui.util';

@Component({
  selector: 'app-curriculum-progress',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, LoadingComponent, EmptyStateComponent, Select, ProgressBar, Button],
  template: `
    <div class="os-page compact">
      <app-page-header [dense]="true" [title]="pageTitle()" routeUrl="/curriculum/progress" />
      <div class="card mb-3 grid grid-cols-1 gap-3 p-3 sm:grid-cols-3">
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
      </div>

      @if (loading()) { <app-loading /> }
      @else if (items().length === 0) {
        <div class="os-panel"><app-empty-state message="No published course progress yet." icon="monitoring" /></div>
      } @else {
        <div class="list">
          @for (item of items(); track item.coursePlanId) {
            <div class="card">
              <div class="card-head">
                <div>
                  <strong>{{ heading(item) }}</strong>
                  <div class="muted">{{ item.yearLabel }}</div>
                </div>
                <div class="pct">{{ item.completedTopicCount }} / {{ item.topicCount }}</div>
              </div>
              <p-progressbar class="my-3 block" [value]="pct(item)" [showValue]="false" [style]="{ height: '6px' }" />
              <div class="chapters">
                @for (ch of item.chapters; track ch.courseChapterId) {
                  <div class="ch">
                    <div class="ch-title">
                      {{ ch.completedTopicCount === ch.topicCount && ch.topicCount > 0 ? '✓' : '○' }}
                      {{ ch.title }}
                      <span class="muted">({{ ch.completedTopicCount }}/{{ ch.topicCount }})</span>
                    </div>
                    <ul>
                      @for (t of ch.topics; track t.courseTopicId) {
                        <li>
                          {{ progressDisplay(t.status) }}
                          {{ t.title }}
                          @if (t.completedByTeacherName) {
                            <span class="muted"> — {{ t.completedByTeacherName }}@if (t.completedAt) {, {{ t.completedAt | date:'mediumDate' }}}</span>
                          }
                        </li>
                      }
                    </ul>
                  </div>
                }
              </div>
              <p-button label="View progress" icon="pi pi-arrow-right" iconPos="right" [text]="true" size="small" [routerLink]="['/curriculum/workspace', item.coursePlanId]" />
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .list { display: grid; gap: 1rem; }
    .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1rem 1.25rem; }
    .card-head { display: flex; justify-content: space-between; gap: 1rem; }
    .muted { color: #6b7280; font-size: .85rem; }
    .pct { font-weight: 700; font-size: 1.1rem; }
    .ch { margin-bottom: .75rem; }
    .ch-title { font-weight: 600; margin-bottom: .25rem; }
    ul { margin: 0; padding-left: 1.1rem; }
    li { font-size: .9rem; margin: .15rem 0; }
  `]
})
export class CurriculumProgressComponent implements OnInit {
  private curriculum = inject(CurriculumService);
  private academic = inject(AcademicService);
  private menuSvc = inject(MenuService);

  items = signal<CurriculumProgressSummaryDto[]>([]);
  years = signal<AcademicYear[]>([]);
  classes = signal<ClassDto[]>([]);
  subjects = signal<SubjectDto[]>([]);
  loading = signal(false);
  yearId: number | null = null;
  classId: number | null = null;
  subjectId: number | null = null;

  progressDisplay = progressDisplay;
  pageTitle = computed(() => this.menuSvc.titleForRoute('/curriculum/progress', 'Curriculum Progress'));
  yearOptions = computed(() => this.years().map(y => ({ value: y.academicYearId, label: y.yearLabel })));
  classOptions = computed(() => this.classes().map(c => ({ value: c.classId, label: classDisplay(c.className, c.section) })));
  subjectOptions = computed(() => this.subjects().map(s => ({ value: s.subjectId, label: s.subjectName })));
  heading(item: CurriculumProgressSummaryDto) {
    return courseHeading(item.subjectName, item.className, item.section);
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
    this.curriculum.getProgressSummaries({
      academicYearId: this.yearId,
      classId: this.classId,
      subjectId: this.subjectId
    }).subscribe({
      next: x => { this.items.set(x); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  pct(item: CurriculumProgressSummaryDto) {
    return item.topicCount ? Math.round((item.completedTopicCount / item.topicCount) * 100) : 0;
  }
}
