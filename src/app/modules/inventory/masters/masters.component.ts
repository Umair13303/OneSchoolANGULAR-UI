import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import { Tag } from 'primeng/tag';
import { Dialog } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { Tooltip } from 'primeng/tooltip';
import { InventoryService } from '../../../core/services/inventory.service';
import { ItemCategoryDto, UnitDto, TaxDto } from '../../../core/models/inventory.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ConfirmDeleteComponent } from '../../../shared/components/confirm-delete/confirm-delete.component';
import { ConfirmDeleteService } from '../../../shared/components/confirm-delete/confirm-delete.service';

type Tab = 'categories' | 'units' | 'taxes';

@Component({
  selector: 'app-inventory-masters',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, PageHeaderComponent, ConfirmDeleteComponent,
    Button, Select, InputText, InputNumber, Tag, Dialog, TableModule, Tooltip
  ],
  template: `
    <div class="os-page compact">
    <app-page-header [dense]="true" title="Categories, Units &amp; Tax" subtitle="Shared lookup data used by Item Master and POS" routeUrl="/inventory/masters" />

    <div class="os-stage">
      <div class="os-stage-bar">
        <div class="os-seg" role="tablist" aria-label="Master data">
          <button type="button" class="os-seg-btn" [class.active]="tab()==='categories'" (click)="tab.set('categories')">Categories</button>
          <button type="button" class="os-seg-btn" [class.active]="tab()==='units'" (click)="tab.set('units')">Units</button>
          <button type="button" class="os-seg-btn" [class.active]="tab()==='taxes'" (click)="tab.set('taxes')">Tax Rates</button>
        </div>
      </div>

    @if (tab() === 'categories') {
      <div class="os-stage-bar">
        <div class="flex w-full flex-wrap items-center justify-between gap-3">
          <div class="tab-head"><h3>Item Categories</h3><p>{{ categories().length }} categories</p></div>
          <p-button label="Add Category" icon="pi pi-plus" (onClick)="openCat()" />
        </div>
      </div>
      <div class="os-stage-body">
        <p-table [value]="categories()" dataKey="itemCategoryId" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '28rem' }" [scrollable]="true">
          <ng-template #header><tr><th>Name</th><th>Items</th><th>Status</th><th class="text-right">Actions</th></tr></ng-template>
          <ng-template #body let-c>
            <tr>
              <td><strong>{{ c.categoryName }}</strong></td>
              <td>{{ c.itemCount }}</td>
              <td><p-tag [value]="c.isActive ? 'Active' : 'Inactive'" [severity]="c.isActive ? 'success' : 'secondary'" [rounded]="true" /></td>
              <td>
                <div class="flex items-center justify-end gap-1 whitespace-nowrap">
                  <p-button icon="pi pi-pencil" [text]="true" [rounded]="true" size="small" severity="secondary" ariaLabel="Edit" pTooltip="Edit" (onClick)="openCat(c)" />
                  <p-button icon="pi pi-trash" [text]="true" [rounded]="true" size="small" severity="danger" ariaLabel="Delete" pTooltip="Delete" (onClick)="deleteCat(c)" />
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template #emptymessage><tr><td colspan="4" class="empty">No categories yet.</td></tr></ng-template>
        </p-table>
      </div>
    }

    @if (tab() === 'units') {
      <div class="os-stage-bar">
        <div class="flex w-full flex-wrap items-center justify-between gap-3">
          <div class="tab-head"><h3>Units of Measure</h3><p>{{ units().length }} units</p></div>
          <p-button label="Add Unit" icon="pi pi-plus" (onClick)="openUnit()" />
        </div>
      </div>
      <div class="os-stage-body">
        <p-table [value]="units()" dataKey="unitId" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '28rem' }" [scrollable]="true">
          <ng-template #header><tr><th>Name</th><th>Short</th><th>Status</th><th class="text-right">Actions</th></tr></ng-template>
          <ng-template #body let-u>
            <tr>
              <td><strong>{{ u.unitName }}</strong></td>
              <td>{{ u.shortName }}</td>
              <td><p-tag [value]="u.isActive ? 'Active' : 'Inactive'" [severity]="u.isActive ? 'success' : 'secondary'" [rounded]="true" /></td>
              <td>
                <div class="flex items-center justify-end gap-1 whitespace-nowrap">
                  <p-button icon="pi pi-pencil" [text]="true" [rounded]="true" size="small" severity="secondary" ariaLabel="Edit" pTooltip="Edit" (onClick)="openUnit(u)" />
                  <p-button icon="pi pi-trash" [text]="true" [rounded]="true" size="small" severity="danger" ariaLabel="Delete" pTooltip="Delete" (onClick)="deleteUnit(u)" />
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template #emptymessage><tr><td colspan="4" class="empty">No units yet.</td></tr></ng-template>
        </p-table>
      </div>
    }

    @if (tab() === 'taxes') {
      <div class="os-stage-bar">
        <div class="flex w-full flex-wrap items-center justify-between gap-3">
          <div class="tab-head"><h3>Tax Rates</h3><p>{{ taxes().length }} rates</p></div>
          <p-button label="Add Tax Rate" icon="pi pi-plus" (onClick)="openTax()" />
        </div>
      </div>
      <div class="os-stage-body">
        <p-table [value]="taxes()" dataKey="taxId" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '28rem' }" [scrollable]="true">
          <ng-template #header><tr><th>Name</th><th>Percentage</th><th>Status</th><th class="text-right">Actions</th></tr></ng-template>
          <ng-template #body let-t>
            <tr>
              <td><strong>{{ t.taxName }}</strong></td>
              <td>{{ t.taxPercentage }}%</td>
              <td><p-tag [value]="t.isActive ? 'Active' : 'Inactive'" [severity]="t.isActive ? 'success' : 'secondary'" [rounded]="true" /></td>
              <td>
                <div class="flex items-center justify-end gap-1 whitespace-nowrap">
                  <p-button icon="pi pi-pencil" [text]="true" [rounded]="true" size="small" severity="secondary" ariaLabel="Edit" pTooltip="Edit" (onClick)="openTax(t)" />
                  <p-button icon="pi pi-trash" [text]="true" [rounded]="true" size="small" severity="danger" ariaLabel="Delete" pTooltip="Delete" (onClick)="deleteTax(t)" />
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template #emptymessage><tr><td colspan="4" class="empty">No tax rates yet.</td></tr></ng-template>
        </p-table>
      </div>
    }

    </div>
    </div>

    <!-- Category Dialog -->
    <p-dialog
      [header]="(editingId() ? 'Edit' : 'Add') + ' Category'"
      [visible]="showCat()"
      (visibleChange)="showCat.set($event)"
      [modal]="true" [draggable]="false" [resizable]="false" [dismissableMask]="true"
      [style]="{ width: '26rem' }" [breakpoints]="{ '640px': '96vw' }">
      <form [formGroup]="catForm" (ngSubmit)="saveCat()">
        <div class="field"><label for="cat-name">Category Name <span class="req">*</span></label><input pInputText id="cat-name" class="w-full" formControlName="categoryName" /></div>
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
          <p-button label="Cancel" severity="secondary" [outlined]="true" (onClick)="showCat.set(false)" />
          <p-button [label]="saving() ? 'Saving…' : 'Save'" icon="pi pi-check" [loading]="saving()" [disabled]="saving()" (onClick)="saveCat()" />
        </div>
      </ng-template>
    </p-dialog>

    <!-- Unit Dialog -->
    <p-dialog
      [header]="(editingId() ? 'Edit' : 'Add') + ' Unit'"
      [visible]="showUnit()"
      (visibleChange)="showUnit.set($event)"
      [modal]="true" [draggable]="false" [resizable]="false" [dismissableMask]="true"
      [style]="{ width: '26rem' }" [breakpoints]="{ '640px': '96vw' }">
      <form [formGroup]="unitForm" (ngSubmit)="saveUnit()">
        <div class="field"><label for="unit-name">Unit Name <span class="req">*</span></label><input pInputText id="unit-name" class="w-full" formControlName="unitName" placeholder="e.g. Piece" /></div>
        <div class="field"><label for="unit-short">Short Name <span class="req">*</span></label><input pInputText id="unit-short" class="w-full" formControlName="shortName" placeholder="e.g. Pc" /></div>
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
          <p-button label="Cancel" severity="secondary" [outlined]="true" (onClick)="showUnit.set(false)" />
          <p-button [label]="saving() ? 'Saving…' : 'Save'" icon="pi pi-check" [loading]="saving()" [disabled]="saving()" (onClick)="saveUnit()" />
        </div>
      </ng-template>
    </p-dialog>

    <!-- Tax Dialog -->
    <p-dialog
      [header]="(editingId() ? 'Edit' : 'Add') + ' Tax Rate'"
      [visible]="showTax()"
      (visibleChange)="showTax.set($event)"
      [modal]="true" [draggable]="false" [resizable]="false" [dismissableMask]="true"
      [style]="{ width: '26rem' }" [breakpoints]="{ '640px': '96vw' }">
      <form [formGroup]="taxForm" (ngSubmit)="saveTax()">
        <div class="field"><label for="tax-name">Tax Name <span class="req">*</span></label><input pInputText id="tax-name" class="w-full" formControlName="taxName" placeholder="e.g. GST" /></div>
        <div class="field"><label for="tax-pct">Percentage <span class="req">*</span></label>
          <p-inputnumber inputId="tax-pct" styleClass="w-full" inputStyleClass="w-full" suffix="%" [minFractionDigits]="0" [maxFractionDigits]="2" formControlName="taxPercentage" />
        </div>
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
          <p-button label="Cancel" severity="secondary" [outlined]="true" (onClick)="showTax.set(false)" />
          <p-button [label]="saving() ? 'Saving…' : 'Save'" icon="pi pi-check" [loading]="saving()" [disabled]="saving()" (onClick)="saveTax()" />
        </div>
      </ng-template>
    </p-dialog>

    <app-confirm-delete />
  `,
  styles: [`
    .tab-head h3 { font-size:15px; font-weight:700; color:var(--t1); margin:0; }
    .tab-head p { font-size:12px; color:var(--t4); margin:2px 0 0; }
    .empty { text-align:center; color:var(--t4); padding:32px 0; font-size:13px; }
    .field { display:flex; flex-direction:column; gap:5px; margin-bottom:14px; }
    .field > label { font-size:11px; font-weight:700; color:var(--t3); text-transform:uppercase; letter-spacing:.5px; }
    .req { color:var(--red); }
    .alert-err { background:#fee2e2; color:#dc2626; border:1px solid #dc2626; border-radius:8px; padding:10px 14px; font-size:13px; margin-bottom:10px; }
  `]
})
export class InventoryMastersComponent implements OnInit {
  private svc = inject(InventoryService);
  private confirmDelete = inject(ConfirmDeleteService);
  private fb = inject(FormBuilder);

  statusOptions = [{ label: 'Active', value: true }, { label: 'Inactive', value: false }];
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
