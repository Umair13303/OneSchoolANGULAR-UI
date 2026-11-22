import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CurriculumService } from '../../../core/services/curriculum.service';
import { MenuService } from '../../../core/services/menu.service';
import { CoursePlanDetailDto } from '../../../core/models/curriculum.model';
import { Button } from 'primeng/button';
import { Tag } from 'primeng/tag';
import { ProgressBar } from 'primeng/progressbar';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { courseHeading, progressDisplay } from '../curriculum-ui.util';

@Component({
  selector: 'app-course-workspace',
  standalone: true,
  imports: [CommonModule, RouterModule, PageHeaderComponent, LoadingComponent, Button, Tag, ProgressBar],
  template: `
    <div class="os-page compact">
      <app-page-header [dense]="true" [title]="pageTitle()" routeUrl="/curriculum/my-courses">
        <p-button label="My Courses" icon="pi pi-arrow-left" severity="secondary" [outlined]="true" size="small" routerLink="/curriculum/my-courses" />
      </app-page-header>

      @if (loading()) { <app-loading /> }
      @else if (plan(); as p) {
        <div class="hero">
          <h1>{{ heading() }}</h1>
          <div class="meta">{{ p.yearLabel }} · {{ p.completedTopicCount }} / {{ p.topicCount }} topics completed</div>
          <p-progressbar class="mt-2.5 block" [value]="pct()" [showValue]="false" [style]="{ height: '6px' }" />
        </div>

        <div class="outline">
          @for (ch of p.chapters; track ch.courseChapterId; let ci = $index) {
            <div class="chapter">
              <div class="ch-title">
                <span class="mark">{{ chapterDone(ch) ? '✓' : '○' }}</span>
                Chapter {{ ci + 1 }} — {{ ch.title }}
              </div>
              @for (t of ch.topics; track t.courseTopicId; let ti = $index) {
                <a class="topic" [routerLink]="['/curriculum/topics', t.courseTopicId]">
                  <span class="t-ord">{{ ci + 1 }}.{{ ti + 1 }}</span>
                  <span class="grow">{{ t.title }}</span>
                  <p-tag [value]="progressDisplay(t.progressStatus)" [severity]="progressSeverity(t.progressStatus)" [rounded]="true" />
                </a>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .hero { margin-bottom: 1rem; }
    .hero h1 { margin: 0; font-size: 1.25rem; font-weight: 800; }
    .meta { color: #6b7280; font-size: .85rem; margin-top: .3rem; }
    .outline { display: grid; gap: .65rem; }
    .chapter { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
    .ch-title {
      display: flex; align-items: center; gap: .45rem;
      padding: .7rem 1rem; font-weight: 700; background: #f8fafc; border-bottom: 1px solid #e5e7eb;
    }
    .mark { width: 1.1rem; text-align: center; }
    .topic {
      display: flex; align-items: center; gap: .5rem; padding: .6rem 1rem;
      text-decoration: none; color: inherit; border-top: 1px solid #f1f5f9;
    }
    .topic:hover { background: #f8fafc; }
    .t-ord { font-size: .75rem; font-weight: 700; color: #94a3b8; min-width: 2rem; }
    .grow { flex: 1; min-width: 0; font-weight: 600; font-size: .92rem; }
  `]
})
export class CourseWorkspaceComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private curriculum = inject(CurriculumService);
  private menuSvc = inject(MenuService);

  plan = signal<CoursePlanDetailDto | null>(null);
  loading = signal(true);
  progressDisplay = progressDisplay;

  pageTitle = computed(() => this.heading() || this.menuSvc.titleForRoute('/curriculum/my-courses', 'Course'));
  heading = computed(() => {
    const p = this.plan();
    return p ? courseHeading(p.subjectName, p.className, p.section) : '';
  });

  ngOnInit() {
    this.menuSvc.ensureLoaded().subscribe();
    const id = Number(this.route.snapshot.paramMap.get('planId'));
    if (!id) { this.router.navigate(['/curriculum/my-courses']); return; }
    this.curriculum.getWorkspace(id).subscribe({
      next: p => { this.plan.set(p); this.loading.set(false); },
      error: () => { this.loading.set(false); this.router.navigate(['/curriculum/my-courses']); }
    });
  }

  progressSeverity(s: string): 'success' | 'info' | 'secondary' {
    if (s === 'Completed') return 'success';
    if (s === 'InProgress' || s === 'In Progress') return 'info';
    return 'secondary';
  }

  pct() {
    const p = this.plan();
    return p && p.topicCount ? Math.round((p.completedTopicCount / p.topicCount) * 100) : 0;
  }

  chapterDone(ch: { topics: { progressStatus: string }[] }) {
    return ch.topics.length > 0 && ch.topics.every(t => t.progressStatus === 'Completed');
  }
}
