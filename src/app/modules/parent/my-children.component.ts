import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { StudentService } from '../../core/services/student.service';
import { StudentListDto } from '../../core/models/student.model';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-my-children',
  standalone: true,
  imports: [CommonModule, RouterModule, PageHeaderComponent, LoadingComponent],
  template: `
    <app-page-header
      title="My Children"
      subtitle="Students linked to your parent account at this school" />

    @if (loading()) {
      <app-loading />
    } @else if (!children().length) {
      <div class="empty card">
        <span class="material-icons-round">family_restroom</span>
        <h3>No children linked yet</h3>
        <p>Ask the school office to link your account to a student guardian (CNIC / phone / portal link).</p>
      </div>
    } @else {
      <div class="kids">
        @for (c of children(); track c.studentId) {
          <article class="kid card">
            <div class="kid-photo">
              @if (c.photoFileId) {
                <img [src]="photoSrc(c.photoFileId)" [alt]="c.fullName" />
              } @else {
                <div class="fallback">{{ (c.fullName || '?')[0] }}</div>
              }
            </div>
            <div class="kid-body">
              <h3>{{ c.fullName }}</h3>
              <div class="meta">
                <span class="adm">{{ c.admissionNo }}</span>
                <span>{{ c.className || '—' }} {{ c.section }}</span>
              </div>
              <div class="actions">
                <a class="btn" [routerLink]="['/students/view', c.studentId]">Profile</a>
                <a class="btn" [routerLink]="['/attendance/view']" [queryParams]="{ classId: c.classId, studentId: c.studentId }">Attendance</a>
                <a class="btn" [routerLink]="['/homework/list']" [queryParams]="{ classId: c.classId }">Diary</a>
                <a class="btn" [routerLink]="['/timetable/view']" [queryParams]="{ classId: c.classId }">Timetable</a>
                <a class="btn" [routerLink]="['/exams/results/cards']" [queryParams]="{ studentId: c.studentId }">Results</a>
                <a class="btn primary" [routerLink]="['/fees/student-fees']" [queryParams]="{ studentId: c.studentId }">Fees</a>
              </div>
            </div>
          </article>
        }
      </div>
    }
  `,
  styles: [`
    .empty {
      text-align: center; padding: 48px 24px; color: var(--t3);
      display: flex; flex-direction: column; align-items: center; gap: 8px;
    }
    .empty .material-icons-round { font-size: 48px; opacity: .5; }
    .kids { display: grid; gap: 14px; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); }
    .kid { display: flex; gap: 14px; padding: 16px; align-items: flex-start; }
    .kid-photo {
      width: 72px; height: 72px; border-radius: 14px; overflow: hidden; flex-shrink: 0;
      background: var(--surface-2); border: 1px solid var(--border);
    }
    .kid-photo img { width: 100%; height: 100%; object-fit: cover; }
    .fallback {
      width: 100%; height: 100%; display: grid; place-items: center;
      font-size: 28px; font-weight: 800; color: var(--accent); background: var(--accent-s);
    }
    .kid-body { flex: 1; min-width: 0; }
    .kid-body h3 { margin: 0 0 6px; font-size: 16px; }
    .meta { display: flex; flex-wrap: wrap; gap: 8px; font-size: 13px; color: var(--t3); margin-bottom: 10px; }
    .adm {
      background: var(--surface-2); border: 1px solid var(--border); border-radius: 999px;
      padding: 1px 8px; font-weight: 700; font-size: 12px;
    }
    .actions { display: flex; flex-wrap: wrap; gap: 6px; }
    .btn {
      display: inline-flex; align-items: center; height: 30px; padding: 0 10px;
      border-radius: 8px; border: 1px solid var(--border); background: var(--surface);
      color: var(--t2); font-size: 12px; font-weight: 700; text-decoration: none;
    }
    .btn.primary { background: var(--accent); color: #fff; border-color: transparent; }
  `]
})
export class MyChildrenComponent implements OnInit {
  private studentSvc = inject(StudentService);

  loading = signal(true);
  children = signal<StudentListDto[]>([]);

  ngOnInit(): void {
    this.studentSvc.getMyChildren().subscribe({
      next: list => { this.children.set(list); this.loading.set(false); },
      error: () => { this.children.set([]); this.loading.set(false); }
    });
  }

  photoSrc(fileId: number): string {
    return `${environment.fileServerUrl}/files/${fileId}`;
  }
}
