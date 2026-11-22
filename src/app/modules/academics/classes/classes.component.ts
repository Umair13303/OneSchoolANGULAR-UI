import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Tooltip } from 'primeng/tooltip';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { AcademicService } from '../../../core/services/academic.service';
import { ClassDto } from '../../../core/models/academic.model';
import { AuthService } from '../../../core/services/auth.service';
import { InstituteService } from '../../../core/services/institute.service';
import { InstituteDto } from '../../../core/models/institute.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ConfirmDeleteComponent } from '../../../shared/components/confirm-delete/confirm-delete.component';
import { ConfirmDeleteService } from '../../../shared/components/confirm-delete/confirm-delete.service';

@Component({
  selector: 'app-classes',
  standalone: true,
  imports: [
    CommonModule, FormsModule, PageHeaderComponent, LoadingComponent, EmptyStateComponent, ConfirmDeleteComponent,
    Button, Select, InputText, TableModule, Tag, Tooltip, IconField, InputIcon
  ],
  template: `
    <div class="os-page compact">
      <app-page-header title="Classes" [dense]="true" routeUrl="/academics/classes">
        <p-button label="Add Class" icon="pi pi-plus" (onClick)="openAdd()" />
      </app-page-header>

      <div class="os-stage">
        <div class="os-stage-bar">
          <div class="os-toolbar-group grow">
            <p-iconfield class="search-field">
              <p-inputicon class="pi pi-search" />
              <input
                pInputText
                class="w-full"
                placeholder="Search by name or section…"
                [ngModel]="search()"
                (ngModelChange)="search.set($event)" />
            </p-iconfield>
            <p-select
              class="status-filter"
              [options]="statusOptions"
              optionLabel="label"
              optionValue="value"
              [ngModel]="statusFilter()"
              (ngModelChange)="statusFilter.set($event)"
              placeholder="All statuses"
              [showClear]="true"
              appendTo="body" />
          </div>
          <span class="count">{{ filtered().length }} of {{ classes().length }}</span>
        </div>

        <div class="os-stage-body">
          @if (loading()) {
            <div class="state-pad"><app-loading /></div>
          } @else if (classes().length === 0) {
            <div class="state-pad">
              <app-empty-state icon="class" title="No classes yet" message="Add your first class to get started." />
            </div>
          } @else {
            <p-table
              [value]="filtered()"
              dataKey="classId"
              styleClass="p-datatable-sm os-data-table"
              [tableStyle]="{ 'min-width': '36rem' }">
              <ng-template #header>
                <tr>
                  <th style="width:3rem">#</th>
                  <th>Class</th>
                  @if (isSuperAdmin) { <th style="width:12rem">Institute</th> }
                  <th style="width:6.5rem">Subjects</th>
                  <th style="width:7.5rem">Status</th>
                  <th style="width:8.5rem" class="text-right">Actions</th>
                </tr>
              </ng-template>
              <ng-template #body let-c let-i="rowIndex">
                <tr>
                  <td class="idx">{{ i + 1 }}</td>
                  <td>
                    <strong class="name">{{ c.className }}</strong>
                    @if (c.section) {
                      <span class="section">Sec {{ c.section }}</span>
                    }
                  </td>
                  @if (isSuperAdmin) {
                    <td>{{ c.instituteName || '—' }}</td>
                  }
                  <td class="num">{{ c.subjectCount }}</td>
                  <td>
                    <p-tag
                      [value]="c.isActive ? 'Active' : 'Inactive'"
                      [severity]="c.isActive ? 'success' : 'secondary'"
                      [rounded]="true" />
                  </td>
                  <td>
                    <div class="flex items-center justify-end gap-1 whitespace-nowrap">
                      <p-button icon="pi pi-pencil" [text]="true" [rounded]="true" size="small"
                        severity="secondary" ariaLabel="Edit" pTooltip="Edit" (onClick)="openEdit(c)" />
                      <p-button
                        [icon]="c.isActive ? 'pi pi-eye-slash' : 'pi pi-eye'"
                        [text]="true" [rounded]="true" size="small"
                        [severity]="c.isActive ? 'warn' : 'success'"
                        [ariaLabel]="c.isActive ? 'Deactivate' : 'Activate'"
                        [pTooltip]="c.isActive ? 'Deactivate' : 'Activate'"
                        (onClick)="toggleStatus(c)" />
                      <p-button icon="pi pi-trash" [text]="true" [rounded]="true" size="small"
                        severity="danger" ariaLabel="Delete" pTooltip="Delete" (onClick)="deleteClass(c)" />
                    </div>
                  </td>
                </tr>
              </ng-template>
              <ng-template #emptymessage>
                <tr>
                  <td [attr.colspan]="isSuperAdmin ? 6 : 5" class="empty">No classes match your search.</td>
                </tr>
              </ng-template>
            </p-table>
          }
        </div>
      </div>
    </div>

    @if (showModal()) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="modal class-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ editId() ? 'Edit Class' : 'Add Class' }}</h3>
            <button type="button" class="modal-close" (click)="closeModal()" aria-label="Close">
              <span class="material-icons-round">close</span>
            </button>
          </div>

          <div class="field">
            <label for="cls-name">Class Name <span class="req">*</span></label>
            <input id="cls-name" class="form-control" [(ngModel)]="form.className"
              placeholder="e.g. Grade 5 / Class 8" />
          </div>

          <div class="field">
            <label for="cls-section">Section <span class="opt">(optional)</span></label>
            <input id="cls-section" class="form-control" [(ngModel)]="form.section"
              placeholder="e.g. A, Blue, Morning" />
          </div>

          @if (isSuperAdmin) {
            <div class="field">
              <label>Institute <span class="req">*</span></label>
              <p-select
                class="w-full"
                [options]="institutes()"
                optionLabel="name"
                optionValue="instituteId"
                placeholder="— Select institute —"
                [showClear]="true"
                appendTo="body"
                [overlayOptions]="{ baseZIndex: 12000 }"
                [(ngModel)]="form.instituteId" />
            </div>
          }

          <div class="field status-field">
            <label>Status</label>
            <div class="status-right">
              <label class="switch">
                <input type="checkbox" [(ngModel)]="form.isActive" />
                <span class="slider"></span>
              </label>
              <span class="sw-label">{{ form.isActive ? 'Active' : 'Inactive' }}</span>
            </div>
          </div>

          @if (modalError()) {
            <p class="error-msg">{{ modalError() }}</p>
          }

          <div class="modal-actions">
            <p-button label="Cancel" severity="secondary" [outlined]="true" (onClick)="closeModal()" />
            <p-button
              [label]="saving() ? 'Saving...' : (editId() ? 'Update Class' : 'Add Class')"
              icon="pi pi-check"
              [loading]="saving()"
              [disabled]="saving()"
              (onClick)="save()" />
          </div>
        </div>
      </div>
    }

    <app-confirm-delete />
  `,
  styles: [`
    .os-toolbar-group.grow { flex: 1 1 auto; min-width: 0; }
    .search-field { flex: 1 1 220px; min-width: min(100%, 220px); max-width: 360px; }
    .status-filter { width: 150px; }
    .count {
      flex-shrink: 0;
      font-size: 12px;
      font-weight: 650;
      color: var(--t3);
      font-variant-numeric: tabular-nums;
    }

    .state-pad { padding: 28px 16px; }

    .idx { color: var(--t4); font-variant-numeric: tabular-nums; }
    .name { font-weight: 700; color: var(--t1); }
    .section {
      display: inline-block;
      margin-left: 8px;
      font-size: 12px;
      font-weight: 600;
      color: var(--t3);
    }
    .num { font-variant-numeric: tabular-nums; font-weight: 650; color: var(--t2); }
    .empty { text-align: center; color: var(--t4); padding: 28px 0; font-size: 13px; }

    .class-modal {
      width: min(420px, 94vw);
      gap: 12px !important;
      padding: 20px 22px !important;
    }
    .class-modal .field { margin-bottom: 0; }
    .class-modal .field > label {
      display: block; margin-bottom: 6px;
      font-size: 12px; font-weight: 700; color: var(--t2);
    }
    .req { color: #ef4444; }
    .opt { font-weight: 400; color: var(--t4); font-size: 11px; }
    .error-msg { color: #ef4444; font-size: 12.5px; margin: 0; }

    .status-field {
      display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 36px;
    }
    .status-field > label:first-child { margin-bottom: 0 !important; }
    .status-right { display: inline-flex; align-items: center; gap: 10px; flex: 0 0 auto; }
    .sw-label { font-size: 13px; font-weight: 600; color: var(--t2); }

    .modal-actions {
      display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 8px;
      margin-top: 4px; padding-top: 12px; border-top: 1px solid var(--border);
      position: sticky; bottom: 0; background: var(--surface); z-index: 1;
    }
    .modal-header {
      display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 0;
    }
    .modal-header h3 { margin: 0; font-size: 18px; font-weight: 800; color: var(--t1); }
    .modal-close {
      border: none; background: var(--surface-2); color: var(--t3); cursor: pointer;
      width: 32px; height: 32px; border-radius: 8px; display: inline-flex;
      align-items: center; justify-content: center;
    }
    .modal-close:hover { background: var(--surface-3); color: var(--t1); }
    .modal-close .material-icons-round { font-size: 18px; }

    .switch { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; }
    .switch input { opacity: 0; width: 0; height: 0; }
    .slider {
      position: absolute; cursor: pointer; inset: 0; background: var(--border-2);
      transition: .2s; border-radius: 999px;
    }
    .slider:before {
      position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px;
      background: #fff; transition: .2s; border-radius: 50%;
      box-shadow: 0 1px 3px rgba(0,0,0,.2);
    }
    .switch input:checked + .slider { background: var(--accent); }
    .switch input:checked + .slider:before { transform: translateX(20px); }

    @media (max-width: 640px) {
      .search-field { max-width: none; }
      .status-filter { width: 100%; }
    }
  `]
})
export class ClassesComponent implements OnInit {
  private svc = inject(AcademicService);
  private confirmDelete = inject(ConfirmDeleteService);
  private auth = inject(AuthService);
  private instituteSvc = inject(InstituteService);

  isSuperAdmin = this.auth.hasRole('superadmin');
  institutes = signal<InstituteDto[]>([]);

  classes    = signal<ClassDto[]>([]);
  loading    = signal(false);
  showModal  = signal(false);
  saving     = signal(false);
  modalError = signal('');
  editId     = signal<number | null>(null);

  search = signal('');
  statusFilter = signal<'active' | 'inactive' | null>(null);
  readonly statusOptions = [
    { label: 'Active', value: 'active' as const },
    { label: 'Inactive', value: 'inactive' as const }
  ];

  form: { className: string; section: string; isActive: boolean; instituteId: number | null } =
    { className: '', section: '', isActive: true, instituteId: null };

  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    return this.classes().filter(c => {
      if (status === 'active' && !c.isActive) return false;
      if (status === 'inactive' && c.isActive) return false;
      if (!q) return true;
      const hay = `${c.className} ${c.section ?? ''} ${c.instituteName ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  });

  ngOnInit() {
    this.load();
    if (this.isSuperAdmin) {
      this.instituteSvc.getInstitutes().subscribe({ next: list => this.institutes.set(list) });
    }
  }

  load() {
    this.loading.set(true);
    this.svc.getClasses().subscribe({
      next: c => { this.classes.set(c); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  openAdd() {
    this.editId.set(null);
    this.form = { className: '', section: '', isActive: true, instituteId: null };
    this.modalError.set('');
    this.showModal.set(true);
  }

  openEdit(c: ClassDto) {
    this.editId.set(c.classId);
    this.form = { className: c.className, section: c.section ?? '', isActive: c.isActive, instituteId: c.instituteId ?? null };
    this.modalError.set('');
    this.showModal.set(true);
  }

  closeModal() { this.showModal.set(false); }

  save() {
    if (!this.form.className.trim()) { this.modalError.set('Class name is required.'); return; }
    if (this.isSuperAdmin && !this.form.instituteId) { this.modalError.set('Please select an institute.'); return; }
    this.saving.set(true);
    const dto = {
      className: this.form.className.trim(),
      section: this.form.section.trim() || null,
      isActive: this.form.isActive,
      instituteId: this.form.instituteId
    };
    const req = this.editId()
      ? this.svc.updateClass(this.editId()!, dto)
      : this.svc.createClass(dto);
    req.subscribe({
      next: () => { this.saving.set(false); this.closeModal(); this.load(); },
      error: (e: any) => { this.saving.set(false); this.modalError.set(e?.error?.error ?? 'Failed to save.'); }
    });
  }

  toggleStatus(c: ClassDto) {
    this.svc.updateClass(c.classId, { className: c.className, section: c.section ?? undefined, isActive: !c.isActive }).subscribe({
      next: () => this.classes.update(list => list.map(x => x.classId === c.classId ? { ...x, isActive: !x.isActive } : x)),
      error: () => {}
    });
  }

  deleteClass(c: ClassDto) {
    this.confirmDelete.open(
      'Delete Class?',
      `This will permanently delete <strong>${c.className}${c.section ? ' — ' + c.section : ''}</strong>.<br>Classes with student enrollments cannot be deleted.`,
      () => this.svc.deleteClass(c.classId),
      () => this.classes.update(list => list.filter(x => x.classId !== c.classId))
    );
  }
}
