import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FeeService } from '../../../core/services/fee.service';
import { FeeTypeDto, FEE_CATEGORIES, FeeCategory } from '../../../core/models/fee.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ConfirmDeleteComponent } from '../../../shared/components/confirm-delete/confirm-delete.component';
import { ConfirmDeleteService } from '../../../shared/components/confirm-delete/confirm-delete.service';

@Component({
  selector: 'app-fee-types',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageHeaderComponent, ConfirmDeleteComponent],
  template: `
    <app-page-header title="Fee Types" subtitle="Define the categories of fees your school charges" />

    <div class="card">
      <div class="card-head">
        <div>
          <h3>Fee Types</h3>
          <p>{{ feeTypes().length }} type{{ feeTypes().length !== 1 ? 's' : '' }} defined</p>
        </div>
        <button class="btn-primary" (click)="openAdd()">
          <span class="material-icons-round">add</span> Add Fee Type
        </button>
      </div>

      <table class="table">
        <thead>
          <tr><th>Name</th><th>Category</th><th>Description</th><th>Status</th><th>Actions</th></tr>
        </thead>
        <tbody>
          @for (ft of feeTypes(); track ft.feeTypeId) {
            <tr>
              <td><strong>{{ ft.name }}</strong></td>
              <td><span [class]="'cat-badge cat-' + ft.feeCategory.toLowerCase()">{{ categoryLabel(ft.feeCategory) }}</span></td>
              <td class="desc-cell">{{ ft.description || '—' }}</td>
              <td><span [class]="'badge ' + (ft.isActive ? 'badge-green' : 'badge-gray')">{{ ft.isActive ? 'Active' : 'Inactive' }}</span></td>
              <td class="actions">
                <button class="icon-btn" (click)="openEdit(ft)" title="Edit"><span class="material-icons-round">edit</span></button>
                <button class="icon-btn danger" (click)="delete(ft.feeTypeId)" title="Delete"><span class="material-icons-round">delete</span></button>
              </td>
            </tr>
          }
          @if (!feeTypes().length) {
            <tr><td colspan="5" class="empty">No fee types yet. Click <strong>Add Fee Type</strong> to create one.</td></tr>
          }
        </tbody>
      </table>
    </div>

    <!-- Modal -->
    @if (showModal()) {
      <div class="overlay" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-hd">
            <div class="modal-icon"><span class="material-icons-round">sell</span></div>
            <div>
              <h3>{{ editingId() ? 'Edit' : 'Add' }} Fee Type</h3>
              <p>{{ editingId() ? 'Update this fee type.' : 'Define a new fee category.' }}</p>
            </div>
            <button class="close-btn" (click)="closeModal()"><span class="material-icons-round">close</span></button>
          </div>
          <form [formGroup]="form" (ngSubmit)="save()" class="modal-body">
            <div class="field" [class.invalid]="f('name')?.invalid && f('name')?.touched">
              <label>Name <span class="req">*</span></label>
              <input formControlName="name" placeholder="e.g. Tuition Fee" />
              @if (f('name')?.invalid && f('name')?.touched) { <span class="err">Name is required.</span> }
            </div>
            <div class="field">
              <label>Fee Category <span class="req">*</span></label>
              <select formControlName="feeCategory">
                @for (cat of categories; track cat.value) {
                  <option [value]="cat.value">{{ cat.label }}</option>
                }
              </select>
              @if (categoryDesc()) { <span class="hint">{{ categoryDesc() }}</span> }
            </div>
            <div class="field">
              <label>Description</label>
              <textarea formControlName="description" placeholder="Optional description" rows="3"></textarea>
            </div>
            @if (editingId()) {
              <div class="field">
                <label>Status</label>
                <select formControlName="isActive">
                  <option [ngValue]="true">Active</option>
                  <option [ngValue]="false">Inactive</option>
                </select>
              </div>
            }
            @if (modalError()) { <div class="alert-err">{{ modalError() }}</div> }
            <div class="modal-ft">
              <button type="button" class="btn-secondary" (click)="closeModal()">Cancel</button>
              <button type="submit" class="btn-primary" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save' }}</button>
            </div>
          </form>
        </div>
      </div>
    }

    <app-confirm-delete />
  `,
  styles: [`
    .card { background:var(--surface); border:1px solid var(--border); border-radius:14px; overflow:hidden; margin-top:4px; }
    .card-head { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:16px 20px; border-bottom:1px solid var(--border); background:var(--surface-2); }
    .card-head h3 { font-size:15px; font-weight:700; color:var(--t1); margin:0; }
    .card-head p  { font-size:12px; color:var(--t4); margin:2px 0 0; }
    .btn-primary { display:inline-flex; align-items:center; gap:6px; }
    .btn-primary .material-icons-round { font-size:16px; }

    .actions { display:flex; gap:2px; }
    .icon-btn { border:none; background:transparent; cursor:pointer; padding:6px; color:var(--t3); display:flex; align-items:center; border-radius:6px; transition:all .15s; }
    .icon-btn:hover { color:var(--t1); background:var(--surface-2); }
    .icon-btn .material-icons-round { font-size:18px; }
    .icon-btn.danger:hover { color:#ef4444; background:rgba(239,68,68,.08); }

    .desc-cell { font-size:12.5px; color:var(--t3); max-width:220px; }
    .badge { padding:3px 9px; border-radius:12px; font-size:11.5px; font-weight:600; }
    .badge-green { background:var(--green-s); color:var(--green); }
    .badge-gray  { background:var(--surface-2); color:var(--t4); }
    .cat-badge { padding:2px 9px; border-radius:20px; font-size:11px; font-weight:600; white-space:nowrap; }
    .cat-recurring         { background:#dbeafe; color:#1d4ed8; }
    .cat-onetime           { background:#d1fae5; color:#065f46; }
    .cat-ondemand          { background:#fef9c3; color:#854d0e; }
    .cat-refundabledeposit { background:#fce7f3; color:#be185d; }
    .empty { text-align:center; color:var(--t4); padding:32px 0; font-size:13px; }

    /* Modal */
    .overlay { position:fixed; inset:0; z-index:1000; background:rgba(0,0,0,0.45); display:flex; align-items:center; justify-content:center; padding:16px; }
    .modal { background:var(--surface); border-radius:16px; width:100%; max-width:440px; box-shadow:0 24px 48px rgba(0,0,0,.2); overflow:hidden; animation:pop .18s cubic-bezier(.34,1.4,.64,1); }
    @keyframes pop { from { transform:scale(.93); opacity:0 } to { transform:scale(1); opacity:1 } }
    .modal-hd { display:flex; align-items:center; gap:12px; padding:18px 20px; border-bottom:1px solid var(--border); background:var(--surface-2); }
    .modal-icon { width:38px; height:38px; border-radius:10px; background:var(--accent-s); color:var(--accent); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .modal-icon .material-icons-round { font-size:20px; }
    .modal-hd h3 { font-size:15px; font-weight:700; color:var(--t1); margin:0; }
    .modal-hd p  { font-size:12px; color:var(--t4); margin:2px 0 0; }
    .close-btn { margin-left:auto; border:none; background:transparent; cursor:pointer; color:var(--t4); padding:6px; border-radius:8px; display:flex; transition:all .15s; }
    .close-btn:hover { background:var(--surface); color:var(--t1); }
    .close-btn .material-icons-round { font-size:20px; }
    .modal-body { padding:20px; }
    .modal-ft { display:flex; justify-content:flex-end; gap:10px; padding-top:12px; border-top:1px solid var(--border); margin-top:4px; }

    .field { display:flex; flex-direction:column; gap:5px; margin-bottom:14px; }
    label { font-size:11px; font-weight:700; color:var(--t3); text-transform:uppercase; letter-spacing:.5px; }
    .req { color:var(--red); }
    input, select, textarea { padding:10px 12px; border:1.5px solid var(--border); border-radius:8px; font-size:13.5px; font-family:inherit; background:var(--surface); color:var(--t1); transition:border-color .15s; }
    input:focus, select:focus, textarea:focus { outline:none; border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-g); }
    textarea { resize:vertical; }
    .field.invalid input, .field.invalid select { border-color:var(--red); }
    .err  { font-size:11.5px; color:var(--red); }
    .hint { font-size:11.5px; color:var(--t4); }
    .alert-err { background:#fee2e2; color:#dc2626; border:1px solid #dc2626; border-radius:8px; padding:10px 14px; font-size:13px; margin-bottom:10px; }
  `]
})
export class FeeTypesComponent implements OnInit {
  private feeSvc        = inject(FeeService);
  private confirmDelete = inject(ConfirmDeleteService);
  private fb            = inject(FormBuilder);

  feeTypes   = signal<FeeTypeDto[]>([]);
  showModal  = signal(false);
  editingId  = signal<number | null>(null);
  saving     = signal(false);
  modalError = signal('');
  categories = FEE_CATEGORIES;

  form = this.fb.group({
    name:        ['', Validators.required],
    description: [''],
    feeCategory: ['Recurring' as FeeCategory, Validators.required],
    isActive:    [true]
  });

  f(n: string) { return this.form.get(n); }

  categoryLabel(cat: string) { return FEE_CATEGORIES.find(c => c.value === cat)?.label ?? cat; }
  categoryDesc()  { return FEE_CATEGORIES.find(c => c.value === this.form.value.feeCategory)?.description ?? ''; }

  ngOnInit() { this.load(); }
  load()     { this.feeSvc.getFeeTypes().subscribe(t => this.feeTypes.set(t)); }

  openAdd() {
    this.editingId.set(null);
    this.form.reset({ isActive: true, feeCategory: 'Recurring' });
    this.modalError.set(''); this.showModal.set(true);
  }

  openEdit(ft: FeeTypeDto) {
    this.editingId.set(ft.feeTypeId);
    this.form.patchValue({ name: ft.name, description: ft.description ?? '', feeCategory: ft.feeCategory, isActive: ft.isActive });
    this.modalError.set(''); this.showModal.set(true);
  }

  save() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.saving.set(true); this.modalError.set('');
    const v = this.form.value;
    const id = this.editingId();
    const obs = id
      ? this.feeSvc.updateFeeType(id, { name: v.name!, description: v.description ?? undefined, feeCategory: v.feeCategory as FeeCategory, isActive: v.isActive! })
      : this.feeSvc.createFeeType({ name: v.name!, description: v.description ?? undefined, feeCategory: v.feeCategory as FeeCategory });
    obs.subscribe({
      next:  ()      => { this.saving.set(false); this.closeModal(); this.load(); },
      error: (e:any) => { this.saving.set(false); this.modalError.set(e?.error?.error ?? 'Save failed.'); }
    });
  }

  delete(id: number) {
    this.confirmDelete.open('Delete Fee Type?', 'This cannot be undone.',
      () => this.feeSvc.deleteFeeType(id), () => this.load());
  }

  closeModal() { this.showModal.set(false); }
}
