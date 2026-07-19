import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { InventoryService } from '../../../core/services/inventory.service';
import { ItemDto, ItemCategoryDto, UnitDto } from '../../../core/models/inventory.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ConfirmDeleteComponent } from '../../../shared/components/confirm-delete/confirm-delete.component';
import { ConfirmDeleteService } from '../../../shared/components/confirm-delete/confirm-delete.service';

@Component({
  selector: 'app-items',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageHeaderComponent, ConfirmDeleteComponent],
  template: `
    <app-page-header title="Item Master" subtitle="Books, stationery, uniforms and every other sellable item">
      <button class="btn-primary" (click)="openAdd()"><span class="material-icons-round">add</span> Add Item</button>
    </app-page-header>

    <div class="filters">
      <input class="search" placeholder="Search by name, code or barcode…" [value]="search()" (input)="onSearch($any($event.target).value)" />
      <select [value]="categoryFilter()" (change)="categoryFilter.set($any($event.target).value); load()">
        <option value="">All Categories</option>
        @for (c of categories(); track c.itemCategoryId) { <option [value]="c.itemCategoryId">{{ c.categoryName }}</option> }
      </select>
    </div>

    <div class="card">
      <table class="table">
        <thead><tr><th>Code</th><th>Name</th><th>Category</th><th>Unit</th><th>Stock</th><th>Sale Price</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          @for (i of items(); track i.itemId) {
            <tr>
              <td>{{ i.itemCode }}</td>
              <td><strong>{{ i.itemName }}</strong>@if (i.barcode) { <div class="sub">{{ i.barcode }}</div> }</td>
              <td>{{ i.categoryName }}</td>
              <td>{{ i.unitName }}</td>
              <td [class.low]="i.quantityOnHand <= i.reorderLevel">{{ i.quantityOnHand }}</td>
              <td>{{ i.salePrice | number:'1.2-2' }}</td>
              <td><span [class]="'badge ' + (i.isActive ? 'badge-green' : 'badge-gray')">{{ i.isActive ? 'Active' : 'Inactive' }}</span></td>
              <td class="actions">
                <button class="icon-btn" (click)="openEdit(i)" title="Edit"><span class="material-icons-round">edit</span></button>
                <button class="icon-btn danger" (click)="deleteItem(i)" title="Delete"><span class="material-icons-round">delete</span></button>
              </td>
            </tr>
          }
          @if (!items().length) { <tr><td colspan="8" class="empty">No items found.</td></tr> }
        </tbody>
      </table>
    </div>

    @if (showModal()) {
      <div class="overlay" (click)="showModal.set(false)">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-hd"><h3>{{ editingId() ? 'Edit' : 'Add' }} Item</h3><button class="close-btn" (click)="showModal.set(false)"><span class="material-icons-round">close</span></button></div>
          <form [formGroup]="form" (ngSubmit)="save()" class="modal-body">
            <div class="grid2">
              <div class="field"><label>Item Name <span class="req">*</span></label><input formControlName="itemName" /></div>
              <div class="field"><label>Item Code</label><input formControlName="itemCode" placeholder="auto if blank" /></div>
              <div class="field"><label>Barcode</label><input formControlName="barcode" /></div>
              <div class="field"><label>Brand</label><input formControlName="brand" /></div>
              <div class="field"><label>Category <span class="req">*</span></label>
                <select formControlName="itemCategoryId">
                  <option [ngValue]="null">Select…</option>
                  @for (c of categories(); track c.itemCategoryId) { <option [ngValue]="c.itemCategoryId">{{ c.categoryName }}</option> }
                </select>
              </div>
              <div class="field"><label>Unit <span class="req">*</span></label>
                <select formControlName="unitId">
                  <option [ngValue]="null">Select…</option>
                  @for (u of units(); track u.unitId) { <option [ngValue]="u.unitId">{{ u.unitName }}</option> }
                </select>
              </div>
              <div class="field"><label>Sale Price <span class="req">*</span></label><input type="number" step="0.01" formControlName="salePrice" /></div>
              <div class="field"><label>Wholesale Price</label><input type="number" step="0.01" formControlName="wholesalePrice" /></div>
              <div class="field"><label>Minimum Sale Price</label><input type="number" step="0.01" formControlName="minimumSalePrice" /></div>
              <div class="field"><label>Tax %</label><input type="number" step="0.01" formControlName="taxPercentage" /></div>
              <div class="field"><label>Minimum Stock Level</label><input type="number" step="0.01" formControlName="minimumStockLevel" /></div>
              <div class="field"><label>Reorder Level</label><input type="number" step="0.01" formControlName="reorderLevel" /></div>
              @if (!editingId()) {
                <div class="field"><label>Opening Quantity</label><input type="number" step="0.01" formControlName="openingQuantity" /></div>
                <div class="field"><label>Opening Cost</label><input type="number" step="0.01" formControlName="openingCost" /></div>
              }
              @if (editingId()) {
                <div class="field"><label>Status</label><select formControlName="isActive"><option [ngValue]="true">Active</option><option [ngValue]="false">Inactive</option></select></div>
              }
            </div>
            <div class="field"><label>Description</label><textarea formControlName="description" rows="2"></textarea></div>
            @if (modalError()) { <div class="alert-err">{{ modalError() }}</div> }
            <div class="modal-ft">
              <button type="button" class="btn-secondary" (click)="showModal.set(false)">Cancel</button>
              <button type="submit" class="btn-primary" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save' }}</button>
            </div>
          </form>
        </div>
      </div>
    }

    <app-confirm-delete />
  `,
  styles: [`
    .filters { display:flex; gap:10px; margin-bottom:14px; }
    .search { flex:1; max-width:340px; padding:9px 12px; border:1.5px solid var(--border); border-radius:8px; font-size:13px; background:var(--surface); color:var(--t1); }
    .filters select { padding:9px 12px; border:1.5px solid var(--border); border-radius:8px; font-size:13px; background:var(--surface); color:var(--t1); }
    .card { background:var(--surface); border:1px solid var(--border); border-radius:14px; overflow:hidden; }
    .sub { font-size:11px; color:var(--t4); }
    td.low { color:#dc2626; font-weight:700; }
    .actions { display:flex; gap:2px; }
    .icon-btn { border:none; background:transparent; cursor:pointer; padding:6px; color:var(--t3); border-radius:6px; }
    .icon-btn:hover { color:var(--t1); background:var(--surface-2); }
    .icon-btn.danger:hover { color:#ef4444; background:rgba(239,68,68,.08); }
    .badge { padding:3px 9px; border-radius:12px; font-size:11.5px; font-weight:600; }
    .badge-green { background:var(--green-s); color:var(--green); }
    .badge-gray { background:var(--surface-2); color:var(--t4); }
    .empty { text-align:center; color:var(--t4); padding:32px 0; font-size:13px; }
    .overlay { position:fixed; inset:0; z-index:1000; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; padding:16px; overflow-y:auto; }
    .modal { background:var(--surface); border-radius:16px; width:100%; max-width:640px; margin:auto; }
    .modal-hd { display:flex; align-items:center; gap:12px; padding:16px 20px; border-bottom:1px solid var(--border); background:var(--surface-2); }
    .modal-hd h3 { font-size:15px; font-weight:700; margin:0; }
    .close-btn { margin-left:auto; border:none; background:transparent; cursor:pointer; color:var(--t4); padding:6px; border-radius:8px; }
    .modal-body { padding:20px; max-height:70vh; overflow-y:auto; }
    .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:0 14px; }
    .modal-ft { display:flex; justify-content:flex-end; gap:10px; padding-top:12px; border-top:1px solid var(--border); margin-top:4px; }
    .field { display:flex; flex-direction:column; gap:5px; margin-bottom:14px; }
    label { font-size:11px; font-weight:700; color:var(--t3); text-transform:uppercase; letter-spacing:.5px; }
    .req { color:var(--red); }
    input, select, textarea { padding:10px 12px; border:1.5px solid var(--border); border-radius:8px; font-size:13.5px; font-family:inherit; background:var(--surface); color:var(--t1); }
    .alert-err { background:#fee2e2; color:#dc2626; border:1px solid #dc2626; border-radius:8px; padding:10px 14px; font-size:13px; margin-bottom:10px; }
  `]
})
export class ItemsComponent implements OnInit {
  private svc = inject(InventoryService);
  private confirmDelete = inject(ConfirmDeleteService);
  private fb = inject(FormBuilder);

  items = signal<ItemDto[]>([]);
  categories = signal<ItemCategoryDto[]>([]);
  units = signal<UnitDto[]>([]);
  search = signal('');
  categoryFilter = signal('');
  showModal = signal(false);
  editingId = signal<number | null>(null);
  saving = signal(false);
  modalError = signal('');

  form = this.fb.group({
    itemName: ['', Validators.required],
    itemCode: [''],
    barcode: [''],
    brand: [''],
    itemCategoryId: [null as number | null, Validators.required],
    unitId: [null as number | null, Validators.required],
    description: [''],
    salePrice: [0, Validators.required],
    wholesalePrice: [null as number | null],
    minimumSalePrice: [null as number | null],
    taxPercentage: [0],
    minimumStockLevel: [0],
    reorderLevel: [0],
    openingQuantity: [0],
    openingCost: [0],
    isActive: [true]
  });

  ngOnInit() {
    this.svc.getCategories().subscribe(c => this.categories.set(c));
    this.svc.getUnits().subscribe(u => this.units.set(u));
    this.load();
  }

  load() {
    const catId = this.categoryFilter() ? Number(this.categoryFilter()) : undefined;
    this.svc.getItems(catId, this.search() || undefined).subscribe(i => this.items.set(i));
  }

  onSearch(v: string) { this.search.set(v); this.load(); }

  openAdd() {
    this.editingId.set(null);
    this.form.reset({ salePrice: 0, taxPercentage: 0, minimumStockLevel: 0, reorderLevel: 0, openingQuantity: 0, openingCost: 0, isActive: true });
    this.modalError.set(''); this.showModal.set(true);
  }

  openEdit(i: ItemDto) {
    this.editingId.set(i.itemId);
    this.form.reset({
      itemName: i.itemName, itemCode: i.itemCode, barcode: i.barcode ?? '', brand: i.brand ?? '',
      itemCategoryId: i.itemCategoryId, unitId: i.unitId, description: i.description ?? '',
      salePrice: i.salePrice, wholesalePrice: i.wholesalePrice ?? null, minimumSalePrice: i.minimumSalePrice ?? null,
      taxPercentage: i.taxPercentage, minimumStockLevel: i.minimumStockLevel, reorderLevel: i.reorderLevel,
      isActive: i.isActive
    });
    this.modalError.set(''); this.showModal.set(true);
  }

  save() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.saving.set(true); this.modalError.set('');
    const v = this.form.value;
    const id = this.editingId();

    const obs = id
      ? this.svc.updateItem(id, {
          itemCode: v.itemCode!, barcode: v.barcode || null, itemName: v.itemName!, itemCategoryId: v.itemCategoryId!,
          brand: v.brand || null, unitId: v.unitId!, description: v.description || null,
          minimumStockLevel: v.minimumStockLevel!, reorderLevel: v.reorderLevel!, salePrice: v.salePrice!,
          wholesalePrice: v.wholesalePrice, minimumSalePrice: v.minimumSalePrice, taxPercentage: v.taxPercentage!,
          isActive: v.isActive!
        })
      : this.svc.createItem({
          itemCode: v.itemCode || null, barcode: v.barcode || null, itemName: v.itemName!, itemCategoryId: v.itemCategoryId!,
          brand: v.brand || null, unitId: v.unitId!, description: v.description || null,
          minimumStockLevel: v.minimumStockLevel!, reorderLevel: v.reorderLevel!, salePrice: v.salePrice!,
          wholesalePrice: v.wholesalePrice, minimumSalePrice: v.minimumSalePrice, taxPercentage: v.taxPercentage!,
          openingQuantity: v.openingQuantity!, openingCost: v.openingCost!
        });

    obs.subscribe({
      next: () => { this.saving.set(false); this.showModal.set(false); this.load(); },
      error: (e: any) => { this.saving.set(false); this.modalError.set(e?.error?.error ?? 'Save failed.'); }
    });
  }

  deleteItem(i: ItemDto) {
    this.confirmDelete.open('Delete Item?', `This will remove <strong>${i.itemName}</strong>. Items with purchase/sales history should be deactivated instead.`,
      () => this.svc.deleteItem(i.itemId), () => this.load());
  }
}
