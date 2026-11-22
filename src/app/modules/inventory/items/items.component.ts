import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators } from '@angular/forms';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import { Textarea } from 'primeng/textarea';
import { Tag } from 'primeng/tag';
import { Dialog } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { Tooltip } from 'primeng/tooltip';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InventoryService } from '../../../core/services/inventory.service';
import { ItemDto, ItemCategoryDto, UnitDto } from '../../../core/models/inventory.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ConfirmDeleteComponent } from '../../../shared/components/confirm-delete/confirm-delete.component';
import { ConfirmDeleteService } from '../../../shared/components/confirm-delete/confirm-delete.service';

@Component({
  selector: 'app-items',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, PageHeaderComponent, ConfirmDeleteComponent,
    Button, Select, InputText, InputNumber, Textarea, Tag, Dialog, TableModule, Tooltip, IconField, InputIcon
  ],
  template: `
    <div class="os-page compact">
    <app-page-header [dense]="true" title="Item Master" subtitle="Books, stationery, uniforms and every other sellable item" routeUrl="/inventory/items">
      <p-button label="Add Item" icon="pi pi-plus" (onClick)="openAdd()" />
    </app-page-header>

    <div class="os-stage">
      <div class="os-stage-bar">
        <div class="flex w-full flex-wrap items-center gap-3">
          <p-iconfield class="min-w-[220px] flex-1">
            <p-inputicon class="pi pi-search" />
            <input pInputText class="w-full" placeholder="Search by name, code or barcode…" [value]="search()" (input)="onSearch($any($event.target).value)" />
          </p-iconfield>
          <p-select
            class="w-full sm:w-64"
            [options]="categoryOptions()"
            optionLabel="label"
            optionValue="value"
            [ngModel]="categoryFilter()"
            (ngModelChange)="categoryFilter.set($event ?? ''); load()"
            placeholder="All Categories"
            appendTo="body"
            ariaLabel="Category" />
        </div>
      </div>

      <div class="os-stage-body">
        <p-table [value]="items()" dataKey="itemId" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '52rem' }" [scrollable]="true">
          <ng-template #header>
            <tr><th>Code</th><th>Name</th><th>Category</th><th>Unit</th><th>Stock</th><th>Sale Price</th><th>Status</th><th class="text-right">Actions</th></tr>
          </ng-template>
          <ng-template #body let-i>
            <tr>
              <td>{{ i.itemCode }}</td>
              <td><strong>{{ i.itemName }}</strong>@if (i.barcode) { <div class="sub">{{ i.barcode }}</div> }</td>
              <td>{{ i.categoryName }}</td>
              <td>{{ i.unitName }}</td>
              <td [class.low]="i.quantityOnHand <= i.reorderLevel">{{ i.quantityOnHand }}</td>
              <td>{{ i.salePrice | number:'1.2-2' }}</td>
              <td><p-tag [value]="i.isActive ? 'Active' : 'Inactive'" [severity]="i.isActive ? 'success' : 'secondary'" [rounded]="true" /></td>
              <td>
                <div class="flex items-center justify-end gap-1 whitespace-nowrap">
                  <p-button icon="pi pi-pencil" [text]="true" [rounded]="true" size="small" severity="secondary" ariaLabel="Edit" pTooltip="Edit" (onClick)="openEdit(i)" />
                  <p-button icon="pi pi-trash" [text]="true" [rounded]="true" size="small" severity="danger" ariaLabel="Delete" pTooltip="Delete" (onClick)="deleteItem(i)" />
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template #emptymessage>
            <tr><td colspan="8" class="empty">No items found.</td></tr>
          </ng-template>
        </p-table>
      </div>
    </div>
    </div>

    <p-dialog
      [header]="(editingId() ? 'Edit' : 'Add') + ' Item'"
      [visible]="showModal()"
      (visibleChange)="showModal.set($event)"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
      [style]="{ width: '40rem' }"
      [breakpoints]="{ '640px': '96vw' }">
      <form [formGroup]="form" (ngSubmit)="save()">
        <div class="grid grid-cols-1 gap-x-3.5 sm:grid-cols-2">
          <div class="field"><label for="it-name">Item Name <span class="req">*</span></label><input pInputText id="it-name" class="w-full" formControlName="itemName" /></div>
          <div class="field"><label for="it-code">Item Code</label><input pInputText id="it-code" class="w-full" formControlName="itemCode" placeholder="auto if blank" /></div>
          <div class="field"><label for="it-barcode">Barcode</label><input pInputText id="it-barcode" class="w-full" formControlName="barcode" /></div>
          <div class="field"><label for="it-brand">Brand</label><input pInputText id="it-brand" class="w-full" formControlName="brand" /></div>
          <div class="field"><label>Category <span class="req">*</span></label>
            <p-select class="w-full" [options]="categories()" optionLabel="categoryName" optionValue="itemCategoryId"
                      placeholder="Select…" [filter]="true" appendTo="body" [overlayOptions]="{ baseZIndex: 10050 }"
                      formControlName="itemCategoryId" />
          </div>
          <div class="field"><label>Unit <span class="req">*</span></label>
            <p-select class="w-full" [options]="units()" optionLabel="unitName" optionValue="unitId"
                      placeholder="Select…" appendTo="body" [overlayOptions]="{ baseZIndex: 10050 }"
                      formControlName="unitId" />
          </div>
          <div class="field"><label for="it-sale">Sale Price <span class="req">*</span></label><p-inputnumber inputId="it-sale" styleClass="w-full" inputStyleClass="w-full" [minFractionDigits]="0" [maxFractionDigits]="2" formControlName="salePrice" /></div>
          <div class="field"><label for="it-whole">Wholesale Price</label><p-inputnumber inputId="it-whole" styleClass="w-full" inputStyleClass="w-full" [minFractionDigits]="0" [maxFractionDigits]="2" formControlName="wholesalePrice" /></div>
          <div class="field"><label for="it-min">Minimum Sale Price</label><p-inputnumber inputId="it-min" styleClass="w-full" inputStyleClass="w-full" [minFractionDigits]="0" [maxFractionDigits]="2" formControlName="minimumSalePrice" /></div>
          <div class="field"><label for="it-tax">Tax %</label><p-inputnumber inputId="it-tax" styleClass="w-full" inputStyleClass="w-full" [minFractionDigits]="0" [maxFractionDigits]="2" formControlName="taxPercentage" /></div>
          <div class="field"><label for="it-msl">Minimum Stock Level</label><p-inputnumber inputId="it-msl" styleClass="w-full" inputStyleClass="w-full" [minFractionDigits]="0" [maxFractionDigits]="2" formControlName="minimumStockLevel" /></div>
          <div class="field"><label for="it-rl">Reorder Level</label><p-inputnumber inputId="it-rl" styleClass="w-full" inputStyleClass="w-full" [minFractionDigits]="0" [maxFractionDigits]="2" formControlName="reorderLevel" /></div>
          @if (!editingId()) {
            <div class="field"><label for="it-oq">Opening Quantity</label><p-inputnumber inputId="it-oq" styleClass="w-full" inputStyleClass="w-full" [minFractionDigits]="0" [maxFractionDigits]="2" formControlName="openingQuantity" /></div>
            <div class="field"><label for="it-oc">Opening Cost</label><p-inputnumber inputId="it-oc" styleClass="w-full" inputStyleClass="w-full" [minFractionDigits]="0" [maxFractionDigits]="2" formControlName="openingCost" /></div>
          }
          @if (editingId()) {
            <div class="field"><label>Status</label>
              <p-select class="w-full" [options]="statusOptions" optionLabel="label" optionValue="value"
                        appendTo="body" [overlayOptions]="{ baseZIndex: 10050 }" formControlName="isActive" />
            </div>
          }
        </div>
        <div class="field"><label for="it-desc">Description</label><textarea pTextarea id="it-desc" class="w-full" formControlName="description" rows="2"></textarea></div>
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
    .sub { font-size:11px; color:var(--t4); }
    td.low { color:#dc2626; font-weight:700; }
    .empty { text-align:center; color:var(--t4); padding:32px 0; font-size:13px; }
    .field { display:flex; flex-direction:column; gap:5px; margin-bottom:14px; }
    label { font-size:11px; font-weight:700; color:var(--t3); text-transform:uppercase; letter-spacing:.5px; }
    .req { color:var(--red); }
    .alert-err { background:#fee2e2; color:#dc2626; border:1px solid #dc2626; border-radius:8px; padding:10px 14px; font-size:13px; margin-bottom:10px; }
  `]
})
export class ItemsComponent implements OnInit {
  private svc = inject(InventoryService);
  private confirmDelete = inject(ConfirmDeleteService);
  private fb = inject(FormBuilder);

  statusOptions = [{ label: 'Active', value: true }, { label: 'Inactive', value: false }];
  items = signal<ItemDto[]>([]);
  categories = signal<ItemCategoryDto[]>([]);
  units = signal<UnitDto[]>([]);
  search = signal('');
  categoryFilter = signal('');
  showModal = signal(false);
  editingId = signal<number | null>(null);
  saving = signal(false);
  modalError = signal('');

  // Options for app-os-select. Values stay STRINGS so categoryFilter remains a
  // string signal and load()'s existing `Number(...)` / falsy-'' handling is
  // untouched. Derived from the same categories() signal the old select used.
  categoryOptions = computed<{ value: string; label: string }[]>(() => [
    { value: '', label: 'All Categories' },
    ...this.categories().map(c => ({ value: String(c.itemCategoryId), label: c.categoryName }))
  ]);

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
