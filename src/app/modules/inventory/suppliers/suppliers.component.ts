import { Component, OnInit, inject, signal } from '@angular/core';
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
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InventoryService } from '../../../core/services/inventory.service';
import { SupplierDto } from '../../../core/models/inventory.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ConfirmDeleteComponent } from '../../../shared/components/confirm-delete/confirm-delete.component';
import { ConfirmDeleteService } from '../../../shared/components/confirm-delete/confirm-delete.service';

@Component({
  selector: 'app-suppliers',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, PageHeaderComponent, ConfirmDeleteComponent,
    Button, Select, InputText, Textarea, Tag, Dialog, TableModule, Tooltip, IconField, InputIcon
  ],
  template: `
    <div class="os-page compact">
    <app-page-header [dense]="true" title="Suppliers" subtitle="Manage vendors you purchase inventory from" routeUrl="/inventory/suppliers">
      <p-button label="Add Supplier" icon="pi pi-plus" (onClick)="openAdd()" />
    </app-page-header>

    <div class="os-stage">
      <div class="os-stage-bar">
        <div class="flex w-full flex-wrap items-center gap-3">
          <p-iconfield class="min-w-[220px] flex-1">
            <p-inputicon class="pi pi-search" />
            <input pInputText class="w-full" placeholder="Search suppliers…" [value]="search()" (input)="onSearch($any($event.target).value)" />
          </p-iconfield>
        </div>
      </div>

      <div class="os-stage-body">
        <p-table [value]="suppliers()" dataKey="supplierId" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '40rem' }" [scrollable]="true">
          <ng-template #header>
            <tr><th>Name</th><th>Contact Person</th><th>Mobile</th><th>City</th><th>Status</th><th class="text-right">Actions</th></tr>
          </ng-template>
          <ng-template #body let-s>
            <tr>
              <td><strong>{{ s.supplierName }}</strong></td>
              <td>{{ s.contactPerson || '—' }}</td>
              <td>{{ s.mobile || '—' }}</td>
              <td>{{ s.city || '—' }}</td>
              <td><p-tag [value]="s.isActive ? 'Active' : 'Inactive'" [severity]="s.isActive ? 'success' : 'secondary'" [rounded]="true" /></td>
              <td>
                <div class="flex items-center justify-end gap-1 whitespace-nowrap">
                  <p-button icon="pi pi-pencil" [text]="true" [rounded]="true" size="small" severity="secondary" ariaLabel="Edit" pTooltip="Edit" (onClick)="openEdit(s)" />
                  <p-button icon="pi pi-trash" [text]="true" [rounded]="true" size="small" severity="danger" ariaLabel="Delete" pTooltip="Delete" (onClick)="deleteSupplier(s)" />
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template #emptymessage>
            <tr><td colspan="6" class="empty">No suppliers found.</td></tr>
          </ng-template>
        </p-table>
      </div>
    </div>
    </div>

    <p-dialog
      [header]="(editingId() ? 'Edit' : 'Add') + ' Supplier'"
      [visible]="showModal()"
      (visibleChange)="showModal.set($event)"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
      [style]="{ width: '30rem' }"
      [breakpoints]="{ '640px': '96vw' }">
      <form [formGroup]="form" (ngSubmit)="save()">
        <div class="field"><label for="sp-name">Supplier Name <span class="req">*</span></label><input pInputText id="sp-name" class="w-full" formControlName="supplierName" /></div>
        <div class="field"><label for="sp-contact">Contact Person</label><input pInputText id="sp-contact" class="w-full" formControlName="contactPerson" /></div>
        <div class="grid grid-cols-1 gap-x-3.5 sm:grid-cols-2">
          <div class="field"><label for="sp-mobile">Mobile</label><input pInputText id="sp-mobile" class="w-full" formControlName="mobile" /></div>
          <div class="field"><label for="sp-phone">Phone</label><input pInputText id="sp-phone" class="w-full" formControlName="phone" /></div>
          <div class="field"><label for="sp-email">Email</label><input pInputText id="sp-email" class="w-full" formControlName="email" /></div>
          <div class="field"><label for="sp-city">City</label><input pInputText id="sp-city" class="w-full" formControlName="city" /></div>
        </div>
        <div class="field"><label for="sp-address">Address</label><textarea pTextarea id="sp-address" class="w-full" formControlName="address" rows="2"></textarea></div>
        @if (editingId()) {
          <div class="field"><label>Status</label>
            <p-select class="w-full" [options]="statusOptions" optionLabel="label" optionValue="value"
                      appendTo="body" [overlayOptions]="{ baseZIndex: 10050 }" formControlName="isActive" />
          </div>
        }
        @if (modalError()) { <div class="alert-err">{{ modalError() }}</div> }
      </form>
      <ng-template #footer>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <p-button label="Cancel" severity="secondary" [outlined]="true" (onClick)="showModal.set(false)" />
          <p-button [label]="saving() ? 'Saving…' : 'Save'" icon="pi pi-check" [loading]="saving()" [disabled]="saving()" (onClick)="save()" />
        </div>
      </ng-template>
    </p-dialog>

    <app-confirm-delete />
  `,
  styles: [`
    .empty { text-align:center; color:var(--t4); padding:32px 0; font-size:13px; }
    .field { display:flex; flex-direction:column; gap:5px; margin-bottom:14px; }
    label { font-size:11px; font-weight:700; color:var(--t3); text-transform:uppercase; letter-spacing:.5px; }
    .req { color:var(--red); }
    .alert-err { background:#fee2e2; color:#dc2626; border:1px solid #dc2626; border-radius:8px; padding:10px 14px; font-size:13px; margin-bottom:10px; }
  `]
})
export class SuppliersComponent implements OnInit {
  private svc = inject(InventoryService);
  private confirmDelete = inject(ConfirmDeleteService);
  private fb = inject(FormBuilder);

  statusOptions = [{ label: 'Active', value: true }, { label: 'Inactive', value: false }];
  suppliers = signal<SupplierDto[]>([]);
  search = signal('');
  showModal = signal(false);
  editingId = signal<number | null>(null);
  saving = signal(false);
  modalError = signal('');

  form = this.fb.group({
    supplierName: ['', Validators.required],
    contactPerson: [''], mobile: [''], phone: [''], email: [''], city: [''], address: [''],
    isActive: [true]
  });

  ngOnInit() { this.load(); }
  load() { this.svc.getSuppliers(this.search() || undefined).subscribe(s => this.suppliers.set(s)); }
  onSearch(v: string) { this.search.set(v); this.load(); }

  openAdd() {
    this.editingId.set(null);
    this.form.reset({ isActive: true });
    this.modalError.set(''); this.showModal.set(true);
  }
  openEdit(s: SupplierDto) {
    this.editingId.set(s.supplierId);
    this.form.reset({
      supplierName: s.supplierName, contactPerson: s.contactPerson ?? '', mobile: s.mobile ?? '',
      phone: s.phone ?? '', email: s.email ?? '', city: s.city ?? '', address: s.address ?? '', isActive: s.isActive
    });
    this.modalError.set(''); this.showModal.set(true);
  }

  save() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.saving.set(true); this.modalError.set('');
    const v = this.form.value;
    const id = this.editingId();
    const payload = {
      supplierName: v.supplierName!, contactPerson: v.contactPerson || null, mobile: v.mobile || null,
      phone: v.phone || null, email: v.email || null, city: v.city || null, address: v.address || null,
      isActive: v.isActive!
    };
    const obs = id ? this.svc.updateSupplier(id, payload) : this.svc.createSupplier(payload);
    obs.subscribe({
      next: () => { this.saving.set(false); this.showModal.set(false); this.load(); },
      error: (e: any) => { this.saving.set(false); this.modalError.set(e?.error?.error ?? 'Save failed.'); }
    });
  }

  deleteSupplier(s: SupplierDto) {
    this.confirmDelete.open('Delete Supplier?', `This will remove <strong>${s.supplierName}</strong>.`,
      () => this.svc.deleteSupplier(s.supplierId), () => this.load());
  }
}
