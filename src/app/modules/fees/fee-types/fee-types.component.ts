import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { Tag } from 'primeng/tag';
import { Dialog } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { Tooltip } from 'primeng/tooltip';
import { FeeService } from '../../../core/services/fee.service';
import { FeeTypeDto, FEE_CATEGORIES, FeeCategory } from '../../../core/models/fee.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ConfirmDeleteComponent } from '../../../shared/components/confirm-delete/confirm-delete.component';
import { ConfirmDeleteService } from '../../../shared/components/confirm-delete/confirm-delete.service';

@Component({
  selector: 'app-fee-types',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, PageHeaderComponent, ConfirmDeleteComponent,
    Button, Select, InputText, Textarea, Tag, Dialog, TableModule, Tooltip
  ],
  template: `
    <app-page-header title="Fee Types" subtitle="Define the categories of fees your school charges" />

    <div class="card table-card">
      <div class="card-head flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3>Fee Types</h3>
          <p>{{ feeTypes().length }} type{{ feeTypes().length !== 1 ? 's' : '' }} defined</p>
        </div>
        <p-button label="Add Fee Type" icon="pi pi-plus" (onClick)="openAdd()" />
      </div>

      <div class="w-full overflow-x-auto">
        <p-table [value]="feeTypes()" dataKey="feeTypeId" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '100%' }">
          <ng-template #header>
            <tr>
              <th>Name</th><th>Category</th><th>Description</th><th>Status</th><th class="text-right">Actions</th>
            </tr>
          </ng-template>
          <ng-template #body let-ft>
            <tr>
              <td><strong>{{ ft.name }}</strong></td>
              <td><span [class]="'cat-badge cat-' + ft.feeCategory.toLowerCase()">{{ categoryLabel(ft.feeCategory) }}</span></td>
              <td class="desc-cell">{{ ft.description || '—' }}</td>
              <td>
                <p-tag [value]="ft.isActive ? 'Active' : 'Inactive'" [severity]="ft.isActive ? 'success' : 'secondary'" [rounded]="true" />
              </td>
              <td>
                <div class="flex items-center justify-end gap-1 whitespace-nowrap">
                  <p-button icon="pi pi-pencil" [text]="true" [rounded]="true" size="small" severity="secondary" ariaLabel="Edit" pTooltip="Edit" (onClick)="openEdit(ft)" />
                  <p-button icon="pi pi-trash" [text]="true" [rounded]="true" size="small" severity="danger" ariaLabel="Delete" pTooltip="Delete" (onClick)="delete(ft.feeTypeId)" />
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template #emptymessage>
            <tr><td colspan="5" class="empty">No fee types yet. Click <strong>Add Fee Type</strong> to create one.</td></tr>
          </ng-template>
        </p-table>
      </div>
    </div>

    <p-dialog
      [header]="(editingId() ? 'Edit' : 'Add') + ' Fee Type'"
      [visible]="showModal()"
      (visibleChange)="showModal.set($event)"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
      [style]="{ width: '28rem' }"
      [breakpoints]="{ '640px': '96vw' }">
      <form [formGroup]="form" (ngSubmit)="save()" id="fee-type-form">
        <p class="sub mb-3">{{ editingId() ? 'Update this fee type.' : 'Define a new fee category.' }}</p>
        <div class="field">
          <label for="ft-name">Name <span class="req">*</span></label>
          <input pInputText id="ft-name" class="w-full" formControlName="name" placeholder="e.g. Tuition Fee" />
          @if (f('name')?.invalid && f('name')?.touched) { <span class="err">Name is required.</span> }
        </div>
        <div class="field">
          <label>Fee Category <span class="req">*</span></label>
          <p-select
            class="w-full"
            [options]="categories"
            optionLabel="label"
            optionValue="value"
            appendTo="body"
            [overlayOptions]="{ baseZIndex: 10050 }"
            formControlName="feeCategory" />
          @if (categoryDesc()) { <span class="hint">{{ categoryDesc() }}</span> }
        </div>
        <div class="field">
          <label for="ft-desc">Description</label>
          <textarea pTextarea id="ft-desc" class="w-full" formControlName="description" placeholder="Optional description" rows="3"></textarea>
        </div>
        @if (editingId()) {
          <div class="field">
            <label>Status</label>
            <p-select
              class="w-full"
              [options]="statusOptions"
              optionLabel="label"
              optionValue="value"
              appendTo="body"
              [overlayOptions]="{ baseZIndex: 10050 }"
              formControlName="isActive" />
          </div>
        }
        @if (modalError()) { <div class="alert-err">{{ modalError() }}</div> }
      </form>
      <ng-template #footer>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <p-button label="Cancel" severity="secondary" [outlined]="true" (onClick)="closeModal()" />
          <p-button [label]="saving() ? 'Saving…' : 'Save'" icon="pi pi-check" [loading]="saving()" [disabled]="saving()" (onClick)="save()" />
        </div>
      </ng-template>
    </p-dialog>

    <app-confirm-delete />
  `,
  styles: [`
    .table-card { padding:0; overflow:hidden; margin-top:4px; }
    .card-head { padding:16px 20px; border-bottom:1px solid var(--border); background:var(--surface-2); }
    .card-head h3 { font-size:15px; font-weight:700; color:var(--t1); margin:0; }
    .card-head p  { font-size:12px; color:var(--t4); margin:2px 0 0; }
    .desc-cell { font-size:12.5px; color:var(--t3); max-width:220px; }
    .cat-badge { padding:2px 9px; border-radius:20px; font-size:11px; font-weight:600; white-space:nowrap; }
    .cat-recurring         { background:#dbeafe; color:#1d4ed8; }
    .cat-onetime           { background:#d1fae5; color:#065f46; }
    .cat-ondemand          { background:#fef9c3; color:#854d0e; }
    .cat-refundabledeposit { background:#fce7f3; color:#be185d; }
    .empty { text-align:center; color:var(--t4); padding:32px 0; font-size:13px; }
    .sub { font-size:12px; color:var(--t4); }
    .field { display:flex; flex-direction:column; gap:5px; margin-bottom:14px; }
    label { font-size:11px; font-weight:700; color:var(--t3); text-transform:uppercase; letter-spacing:.5px; }
    .req { color:var(--red); }
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
  statusOptions = [{ label: 'Active', value: true }, { label: 'Inactive', value: false }];

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
