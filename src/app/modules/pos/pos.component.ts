import { Component, OnInit, inject, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PosService } from '../../core/services/pos.service';
import { PosLookupDto, SalesDto, PAYMENT_METHODS } from '../../core/models/inventory.model';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

interface CartLine {
  kind: 'Item' | 'Package';
  id: number;
  name: string;
  quantity: number;
  price: number;
  discount: number;
  tax: number;
  maxQty: number;
}
interface PaymentLine { paymentMethod: string; amount: number; referenceNo?: string; }

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  template: `
    <app-page-header title="Point of Sale" subtitle="Search or scan items, build the cart, and checkout">
      <button class="btn-secondary" (click)="loadHeld()"><span class="material-icons-round">pause_circle</span> Held Invoices ({{ heldInvoices().length }})</button>
    </app-page-header>

    <div class="pos-layout">
      <!-- Left: search -->
      <div class="pane search-pane">
        <input #searchBox class="barcode-input" placeholder="Scan barcode or search item / package…"
               [(ngModel)]="searchTerm" (ngModelChange)="onSearchChange($event)" (keydown.enter)="onEnterSearch()" autofocus />
        <div class="results">
          @for (r of results(); track r.kind + '-' + r.id) {
            <div class="result" (click)="addToCart(r)">
              <div>
                <strong>{{ r.name }}</strong>
                <div class="sub">{{ r.code }} @if (r.kind==='Item') { · Stock: {{ r.quantityOnHand }} } @if (r.kind==='Package') { · Package }</div>
              </div>
              <div class="price">{{ r.price | number:'1.2-2' }}</div>
            </div>
          }
          @if (searchTerm && !results().length) { <p class="empty">No matches.</p> }
        </div>
      </div>

      <!-- Center: cart -->
      <div class="pane cart-pane">
        <table class="cart-table">
          <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Disc</th><th>Tax</th><th>Amount</th><th></th></tr></thead>
          <tbody>
            @for (line of cart(); track line.kind + '-' + line.id; let i = $index) {
              <tr>
                <td>{{ line.name }}</td>
                <td><input type="number" step="1" min="0.01" [(ngModel)]="line.quantity" class="cell-num" /></td>
                <td><input type="number" step="0.01" [(ngModel)]="line.price" class="cell-num" /></td>
                <td><input type="number" step="0.01" [(ngModel)]="line.discount" class="cell-num" /></td>
                <td><input type="number" step="0.01" [(ngModel)]="line.tax" class="cell-num" /></td>
                <td class="amt">{{ lineAmount(line) | number:'1.2-2' }}</td>
                <td><button class="icon-btn danger" (click)="removeLine(i)"><span class="material-icons-round">close</span></button></td>
              </tr>
            }
            @if (!cart().length) { <tr><td colspan="7" class="empty">Cart is empty — search or scan an item to begin.</td></tr> }
          </tbody>
        </table>
      </div>

      <!-- Right: summary + payment -->
      <div class="pane summary-pane">
        <div class="student-block">
          <label>Customer Name</label>
          <input [(ngModel)]="customerName" placeholder="Walk-in customer" />
          <label>Student ID <span class="hint">(optional — for student sales)</span></label>
          <input type="number" [(ngModel)]="studentId" placeholder="e.g. 1024" />
        </div>

        <div class="totals">
          <div><span>Total Items</span><strong>{{ totalQty() }}</strong></div>
          <div><span>Gross Amount</span><strong>{{ totals().gross | number:'1.2-2' }}</strong></div>
          <div><span>Discount</span><strong>{{ totals().discount | number:'1.2-2' }}</strong></div>
          <div><span>Tax</span><strong>{{ totals().tax | number:'1.2-2' }}</strong></div>
          <div class="net"><span>Net Amount</span><strong>{{ totals().net | number:'1.2-2' }}</strong></div>
        </div>

        <div class="payments">
          <label>Payments</label>
          @for (p of payments(); track $index; let i = $index) {
            <div class="pay-line">
              <select [(ngModel)]="p.paymentMethod">
                @for (m of paymentMethods; track m) { <option [value]="m">{{ m }}</option> }
              </select>
              <input type="number" step="0.01" [(ngModel)]="p.amount" class="cell-num" />
              <button class="icon-btn danger" (click)="removePayment(i)"><span class="material-icons-round">close</span></button>
            </div>
          }
          <button type="button" class="btn-secondary add-pay" (click)="addPayment()"><span class="material-icons-round">add</span> Add Payment</button>
          <div class="pay-summary">
            <div><span>Paid</span><strong>{{ paidTotal() | number:'1.2-2' }}</strong></div>
            <div><span>Change</span><strong>{{ changeDue() | number:'1.2-2' }}</strong></div>
          </div>
        </div>

        @if (error()) { <div class="alert-err">{{ error() }}</div> }

        <div class="actions-col">
          <button class="btn-secondary" [disabled]="!cart().length || busy()" (click)="holdInvoice()">
            <span class="material-icons-round">pause_circle</span> Hold Invoice
          </button>
          <button class="btn-primary checkout" [disabled]="!cart().length || busy()" (click)="checkout()">
            <span class="material-icons-round">point_of_sale</span> {{ busy() ? 'Processing…' : 'Complete Sale' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Held invoices modal -->
    @if (showHeld()) {
      <div class="overlay" (click)="showHeld.set(false)">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-hd"><h3>Held Invoices</h3><button class="close-btn" (click)="showHeld.set(false)"><span class="material-icons-round">close</span></button></div>
          <div class="modal-body">
            @for (h of heldInvoices(); track h.salesId) {
              <div class="held-row" (click)="resumeInvoice(h)">
                <div><strong>{{ h.invoiceNo }}</strong><div class="sub">{{ h.holdReference || h.customerName || 'Walk-in' }} · {{ h.details.length }} items</div></div>
                <div class="price">{{ h.netAmount | number:'1.2-2' }}</div>
              </div>
            }
            @if (!heldInvoices().length) { <p class="empty">No held invoices.</p> }
          </div>
        </div>
      </div>
    }

    <!-- Receipt (printable) -->
    @if (receipt()) {
      <div class="overlay" (click)="receipt.set(null)">
        <div class="modal receipt-modal" (click)="$event.stopPropagation()">
          <div class="modal-hd"><h3>Receipt — {{ receipt()!.invoiceNo }}</h3><button class="close-btn" (click)="receipt.set(null)"><span class="material-icons-round">close</span></button></div>
          <div class="receipt" id="receiptPrint">
            <h2>School Store</h2>
            <p>Invoice: {{ receipt()!.invoiceNo }}<br />Date: {{ receipt()!.salesDate | date:'medium' }}<br />Cashier: {{ receipt()!.cashierName }}</p>
            <hr />
            @for (d of receipt()!.details; track d.salesDetailId) {
              <div class="r-line"><span>{{ d.itemName }} × {{ d.quantity }}</span><span>{{ d.amount | number:'1.2-2' }}</span></div>
            }
            <hr />
            <div class="r-line"><span>Gross</span><span>{{ receipt()!.grossAmount | number:'1.2-2' }}</span></div>
            <div class="r-line"><span>Discount</span><span>{{ receipt()!.discountAmount | number:'1.2-2' }}</span></div>
            <div class="r-line"><span>Tax</span><span>{{ receipt()!.taxAmount | number:'1.2-2' }}</span></div>
            <div class="r-line total"><span>Net Total</span><span>{{ receipt()!.netAmount | number:'1.2-2' }}</span></div>
            <div class="r-line"><span>Paid</span><span>{{ receipt()!.paidAmount | number:'1.2-2' }}</span></div>
            <div class="r-line"><span>Change</span><span>{{ receipt()!.changeAmount | number:'1.2-2' }}</span></div>
            @for (p of receipt()!.payments; track p.salesPaymentId) {
              <div class="r-line"><span>{{ p.paymentMethod }}</span><span>{{ p.amount | number:'1.2-2' }}</span></div>
            }
            <hr /><p class="thanks">Thank you!</p>
          </div>
          <div class="modal-ft"><button class="btn-primary" (click)="printReceipt()"><span class="material-icons-round">print</span> Print Receipt</button></div>
        </div>
      </div>
    }
  `,
  styles: [`
    .pos-layout { display:grid; grid-template-columns:280px 1fr 300px; gap:16px; align-items:start; }
    .pane { background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:16px; }
    .barcode-input { width:100%; padding:11px 12px; border:1.5px solid var(--accent); border-radius:8px; font-size:14px; margin-bottom:12px; background:var(--surface); color:var(--t1); }
    .results { display:flex; flex-direction:column; gap:4px; max-height:70vh; overflow-y:auto; }
    .result { display:flex; justify-content:space-between; align-items:center; padding:10px; border-radius:8px; cursor:pointer; border:1px solid var(--border); }
    .result:hover { background:var(--surface-2); }
    .result .sub { font-size:11px; color:var(--t4); margin-top:2px; }
    .result .price { font-weight:700; color:var(--t1); }
    .cart-table { width:100%; border-collapse:collapse; }
    .cart-table th { text-align:left; font-size:11px; text-transform:uppercase; color:var(--t4); padding:8px; border-bottom:1px solid var(--border); }
    .cart-table td { padding:6px 8px; border-bottom:1px solid var(--border); }
    .cell-num { width:70px; padding:6px 8px; border:1.5px solid var(--border); border-radius:6px; font-size:13px; background:var(--surface); color:var(--t1); }
    .amt { font-weight:700; color:var(--t1); white-space:nowrap; }
    .icon-btn { border:none; background:transparent; cursor:pointer; padding:5px; color:var(--t3); border-radius:6px; }
    .icon-btn.danger:hover { color:#ef4444; background:rgba(239,68,68,.08); }
    .empty { text-align:center; color:var(--t4); padding:24px 0; font-size:13px; }
    .student-block { display:flex; flex-direction:column; gap:6px; margin-bottom:14px; }
    .student-block label { font-size:11px; font-weight:700; color:var(--t3); text-transform:uppercase; letter-spacing:.5px; }
    .student-block .hint { text-transform:none; font-weight:400; color:var(--t4); }
    .student-block input { padding:8px 10px; border:1.5px solid var(--border); border-radius:8px; font-size:13px; background:var(--surface); color:var(--t1); margin-bottom:6px; }
    .totals { display:flex; flex-direction:column; gap:6px; padding:12px 0; border-top:1px solid var(--border); border-bottom:1px solid var(--border); margin-bottom:12px; }
    .totals div { display:flex; justify-content:space-between; font-size:13px; color:var(--t3); }
    .totals .net { font-size:15px; padding-top:6px; border-top:1px dashed var(--border); }
    .totals .net strong { color:var(--accent); }
    .payments label { font-size:11px; font-weight:700; color:var(--t3); text-transform:uppercase; letter-spacing:.5px; display:block; margin-bottom:8px; }
    .pay-line { display:flex; gap:6px; margin-bottom:6px; }
    .pay-line select { flex:1; padding:7px 8px; border:1.5px solid var(--border); border-radius:6px; font-size:12.5px; background:var(--surface); color:var(--t1); }
    .add-pay { width:100%; justify-content:center; display:flex; align-items:center; gap:6px; margin-bottom:10px; }
    .pay-summary { display:flex; flex-direction:column; gap:4px; font-size:13px; margin-bottom:14px; }
    .pay-summary div { display:flex; justify-content:space-between; }
    .actions-col { display:flex; flex-direction:column; gap:10px; }
    .actions-col button { justify-content:center; display:flex; align-items:center; gap:8px; }
    .checkout { padding:12px; font-size:14px; }
    .alert-err { background:#fee2e2; color:#dc2626; border:1px solid #dc2626; border-radius:8px; padding:10px 14px; font-size:12.5px; margin-bottom:10px; }
    .overlay { position:fixed; inset:0; z-index:1000; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; padding:16px; }
    .modal { background:var(--surface); border-radius:16px; width:100%; max-width:420px; max-height:85vh; display:flex; flex-direction:column; }
    .modal-hd { display:flex; align-items:center; gap:12px; padding:16px 20px; border-bottom:1px solid var(--border); background:var(--surface-2); }
    .modal-hd h3 { font-size:15px; font-weight:700; margin:0; }
    .close-btn { margin-left:auto; border:none; background:transparent; cursor:pointer; color:var(--t4); padding:6px; border-radius:8px; }
    .modal-body { padding:16px 20px; overflow-y:auto; }
    .held-row { display:flex; justify-content:space-between; align-items:center; padding:10px; border:1px solid var(--border); border-radius:8px; margin-bottom:8px; cursor:pointer; }
    .held-row:hover { background:var(--surface-2); }
    .held-row .sub { font-size:11px; color:var(--t4); }
    .receipt-modal { max-width:340px; }
    .receipt { font-family:monospace; font-size:12.5px; padding:16px 20px; color:var(--t1); }
    .receipt h2 { text-align:center; font-size:16px; margin:0 0 8px; }
    .r-line { display:flex; justify-content:space-between; padding:2px 0; }
    .r-line.total { font-weight:700; font-size:14px; }
    .thanks { text-align:center; }
    .modal-ft { padding:14px 20px; border-top:1px solid var(--border); display:flex; justify-content:flex-end; }
  `]
})
export class PosComponent implements OnInit {
  private posSvc = inject(PosService);

  searchTerm = '';
  results = signal<PosLookupDto[]>([]);
  cart = signal<CartLine[]>([]);
  customerName = '';
  studentId: number | null = null;
  payments = signal<PaymentLine[]>([{ paymentMethod: 'Cash', amount: 0 }]);
  paymentMethods = PAYMENT_METHODS;

  busy = signal(false);
  error = signal('');
  showHeld = signal(false);
  heldInvoices = signal<SalesDto[]>([]);
  receipt = signal<SalesDto | null>(null);
  private resumingInvoiceId: number | null = null;
  private searchDebounce: any;

  ngOnInit() {}

  onSearchChange(term: string) {
    clearTimeout(this.searchDebounce);
    if (!term) { this.results.set([]); return; }
    this.searchDebounce = setTimeout(() => this.posSvc.search(term).subscribe(r => this.results.set(r)), 200);
  }

  /// Enter key: if there's exactly one exact-code/barcode match, add it immediately (fast barcode scan flow).
  onEnterSearch() {
    const term = this.searchTerm.trim();
    if (!term) return;
    const exact = this.results().find(r => r.code === term || r.barcode === term);
    if (exact) { this.addToCart(exact); return; }
    if (this.results().length === 1) this.addToCart(this.results()[0]);
  }

  addToCart(r: PosLookupDto) {
    const existing = this.cart().find(l => l.kind === r.kind && l.id === r.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      this.cart.update(c => [...c, { kind: r.kind, id: r.id, name: r.name, quantity: 1, price: r.price, discount: 0, tax: r.taxPercentage, maxQty: r.quantityOnHand }]);
    }
    this.searchTerm = ''; this.results.set([]);
  }

  removeLine(i: number) { this.cart.update(c => c.filter((_, idx) => idx !== i)); }

  lineAmount(l: CartLine): number { return (l.quantity || 0) * (l.price || 0) - (l.discount || 0) + (l.tax || 0); }
  totalQty(): number { return this.cart().reduce((s, l) => s + (l.quantity || 0), 0); }
  totals(): { gross: number; discount: number; tax: number; net: number } {
    let gross = 0, discount = 0, tax = 0, net = 0;
    for (const l of this.cart()) {
      gross += (l.quantity || 0) * (l.price || 0);
      discount += l.discount || 0;
      tax += l.tax || 0;
      net += this.lineAmount(l);
    }
    return { gross, discount, tax, net };
  }

  addPayment() { this.payments.update(p => [...p, { paymentMethod: 'Cash', amount: 0 }]); }
  removePayment(i: number) { this.payments.update(p => p.filter((_, idx) => idx !== i)); }
  paidTotal(): number { return this.payments().reduce((s, p) => s + (p.amount || 0), 0); }
  changeDue(): number { return Math.max(0, this.paidTotal() - this.totals().net); }

  private buildLines() {
    return this.cart().map(l => ({ kind: l.kind, id: l.id, quantity: l.quantity, price: l.price, discount: l.discount, tax: l.tax }));
  }

  holdInvoice() {
    if (!this.cart().length) return;
    this.busy.set(true); this.error.set('');
    this.posSvc.createSale({
      studentId: this.studentId, customerName: this.customerName || null, holdReference: this.customerName || null,
      hold: true, lines: this.buildLines(), payments: []
    }).subscribe({
      next: () => { this.busy.set(false); this.resetCart(); },
      error: (e: any) => { this.busy.set(false); this.error.set(e?.error?.error ?? 'Could not hold invoice.'); }
    });
  }

  checkout() {
    if (!this.cart().length) return;
    if (this.paidTotal() < this.totals().net) { this.error.set('Payment total is less than the invoice net amount.'); return; }
    this.busy.set(true); this.error.set('');

    const paymentLines = this.payments().filter(p => p.amount > 0).map(p => ({ paymentMethod: p.paymentMethod, amount: p.amount, referenceNo: p.referenceNo }));

    const obs = this.resumingInvoiceId
      ? this.posSvc.resumeSale(this.resumingInvoiceId, { lines: this.buildLines(), payments: paymentLines })
      : this.posSvc.createSale({ studentId: this.studentId, customerName: this.customerName || null, hold: false, lines: this.buildLines(), payments: paymentLines });

    obs.subscribe({
      next: (sale) => { this.busy.set(false); this.receipt.set(sale); this.resetCart(); },
      error: (e: any) => { this.busy.set(false); this.error.set(e?.error?.error ?? 'Checkout failed.'); }
    });
  }

  resetCart() {
    this.cart.set([]); this.customerName = ''; this.studentId = null;
    this.payments.set([{ paymentMethod: 'Cash', amount: 0 }]);
    this.resumingInvoiceId = null;
  }

  loadHeld() { this.posSvc.getHeldInvoices().subscribe(h => { this.heldInvoices.set(h); this.showHeld.set(true); }); }

  resumeInvoice(h: SalesDto) {
    this.resumingInvoiceId = h.salesId;
    this.cart.set(h.details.map(d => ({
      kind: d.packageId ? 'Package' : 'Item', id: (d.packageId ?? d.itemId)!, name: d.itemName,
      quantity: d.quantity, price: d.price, discount: d.discount, tax: d.tax, maxQty: 0
    })));
    this.customerName = h.customerName ?? '';
    this.studentId = h.studentId ?? null;
    this.payments.set([{ paymentMethod: 'Cash', amount: h.netAmount }]);
    this.showHeld.set(false);
  }

  printReceipt() {
    const content = document.getElementById('receiptPrint')?.innerHTML;
    if (!content) return;
    const w = window.open('', '_blank', 'width=340,height=600');
    if (!w) return;
    w.document.write(`<html><head><title>Receipt</title><style>body{font-family:monospace;font-size:12.5px;padding:16px;} .r-line{display:flex;justify-content:space-between;} .r-line.total{font-weight:700;font-size:14px;} h2{text-align:center;}</style></head><body>${content}</body></html>`);
    w.document.close();
    w.print();
  }
}
