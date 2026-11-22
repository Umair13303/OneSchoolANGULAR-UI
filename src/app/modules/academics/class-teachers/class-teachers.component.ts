import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { Tag } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { Tooltip } from 'primeng/tooltip';

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
  imports: [
    CommonModule, FormsModule, PageHeaderComponent, LoadingComponent, EmptyStateComponent,
    Button, Select, Tag, Tooltip, TableModule
  ],
  template: `
    <div class="os-page compact">
      <app-page-header title="Class Teachers" [dense]="true" routeUrl="/academics/class-teachers" />

      <div class="os-stage">
        <div class="os-stage-bar">
          <span class="tip">
            <span class="material-icons-round tip-icon">info</span>
            Homeroom teacher for the class. Fills only unassigned subjects — existing subject teachers stay unchanged.
          </span>
          @if (!loading() && classes().length > 0) {
            <span class="count">{{ classes().length }} classes</span>
          }
        </div>

        <div class="os-stage-body">
          @if (loading()) {
            <div class="state-pad"><app-loading /></div>
          } @else if (classes().length === 0) {
            <div class="state-pad">
              <app-empty-state icon="class" title="No classes" message="Create classes first under Academics → Classes." />
            </div>
          } @else {
            <p-table
              [value]="classes()"
              dataKey="classId"
              styleClass="p-datatable-sm os-data-table"
              [tableStyle]="{ 'min-width': '44rem' }">
              <ng-template #header>
                <tr>
                  <th style="width:3rem">#</th>
                  <th>Class</th>
                  <th style="width:6.5rem">Subjects</th>
                  <th style="width:20rem">Class Teacher</th>
                  <th style="width:12rem" class="text-right">Actions</th>
                </tr>
              </ng-template>
              <ng-template #body let-c let-i="rowIndex">
                <tr>
                  <td class="idx">{{ i + 1 }}</td>
                  <td>
                    <div class="class-cell">
                      <strong class="class-name">{{ c.className }}</strong>
                      @if (c.section) {
                        <span class="sec">Sec {{ c.section }}</span>
                      }
                    </div>
                  </td>
                  <td>
                    <p-tag [value]="'' + c.subjectCount" severity="secondary" />
                  </td>
                  <td>
                    <p-select
                      class="w-full max-w-[280px]"
                      size="small"
                      [options]="teachers()"
                      optionLabel="fullName"
                      optionValue="userId"
                      placeholder="— Unassigned —"
                      [showClear]="true"
                      appendTo="body"
                      [ngModel]="draftTeacherId(c.classId)"
                      (ngModelChange)="setDraft(c.classId, $event)" />
                  </td>
                  <td>
                    <div class="flex items-center justify-end gap-1.5 whitespace-nowrap">
                      <p-button
                        label="Save"
                        icon="pi pi-save"
                        size="small"
                        [disabled]="!isDirty(c) || savingId() === c.classId"
                        [loading]="savingId() === c.classId"
                        (onClick)="save(c)" />
                      @if (c.classTeacherId) {
                        <p-button
                          icon="pi pi-user-minus"
                          severity="secondary"
                          [outlined]="true"
                          size="small"
                          [disabled]="savingId() === c.classId"
                          pTooltip="Remove class teacher"
                          (onClick)="clear(c)" />
                      }
                    </div>
                  </td>
                </tr>
              </ng-template>
            </p-table>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .tip { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--t2); min-width: 0; }
    .tip-icon { font-size: 16px; color: var(--accent); }
    .count { margin-left: auto; font-size: 12px; color: var(--t4); white-space: nowrap; }
    .state-pad { padding: 16px; }
    .idx { color: var(--t4); }
    .class-cell { display: flex; align-items: center; gap: 8px; }
    .class-name { font-weight: 650; color: var(--t1); }
    .sec {
      font-size: 11px; font-weight: 700; padding: 1px 8px; border-radius: 99px;
      background: var(--surface-2); border: 1px solid var(--border); color: var(--t3);
    }
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
            ? `${updated.classTeacherName || 'Teacher'} is class teacher for ${c.className}. Unassigned subjects inherited this teacher; specialists were left as-is.`
            : `Class teacher cleared for ${c.className}. Subject teachers were not changed.`,
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
