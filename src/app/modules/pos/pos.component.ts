import { Component, OnInit, inject, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import { Dialog } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { Tooltip } from 'primeng/tooltip';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
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
  imports: [
    CommonModule, FormsModule, PageHeaderComponent,
    Button, Select, InputText, InputNumber, Dialog, TableModule, Tooltip, IconField, InputIcon
  ],
  template: `
    <app-page-header title="Point of Sale" subtitle="Search or scan items, build the cart, and checkout">
      <p-button [label]="'Held Invoices (' + heldInvoices().length + ')'" icon="pi pi-pause-circle" severity="secondary" [outlined]="true" (onClick)="loadHeld()" />
    </app-page-header>

    <div class="pos-layout">
      <!-- Left: search -->
      <div class="pane search-pane">
        <p-iconfield class="mb-3 block">
          <p-inputicon class="pi pi-search" />
          <input pInputText #searchBox class="barcode-input w-full" placeholder="Scan barcode or search item / package…"
                 [(ngModel)]="searchTerm" (ngModelChange)="onSearchChange($event)" (keydown.enter)="onEnterSearch()" autofocus />
        </p-iconfield>
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
        <p-table [value]="cart()" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '36rem' }" [scrollable]="true">
          <ng-template #header>
            <tr><th>Item</th><th>Qty</th><th>Price</th><th>Disc</th><th>Tax</th><th>Amount</th><th></th></tr>
          </ng-template>
          <ng-template #body let-line let-i="rowIndex">
            <tr>
              <td>{{ line.name }}</td>
              <td><p-inputnumber [(ngModel)]="line.quantity" [min]="0" [minFractionDigits]="0" [maxFractionDigits]="2" styleClass="cell-num" inputStyleClass="cell-num" /></td>
              <td><p-inputnumber [(ngModel)]="line.price" [minFractionDigits]="0" [maxFractionDigits]="2" styleClass="cell-num" inputStyleClass="cell-num" /></td>
              <td><p-inputnumber [(ngModel)]="line.discount" [minFractionDigits]="0" [maxFractionDigits]="2" styleClass="cell-num" inputStyleClass="cell-num" /></td>
              <td><p-inputnumber [(ngModel)]="line.tax" [minFractionDigits]="0" [maxFractionDigits]="2" styleClass="cell-num" inputStyleClass="cell-num" /></td>
              <td class="amt">{{ lineAmount(line) | number:'1.2-2' }}</td>
              <td><p-button icon="pi pi-times" [text]="true" [rounded]="true" size="small" severity="danger" ariaLabel="Remove line" pTooltip="Remove" (onClick)="removeLine(i)" /></td>
            </tr>
          </ng-template>
          <ng-template #emptymessage>
            <tr><td colspan="7" class="empty">Cart is empty — search or scan an item to begin.</td></tr>
          </ng-template>
        </p-table>
      </div>

      <!-- Right: summary + payment -->
      <div class="pane summary-pane">
        <div class="student-block">
          <label for="pos-cust">Customer Name</label>
          <input pInputText id="pos-cust" class="w-full" [(ngModel)]="customerName" placeholder="Walk-in customer" />
          <label for="pos-student">Student ID <span class="hint">(optional — for student sales)</span></label>
          <p-inputnumber inputId="pos-student" styleClass="w-full" inputStyleClass="w-full" [useGrouping]="false" [(ngModel)]="studentId" placeholder="e.g. 1024" />
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
            <div class="mb-1.5 flex items-center gap-1.5">
              <p-select class="min-w-0 flex-1" [options]="paymentMethods" [(ngModel)]="p.paymentMethod" appendTo="body" ariaLabel="Payment method" />
              <p-inputnumber [(ngModel)]="p.amount" [minFractionDigits]="0" [maxFractionDigits]="2" styleClass="cell-num" inputStyleClass="cell-num" />
              <p-button icon="pi pi-times" [text]="true" [rounded]="true" size="small" severity="danger" ariaLabel="Remove payment" pTooltip="Remove" (onClick)="removePayment(i)" />
            </div>
          }
          <p-button type="button" class="add-pay" styleClass="w-full" label="Add Payment" icon="pi pi-plus" severity="secondary" [outlined]="true" size="small" (onClick)="addPayment()" />
          <div class="pay-summary">
            <div><span>Paid</span><strong>{{ paidTotal() | number:'1.2-2' }}</strong></div>
            <div><span>Change</span><strong>{{ changeDue() | number:'1.2-2' }}</strong></div>
          </div>
        </div>

        @if (error()) { <div class="alert-err">{{ error() }}</div> }

        <div class="flex flex-col gap-2.5">
          <p-button styleClass="w-full" label="Hold Invoice" icon="pi pi-pause-circle" severity="secondary" [outlined]="true"
                    [disabled]="!cart().length || busy()" (onClick)="holdInvoice()" />
          <p-button styleClass="w-full" size="large" [label]="busy() ? 'Processing…' : 'Complete Sale'" icon="pi pi-shopping-cart"
                    [loading]="busy()" [disabled]="!cart().length || busy()" (onClick)="checkout()" />
        </div>
      </div>
    </div>

    <!-- Held invoices dialog -->
    <p-dialog
      header="Held Invoices"
      [visible]="showHeld()"
      (visibleChange)="showHeld.set($event)"
      [modal]="true" [draggable]="false" [resizable]="false" [dismissableMask]="true"
      [style]="{ width: '26rem' }" [breakpoints]="{ '640px': '96vw' }">
      @for (h of heldInvoices(); track h.salesId) {
        <div class="held-row" (click)="resumeInvoice(h)">
          <div><strong>{{ h.invoiceNo }}</strong><div class="sub">{{ h.holdReference || h.customerName || 'Walk-in' }} · {{ h.details.length }} items</div></div>
          <div class="price">{{ h.netAmount | number:'1.2-2' }}</div>
        </div>
      }
      @if (!heldInvoices().length) { <p class="empty">No held invoices.</p> }
    </p-dialog>

    <!-- Receipt (printable) -->
    <p-dialog
      [header]="'Receipt — ' + (receipt()?.invoiceNo ?? '')"
      [visible]="!!receipt()"
      (visibleChange)="$event ? null : receipt.set(null)"
      [modal]="true" [draggable]="false" [resizable]="false" [dismissableMask]="true"
      [style]="{ width: '22rem' }" [breakpoints]="{ '640px': '96vw' }">
      @if (receipt(); as rc) {
        <div class="receipt" id="receiptPrint">
          <h2>School Store</h2>
          <p>Invoice: {{ rc.invoiceNo }}<br />Date: {{ rc.salesDate | date:'medium' }}<br />Cashier: {{ rc.cashierName }}</p>
          <hr />
          @for (d of rc.details; track d.salesDetailId) {
            <div class="r-line"><span>{{ d.itemName }} × {{ d.quantity }}</span><span>{{ d.amount | number:'1.2-2' }}</span></div>
          }
          <hr />
          <div class="r-line"><span>Gross</span><span>{{ rc.grossAmount | number:'1.2-2' }}</span></div>
          <div class="r-line"><span>Discount</span><span>{{ rc.discountAmount | number:'1.2-2' }}</span></div>
          <div class="r-line"><span>Tax</span><span>{{ rc.taxAmount | number:'1.2-2' }}</span></div>
          <div class="r-line total"><span>Net Total</span><span>{{ rc.netAmount | number:'1.2-2' }}</span></div>
          <div class="r-line"><span>Paid</span><span>{{ rc.paidAmount | number:'1.2-2' }}</span></div>
          <div class="r-line"><span>Change</span><span>{{ rc.changeAmount | number:'1.2-2' }}</span></div>
          @for (p of rc.payments; track p.salesPaymentId) {
            <div class="r-line"><span>{{ p.paymentMethod }}</span><span>{{ p.amount | number:'1.2-2' }}</span></div>
          }
          <hr /><p class="thanks">Thank you!</p>
        </div>
      }
      <ng-template #footer>
        <div class="flex justify-end gap-2">
          <p-button label="Close" severity="secondary" [outlined]="true" (onClick)="receipt.set(null)" />
          <p-button label="Print Receipt" icon="pi pi-print" (onClick)="printReceipt()" />
        </div>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .pos-layout { display:grid; grid-template-columns:280px 1fr 300px; gap:16px; align-items:start; }
    @media (max-width: 1100px) { .pos-layout { grid-template-columns:1fr; } }
    .pane { background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:16px; min-width:0; }
    .barcode-input { border-color:var(--accent); }
    .results { display:flex; flex-direction:column; gap:4px; max-height:70vh; overflow-y:auto; }
    .result { display:flex; justify-content:space-between; align-items:center; padding:10px; border-radius:8px; cursor:pointer; border:1px solid var(--border); }
    .result:hover { background:var(--surface-2); }
    .result .sub { font-size:11px; color:var(--t4); margin-top:2px; }
    .result .price { font-weight:700; color:var(--t1); }
    :host ::ng-deep .cell-num { width:5.5rem; }
    .amt { font-weight:700; color:var(--t1); white-space:nowrap; }
    .empty { text-align:center; color:var(--t4); padding:24px 0; font-size:13px; }
    .student-block { display:flex; flex-direction:column; gap:6px; margin-bottom:14px; }
    .student-block label { font-size:11px; font-weight:700; color:var(--t3); text-transform:uppercase; letter-spacing:.5px; }
    .student-block .hint { text-transform:none; font-weight:400; color:var(--t4); }
    .totals { display:flex; flex-direction:column; gap:6px; padding:12px 0; border-top:1px solid var(--border); border-bottom:1px solid var(--border); margin-bottom:12px; }
    .totals div { display:flex; justify-content:space-between; font-size:13px; color:var(--t3); }
    .totals .net { font-size:15px; padding-top:6px; border-top:1px dashed var(--border); }
    .totals .net strong { color:var(--accent); }
    .payments label { font-size:11px; font-weight:700; color:var(--t3); text-transform:uppercase; letter-spacing:.5px; display:block; margin-bottom:8px; }
    .add-pay { display:block; margin-bottom:10px; }
    .pay-summary { display:flex; flex-direction:column; gap:4px; font-size:13px; margin-bottom:14px; }
    .pay-summary div { display:flex; justify-content:space-between; }
    .alert-err { background:#fee2e2; color:#dc2626; border:1px solid #dc2626; border-radius:8px; padding:10px 14px; font-size:12.5px; margin-bottom:10px; }
    .held-row { display:flex; justify-content:space-between; align-items:center; padding:10px; border:1px solid var(--border); border-radius:8px; margin-bottom:8px; cursor:pointer; }
    .held-row:hover { background:var(--surface-2); }
    .held-row .sub { font-size:11px; color:var(--t4); }
    .held-row .price { font-weight:700; color:var(--t1); }
    .receipt { font-family:monospace; font-size:12.5px; padding:4px 4px; color:var(--t1); }
    .receipt h2 { text-align:center; font-size:16px; margin:0 0 8px; }
    .r-line { display:flex; justify-content:space-between; padding:2px 0; }
    .r-line.total { font-weight:700; font-size:14px; }
    .thanks { text-align:center; }
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
  paymentMethods: string[] = [...PAYMENT_METHODS];

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
