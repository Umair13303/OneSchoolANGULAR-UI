import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { InventoryService } from '../../../core/services/inventory.service';
import { SupplierDto } from '../../../core/models/inventory.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ConfirmDeleteComponent } from '../../../shared/components/confirm-delete/confirm-delete.component';
import { ConfirmDeleteService } from '../../../shared/components/confirm-delete/confirm-delete.service';

@Component({
  selector: 'app-suppliers',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageHeaderComponent, ConfirmDeleteComponent],
  template: `
    <app-page-header title="Suppliers" subtitle="Manage vendors you purchase inventory from">
      <button class="btn-primary" (click)="openAdd()"><span class="material-icons-round">add</span> Add Supplier</button>
    </app-page-header>

    <input class="search" placeholder="Search suppliers…" [value]="search()" (input)="onSearch($any($event.target).value)" />

    <div class="card">
      <table class="table">
        <thead><tr><th>Name</th><th>Contact Person</th><th>Mobile</th><th>City</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          @for (s of suppliers(); track s.supplierId) {
            <tr>
              <td><strong>{{ s.supplierName }}</strong></td>
              <td>{{ s.contactPerson || '—' }}</td>
              <td>{{ s.mobile || '—' }}</td>
              <td>{{ s.city || '—' }}</td>
              <td><span [class]="'badge ' + (s.isActive ? 'badge-green' : 'badge-gray')">{{ s.isActive ? 'Active' : 'Inactive' }}</span></td>
              <td class="actions">
                <button class="icon-btn" (click)="openEdit(s)" title="Edit"><span class="material-icons-round">edit</span></button>
                <button class="icon-btn danger" (click)="deleteSupplier(s)" title="Delete"><span class="material-icons-round">delete</span></button>
              </td>
            </tr>
          }
          @if (!suppliers().length) { <tr><td colspan="6" class="empty">No suppliers found.</td></tr> }
        </tbody>
      </table>
    </div>

    @if (showModal()) {
      <div class="overlay" (click)="showModal.set(false)">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-hd"><h3>{{ editingId() ? 'Edit' : 'Add' }} Supplier</h3><button class="close-btn" (click)="showModal.set(false)"><span class="material-icons-round">close</span></button></div>
          <form [formGroup]="form" (ngSubmit)="save()" class="modal-body">
            <div class="field"><label>Supplier Name <span class="req">*</span></label><input formControlName="supplierName" /></div>
            <div class="field"><label>Contact Person</label><input formControlName="contactPerson" /></div>
            <div class="field"><label>Mobile</label><input formControlName="mobile" /></div>
            <div class="field"><label>Phone</label><input formControlName="phone" /></div>
            <div class="field"><label>Email</label><input formControlName="email" /></div>
            <div class="field"><label>City</label><input formControlName="city" /></div>
            <div class="field"><label>Address</label><textarea formControlName="address" rows="2"></textarea></div>
            @if (editingId()) { <div class="field"><label>Status</label><select formControlName="isActive"><option [ngValue]="true">Active</option><option [ngValue]="false">Inactive</option></select></div> }
            @if (modalError()) { <div class="alert-err">{{ modalError() }}</div> }
            <div class="modal-ft"><button type="button" class="btn-secondary" (click)="showModal.set(false)">Cancel</button><button type="submit" class="btn-primary" [disabled]="saving()">Save</button></div>
          </form>
        </div>
      </div>
    }

    <app-confirm-delete />
  `,
  styles: [`
    .search { width:100%; max-width:340px; padding:9px 12px; border:1.5px solid var(--border); border-radius:8px; font-size:13px; margin-bottom:14px; background:var(--surface); color:var(--t1); }
    .card { background:var(--surface); border:1px solid var(--border); border-radius:14px; overflow:hidden; }
    .actions { display:flex; gap:2px; }
    .icon-btn { border:none; background:transparent; cursor:pointer; padding:6px; color:var(--t3); border-radius:6px; }
    .icon-btn:hover { color:var(--t1); background:var(--surface-2); }
    .icon-btn.danger:hover { color:#ef4444; background:rgba(239,68,68,.08); }
    .badge { padding:3px 9px; border-radius:12px; font-size:11.5px; font-weight:600; }
    .badge-green { background:var(--green-s); color:var(--green); }
    .badge-gray { background:var(--surface-2); color:var(--t4); }
    .empty { text-align:center; color:var(--t4); padding:32px 0; font-size:13px; }
    .overlay { position:fixed; inset:0; z-index:1000; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; padding:16px; }
    .modal { background:var(--surface); border-radius:16px; width:100%; max-width:460px; }
    .modal-hd { display:flex; align-items:center; gap:12px; padding:16px 20px; border-bottom:1px solid var(--border); background:var(--surface-2); }
    .modal-hd h3 { font-size:15px; font-weight:700; margin:0; }
    .close-btn { margin-left:auto; border:none; background:transparent; cursor:pointer; color:var(--t4); padding:6px; border-radius:8px; }
    .modal-body { padding:20px; max-height:70vh; overflow-y:auto; }
    .modal-ft { display:flex; justify-content:flex-end; gap:10px; padding-top:12px; border-top:1px solid var(--border); margin-top:4px; }
    .field { display:flex; flex-direction:column; gap:5px; margin-bottom:14px; }
    label { font-size:11px; font-weight:700; color:var(--t3); text-transform:uppercase; letter-spacing:.5px; }
    .req { color:var(--red); }
    input, select, textarea { padding:10px 12px; border:1.5px solid var(--border); border-radius:8px; font-size:13.5px; font-family:inherit; background:var(--surface); color:var(--t1); width:100%; }
    .alert-err { background:#fee2e2; color:#dc2626; border:1px solid #dc2626; border-radius:8px; padding:10px 14px; font-size:13px; margin-bottom:10px; }
  `]
})
export class SuppliersComponent implements OnInit {
  private svc = inject(InventoryService);
  private confirmDelete = inject(ConfirmDeleteService);
  private fb = inject(FormBuilder);

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
