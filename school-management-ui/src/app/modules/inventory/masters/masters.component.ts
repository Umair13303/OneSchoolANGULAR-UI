import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { InventoryService } from '../../../core/services/inventory.service';
import { ItemCategoryDto, UnitDto, TaxDto } from '../../../core/models/inventory.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ConfirmDeleteComponent } from '../../../shared/components/confirm-delete/confirm-delete.component';
import { ConfirmDeleteService } from '../../../shared/components/confirm-delete/confirm-delete.service';

type Tab = 'categories' | 'units' | 'taxes';

@Component({
  selector: 'app-inventory-masters',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageHeaderComponent, ConfirmDeleteComponent],
  template: `
    <app-page-header title="Categories, Units &amp; Tax" subtitle="Shared lookup data used by Item Master and POS" />

    <div class="tabs">
      <button class="tab" [class.active]="tab()==='categories'" (click)="tab.set('categories')">Categories</button>
      <button class="tab" [class.active]="tab()==='units'" (click)="tab.set('units')">Units</button>
      <button class="tab" [class.active]="tab()==='taxes'" (click)="tab.set('taxes')">Tax Rates</button>
    </div>

    @if (tab() === 'categories') {
      <div class="card">
        <div class="card-head">
          <div><h3>Item Categories</h3><p>{{ categories().length }} categories</p></div>
          <button class="btn-primary" (click)="openCat()"><span class="material-icons-round">add</span> Add Category</button>
        </div>
        <table class="table">
          <thead><tr><th>Name</th><th>Items</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            @for (c of categories(); track c.itemCategoryId) {
              <tr>
                <td><strong>{{ c.categoryName }}</strong></td>
                <td>{{ c.itemCount }}</td>
                <td><span [class]="'badge ' + (c.isActive ? 'badge-green' : 'badge-gray')">{{ c.isActive ? 'Active' : 'Inactive' }}</span></td>
                <td class="actions">
                  <button class="icon-btn" (click)="openCat(c)" title="Edit"><span class="material-icons-round">edit</span></button>
                  <button class="icon-btn danger" (click)="deleteCat(c)" title="Delete"><span class="material-icons-round">delete</span></button>
                </td>
              </tr>
            }
            @if (!categories().length) { <tr><td colspan="4" class="empty">No categories yet.</td></tr> }
          </tbody>
        </table>
      </div>
    }

    @if (tab() === 'units') {
      <div class="card">
        <div class="card-head">
          <div><h3>Units of Measure</h3><p>{{ units().length }} units</p></div>
          <button class="btn-primary" (click)="openUnit()"><span class="material-icons-round">add</span> Add Unit</button>
        </div>
        <table class="table">
          <thead><tr><th>Name</th><th>Short</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            @for (u of units(); track u.unitId) {
              <tr>
                <td><strong>{{ u.unitName }}</strong></td>
                <td>{{ u.shortName }}</td>
                <td><span [class]="'badge ' + (u.isActive ? 'badge-green' : 'badge-gray')">{{ u.isActive ? 'Active' : 'Inactive' }}</span></td>
                <td class="actions">
                  <button class="icon-btn" (click)="openUnit(u)" title="Edit"><span class="material-icons-round">edit</span></button>
                  <button class="icon-btn danger" (click)="deleteUnit(u)" title="Delete"><span class="material-icons-round">delete</span></button>
                </td>
              </tr>
            }
            @if (!units().length) { <tr><td colspan="4" class="empty">No units yet.</td></tr> }
          </tbody>
        </table>
      </div>
    }

    @if (tab() === 'taxes') {
      <div class="card">
        <div class="card-head">
          <div><h3>Tax Rates</h3><p>{{ taxes().length }} rates</p></div>
          <button class="btn-primary" (click)="openTax()"><span class="material-icons-round">add</span> Add Tax Rate</button>
        </div>
        <table class="table">
          <thead><tr><th>Name</th><th>Percentage</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            @for (t of taxes(); track t.taxId) {
              <tr>
                <td><strong>{{ t.taxName }}</strong></td>
                <td>{{ t.taxPercentage }}%</td>
                <td><span [class]="'badge ' + (t.isActive ? 'badge-green' : 'badge-gray')">{{ t.isActive ? 'Active' : 'Inactive' }}</span></td>
                <td class="actions">
                  <button class="icon-btn" (click)="openTax(t)" title="Edit"><span class="material-icons-round">edit</span></button>
                  <button class="icon-btn danger" (click)="deleteTax(t)" title="Delete"><span class="material-icons-round">delete</span></button>
                </td>
              </tr>
            }
            @if (!taxes().length) { <tr><td colspan="4" class="empty">No tax rates yet.</td></tr> }
          </tbody>
        </table>
      </div>
    }

    <!-- Category Modal -->
    @if (showCat()) {
      <div class="overlay" (click)="showCat.set(false)">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-hd"><h3>{{ editingId() ? 'Edit' : 'Add' }} Category</h3><button class="close-btn" (click)="showCat.set(false)"><span class="material-icons-round">close</span></button></div>
          <form [formGroup]="catForm" (ngSubmit)="saveCat()" class="modal-body">
            <div class="field"><label>Category Name <span class="req">*</span></label><input formControlName="categoryName" /></div>
            @if (editingId()) { <div class="field"><label>Status</label><select formControlName="isActive"><option [ngValue]="true">Active</option><option [ngValue]="false">Inactive</option></select></div> }
            @if (modalError()) { <div class="alert-err">{{ modalError() }}</div> }
            <div class="modal-ft"><button type="button" class="btn-secondary" (click)="showCat.set(false)">Cancel</button><button type="submit" class="btn-primary" [disabled]="saving()">Save</button></div>
          </form>
        </div>
      </div>
    }

    <!-- Unit Modal -->
    @if (showUnit()) {
      <div class="overlay" (click)="showUnit.set(false)">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-hd"><h3>{{ editingId() ? 'Edit' : 'Add' }} Unit</h3><button class="close-btn" (click)="showUnit.set(false)"><span class="material-icons-round">close</span></button></div>
          <form [formGroup]="unitForm" (ngSubmit)="saveUnit()" class="modal-body">
            <div class="field"><label>Unit Name <span class="req">*</span></label><input formControlName="unitName" placeholder="e.g. Piece" /></div>
            <div class="field"><label>Short Name <span class="req">*</span></label><input formControlName="shortName" placeholder="e.g. Pc" /></div>
            @if (editingId()) { <div class="field"><label>Status</label><select formControlName="isActive"><option [ngValue]="true">Active</option><option [ngValue]="false">Inactive</option></select></div> }
            @if (modalError()) { <div class="alert-err">{{ modalError() }}</div> }
            <div class="modal-ft"><button type="button" class="btn-secondary" (click)="showUnit.set(false)">Cancel</button><button type="submit" class="btn-primary" [disabled]="saving()">Save</button></div>
          </form>
        </div>
      </div>
    }

    <!-- Tax Modal -->
    @if (showTax()) {
      <div class="overlay" (click)="showTax.set(false)">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-hd"><h3>{{ editingId() ? 'Edit' : 'Add' }} Tax Rate</h3><button class="close-btn" (click)="showTax.set(false)"><span class="material-icons-round">close</span></button></div>
          <form [formGroup]="taxForm" (ngSubmit)="saveTax()" class="modal-body">
            <div class="field"><label>Tax Name <span class="req">*</span></label><input formControlName="taxName" placeholder="e.g. GST" /></div>
            <div class="field"><label>Percentage <span class="req">*</span></label><input type="number" step="0.01" formControlName="taxPercentage" /></div>
            @if (editingId()) { <div class="field"><label>Status</label><select formControlName="isActive"><option [ngValue]="true">Active</option><option [ngValue]="false">Inactive</option></select></div> }
            @if (modalError()) { <div class="alert-err">{{ modalError() }}</div> }
            <div class="modal-ft"><button type="button" class="btn-secondary" (click)="showTax.set(false)">Cancel</button><button type="submit" class="btn-primary" [disabled]="saving()">Save</button></div>
          </form>
        </div>
      </div>
    }

    <app-confirm-delete />
  `,
  styles: [`
    .tabs { display:flex; gap:6px; margin-bottom:16px; border-bottom:1px solid var(--border); }
    .tab { padding:10px 16px; border:none; background:transparent; cursor:pointer; font-size:13px; font-weight:600; color:var(--t4); border-bottom:2px solid transparent; }
    .tab.active { color:var(--accent); border-bottom-color:var(--accent); }
    .card { background:var(--surface); border:1px solid var(--border); border-radius:14px; overflow:hidden; }
    .card-head { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:16px 20px; border-bottom:1px solid var(--border); background:var(--surface-2); }
    .card-head h3 { font-size:15px; font-weight:700; color:var(--t1); margin:0; }
    .card-head p { font-size:12px; color:var(--t4); margin:2px 0 0; }
    .btn-primary { display:inline-flex; align-items:center; gap:6px; }
    .actions { display:flex; gap:2px; }
    .icon-btn { border:none; background:transparent; cursor:pointer; padding:6px; color:var(--t3); border-radius:6px; }
    .icon-btn:hover { color:var(--t1); background:var(--surface-2); }
    .icon-btn.danger:hover { color:#ef4444; background:rgba(239,68,68,.08); }
    .badge { padding:3px 9px; border-radius:12px; font-size:11.5px; font-weight:600; }
    .badge-green { background:var(--green-s); color:var(--green); }
    .badge-gray { background:var(--surface-2); color:var(--t4); }
    .empty { text-align:center; color:var(--t4); padding:32px 0; font-size:13px; }
    .overlay { position:fixed; inset:0; z-index:1000; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; padding:16px; }
    .modal { background:var(--surface); border-radius:16px; width:100%; max-width:420px; overflow:hidden; }
    .modal-hd { display:flex; align-items:center; gap:12px; padding:16px 20px; border-bottom:1px solid var(--border); background:var(--surface-2); }
    .modal-hd h3 { font-size:15px; font-weight:700; margin:0; }
    .close-btn { margin-left:auto; border:none; background:transparent; cursor:pointer; color:var(--t4); padding:6px; border-radius:8px; }
    .modal-body { padding:20px; }
    .modal-ft { display:flex; justify-content:flex-end; gap:10px; padding-top:12px; border-top:1px solid var(--border); margin-top:4px; }
    .field { display:flex; flex-direction:column; gap:5px; margin-bottom:14px; }
    label { font-size:11px; font-weight:700; color:var(--t3); text-transform:uppercase; letter-spacing:.5px; }
    .req { color:var(--red); }
    input, select { padding:10px 12px; border:1.5px solid var(--border); border-radius:8px; font-size:13.5px; font-family:inherit; background:var(--surface); color:var(--t1); }
    .alert-err { background:#fee2e2; color:#dc2626; border:1px solid #dc2626; border-radius:8px; padding:10px 14px; font-size:13px; margin-bottom:10px; }
  `]
})
export class InventoryMastersComponent implements OnInit {
  private svc = inject(InventoryService);
  private confirmDelete = inject(ConfirmDeleteService);
  private fb = inject(FormBuilder);

  tab = signal<Tab>('categories');
  categories = signal<ItemCategoryDto[]>([]);
  units = signal<UnitDto[]>([]);
  taxes = signal<TaxDto[]>([]);

  showCat = signal(false); showUnit = signal(false); showTax = signal(false);
  editingId = signal<number | null>(null);
  saving = signal(false);
  modalError = signal('');

  catForm = this.fb.group({ categoryName: ['', Validators.required], isActive: [true] });
  unitForm = this.fb.group({ unitName: ['', Validators.required], shortName: ['', Validators.required], isActive: [true] });
  taxForm = this.fb.group({ taxName: ['', Validators.required], taxPercentage: [0, Validators.required], isActive: [true] });

  ngOnInit() { this.loadAll(); }
  loadAll() {
    this.svc.getCategories().subscribe(c => this.categories.set(c));
    this.svc.getUnits().subscribe(u => this.units.set(u));
    this.svc.getTaxes().subscribe(t => this.taxes.set(t));
  }

  // ── Categories ─────────────────────────────────────────────────────────────
  openCat(c?: ItemCategoryDto) {
    this.editingId.set(c?.itemCategoryId ?? null);
    this.catForm.reset({ categoryName: c?.categoryName ?? '', isActive: c?.isActive ?? true });
    this.modalError.set(''); this.showCat.set(true);
  }
  saveCat() {
    if (this.catForm.invalid) return;
    this.saving.set(true);
    const v = this.catForm.value;
    const id = this.editingId();
    const obs = id ? this.svc.updateCategory(id, { categoryName: v.categoryName!, isActive: v.isActive! })
                   : this.svc.createCategory({ categoryName: v.categoryName!, isActive: true });
    obs.subscribe({
      next: () => { this.saving.set(false); this.showCat.set(false); this.loadAll(); },
      error: (e: any) => { this.saving.set(false); this.modalError.set(e?.error?.error ?? 'Save failed.'); }
    });
  }
  deleteCat(c: ItemCategoryDto) {
    this.confirmDelete.open('Delete Category?', `This will remove <strong>${c.categoryName}</strong>.`,
      () => this.svc.deleteCategory(c.itemCategoryId), () => this.loadAll());
  }

  // ── Units ──────────────────────────────────────────────────────────────────
  openUnit(u?: UnitDto) {
    this.editingId.set(u?.unitId ?? null);
    this.unitForm.reset({ unitName: u?.unitName ?? '', shortName: u?.shortName ?? '', isActive: u?.isActive ?? true });
    this.modalError.set(''); this.showUnit.set(true);
  }
  saveUnit() {
    if (this.unitForm.invalid) return;
    this.saving.set(true);
    const v = this.unitForm.value;
    const id = this.editingId();
    const obs = id ? this.svc.updateUnit(id, { unitName: v.unitName!, shortName: v.shortName!, isActive: v.isActive! })
                   : this.svc.createUnit({ unitName: v.unitName!, shortName: v.shortName!, isActive: true });
    obs.subscribe({
      next: () => { this.saving.set(false); this.showUnit.set(false); this.loadAll(); },
      error: (e: any) => { this.saving.set(false); this.modalError.set(e?.error?.error ?? 'Save failed.'); }
    });
  }
  deleteUnit(u: UnitDto) {
    this.confirmDelete.open('Delete Unit?', `This will remove <strong>${u.unitName}</strong>.`,
      () => this.svc.deleteUnit(u.unitId), () => this.loadAll());
  }

  // ── Tax ────────────────────────────────────────────────────────────────────
  openTax(t?: TaxDto) {
    this.editingId.set(t?.taxId ?? null);
    this.taxForm.reset({ taxName: t?.taxName ?? '', taxPercentage: t?.taxPercentage ?? 0, isActive: t?.isActive ?? true });
    this.modalError.set(''); this.showTax.set(true);
  }
  saveTax() {
    if (this.taxForm.invalid) return;
    this.saving.set(true);
    const v = this.taxForm.value;
    const id = this.editingId();
    const obs = id ? this.svc.updateTax(id, { taxName: v.taxName!, taxPercentage: v.taxPercentage!, isActive: v.isActive! })
                   : this.svc.createTax({ taxName: v.taxName!, taxPercentage: v.taxPercentage!, isActive: true });
    obs.subscribe({
      next: () => { this.saving.set(false); this.showTax.set(false); this.loadAll(); },
      error: (e: any) => { this.saving.set(false); this.modalError.set(e?.error?.error ?? 'Save failed.'); }
    });
  }
  deleteTax(t: TaxDto) {
    this.confirmDelete.open('Delete Tax Rate?', `This will remove <strong>${t.taxName}</strong>.`,
      () => this.svc.deleteTax(t.taxId), () => this.loadAll());
  }
}
