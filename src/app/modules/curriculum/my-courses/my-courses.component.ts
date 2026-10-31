import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { CurriculumService } from '../../../core/services/curriculum.service';
import { MenuService } from '../../../core/services/menu.service';
import { CoursePlanListDto, TeacherCourseSlotDto } from '../../../core/models/curriculum.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { classDisplay, courseHeading } from '../curriculum-ui.util';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-my-courses',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    PageHeaderComponent, LoadingComponent, EmptyStateComponent
  ],
  template: `
    <div class="os-page compact mc-page">
      <app-page-header
        [dense]="true"
        [title]="pageTitle()"
        routeUrl="/curriculum/my-courses"
        subtitle="Build lessons for your classes, then teach from Classroom" />

      @if (bannerError()) {
        <div class="banner err">{{ bannerError() }}</div>
      }

      @if (loading()) { <app-loading /> }
      @else if (!courses().length && !slots().length) {
        <div class="os-panel">
          <app-empty-state
            title="No classes assigned"
            message="Ask your school admin to assign you a class and subject first."
            icon="menu_book" />
        </div>
      } @else {
        @if (openSlots().length) {
          <section class="mc-sec">
            <header class="mc-head">
              <h2>Start here</h2>
              <p>Tap a class to begin adding chapters and topics.</p>
            </header>
            <div class="mc-grid">
              @for (s of openSlots(); track slotKey(s)) {
                <button type="button" class="mc-card start"
                        [disabled]="creatingKey() === slotKey(s)"
                        (click)="startSlot(s)">
                  <div class="mc-card-top">
                    <span class="mc-icon start" aria-hidden="true">
                      <span class="material-icons-round">auto_stories</span>
                    </span>
                    <span class="mc-pill new">New</span>
                  </div>
                  <strong class="mc-title">{{ s.subjectName }}</strong>
                  <span class="mc-meta">{{ classLabel(s) }} · {{ s.yearLabel }}</span>
                  <span class="mc-cta start">
                    {{ creatingKey() === slotKey(s) ? 'Starting…' : 'Start course' }}
                    <span class="material-icons-round">arrow_forward</span>
                  </span>
                </button>
              }
            </div>
          </section>
        }

        <section class="mc-sec">
          <header class="mc-head">
            <h2>Your courses</h2>
            @if (courses().length) {
              <p>Edit content anytime. Publish when ready to teach.</p>
            } @else {
              <p>Courses you create will show up here.</p>
            }
          </header>

          @if (!courses().length) {
            <div class="os-panel soft">
              <app-empty-state
                title="No course work yet"
                message="Choose a class above to create your first course."
                icon="edit_note" />
            </div>
          } @else {
            <div class="mc-grid">
              @for (c of courses(); track c.coursePlanId) {
                <article class="mc-card course" [attr.data-status]="c.status">
                  <div class="mc-card-top">
                    <span class="mc-icon" [class.pub]="c.status === 'Published'" aria-hidden="true">
                      <span class="material-icons-round">
                        {{ c.status === 'Published' ? 'menu_book' : 'edit_note' }}
                      </span>
                    </span>
                    <span class="mc-pill" [attr.data-status]="c.status">
                      {{ c.status === 'Draft' ? 'Not published' : c.status }}
                    </span>
                  </div>

                  <h3 class="mc-title">{{ heading(c) }}</h3>
                  <div class="mc-meta">
                    <span>{{ c.yearLabel }}</span>
                    <span class="dot">·</span>
                    <span>{{ c.chapterCount }} chapter{{ c.chapterCount === 1 ? '' : 's' }}</span>
                    <span class="dot">·</span>
                    <span>{{ c.topicCount }} topic{{ c.topicCount === 1 ? '' : 's' }}</span>
                    @if (c.status === 'Published' && c.topicCount) {
                      <span class="dot">·</span>
                      <span>{{ pct(c) }}% done</span>
                    }
                  </div>

                  @if (c.topicCount) {
                    <div class="mc-bar" aria-hidden="true">
                      <div class="mc-fill" [style.width.%]="pct(c)"></div>
                    </div>
                  }

                  @if (c.status === 'Draft' && c.topicCount === 0) {
                    <p class="mc-hint">Next: add a chapter, then topics.</p>
                  } @else if (c.status === 'Draft') {
                    <p class="mc-hint">Publish when ready to teach.</p>
                  }

                  <div class="mc-actions">
                    <a class="btn-primary mc-btn"
                       [routerLink]="['/curriculum/plans', c.coursePlanId]">
                      {{ c.status === 'Draft' && c.topicCount === 0 ? 'Add content' : 'Edit' }}
                    </a>
                    @if (c.status === 'Published') {
                      <a class="btn-secondary mc-btn"
                         [routerLink]="['/curriculum/workspace', c.coursePlanId]">Teach</a>
                    }
                  </div>
                </article>
              }
            </div>
          }
        </section>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }

    .banner.err {
      margin-bottom: .75rem; padding: .65rem .85rem; border-radius: 10px;
      background: #fef2f2; color: #b91c1c; font-size: .88rem; font-weight: 600;
    }

    .mc-sec { margin-bottom: 1.5rem; }

    /* Stacked head — avoid global .sec-head space-between */
    .mc-head {
      display: block;
      margin: 0 0 .75rem;
      padding: 0;
      border: none;
    }
    .mc-head h2 {
      margin: 0;
      font-size: 1.02rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -.01em;
    }
    .mc-head p {
      margin: .2rem 0 0;
      font-size: .84rem;
      color: #64748b;
      max-width: 42ch;
      line-height: 1.4;
    }

    .mc-grid {
      display: grid;
      gap: .75rem;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    }

    .mc-card {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: .35rem;
      min-height: 100%;
      padding: 1rem 1.05rem 1.05rem;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
      background: #fff;
      box-shadow: 0 1px 2px rgba(15, 23, 42, .04);
      text-align: left;
      font: inherit;
      color: inherit;
      transition: border-color .12s, box-shadow .12s, transform .12s;
    }
    .mc-card.start {
      cursor: pointer;
      border-color: #bfdbfe;
      background: linear-gradient(165deg, #eff6ff 0%, #fff 55%);
    }
    .mc-card.start:hover:not(:disabled) {
      border-color: #93c5fd;
      box-shadow: 0 8px 20px rgba(37, 99, 235, .1);
      transform: translateY(-1px);
    }
    .mc-card.start:disabled { opacity: .72; cursor: wait; }

    .mc-card.course[data-status="Draft"] {
      border-color: #fde68a;
      background: linear-gradient(165deg, #fffbeb 0%, #fff 50%);
    }
    .mc-card.course[data-status="Published"] {
      border-color: #bbf7d0;
      background: linear-gradient(165deg, #f0fdf4 0%, #fff 50%);
    }

    .mc-card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: .5rem;
      margin-bottom: .35rem;
    }

    .mc-icon {
      width: 40px; height: 40px; border-radius: 11px; flex-shrink: 0;
      display: grid; place-items: center;
      background: #f1f5f9; color: #475569;
    }
    .mc-icon.start { background: #dbeafe; color: #1d4ed8; }
    .mc-icon.pub { background: #dcfce7; color: #15803d; }
    .mc-icon .material-icons-round { font-size: 22px; }

    .mc-pill {
      font-size: .68rem; font-weight: 800; letter-spacing: .02em;
      padding: .2rem .55rem; border-radius: 999px;
      background: #f1f5f9; color: #475569;
    }
    .mc-pill.new { background: #dbeafe; color: #1d4ed8; }
    .mc-pill[data-status="Published"] { background: #dcfce7; color: #166534; }
    .mc-pill[data-status="Draft"] { background: #fef3c7; color: #92400e; }

    .mc-title {
      margin: 0;
      font-size: 1.02rem;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.3;
    }
    .mc-meta {
      display: flex; flex-wrap: wrap; gap: .2rem .35rem;
      font-size: .8rem; color: #64748b; line-height: 1.35;
    }
    .dot { color: #cbd5e1; }

    .mc-bar {
      margin-top: .35rem;
      height: 6px;
      background: #f1f5f9;
      border-radius: 999px;
      overflow: hidden;
    }
    .mc-fill { height: 100%; background: #16a34a; border-radius: inherit; }

    .mc-hint {
      margin: .35rem 0 0;
      font-size: .8rem;
      font-weight: 600;
      color: #92400e;
      line-height: 1.35;
    }

    .mc-cta.start {
      display: inline-flex;
      align-items: center;
      gap: .15rem;
      margin-top: auto;
      padding-top: .55rem;
      font-size: .84rem;
      font-weight: 800;
      color: #1d4ed8;
    }
    .mc-cta.start .material-icons-round { font-size: 16px; }

    .mc-actions {
      display: grid;
      grid-template-columns: 1fr;
      gap: .45rem;
      margin-top: auto;
      padding-top: .75rem;
    }
    .mc-actions:has(> :nth-child(2)) {
      grid-template-columns: 1fr 1fr;
    }
    .mc-btn {
      width: 100%;
      justify-content: center;
      text-align: center;
      min-height: 38px;
      font-weight: 700 !important;
    }

    .soft { background: #f8fafc; }

    @media (max-width: 560px) {
      .mc-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class MyCoursesComponent implements OnInit {
  private curriculum = inject(CurriculumService);
  private menuSvc = inject(MenuService);
  private router = inject(Router);

  courses = signal<CoursePlanListDto[]>([]);
  slots = signal<TeacherCourseSlotDto[]>([]);
  loading = signal(true);
  creatingKey = signal<string | null>(null);
  bannerError = signal('');

  pageTitle = computed(() => this.menuSvc.titleForRoute('/curriculum/my-courses', 'My Courses'));
  openSlots = computed(() => this.slots().filter(s => !s.coursePlanId && s.academicYearId > 0));

  heading(c: CoursePlanListDto) {
    return courseHeading(c.subjectName, c.className, c.section);
  }

  classLabel(s: TeacherCourseSlotDto) {
    return classDisplay(s.className, s.section);
  }

  slotKey(s: TeacherCourseSlotDto) {
    return `${s.classId}:${s.subjectId}:${s.academicYearId}`;
  }

  ngOnInit() {
    this.menuSvc.ensureLoaded().subscribe();
    this.reload();
  }

  reload() {
    this.loading.set(true);
    this.bannerError.set('');
    forkJoin({
      courses: this.curriculum.getMyCourses().pipe(catchError(() => of([] as CoursePlanListDto[]))),
      slots: this.curriculum.getMyCourseSlots().pipe(catchError(() => of([] as TeacherCourseSlotDto[])))
    }).subscribe({
      next: ({ courses, slots }) => {
        this.courses.set(courses);
        this.slots.set(slots);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.bannerError.set('Could not load your courses. Please refresh.');
      }
    });
  }

  pct(c: CoursePlanListDto) {
    return c.topicCount ? Math.round((c.completedTopicCount / c.topicCount) * 100) : 0;
  }

  startSlot(s: TeacherCourseSlotDto) {
    if (!s.academicYearId) {
      this.bannerError.set('This class has no academic year. Ask admin to fix the class setup.');
      return;
    }
    const key = this.slotKey(s);
    this.creatingKey.set(key);
    this.bannerError.set('');
    this.curriculum.createPlan({
      academicYearId: s.academicYearId,
      classId: s.classId,
      subjectId: s.subjectId,
      title: '',
      description: null
    }).subscribe({
      next: plan => {
        this.creatingKey.set(null);
        this.router.navigate(['/curriculum/plans', plan.coursePlanId], {
          queryParams: { welcome: '1' }
        });
      },
      error: (e: any) => {
        this.creatingKey.set(null);
        this.bannerError.set(e?.error?.error || 'Could not start this course. Try again.');
      }
    });
  }
}
