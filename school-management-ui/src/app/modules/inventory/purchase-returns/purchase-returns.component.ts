import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormArray, Validators } from '@angular/forms';
import { PurchaseService } from '../../../core/services/purchase.service';
import { InventoryService } from '../../../core/services/inventory.service';
import { PurchaseReturnDto, ItemDto, SupplierDto } from '../../../core/models/inventory.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';

@Component({
  selector: 'app-purchase-returns',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageHeaderComponent, DatePickerComponent],
  template: `
    <app-page-header [title]="view() === 'list' ? 'Purchase Returns' : 'New Purchase Return'" subtitle="Return purchased items back to a supplier">
      @if (view() === 'list') {
        <button class="btn-primary" (click)="openNew()"><span class="material-icons-round">add</span> New Return</button>
      } @else {
        <button class="btn-secondary" (click)="view.set('list')">Back to list</button>
      }
    </app-page-header>

    @if (view() === 'list') {
      <div class="card">
        <table class="table">
          <thead><tr><th>Return No</th><th>Date</th><th>Supplier</th><th>Net Amount</th><th>Status</th></tr></thead>
          <tbody>
            @for (r of returns(); track r.purchaseReturnId) {
              <tr>
                <td>{{ r.returnNo }}</td><td>{{ r.returnDate }}</td><td>{{ r.supplierName }}</td>
                <td>{{ r.netAmount | number:'1.2-2' }}</td>
                <td><span class="badge badge-green">{{ r.status }}</span></td>
              </tr>
            }
            @if (!returns().length) { <tr><td colspan="5" class="empty">No purchase returns recorded yet.</td></tr> }
          </tbody>
        </table>
      </div>
    } @else {
      <form [formGroup]="form" (ngSubmit)="save()" class="card form-card">
        <div class="grid2">
          <div class="field"><label>Return Date <span class="req">*</span></label><app-date-picker formControlName="returnDate"/></div>
          <div class="field"><label>Supplier <span class="req">*</span></label>
            <select formControlName="supplierId">
              <option [ngValue]="null">Select…</option>
              @for (s of suppliers(); track s.supplierId) { <option [ngValue]="s.supplierId">{{ s.supplierName }}</option> }
            </select>
          </div>
        </div>
        <div class="field"><label>Remarks</label><input formControlName="remarks" /></div>

        <table class="lines-table">
          <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Net</th><th></th></tr></thead>
          <tbody formArrayName="details">
            @for (line of details.controls; track $index; let i = $index) {
              <tr [formGroupName]="i">
                <td>
                  <select formControlName="itemId">
                    <option [ngValue]="null">Select item…</option>
                    @for (it of items(); track it.itemId) { <option [ngValue]="it.itemId">{{ it.itemName }}</option> }
                  </select>
                </td>
                <td><input type="number" step="0.01" formControlName="quantity" class="num" /></td>
                <td><input type="number" step="0.01" formControlName="price" class="num" /></td>
                <td class="net">{{ lineNet(i) | number:'1.2-2' }}</td>
                <td><button type="button" class="icon-btn danger" (click)="removeLine(i)"><span class="material-icons-round">close</span></button></td>
              </tr>
            }
          </tbody>
        </table>
        <button type="button" class="btn-secondary add-line" (click)="addLine()"><span class="material-icons-round">add</span> Add Line</button>

        <div class="totals"><div class="net-total"><span>Net Amount</span><strong>{{ total() | number:'1.2-2' }}</strong></div></div>

        @if (formError()) { <div class="alert-err">{{ formError() }}</div> }
        <div class="form-ft">
          <button type="button" class="btn-secondary" (click)="view.set('list')">Cancel</button>
          <button type="submit" class="btn-primary" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save Return' }}</button>
        </div>
      </form>
    }
  `,
  styles: [`
    .card { background:var(--surface); border:1px solid var(--border); border-radius:14px; overflow:hidden; }
    .form-card { padding:20px; }
    .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:0 14px; }
    .field { display:flex; flex-direction:column; gap:5px; margin-bottom:14px; }
    label { font-size:11px; font-weight:700; color:var(--t3); text-transform:uppercase; letter-spacing:.5px; }
    .req { color:var(--red); }
    input, select { padding:9px 11px; border:1.5px solid var(--border); border-radius:8px; font-size:13px; font-family:inherit; background:var(--surface); color:var(--t1); width:100%; }
    .lines-table { width:100%; border-collapse:collapse; margin:12px 0; }
    .lines-table th { text-align:left; font-size:11px; text-transform:uppercase; color:var(--t4); padding:6px 8px; border-bottom:1px solid var(--border); }
    .lines-table td { padding:5px 8px; }
    .num { width:100px; }
    .net { font-weight:600; color:var(--t1); white-space:nowrap; }
    .add-line { display:inline-flex; align-items:center; gap:6px; margin-bottom:16px; }
    .totals { display:flex; justify-content:flex-end; padding:14px 0; border-top:1px solid var(--border); margin-top:8px; }
    .net-total { display:flex; flex-direction:column; align-items:flex-end; font-size:12px; color:var(--t4); }
    .net-total strong { color:var(--accent); font-size:16px; }
    .form-ft { display:flex; justify-content:flex-end; gap:10px; padding-top:12px; border-top:1px solid var(--border); }
    .icon-btn { border:none; background:transparent; cursor:pointer; padding:6px; color:var(--t3); border-radius:6px; }
    .icon-btn.danger:hover { color:#ef4444; background:rgba(239,68,68,.08); }
    .badge { padding:3px 9px; border-radius:12px; font-size:11.5px; font-weight:600; }
    .badge-green { background:var(--green-s); color:var(--green); }
    .empty { text-align:center; color:var(--t4); padding:32px 0; font-size:13px; }
    .alert-err { background:#fee2e2; color:#dc2626; border:1px solid #dc2626; border-radius:8px; padding:10px 14px; font-size:13px; margin-bottom:10px; }
  `]
})
export class PurchaseReturnsComponent implements OnInit {
  private purchaseSvc = inject(PurchaseService);
  private invSvc = inject(InventoryService);
  private fb = inject(FormBuilder);

  view = signal<'list' | 'new'>('list');
  returns = signal<PurchaseReturnDto[]>([]);
  items = signal<ItemDto[]>([]);
  suppliers = signal<SupplierDto[]>([]);
  saving = signal(false);
  formError = signal('');

  form = this.fb.group({
    returnDate: [new Date().toISOString().slice(0, 10), Validators.required],
    supplierId: [null as number | null, Validators.required],
    remarks: [''],
    details: this.fb.array([])
  });
  get details() { return this.form.get('details') as FormArray; }

  ngOnInit() {
    this.invSvc.getItems(undefined, undefined, true).subscribe(i => this.items.set(i));
    this.invSvc.getSuppliers(undefined, true).subscribe(s => this.suppliers.set(s));
    this.load();
  }
  load() { this.purchaseSvc.getPurchaseReturns().subscribe(r => this.returns.set(r)); }

  newLine() { return this.fb.group({ itemId: [null as number | null, Validators.required], quantity: [1, Validators.required], price: [0, Validators.required] }); }
  addLine() { this.details.push(this.newLine()); }
  removeLine(i: number) { this.details.removeAt(i); }
  lineNet(i: number): number { const v = this.details.at(i).value; return (v.quantity || 0) * (v.price || 0); }
  total(): number { let t = 0; for (let i = 0; i < this.details.length; i++) t += this.lineNet(i); return t; }

  openNew() {
    this.form.reset({ returnDate: new Date().toISOString().slice(0, 10) });
    this.details.clear(); this.addLine();
    this.formError.set(''); this.view.set('new');
  }

  save() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.details.length === 0) { this.formError.set('Add at least one valid line.'); return; }
    this.saving.set(true); this.formError.set('');
    const v = this.form.value;
    this.purchaseSvc.createPurchaseReturn({
      returnDate: v.returnDate!, supplierId: v.supplierId!, remarks: v.remarks || null,
      details: (v.details as any[]).map(d => ({ itemId: d.itemId, quantity: d.quantity, price: d.price }))
    }).subscribe({
      next: () => { this.saving.set(false); this.view.set('list'); this.load(); },
      error: (e: any) => { this.saving.set(false); this.formError.set(e?.error?.error ?? 'Save failed.'); }
    });
  }
}
