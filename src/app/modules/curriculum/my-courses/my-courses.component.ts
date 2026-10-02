import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CurriculumService } from '../../../core/services/curriculum.service';
import { MenuService } from '../../../core/services/menu.service';
import { CoursePlanListDto } from '../../../core/models/curriculum.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { courseHeading } from '../curriculum-ui.util';

@Component({
  selector: 'app-my-courses',
  standalone: true,
  imports: [CommonModule, RouterModule, PageHeaderComponent, LoadingComponent, EmptyStateComponent],
  template: `
    <div class="os-page compact">
      <app-page-header [dense]="true" [title]="pageTitle()" />
      @if (loading()) { <app-loading /> }
      @else if (courses().length === 0) {
        <div class="os-panel">
          <app-empty-state message="No published courses assigned to you yet." icon="menu_book" />
        </div>
      } @else {
        <div class="list">
          @for (c of courses(); track c.coursePlanId) {
            <a class="row" [routerLink]="['/curriculum/workspace', c.coursePlanId]">
              <div class="main">
                <strong>{{ heading(c) }}</strong>
                <div class="muted">{{ c.yearLabel }} · {{ c.completedTopicCount }} / {{ c.topicCount }} topics completed</div>
              </div>
              <div class="bar"><div class="fill" [style.width.%]="pct(c)"></div></div>
            </a>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .list {
      background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;
    }
    .row {
      display: grid; gap: .45rem; padding: .85rem 1.1rem;
      text-decoration: none; color: inherit; border-top: 1px solid #f1f5f9;
    }
    .row:first-child { border-top: none; }
    .row:hover { background: #f8fafc; }
    .main strong { font-size: .98rem; }
    .muted { color: #6b7280; font-size: .85rem; margin-top: .15rem; }
    .bar { height: 5px; background: #f1f5f9; border-radius: 999px; overflow: hidden; max-width: 220px; }
    .fill { height: 100%; background: #16a34a; }
  `]
})
export class MyCoursesComponent implements OnInit {
  private curriculum = inject(CurriculumService);
  private menuSvc = inject(MenuService);
  courses = signal<CoursePlanListDto[]>([]);
  loading = signal(true);
  pageTitle = computed(() => this.menuSvc.titleForRoute('/curriculum/my-courses', 'My Courses'));

  heading(c: CoursePlanListDto) {
    return courseHeading(c.subjectName, c.className, c.section);
  }

  ngOnInit() {
    this.menuSvc.ensureLoaded().subscribe();
    this.curriculum.getMyCourses().subscribe({
      next: c => { this.courses.set(c); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  pct(c: CoursePlanListDto) {
    return c.topicCount ? Math.round((c.completedTopicCount / c.topicCount) * 100) : 0;
  }
}
