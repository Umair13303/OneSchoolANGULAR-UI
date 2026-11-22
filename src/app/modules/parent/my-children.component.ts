import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Button } from 'primeng/button';
import { Tag } from 'primeng/tag';
import { StudentService } from '../../core/services/student.service';
import { StudentListDto } from '../../core/models/student.model';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-my-children',
  standalone: true,
  imports: [CommonModule, RouterModule, PageHeaderComponent, LoadingComponent, Button, Tag],
  template: `
    <app-page-header
      title="My Children"
      subtitle="Students linked to your parent account at this school" />

    @if (loading()) {
      <app-loading />
    } @else if (!children().length) {
      <div class="card flex flex-col items-center gap-2 px-6 py-12 text-center text-[var(--t3)]">
        <span class="material-icons-round text-5xl opacity-50">family_restroom</span>
        <h3 class="m-0">No children linked yet</h3>
        <p class="m-0">Ask the school office to link your account to a student guardian (CNIC / phone / portal link).</p>
      </div>
    } @else {
      <div class="grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(320px,1fr))]">
        @for (c of children(); track c.studentId) {
          <article class="card flex items-start gap-3.5 p-4">
            <div class="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)]">
              @if (c.photoFileId) {
                <img class="h-full w-full object-cover" [src]="photoSrc(c.photoFileId)" [alt]="c.fullName" />
              } @else {
                <div class="grid h-full w-full place-items-center bg-[var(--accent-s)] text-[28px] font-extrabold text-[var(--accent)]">
                  {{ (c.fullName || '?')[0] }}
                </div>
              }
            </div>
            <div class="min-w-0 flex-1">
              <h3 class="m-0 mb-1.5 text-base">{{ c.fullName }}</h3>
              <div class="mb-2.5 flex flex-wrap items-center gap-2 text-[13px] text-[var(--t3)]">
                <p-tag [value]="c.admissionNo" severity="secondary" [rounded]="true" />
                <span>{{ c.className || '—' }} {{ c.section }}</span>
              </div>
              <div class="flex flex-wrap gap-1.5">
                <p-button label="Profile" size="small" severity="secondary" [outlined]="true"
                  (onClick)="go(['/students/view', c.studentId])" />
                <p-button label="Attendance" size="small" severity="secondary" [outlined]="true"
                  (onClick)="go(['/attendance/view'], { classId: c.classId, studentId: c.studentId })" />
                <p-button label="Diary" size="small" severity="secondary" [outlined]="true"
                  (onClick)="go(['/homework/list'], { classId: c.classId })" />
                <p-button label="Timetable" size="small" severity="secondary" [outlined]="true"
                  (onClick)="go(['/timetable/view'], { classId: c.classId })" />
                <p-button label="Results" size="small" severity="secondary" [outlined]="true"
                  (onClick)="go(['/exams/results/cards'], { studentId: c.studentId })" />
                <p-button label="Fees" size="small"
                  (onClick)="go(['/fees/student-fees'], { studentId: c.studentId })" />
              </div>
            </div>
          </article>
        }
      </div>
    }
  `
})
export class MyChildrenComponent implements OnInit {
  private studentSvc = inject(StudentService);
  private router = inject(Router);

  loading = signal(true);
  children = signal<StudentListDto[]>([]);

  ngOnInit(): void {
    this.studentSvc.getMyChildren().subscribe({
      next: list => { this.children.set(list); this.loading.set(false); },
      error: () => { this.children.set([]); this.loading.set(false); }
    });
  }

  go(commands: unknown[], queryParams?: Record<string, unknown>): void {
    this.router.navigate(commands, queryParams ? { queryParams } : undefined);
  }

  photoSrc(fileId: number): string {
    return `${environment.fileServerUrl}/files/${fileId}`;
  }
}
