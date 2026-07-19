import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PosService } from '../../../core/services/pos.service';
import { SalesDto, SalesReturnDto } from '../../../core/models/inventory.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-sales-returns',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  template: `
    <app-page-header title="Sales Returns" subtitle="Return items from a completed invoice — stock is restored automatically" />

    <div class="layout">
      <div class="pane">
        <input class="search" placeholder="Search invoice number…" [(ngModel)]="search" (ngModelChange)="filterSales()" />
        <div class="sale-list">
          @for (s of filteredSales(); track s.salesId) {
            <div class="sale-row" [class.active]="selected()?.salesId === s.salesId" (click)="select(s)">
              <div><strong>{{ s.invoiceNo }}</strong><div class="sub">{{ s.salesDate | date:'short' }} · {{ s.status }}</div></div>
              <div class="price">{{ s.netAmount | number:'1.2-2' }}</div>
            </div>
          }
          @if (!filteredSales().length) { <p class="empty">No matching invoices.</p> }
        </div>
      </div>

      <div class="pane detail-pane">
        @if (selected()) {
          <h3>Invoice {{ selected()!.invoiceNo }}</h3>
          <p class="sub">{{ selected()!.customerName || selected()!.studentName || 'Walk-in' }} · Cashier: {{ selected()!.cashierName }}</p>
          <table class="table">
            <thead><tr><th></th><th>Item</th><th>Sold Qty</th><th>Already Returned</th><th>Return Qty</th></tr></thead>
            <tbody>
              @for (d of selected()!.details; track d.salesDetailId) {
                <tr>
                  <td><input type="checkbox" [checked]="isChecked(d.salesDetailId)" (change)="toggle(d.salesDetailId, d.quantity)" /></td>
                  <td>{{ d.itemName }}</td>
                  <td>{{ d.quantity }}</td>
                  <td>{{ returnedQty(d) }}</td>
                  <td><input type="number" step="0.01" [min]="0" [max]="d.quantity - returnedQty(d)" [(ngModel)]="lineQty[d.salesDetailId]" class="cell-num" [disabled]="!isChecked(d.salesDetailId)" /></td>
                </tr>
              }
            </tbody>
          </table>
          <div class="field"><label>Remarks</label><input [(ngModel)]="remarks" /></div>
          @if (error()) { <div class="alert-err">{{ error() }}</div> }
          <button class="btn-primary" [disabled]="busy()" (click)="submitReturn()"><span class="material-icons-round">keyboard_return</span> {{ busy() ? 'Processing…' : 'Process Return' }}</button>
        } @else {
          <p class="empty">Select an invoice on the left to process a return.</p>
        }
      </div>
    </div>

    <h3 class="history-title">Recent Returns</h3>
    <div class="card">
      <table class="table">
        <thead><tr><th>Return No</th><th>Date</th><th>Invoice</th><th>Net Amount</th><th>Status</th></tr></thead>
        <tbody>
          @for (r of returnHistory(); track r.salesReturnId) {
            <tr><td>{{ r.returnNo }}</td><td>{{ r.returnDate | date:'short' }}</td><td>{{ r.invoiceNo }}</td><td>{{ r.netAmount | number:'1.2-2' }}</td><td><span class="badge badge-green">{{ r.status }}</span></td></tr>
          }
          @if (!returnHistory().length) { <tr><td colspan="5" class="empty">No returns recorded yet.</td></tr> }
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .layout { display:grid; grid-template-columns:340px 1fr; gap:16px; margin-bottom:24px; }
    .pane { background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:16px; }
    .search { width:100%; padding:9px 12px; border:1.5px solid var(--border); border-radius:8px; font-size:13px; margin-bottom:12px; background:var(--surface); color:var(--t1); }
    .sale-list { display:flex; flex-direction:column; gap:6px; max-height:60vh; overflow-y:auto; }
    .sale-row { display:flex; justify-content:space-between; align-items:center; padding:10px; border:1px solid var(--border); border-radius:8px; cursor:pointer; }
    .sale-row:hover { background:var(--surface-2); }
    .sale-row.active { border-color:var(--accent); background:var(--accent-s); }
    .sale-row .sub { font-size:11px; color:var(--t4); }
    .detail-pane h3 { margin:0 0 4px; font-size:15px; }
    .detail-pane .sub { font-size:12px; color:var(--t4); margin-bottom:14px; }
    .cell-num { width:80px; padding:6px 8px; border:1.5px solid var(--border); border-radius:6px; font-size:13px; background:var(--surface); color:var(--t1); }
    .field { display:flex; flex-direction:column; gap:5px; margin:14px 0; }
    label { font-size:11px; font-weight:700; color:var(--t3); text-transform:uppercase; letter-spacing:.5px; }
    input:not(.cell-num) { padding:9px 11px; border:1.5px solid var(--border); border-radius:8px; font-size:13px; background:var(--surface); color:var(--t1); width:100%; }
    .empty { text-align:center; color:var(--t4); padding:24px 0; font-size:13px; }
    .alert-err { background:#fee2e2; color:#dc2626; border:1px solid #dc2626; border-radius:8px; padding:10px 14px; font-size:13px; margin-bottom:10px; }
    .history-title { font-size:15px; font-weight:700; margin:0 0 12px; }
    .card { background:var(--surface); border:1px solid var(--border); border-radius:14px; overflow:hidden; }
    .badge { padding:3px 9px; border-radius:12px; font-size:11.5px; font-weight:600; }
    .badge-green { background:var(--green-s); color:var(--green); }
  `]
})
export class SalesReturnsComponent implements OnInit {
  private posSvc = inject(PosService);

  allSales = signal<SalesDto[]>([]);
  filteredSales = signal<SalesDto[]>([]);
  search = '';
  selected = signal<SalesDto | null>(null);
  checkedLines = signal<Set<number>>(new Set());
  lineQty: Record<number, number> = {};
  remarks = '';
  busy = signal(false);
  error = signal('');
  returnHistory = signal<SalesReturnDto[]>([]);
  private returnedByDetail = signal<Record<number, number>>({});

  ngOnInit() {
    this.posSvc.getSales({}).subscribe(s => {
      const eligible = s.filter(x => x.status === 'Completed' || x.status === 'PartiallyReturned');
      this.allSales.set(eligible); this.filteredSales.set(eligible);
    });
    this.loadHistory();
  }

  loadHistory() { this.posSvc.getSalesReturns().subscribe(r => this.returnHistory.set(r)); }

  filterSales() {
    const s = this.search.toLowerCase();
    this.filteredSales.set(!s ? this.allSales() : this.allSales().filter(x => x.invoiceNo.toLowerCase().includes(s)));
  }

  select(sale: SalesDto) {
    this.selected.set(sale);
    this.checkedLines.set(new Set());
    this.lineQty = {};
    this.remarks = '';
    this.error.set('');
    // Compute already-returned qty per ORIGINAL sales-detail line (not per item — two lines
    // for the same item/package on one invoice must be capped independently).
    this.posSvc.getSalesReturns().subscribe(returns => {
      const map: Record<number, number> = {};
      for (const r of returns.filter(x => x.salesId === sale.salesId)) {
        for (const d of r.details) {
          map[d.salesDetailId] = (map[d.salesDetailId] || 0) + d.quantity;
        }
      }
      this.returnedByDetail.set(map);
    });
  }

  returnedQty(d: SalesDto['details'][number]): number {
    return this.returnedByDetail()[d.salesDetailId] || 0;
  }

  isChecked(id: number) { return this.checkedLines().has(id); }
  toggle(id: number, maxQty: number) {
    const set = new Set(this.checkedLines());
    if (set.has(id)) { set.delete(id); } else { set.add(id); if (!this.lineQty[id]) this.lineQty[id] = maxQty; }
    this.checkedLines.set(set);
  }

  submitReturn() {
    const sale = this.selected();
    if (!sale) return;
    const lines = Array.from(this.checkedLines()).map(id => ({ salesDetailId: id, quantity: this.lineQty[id] || 0 })).filter(l => l.quantity > 0);
    if (!lines.length) { this.error.set('Select at least one line with a quantity to return.'); return; }

    this.busy.set(true); this.error.set('');
    this.posSvc.createSalesReturn({ salesId: sale.salesId, remarks: this.remarks || null, lines }).subscribe({
      next: () => { this.busy.set(false); this.selected.set(null); this.loadHistory(); this.ngOnInit(); },
      error: (e: any) => { this.busy.set(false); this.error.set(e?.error?.error ?? 'Return failed.'); }
    });
  }
}
