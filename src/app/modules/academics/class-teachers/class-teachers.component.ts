import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

import { AcademicService } from '../../../core/services/academic.service';
import { UserService } from '../../../core/services/user.service';
import { ClassDto } from '../../../core/models/academic.model';
import { UserListDto } from '../../../core/models/user.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-class-teachers',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, LoadingComponent, EmptyStateComponent],
  template: `
    <app-page-header
      title="Class Teachers"
      subtitle="Assign one teacher to a class for the full day. That teacher is also set on all subjects of that class only." />

    @if (loading()) {
      <div class="card"><app-loading /></div>
    } @else if (classes().length === 0) {
      <div class="card">
        <app-empty-state icon="class" title="No classes" message="Create classes first under Academics → Classes." />
      </div>
    } @else {
      <div class="card table-card">
        <div class="hint">
          <span class="material-icons-round">info</span>
          <span>Pick a teacher per class. Only that class’s subjects are updated — other classes stay unchanged.</span>
        </div>
        <div class="table-scroll">
          <table class="table">
            <thead>
              <tr>
                <th class="col-idx">#</th>
                <th>Class</th>
                <th>Subjects</th>
                <th>Class Teacher</th>
                <th class="col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (c of classes(); track c.classId; let i = $index) {
                <tr>
                  <td class="col-idx idx">{{ i + 1 }}</td>
                  <td>
                    <div class="class-cell">
                      <span class="class-name">{{ c.className }}</span>
                      @if (c.section) {
                        <span class="sec">Sec {{ c.section }}</span>
                      }
                    </div>
                  </td>
                  <td><span class="subj-badge">{{ c.subjectCount }}</span></td>
                  <td>
                    <select
                      class="teacher-select"
                      [ngModel]="draftTeacherId(c.classId)"
                      (ngModelChange)="setDraft(c.classId, $event)">
                      <option [ngValue]="null">— Unassigned —</option>
                      @for (t of teachers(); track t.userId) {
                        <option [ngValue]="t.userId">{{ t.fullName }}</option>
                      }
                    </select>
                  </td>
                  <td class="col-actions">
                    <button
                      class="btn-primary btn-sm"
                      [disabled]="!isDirty(c) || savingId() === c.classId"
                      (click)="save(c)">
                      @if (savingId() === c.classId) {
                        Saving…
                      } @else {
                        <span class="material-icons-round">save</span> Save
                      }
                    </button>
                    @if (c.classTeacherId) {
                      <button
                        class="btn-secondary btn-sm"
                        [disabled]="savingId() === c.classId"
                        (click)="clear(c)"
                        title="Remove class teacher">
                        <span class="material-icons-round">person_remove</span>
                      </button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    }
  `,
  styles: [`
    .hint {
      display: flex; align-items: flex-start; gap: 8px;
      margin: 14px 16px 0; padding: 10px 12px;
      background: var(--accent-s); border: 1px solid var(--accent-g);
      border-radius: var(--r-md, 8px); font-size: 13px; color: var(--t2);
      .material-icons-round { font-size: 18px; color: var(--accent); margin-top: 1px; }
    }
    .table-card { overflow: hidden; }
    .table-scroll { overflow-x: auto; padding: 8px 0 4px; }
    .table { width: 100%; border-collapse: collapse; }
    .table th, .table td {
      padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--border);
      font-size: 13.5px; vertical-align: middle;
    }
    .table th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px; color: var(--t4); font-weight: 700; }
    .col-idx { width: 48px; color: var(--t4); }
    .col-actions { width: 180px; white-space: nowrap; }
    .class-cell { display: flex; align-items: center; gap: 8px; }
    .class-name { font-weight: 650; color: var(--t1); }
    .sec {
      font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 99px;
      background: var(--surface-2); border: 1px solid var(--border); color: var(--t3);
    }
    .subj-badge {
      display: inline-flex; min-width: 28px; justify-content: center;
      padding: 2px 8px; border-radius: 99px; font-size: 12px; font-weight: 700;
      background: var(--surface-2); border: 1px solid var(--border); color: var(--t2);
    }
    .teacher-select {
      width: min(280px, 100%); height: 38px; border-radius: var(--r-md, 8px);
      border: 1px solid var(--border-2); background: var(--surface); color: var(--t1);
      padding: 0 10px; font-size: 13.5px;
    }
    .btn-sm {
      display: inline-flex; align-items: center; gap: 4px; height: 34px;
      padding: 0 12px; border-radius: var(--r-md, 8px); font-size: 12.5px; font-weight: 650;
      cursor: pointer; margin-right: 6px;
      .material-icons-round { font-size: 16px; }
    }
    .btn-sm:disabled { opacity: 0.5; cursor: not-allowed; }
  `]
})
export class ClassTeachersComponent implements OnInit {
  private academicSvc = inject(AcademicService);
  private userSvc = inject(UserService);

  loading = signal(true);
  savingId = signal<number | null>(null);
  classes = signal<ClassDto[]>([]);
  teachers = signal<UserListDto[]>([]);
  /** Per-class draft teacher selection (null = unassigned). */
  private drafts = signal<Record<number, number | null>>({});

  ngOnInit(): void {
    this.reload();
  }

  draftTeacherId(classId: number): number | null {
    const d = this.drafts();
    return classId in d ? d[classId] : null;
  }

  setDraft(classId: number, teacherId: number | null): void {
    this.drafts.update(d => ({ ...d, [classId]: teacherId }));
  }

  isDirty(c: ClassDto): boolean {
    const draft = this.draftTeacherId(c.classId);
    const saved = c.classTeacherId ?? null;
    return draft !== saved;
  }

  reload(): void {
    this.loading.set(true);
    this.userSvc.getAll().subscribe({
      next: users => {
        this.teachers.set(users.filter(u => u.roleName?.toLowerCase() === 'teacher' && u.isActive));
      },
      error: () => this.teachers.set([])
    });
    this.academicSvc.getClasses().subscribe({
      next: list => {
        const active = list.filter(c => c.isActive);
        this.classes.set(active);
        const map: Record<number, number | null> = {};
        for (const c of active) map[c.classId] = c.classTeacherId ?? null;
        this.drafts.set(map);
        this.loading.set(false);
      },
      error: () => {
        this.classes.set([]);
        this.loading.set(false);
      }
    });
  }

  save(c: ClassDto): void {
    const teacherId = this.draftTeacherId(c.classId);
    this.savingId.set(c.classId);
    this.academicSvc.setClassTeacher(c.classId, teacherId).subscribe({
      next: updated => {
        this.classes.update(rows => rows.map(r => r.classId === updated.classId ? {
          ...r,
          classTeacherId: updated.classTeacherId,
          classTeacherName: updated.classTeacherName,
          subjectCount: updated.subjectCount
        } : r));
        this.setDraft(c.classId, updated.classTeacherId ?? null);
        this.savingId.set(null);
        Swal.fire({
          icon: 'success',
          title: 'Saved',
          text: teacherId
            ? `${updated.classTeacherName || 'Teacher'} is class teacher for ${c.className}. All subjects of this class were updated.`
            : `Class teacher cleared for ${c.className}.`,
          timer: 2200,
          showConfirmButton: false
        });
      },
      error: err => {
        this.savingId.set(null);
        Swal.fire('Error', err?.error?.error || 'Could not save class teacher.', 'error');
      }
    });
  }

  clear(c: ClassDto): void {
    this.setDraft(c.classId, null);
    this.save(c);
  }
}
