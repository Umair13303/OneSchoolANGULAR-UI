import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormArray, Validators } from '@angular/forms';
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
  imports: [CommonModule, ReactiveFormsModule, PageHeaderComponent, DatePickerComponent],
  template: `
    <app-page-header title="Stock Management" subtitle="Current balances, movement history, adjustments and transfers" />

    <div class="tabs">
      <button class="tab" [class.active]="tab()==='current'" (click)="tab.set('current')">Current Stock</button>
      <button class="tab" [class.active]="tab()==='ledger'" (click)="tab.set('ledger'); loadLedger()">Stock Ledger</button>
      <button class="tab" [class.active]="tab()==='adjustments'" (click)="tab.set('adjustments')">Adjustments</button>
      <button class="tab" [class.active]="tab()==='transfers'" (click)="tab.set('transfers')">Transfers</button>
    </div>

    @if (tab() === 'current') {
      <div class="filters">
        <input class="search" placeholder="Search item…" [value]="search()" (input)="onSearch($any($event.target).value)" />
        <label class="chk"><input type="checkbox" [checked]="lowOnly()" (change)="toggleLowOnly()" /> Low / reorder only</label>
      </div>
      <div class="card">
        <table class="table">
          <thead><tr><th>Code</th><th>Item</th><th>Category</th><th>On Hand</th><th>Reorder Lvl</th><th>Avg Cost</th><th>Stock Value</th></tr></thead>
          <tbody>
            @for (s of filteredStock(); track s.itemId) {
              <tr>
                <td>{{ s.itemCode }}</td>
                <td>{{ s.itemName }}</td>
                <td>{{ s.categoryName }}</td>
                <td [class.low]="s.quantityOnHand <= s.reorderLevel">{{ s.quantityOnHand }}</td>
                <td>{{ s.reorderLevel }}</td>
                <td>{{ s.averageCost | number:'1.2-2' }}</td>
                <td>{{ s.stockValue | number:'1.2-2' }}</td>
              </tr>
            }
            @if (!filteredStock().length) { <tr><td colspan="7" class="empty">No stock records.</td></tr> }
          </tbody>
        </table>
      </div>
    }

    @if (tab() === 'ledger') {
      <div class="filters">
        <select [value]="ledgerItemId()" (change)="ledgerItemId.set($any($event.target).value); loadLedger()">
          <option value="">All Items</option>
          @for (i of allItems(); track i.itemId) { <option [value]="i.itemId">{{ i.itemName }}</option> }
        </select>
      </div>
      <div class="card">
        <table class="table">
          <thead><tr><th>Date</th><th>Voucher</th><th>No</th><th>Item</th><th>Qty In</th><th>Qty Out</th><th>Balance</th><th>Cost</th><th>User</th></tr></thead>
          <tbody>
            @for (l of ledger(); track l.stockLedgerId) {
              <tr>
                <td>{{ l.transactionDate | date:'short' }}</td>
                <td>{{ l.voucherType }}</td><td>{{ l.voucherNo }}</td><td>{{ l.itemName }}</td>
                <td class="in">{{ l.qtyIn || '' }}</td><td class="out">{{ l.qtyOut || '' }}</td>
                <td>{{ l.balance }}</td><td>{{ l.cost | number:'1.2-2' }}</td><td>{{ l.userName }}</td>
              </tr>
            }
            @if (!ledger().length) { <tr><td colspan="9" class="empty">No ledger entries.</td></tr> }
          </tbody>
        </table>
      </div>
    }

    @if (tab() === 'adjustments') {
      <div class="toolbar"><button class="btn-primary" (click)="openAdj()"><span class="material-icons-round">add</span> New Adjustment</button></div>
      <div class="card">
        <table class="table">
          <thead><tr><th>No</th><th>Date</th><th>Type</th><th>Lines</th><th>Remarks</th></tr></thead>
          <tbody>
            @for (a of adjustments(); track a.stockAdjustmentId) {
              <tr><td>{{ a.adjustmentNo }}</td><td>{{ a.adjustmentDate }}</td><td>{{ a.adjustmentType }}</td><td>{{ a.details.length }}</td><td>{{ a.remarks || '—' }}</td></tr>
            }
            @if (!adjustments().length) { <tr><td colspan="5" class="empty">No adjustments recorded.</td></tr> }
          </tbody>
        </table>
      </div>
    }

    @if (tab() === 'transfers') {
      <div class="toolbar"><button class="btn-primary" (click)="openTrf()"><span class="material-icons-round">add</span> New Transfer</button></div>
      <div class="card">
        <table class="table">
          <thead><tr><th>No</th><th>Date</th><th>From</th><th>To</th><th>Lines</th></tr></thead>
          <tbody>
            @for (t of transfers(); track t.stockTransferId) {
              <tr><td>{{ t.transferNo }}</td><td>{{ t.transferDate }}</td><td>{{ t.fromLocation }}</td><td>{{ t.toLocation }}</td><td>{{ t.details.length }}</td></tr>
            }
            @if (!transfers().length) { <tr><td colspan="5" class="empty">No transfers recorded.</td></tr> }
          </tbody>
        </table>
      </div>
    }

    <!-- Adjustment Modal -->
    @if (showAdj()) {
      <div class="overlay" (click)="showAdj.set(false)">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-hd"><h3>New Stock Adjustment</h3><button class="close-btn" (click)="showAdj.set(false)"><span class="material-icons-round">close</span></button></div>
          <form [formGroup]="adjForm" (ngSubmit)="saveAdj()" class="modal-body">
            <div class="grid2">
              <div class="field"><label>Date <span class="req">*</span></label><app-date-picker formControlName="adjustmentDate"/></div>
              <div class="field"><label>Type <span class="req">*</span></label>
                <select formControlName="adjustmentType">
                  @for (t of adjTypes; track t.value) { <option [value]="t.value">{{ t.label }}</option> }
                </select>
              </div>
            </div>
            <div class="field"><label>Remarks</label><input formControlName="remarks" /></div>
            <table class="lines-table" formArrayName="lines">
              <thead><tr><th>Item</th><th>Current Qty</th><th>New Qty</th></tr></thead>
              <tbody>
                @for (line of adjLines.controls; track $index; let i = $index) {
                  <tr [formGroupName]="i">
                    <td>
                      <select formControlName="itemId" (change)="onAdjItemChange(i)">
                        <option [ngValue]="null">Select item…</option>
                        @for (it of allItems(); track it.itemId) { <option [ngValue]="it.itemId">{{ it.itemName }}</option> }
                      </select>
                    </td>
                    <td>{{ currentQtyOf(line.value.itemId) }}</td>
                    <td><input type="number" step="0.01" formControlName="newQuantity" class="num" /></td>
                  </tr>
                }
              </tbody>
            </table>
            <button type="button" class="btn-secondary add-line" (click)="addAdjLine()"><span class="material-icons-round">add</span> Add Item</button>
            @if (modalError()) { <div class="alert-err">{{ modalError() }}</div> }
            <div class="modal-ft"><button type="button" class="btn-secondary" (click)="showAdj.set(false)">Cancel</button><button type="submit" class="btn-primary" [disabled]="saving()">Save</button></div>
          </form>
        </div>
      </div>
    }

    <!-- Transfer Modal -->
    @if (showTrf()) {
      <div class="overlay" (click)="showTrf.set(false)">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-hd"><h3>New Stock Transfer</h3><button class="close-btn" (click)="showTrf.set(false)"><span class="material-icons-round">close</span></button></div>
          <form [formGroup]="trfForm" (ngSubmit)="saveTrf()" class="modal-body">
            <div class="grid2">
              <div class="field"><label>Date <span class="req">*</span></label><app-date-picker formControlName="transferDate"/></div>
            </div>
            <div class="grid2">
              <div class="field"><label>From Location <span class="req">*</span></label><input formControlName="fromLocation" placeholder="e.g. Main Store" /></div>
              <div class="field"><label>To Location <span class="req">*</span></label><input formControlName="toLocation" placeholder="e.g. Campus 2" /></div>
            </div>
            <div class="field"><label>Remarks</label><input formControlName="remarks" /></div>
            <table class="lines-table" formArrayName="lines">
              <thead><tr><th>Item</th><th>Quantity</th></tr></thead>
              <tbody>
                @for (line of trfLines.controls; track $index; let i = $index) {
                  <tr [formGroupName]="i">
                    <td>
                      <select formControlName="itemId">
                        <option [ngValue]="null">Select item…</option>
                        @for (it of allItems(); track it.itemId) { <option [ngValue]="it.itemId">{{ it.itemName }}</option> }
                      </select>
                    </td>
                    <td><input type="number" step="0.01" formControlName="quantity" class="num" /></td>
                  </tr>
                }
              </tbody>
            </table>
            <button type="button" class="btn-secondary add-line" (click)="addTrfLine()"><span class="material-icons-round">add</span> Add Item</button>
            @if (modalError()) { <div class="alert-err">{{ modalError() }}</div> }
            <div class="modal-ft"><button type="button" class="btn-secondary" (click)="showTrf.set(false)">Cancel</button><button type="submit" class="btn-primary" [disabled]="saving()">Save</button></div>
          </form>
        </div>
      </div>
    }
  `,
  styles: [`
    .tabs { display:flex; gap:6px; margin-bottom:16px; border-bottom:1px solid var(--border); }
    .tab { padding:10px 16px; border:none; background:transparent; cursor:pointer; font-size:13px; font-weight:600; color:var(--t4); border-bottom:2px solid transparent; }
    .tab.active { color:var(--accent); border-bottom-color:var(--accent); }
    .filters { display:flex; gap:12px; align-items:center; margin-bottom:14px; }
    .search { flex:1; max-width:300px; padding:9px 12px; border:1.5px solid var(--border); border-radius:8px; font-size:13px; background:var(--surface); color:var(--t1); }
    .filters select { padding:9px 12px; border:1.5px solid var(--border); border-radius:8px; font-size:13px; background:var(--surface); color:var(--t1); }
    .chk { display:flex; align-items:center; gap:6px; font-size:12.5px; color:var(--t3); }
    .toolbar { margin-bottom:14px; }
    .card { background:var(--surface); border:1px solid var(--border); border-radius:14px; overflow:hidden; }
    td.low { color:#dc2626; font-weight:700; }
    td.in { color:#059669; font-weight:600; }
    td.out { color:#dc2626; font-weight:600; }
    .empty { text-align:center; color:var(--t4); padding:32px 0; font-size:13px; }
    .overlay { position:fixed; inset:0; z-index:1000; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; padding:16px; overflow-y:auto; }
    .modal { background:var(--surface); border-radius:16px; width:100%; max-width:560px; margin:auto; }
    .modal-hd { display:flex; align-items:center; gap:12px; padding:16px 20px; border-bottom:1px solid var(--border); background:var(--surface-2); }
    .modal-hd h3 { font-size:15px; font-weight:700; margin:0; }
    .close-btn { margin-left:auto; border:none; background:transparent; cursor:pointer; color:var(--t4); padding:6px; border-radius:8px; }
    .modal-body { padding:20px; max-height:75vh; overflow-y:auto; }
    .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:0 14px; }
    .field { display:flex; flex-direction:column; gap:5px; margin-bottom:14px; }
    label { font-size:11px; font-weight:700; color:var(--t3); text-transform:uppercase; letter-spacing:.5px; }
    .req { color:var(--red); }
    input, select { padding:9px 11px; border:1.5px solid var(--border); border-radius:8px; font-size:13px; font-family:inherit; background:var(--surface); color:var(--t1); width:100%; }
    .lines-table { width:100%; border-collapse:collapse; margin:10px 0; }
    .lines-table th { text-align:left; font-size:11px; text-transform:uppercase; color:var(--t4); padding:6px 8px; border-bottom:1px solid var(--border); }
    .lines-table td { padding:5px 8px; }
    .num { width:100px; }
    .add-line { display:inline-flex; align-items:center; gap:6px; margin-bottom:16px; }
    .modal-ft { display:flex; justify-content:flex-end; gap:10px; padding-top:12px; border-top:1px solid var(--border); margin-top:4px; }
    .alert-err { background:#fee2e2; color:#dc2626; border:1px solid #dc2626; border-radius:8px; padding:10px 14px; font-size:13px; margin-bottom:10px; }
  `]
})
export class StockComponent implements OnInit {
  private stockSvc = inject(StockService);
  private invSvc = inject(InventoryService);
  private fb = inject(FormBuilder);

  tab = signal<Tab>('current');
  adjTypes = ADJUSTMENT_TYPES;

  currentStock = signal<CurrentStockDto[]>([]);
  search = signal('');
  lowOnly = signal(false);

  ledger = signal<StockLedgerDto[]>([]);
  ledgerItemId = signal('');
  allItems = signal<ItemDto[]>([]);

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
