import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  imports: [CommonModule, FormsModule, PageHeaderComponent, LoadingComponent, EmptyStateComponent, ConfirmDeleteComponent],
  template: `
    <app-page-header title="Classes" subtitle="Manage school classes and sections">
      <button class="btn-primary" (click)="openAdd()">
        <span class="material-icons-round">add</span> Add Class
      </button>
    </app-page-header>

    @if (loading()) {
      <div class="card"><app-loading /></div>
    } @else if (classes().length === 0) {
      <div class="card">
        <app-empty-state icon="class" title="No classes yet" message="Add your first class to get started." />
      </div>
    } @else {
      <div class="card table-card">
        <div class="table-scroll">
        <table class="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Class Name</th>
              <th class="col-section">Section</th>
              @if (isSuperAdmin) { <th class="col-institute">Institute</th> }
              <th class="col-subjects">Subjects</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (c of classes(); track c.classId; let i = $index) {
              <tr>
                <td class="idx">{{ i + 1 }}</td>
                <td><strong>{{ c.className }}</strong>{{ c.section ? ' — ' + c.section : '' }}</td>
                <td class="col-section">{{ c.section || '—' }}</td>
                @if (isSuperAdmin) { <td class="col-institute">{{ c.instituteName || '—' }}</td> }
                <td class="col-subjects"><span class="subj-badge">{{ c.subjectCount }}</span></td>
                <td>
                  <span class="badge" [class.active]="c.isActive">
                    {{ c.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td class="actions">
                  <button class="act-btn edit" (click)="openEdit(c)" title="Edit">
                    <span class="material-icons-round">edit</span>
                  </button>
                  <button class="act-btn toggle" (click)="toggleStatus(c)" [title]="c.isActive ? 'Deactivate' : 'Activate'">
                    <span class="material-icons-round">{{ c.isActive ? 'toggle_on' : 'toggle_off' }}</span>
                  </button>
                  <button class="act-btn danger" (click)="deleteClass(c)" title="Delete">
                    <span class="material-icons-round">delete</span>
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
        </div>
      </div>
    }

    <!-- Add / Edit Modal -->
    @if (showModal()) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <span class="material-icons-round modal-icon">{{ editId() ? 'edit' : 'add_circle' }}</span>
            <h3>{{ editId() ? 'Edit Class' : 'Add Class' }}</h3>
          </div>

          <div class="field">
            <label>Class Name <span class="req">*</span></label>
            <input [(ngModel)]="form.className" placeholder="e.g. Grade 5 / Class 8" />
          </div>
          <div class="field">
            <label>Section <span class="opt">(optional)</span></label>
            <input [(ngModel)]="form.section" placeholder="e.g. A, Blue, Morning" />
          </div>
          @if (isSuperAdmin) {
            <div class="field">
              <label>Institute <span class="req">*</span></label>
              <select [(ngModel)]="form.instituteId">
                <option [ngValue]="null">— Select institute —</option>
                @for (inst of institutes(); track inst.instituteId) {
                  <option [ngValue]="inst.instituteId">{{ inst.name }}</option>
                }
              </select>
            </div>
          }
          <div class="field toggle-field">
            <label>Status</label>
            <label class="switch">
              <input type="checkbox" [(ngModel)]="form.isActive" />
              <span class="slider"></span>
              <span class="sw-label">{{ form.isActive ? 'Active' : 'Inactive' }}</span>
            </label>
          </div>

          @if (modalError()) {
            <p class="error-msg">{{ modalError() }}</p>
          }

          <div class="modal-actions">
            <button class="btn-secondary" (click)="closeModal()">Cancel</button>
            <button class="btn-primary" (click)="save()" [disabled]="saving()">
              {{ saving() ? 'Saving...' : (editId() ? 'Update Class' : 'Add Class') }}
            </button>
          </div>
        </div>
      </div>
    }

    <app-confirm-delete />
  `,
  styles: [`
    .table-card { padding: 0; overflow: hidden; }
    .table-card table { overflow-x: auto; }

    .table { width: 100%; border-collapse: collapse; }
    .table th {
      padding: 11px 16px; font-size: 11.5px; font-weight: 700;
      color: var(--t4); text-transform: uppercase; letter-spacing: 0.5px;
      background: var(--surface-2); border-bottom: 1px solid var(--border);
      text-align: left;
    }
    .table td {
      padding: 13px 16px; font-size: 13.5px; color: var(--t2);
      border-bottom: 1px solid var(--border);
    }
    .table tbody tr:last-child td { border-bottom: none; }
    .table tbody tr:hover { background: var(--surface-2); }

    .idx { color: var(--t4); font-size: 12px; width: 36px; }

    .badge {
      display: inline-flex; padding: 3px 10px; border-radius: 99px;
      font-size: 11.5px; font-weight: 700;
      background: var(--red-s, #fee2e2); color: var(--red, #ef4444);
    }
    .badge.active { background: var(--green-s, #dcfce7); color: var(--green, #16a34a); }

    .subj-badge {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 26px; height: 22px; padding: 0 8px;
      background: var(--accent-s); color: var(--accent);
      border-radius: 99px; font-size: 12px; font-weight: 700;
    }

    .actions { display: flex; gap: 6px; }
    .act-btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 32px; height: 32px; border-radius: 8px; border: 1.5px solid var(--border);
      background: var(--surface-2); cursor: pointer; transition: all 0.15s;
      .material-icons-round { font-size: 16px; color: var(--t3); }
    }
    .act-btn:hover { background: var(--surface-3); }
    .act-btn.edit:hover { border-color: var(--accent); background: var(--accent-s); .material-icons-round { color: var(--accent); } }
    .act-btn.toggle:hover { border-color: #059669; background: #dcfce7; .material-icons-round { color: #059669; } }
    .act-btn.danger:hover { border-color: #ef4444; background: #fee2e2; .material-icons-round { color: #ef4444; } }

    /* Modal */
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.45);
      display: flex; align-items: center; justify-content: center; z-index: 1000;
      backdrop-filter: blur(2px);
    }
    .modal {
      background: var(--surface); border-radius: var(--r-2xl);
      padding: 28px; width: 100%; max-width: 420px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.2); border: 1px solid var(--border);
    }
    .modal-header { display: flex; align-items: center; gap: 10px; margin-bottom: 22px; }
    .modal-icon { font-size: 22px; color: var(--accent); }
    h3 { font-size: 17px; font-weight: 800; color: var(--t1); }

    .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
    .field label { font-size: 12.5px; font-weight: 700; color: var(--t2); }
    .field input {
      padding: 10px 13px; border-radius: 10px;
      border: 1.5px solid var(--border); background: var(--surface-2);
      font-size: 14px; color: var(--t1); outline: none;
      transition: border-color 0.15s;
    }
    .field input:focus { border-color: var(--accent); }
    .field select {
      padding: 10px 13px; border-radius: 10px;
      border: 1.5px solid var(--border); background: var(--surface-2);
      font-size: 14px; color: var(--t1); outline: none;
      transition: border-color 0.15s; font-family: inherit;
    }
    .field select:focus { border-color: var(--accent); }
    .req { color: #ef4444; }
    .opt { font-weight: 400; color: var(--t4); font-size: 11px; }

    .toggle-field { flex-direction: row; align-items: center; justify-content: space-between; }
    .switch { display: flex; align-items: center; gap: 10px; cursor: pointer; }
    .switch input { display: none; }
    .slider {
      width: 40px; height: 22px; border-radius: 99px;
      background: var(--border-2); position: relative; transition: background 0.2s;
    }
    .slider::after {
      content: ''; position: absolute; top: 3px; left: 3px;
      width: 16px; height: 16px; border-radius: 50%; background: #fff;
      transition: transform 0.2s; box-shadow: 0 1px 4px rgba(0,0,0,0.2);
    }
    .switch input:checked + .slider { background: var(--accent); }
    .switch input:checked + .slider::after { transform: translateX(18px); }
    .sw-label { font-size: 13px; font-weight: 600; color: var(--t2); }

    .error-msg { color: #ef4444; font-size: 12.5px; margin-bottom: 12px; }

    .modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 6px; }
    .btn-secondary {
      padding: 9px 20px; border-radius: 10px; border: 1.5px solid var(--border);
      background: var(--surface-2); font-size: 13.5px; font-weight: 700;
      color: var(--t2); cursor: pointer;
    }
    .btn-primary {
      padding: 9px 20px; border-radius: 10px; border: none;
      background: var(--accent); font-size: 13.5px; font-weight: 700;
      color: #fff; cursor: pointer; display: flex; align-items: center; gap: 6px;
    }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

    /* ── Mobile ─────────────────────────────────────── */
    @media (max-width: 768px) {
      /* Hide Section & Subjects columns, keep Name + Status + Actions */
      .col-section   { display: none; }
      .col-institute { display: none; }
      .col-subjects  { display: none; }
      .table th, .table td { padding: 10px 10px; }
      .actions { gap: 4px; }
      .act-btn { width: 30px; height: 30px; }
      .act-btn .material-icons-round { font-size: 15px; }
    }
    @media (max-width: 480px) {
      .idx { display: none; }
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

  form: { className: string; section: string; isActive: boolean; instituteId: number | null } =
    { className: '', section: '', isActive: true, instituteId: null };

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
