import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormArray, Validators } from '@angular/forms';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import { Checkbox } from 'primeng/checkbox';
import { Dialog } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { StockService } from '../../../core/services/stock.service';
import { InventoryService } from '../../../core/services/inventory.service';
import {
  CurrentStockDto, StockLedgerDto, StockAdjustmentDto, StockTransferDto, ItemDto, ADJUSTMENT_TYPES
} from '../../../core/models/inventory.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';

type Tab = 'current' | 'ledger' | 'adjustments' | 'transfers';

@Component({
  selector: 'app-stock',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, PageHeaderComponent, DatePickerComponent,
    Button, Select, InputText, InputNumber, Checkbox, Dialog, TableModule, IconField, InputIcon
  ],
  template: `
    <div class="os-page compact">
    <app-page-header [dense]="true" title="Stock Management" subtitle="Current balances, movement history, adjustments and transfers" routeUrl="/inventory/stock" />

    <div class="os-stage">
      <div class="os-stage-bar">
        <div class="os-seg" role="tablist" aria-label="Stock view">
          <button type="button" class="os-seg-btn" [class.active]="tab()==='current'" (click)="tab.set('current')">Current Stock</button>
          <button type="button" class="os-seg-btn" [class.active]="tab()==='ledger'" (click)="tab.set('ledger'); loadLedger()">Stock Ledger</button>
          <button type="button" class="os-seg-btn" [class.active]="tab()==='adjustments'" (click)="tab.set('adjustments')">Adjustments</button>
          <button type="button" class="os-seg-btn" [class.active]="tab()==='transfers'" (click)="tab.set('transfers')">Transfers</button>
        </div>
      </div>

    @if (tab() === 'current') {
      <div class="os-stage-bar">
        <div class="flex w-full flex-wrap items-center gap-3">
          <p-iconfield class="min-w-[220px] flex-1">
            <p-inputicon class="pi pi-search" />
            <input pInputText class="w-full" placeholder="Search item…" [value]="search()" (input)="onSearch($any($event.target).value)" />
          </p-iconfield>
          <label class="chk" for="stk-low">
            <p-checkbox inputId="stk-low" [binary]="true" [ngModel]="lowOnly()" (ngModelChange)="lowOnly.set($event)" />
            Low / reorder only
          </label>
        </div>
      </div>
      <div class="os-stage-body">
        <p-table [value]="filteredStock()" dataKey="itemId" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '44rem' }" [scrollable]="true">
          <ng-template #header>
            <tr><th>Code</th><th>Item</th><th>Category</th><th>On Hand</th><th>Reorder Lvl</th><th>Avg Cost</th><th>Stock Value</th></tr>
          </ng-template>
          <ng-template #body let-s>
            <tr>
              <td>{{ s.itemCode }}</td>
              <td>{{ s.itemName }}</td>
              <td>{{ s.categoryName }}</td>
              <td [class.low]="s.quantityOnHand <= s.reorderLevel">{{ s.quantityOnHand }}</td>
              <td>{{ s.reorderLevel }}</td>
              <td>{{ s.averageCost | number:'1.2-2' }}</td>
              <td>{{ s.stockValue | number:'1.2-2' }}</td>
            </tr>
          </ng-template>
          <ng-template #emptymessage><tr><td colspan="7" class="empty">No stock records.</td></tr></ng-template>
        </p-table>
      </div>
    }

    @if (tab() === 'ledger') {
      <div class="os-stage-bar">
        <div class="flex w-full flex-wrap items-center gap-3">
          <p-select
            class="w-full sm:w-72"
            [options]="ledgerItemOptions()"
            optionLabel="label"
            optionValue="value"
            [filter]="true"
            filterBy="label"
            appendTo="body"
            [ngModel]="ledgerItemId()"
            (ngModelChange)="ledgerItemId.set($event ?? ''); loadLedger()"
            ariaLabel="Item" />
        </div>
      </div>
      <div class="os-stage-body">
        <p-table [value]="ledger()" dataKey="stockLedgerId" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '56rem' }" [scrollable]="true">
          <ng-template #header>
            <tr><th>Date</th><th>Voucher</th><th>No</th><th>Item</th><th>Qty In</th><th>Qty Out</th><th>Balance</th><th>Cost</th><th>User</th></tr>
          </ng-template>
          <ng-template #body let-l>
            <tr>
              <td>{{ l.transactionDate | date:'short' }}</td>
              <td>{{ l.voucherType }}</td><td>{{ l.voucherNo }}</td><td>{{ l.itemName }}</td>
              <td class="in">{{ l.qtyIn || '' }}</td><td class="out">{{ l.qtyOut || '' }}</td>
              <td>{{ l.balance }}</td><td>{{ l.cost | number:'1.2-2' }}</td><td>{{ l.userName }}</td>
            </tr>
          </ng-template>
          <ng-template #emptymessage><tr><td colspan="9" class="empty">No ledger entries.</td></tr></ng-template>
        </p-table>
      </div>
    }

    @if (tab() === 'adjustments') {
      <div class="os-stage-bar">
        <div class="flex w-full items-center justify-end gap-3">
          <p-button label="New Adjustment" icon="pi pi-plus" (onClick)="openAdj()" />
        </div>
      </div>
      <div class="os-stage-body">
        <p-table [value]="adjustments()" dataKey="stockAdjustmentId" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '36rem' }" [scrollable]="true">
          <ng-template #header><tr><th>No</th><th>Date</th><th>Type</th><th>Lines</th><th>Remarks</th></tr></ng-template>
          <ng-template #body let-a>
            <tr><td>{{ a.adjustmentNo }}</td><td>{{ a.adjustmentDate }}</td><td>{{ a.adjustmentType }}</td><td>{{ a.details.length }}</td><td>{{ a.remarks || '—' }}</td></tr>
          </ng-template>
          <ng-template #emptymessage><tr><td colspan="5" class="empty">No adjustments recorded.</td></tr></ng-template>
        </p-table>
      </div>
    }

    @if (tab() === 'transfers') {
      <div class="os-stage-bar">
        <div class="flex w-full items-center justify-end gap-3">
          <p-button label="New Transfer" icon="pi pi-plus" (onClick)="openTrf()" />
        </div>
      </div>
      <div class="os-stage-body">
        <p-table [value]="transfers()" dataKey="stockTransferId" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '36rem' }" [scrollable]="true">
          <ng-template #header><tr><th>No</th><th>Date</th><th>From</th><th>To</th><th>Lines</th></tr></ng-template>
          <ng-template #body let-t>
            <tr><td>{{ t.transferNo }}</td><td>{{ t.transferDate }}</td><td>{{ t.fromLocation }}</td><td>{{ t.toLocation }}</td><td>{{ t.details.length }}</td></tr>
          </ng-template>
          <ng-template #emptymessage><tr><td colspan="5" class="empty">No transfers recorded.</td></tr></ng-template>
        </p-table>
      </div>
    }

    </div>
    </div>

    <!-- Adjustment Dialog -->
    <p-dialog
      header="New Stock Adjustment"
      [visible]="showAdj()"
      (visibleChange)="showAdj.set($event)"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
      [style]="{ width: '40rem' }"
      [breakpoints]="{ '640px': '96vw' }">
      <form [formGroup]="adjForm" (ngSubmit)="saveAdj()">
        <div class="grid grid-cols-1 gap-x-3.5 sm:grid-cols-2">
          <div class="field"><label>Date <span class="req">*</span></label><app-date-picker formControlName="adjustmentDate"/></div>
          <div class="field"><label>Type <span class="req">*</span></label>
            <p-select class="w-full" [options]="adjTypes" optionLabel="label" optionValue="value"
                      appendTo="body" [overlayOptions]="{ baseZIndex: 10050 }" formControlName="adjustmentType" />
          </div>
        </div>
        <div class="field"><label for="adj-remarks">Remarks</label><input pInputText id="adj-remarks" class="w-full" formControlName="remarks" /></div>
        <div class="w-full overflow-x-auto">
          <table class="lines-table" formArrayName="lines">
            <thead><tr><th>Item</th><th>Current Qty</th><th>New Qty</th></tr></thead>
            <tbody>
              @for (line of adjLines.controls; track $index; let i = $index) {
                <tr [formGroupName]="i">
                  <td class="min-w-[12rem]">
                    <p-select class="w-full" [options]="allItems()" optionLabel="itemName" optionValue="itemId"
                              placeholder="Select item…" [filter]="true" filterBy="itemName"
                              appendTo="body" [overlayOptions]="{ baseZIndex: 10050 }"
                              formControlName="itemId" (onChange)="onAdjItemChange(i)" />
                  </td>
                  <td>{{ currentQtyOf(line.value.itemId) }}</td>
                  <td><p-inputnumber styleClass="w-28" inputStyleClass="w-28" [minFractionDigits]="0" [maxFractionDigits]="2" formControlName="newQuantity" /></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <p-button type="button" class="add-line" label="Add Item" icon="pi pi-plus" severity="secondary" [outlined]="true" size="small" (onClick)="addAdjLine()" />
        @if (modalError()) { <div class="alert-err">{{ modalError() }}</div> }
      </form>
      <ng-template #footer>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <p-button label="Cancel" severity="secondary" [outlined]="true" (onClick)="showAdj.set(false)" />
          <p-button [label]="saving() ? 'Saving…' : 'Save'" icon="pi pi-check" [loading]="saving()" [disabled]="saving()" (onClick)="saveAdj()" />
        </div>
      </ng-template>
    </p-dialog>

    <!-- Transfer Dialog -->
    <p-dialog
      header="New Stock Transfer"
      [visible]="showTrf()"
      (visibleChange)="showTrf.set($event)"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
      [style]="{ width: '40rem' }"
      [breakpoints]="{ '640px': '96vw' }">
      <form [formGroup]="trfForm" (ngSubmit)="saveTrf()">
        <div class="grid grid-cols-1 gap-x-3.5 sm:grid-cols-2">
          <div class="field"><label>Date <span class="req">*</span></label><app-date-picker formControlName="transferDate"/></div>
          <div></div>
          <div class="field"><label for="trf-from">From Location <span class="req">*</span></label><input pInputText id="trf-from" class="w-full" formControlName="fromLocation" placeholder="e.g. Main Store" /></div>
          <div class="field"><label for="trf-to">To Location <span class="req">*</span></label><input pInputText id="trf-to" class="w-full" formControlName="toLocation" placeholder="e.g. Campus 2" /></div>
        </div>
        <div class="field"><label for="trf-remarks">Remarks</label><input pInputText id="trf-remarks" class="w-full" formControlName="remarks" /></div>
        <div class="w-full overflow-x-auto">
          <table class="lines-table" formArrayName="lines">
            <thead><tr><th>Item</th><th>Quantity</th></tr></thead>
            <tbody>
              @for (line of trfLines.controls; track $index; let i = $index) {
                <tr [formGroupName]="i">
                  <td class="min-w-[12rem]">
                    <p-select class="w-full" [options]="allItems()" optionLabel="itemName" optionValue="itemId"
                              placeholder="Select item…" [filter]="true" filterBy="itemName"
                              appendTo="body" [overlayOptions]="{ baseZIndex: 10050 }"
                              formControlName="itemId" />
                  </td>
                  <td><p-inputnumber styleClass="w-28" inputStyleClass="w-28" [minFractionDigits]="0" [maxFractionDigits]="2" formControlName="quantity" /></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <p-button type="button" class="add-line" label="Add Item" icon="pi pi-plus" severity="secondary" [outlined]="true" size="small" (onClick)="addTrfLine()" />
        @if (modalError()) { <div class="alert-err">{{ modalError() }}</div> }
      </form>
      <ng-template #footer>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <p-button label="Cancel" severity="secondary" [outlined]="true" (onClick)="showTrf.set(false)" />
          <p-button [label]="saving() ? 'Saving…' : 'Save'" icon="pi pi-check" [loading]="saving()" [disabled]="saving()" (onClick)="saveTrf()" />
        </div>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .chk { display:flex; align-items:center; gap:8px; font-size:12.5px; color:var(--t3); white-space:nowrap; }
    td.low { color:#dc2626; font-weight:700; }
    td.in { color:#059669; font-weight:600; }
    td.out { color:#dc2626; font-weight:600; }
    .empty { text-align:center; color:var(--t4); padding:32px 0; font-size:13px; }
    .field { display:flex; flex-direction:column; gap:5px; margin-bottom:14px; }
    .field > label { font-size:11px; font-weight:700; color:var(--t3); text-transform:uppercase; letter-spacing:.5px; }
    .req { color:var(--red); }
    .lines-table { width:100%; border-collapse:collapse; margin:10px 0; }
    .lines-table th { text-align:left; font-size:11px; text-transform:uppercase; color:var(--t4); padding:6px 8px; border-bottom:1px solid var(--border); }
    .lines-table td { padding:5px 8px; }
    .add-line { display:inline-block; margin-bottom:16px; }
    .alert-err { background:#fee2e2; color:#dc2626; border:1px solid #dc2626; border-radius:8px; padding:10px 14px; font-size:13px; margin-bottom:10px; }
  `]
})
export class StockComponent implements OnInit {
  private stockSvc = inject(StockService);
  private invSvc = inject(InventoryService);
  private fb = inject(FormBuilder);

  tab = signal<Tab>('current');
  adjTypes = [...ADJUSTMENT_TYPES];

  currentStock = signal<CurrentStockDto[]>([]);
  search = signal('');
  lowOnly = signal(false);

  ledger = signal<StockLedgerDto[]>([]);
  ledgerItemId = signal('');
  allItems = signal<ItemDto[]>([]);
  ledgerItemOptions = computed(() => [{ value: '', label: 'All Items' }, ...this.allItems().map(i => ({ value: String(i.itemId), label: i.itemName }))]);

  adjustments = signal<StockAdjustmentDto[]>([]);
  transfers = signal<StockTransferDto[]>([]);

  showAdj = signal(false);
  showTrf = signal(false);
  saving = signal(false);
  modalError = signal('');

  adjForm = this.fb.group({
    adjustmentDate: [new Date().toISOString().slice(0, 10), Validators.required],
    adjustmentType: ['Adjustment', Validators.required],
    remarks: [''],
    lines: this.fb.array([])
  });
  get adjLines() { return this.adjForm.get('lines') as FormArray; }

  trfForm = this.fb.group({
    transferDate: [new Date().toISOString().slice(0, 10), Validators.required],
    fromLocation: ['', Validators.required],
    toLocation: ['', Validators.required],
    remarks: [''],
    lines: this.fb.array([])
  });
  get trfLines() { return this.trfForm.get('lines') as FormArray; }

  ngOnInit() {
    this.invSvc.getItems(undefined, undefined, true).subscribe(i => this.allItems.set(i));
    this.loadCurrentStock();
    this.loadAdjustments();
    this.loadTransfers();
  }

  loadCurrentStock() { this.stockSvc.getCurrentStock().subscribe(s => this.currentStock.set(s)); }
  loadLedger() {
    const id = this.ledgerItemId() ? Number(this.ledgerItemId()) : undefined;
    this.stockSvc.getLedger(id).subscribe(l => this.ledger.set(l));
  }
  loadAdjustments() { this.stockSvc.getAdjustments().subscribe(a => this.adjustments.set(a)); }
  loadTransfers() { this.stockSvc.getTransfers().subscribe(t => this.transfers.set(t)); }

  onSearch(v: string) { this.search.set(v); }
  toggleLowOnly() { this.lowOnly.set(!this.lowOnly()); }
  filteredStock(): CurrentStockDto[] {
    let list = this.currentStock();
    if (this.search()) {
      const s = this.search().toLowerCase();
      list = list.filter(x => x.itemName.toLowerCase().includes(s) || x.itemCode.toLowerCase().includes(s));
    }
    if (this.lowOnly()) list = list.filter(x => x.quantityOnHand <= x.reorderLevel);
    return list;
  }

  currentQtyOf(itemId: number | null): number {
    if (!itemId) return 0;
    return this.currentStock().find(s => s.itemId === itemId)?.quantityOnHand ?? 0;
  }

  // ── Adjustments ──────────────────────────────────────────────────────────
  newAdjLine() { return this.fb.group({ itemId: [null as number | null, Validators.required], newQuantity: [0, Validators.required] }); }
  addAdjLine() { this.adjLines.push(this.newAdjLine()); }
  onAdjItemChange(i: number) {
    const itemId = this.adjLines.at(i).value.itemId;
    this.adjLines.at(i).patchValue({ newQuantity: this.currentQtyOf(itemId) });
  }
  openAdj() {
    this.adjForm.reset({ adjustmentDate: new Date().toISOString().slice(0, 10), adjustmentType: 'Adjustment' });
    this.adjLines.clear(); this.addAdjLine();
    this.modalError.set(''); this.showAdj.set(true);
  }
  saveAdj() {
    this.adjForm.markAllAsTouched();
    if (this.adjForm.invalid || this.adjLines.length === 0) { this.modalError.set('Add at least one line.'); return; }
    this.saving.set(true); this.modalError.set('');
    const v = this.adjForm.value;
    this.stockSvc.createAdjustment({
      adjustmentDate: v.adjustmentDate!, adjustmentType: v.adjustmentType as any, remarks: v.remarks || null,
      lines: (v.lines as any[]).map(l => ({ itemId: l.itemId, newQuantity: l.newQuantity }))
    }).subscribe({
      next: () => { this.saving.set(false); this.showAdj.set(false); this.loadAdjustments(); this.loadCurrentStock(); },
      error: (e: any) => { this.saving.set(false); this.modalError.set(e?.error?.error ?? 'Save failed.'); }
    });
  }

  // ── Transfers ────────────────────────────────────────────────────────────
  newTrfLine() { return this.fb.group({ itemId: [null as number | null, Validators.required], quantity: [1, Validators.required] }); }
  addTrfLine() { this.trfLines.push(this.newTrfLine()); }
  openTrf() {
    this.trfForm.reset({ transferDate: new Date().toISOString().slice(0, 10) });
    this.trfLines.clear(); this.addTrfLine();
    this.modalError.set(''); this.showTrf.set(true);
  }
  saveTrf() {
    this.trfForm.markAllAsTouched();
    if (this.trfForm.invalid || this.trfLines.length === 0) { this.modalError.set('Add at least one line.'); return; }
    this.saving.set(true); this.modalError.set('');
    const v = this.trfForm.value;
    this.stockSvc.createTransfer({
      transferDate: v.transferDate!, fromLocation: v.fromLocation!, toLocation: v.toLocation!, remarks: v.remarks || null,
      lines: (v.lines as any[]).map(l => ({ itemId: l.itemId, quantity: l.quantity }))
    }).subscribe({
      next: () => { this.saving.set(false); this.showTrf.set(false); this.loadTransfers(); },
      error: (e: any) => { this.saving.set(false); this.modalError.set(e?.error?.error ?? 'Save failed.'); }
    });
  }
}
