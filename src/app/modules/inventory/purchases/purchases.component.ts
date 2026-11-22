import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormArray, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import { Tag } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { Tooltip } from 'primeng/tooltip';
import { PurchaseService } from '../../../core/services/purchase.service';
import { InventoryService } from '../../../core/services/inventory.service';
import { PurchaseDto, ItemDto, SupplierDto } from '../../../core/models/inventory.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';

@Component({
  selector: 'app-purchases',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, PageHeaderComponent, DatePickerComponent,
    Button, Select, InputText, InputNumber, Tag, TableModule, Tooltip
  ],
  template: `
    <app-page-header [title]="view() === 'list' ? 'Purchases' : 'New Purchase Invoice'" subtitle="Record supplier purchases — stock and costing update automatically">
      @if (view() === 'list') {
        <p-button label="New Purchase" icon="pi pi-plus" (onClick)="openNew()" />
      } @else {
        <p-button label="Back to list" icon="pi pi-arrow-left" severity="secondary" [outlined]="true" (onClick)="view.set('list')" />
      }
    </app-page-header>

    @if (view() === 'list') {
      <div class="card">
        <p-table [value]="purchases()" dataKey="purchaseId" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '44rem' }" [scrollable]="true">
          <ng-template #header>
            <tr><th>Purchase No</th><th>Date</th><th>Supplier</th><th>Invoice #</th><th>Net Amount</th><th>Status</th><th class="text-right"></th></tr>
          </ng-template>
          <ng-template #body let-p>
            <tr>
              <td>{{ p.purchaseNo }}</td>
              <td>{{ p.purchaseDate }}</td>
              <td>{{ p.supplierName }}</td>
              <td>{{ p.invoiceNumber || '—' }}</td>
              <td>{{ p.netAmount | number:'1.2-2' }}</td>
              <td><p-tag [value]="p.status" [severity]="p.status === 'Cancelled' ? 'secondary' : 'success'" [rounded]="true" /></td>
              <td>
                <div class="flex items-center justify-end gap-1">
                  @if (p.status !== 'Cancelled') {
                    <p-button icon="pi pi-times-circle" [text]="true" [rounded]="true" size="small" severity="danger" ariaLabel="Cancel purchase" pTooltip="Cancel" (onClick)="cancel(p)" />
                  }
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template #emptymessage><tr><td colspan="7" class="empty">No purchases recorded yet.</td></tr></ng-template>
        </p-table>
      </div>
    } @else {
      <form [formGroup]="form" (ngSubmit)="save()" class="card form-card">
        <div class="grid grid-cols-1 gap-x-3.5 sm:grid-cols-2 lg:grid-cols-3">
          <div class="field"><label>Purchase Date <span class="req">*</span></label><app-date-picker formControlName="purchaseDate"/></div>
          <div class="field"><label>Supplier <span class="req">*</span></label>
            <p-select class="w-full" [options]="suppliers()" optionLabel="supplierName" optionValue="supplierId"
                      placeholder="Select…" [filter]="true" filterBy="supplierName" appendTo="body" formControlName="supplierId" />
          </div>
          <div class="field"><label for="pu-inv">Supplier Invoice #</label><input pInputText id="pu-inv" class="w-full" formControlName="invoiceNumber" /></div>
        </div>
        <div class="field"><label for="pu-remarks">Remarks</label><input pInputText id="pu-remarks" class="w-full" formControlName="remarks" /></div>

        <div class="w-full overflow-x-auto">
          <table class="lines-table">
            <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Discount</th><th>Tax</th><th>Net</th><th></th></tr></thead>
            <tbody formArrayName="details">
              @for (line of details.controls; track $index; let i = $index) {
                <tr [formGroupName]="i">
                  <td class="min-w-[13rem]">
                    <p-select class="w-full" [options]="items()" optionLabel="itemName" optionValue="itemId"
                              placeholder="Select item…" [filter]="true" filterBy="itemName" appendTo="body" formControlName="itemId" />
                  </td>
                  <td><p-inputnumber styleClass="w-24" inputStyleClass="w-24" [minFractionDigits]="0" [maxFractionDigits]="2" formControlName="quantity" /></td>
                  <td><p-inputnumber styleClass="w-28" inputStyleClass="w-28" [minFractionDigits]="0" [maxFractionDigits]="2" formControlName="purchasePrice" /></td>
                  <td><p-inputnumber styleClass="w-24" inputStyleClass="w-24" [minFractionDigits]="0" [maxFractionDigits]="2" formControlName="discount" /></td>
                  <td><p-inputnumber styleClass="w-24" inputStyleClass="w-24" [minFractionDigits]="0" [maxFractionDigits]="2" formControlName="tax" /></td>
                  <td class="net">{{ lineNet(i) | number:'1.2-2' }}</td>
                  <td><p-button type="button" icon="pi pi-times" [text]="true" [rounded]="true" size="small" severity="danger" ariaLabel="Remove line" pTooltip="Remove" (onClick)="removeLine(i)" /></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <p-button type="button" class="add-line" label="Add Line" icon="pi pi-plus" severity="secondary" [outlined]="true" size="small" (onClick)="addLine()" />

        <div class="totals">
          <div><span>Gross</span><strong>{{ totals().gross | number:'1.2-2' }}</strong></div>
          <div><span>Discount</span><strong>{{ totals().discount | number:'1.2-2' }}</strong></div>
          <div><span>Tax</span><strong>{{ totals().tax | number:'1.2-2' }}</strong></div>
          <div class="net-total"><span>Net Amount</span><strong>{{ totals().net | number:'1.2-2' }}</strong></div>
        </div>

        @if (formError()) { <div class="alert-err">{{ formError() }}</div> }
        <div class="form-ft flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <p-button type="button" label="Cancel" severity="secondary" [outlined]="true" (onClick)="view.set('list')" />
          <p-button type="submit" [label]="saving() ? 'Saving…' : 'Save Purchase'" icon="pi pi-check" [loading]="saving()" [disabled]="saving()" />
        </div>
      </form>
    }
  `,
  styles: [`
    .card { background:var(--surface); border:1px solid var(--border); border-radius:14px; overflow:hidden; }
    .form-card { padding:20px; }
    .field { display:flex; flex-direction:column; gap:5px; margin-bottom:14px; }
    .field > label { font-size:11px; font-weight:700; color:var(--t3); text-transform:uppercase; letter-spacing:.5px; }
    .req { color:var(--red); }
    .lines-table { width:100%; border-collapse:collapse; margin:12px 0; }
    .lines-table th { text-align:left; font-size:11px; text-transform:uppercase; color:var(--t4); padding:6px 8px; border-bottom:1px solid var(--border); }
    .lines-table td { padding:5px 8px; }
    .net { font-weight:600; color:var(--t1); white-space:nowrap; }
    .add-line { display:inline-block; margin-bottom:16px; }
    .totals { display:flex; flex-wrap:wrap; gap:24px; justify-content:flex-end; padding:14px 0; border-top:1px solid var(--border); margin-top:8px; }
    .totals div { display:flex; flex-direction:column; align-items:flex-end; font-size:12px; color:var(--t4); }
    .totals strong { font-size:14px; color:var(--t1); }
    .net-total strong { color:var(--accent); font-size:16px; }
    .form-ft { padding-top:12px; border-top:1px solid var(--border); }
    .empty { text-align:center; color:var(--t4); padding:32px 0; font-size:13px; }
    .alert-err { background:#fee2e2; color:#dc2626; border:1px solid #dc2626; border-radius:8px; padding:10px 14px; font-size:13px; margin-bottom:10px; }
  `]
})
export class PurchasesComponent implements OnInit {
  private purchaseSvc = inject(PurchaseService);
  private invSvc = inject(InventoryService);
  private fb = inject(FormBuilder);

  view = signal<'list' | 'new'>('list');
  purchases = signal<PurchaseDto[]>([]);
  items = signal<ItemDto[]>([]);
  suppliers = signal<SupplierDto[]>([]);
  saving = signal(false);
  formError = signal('');

  form = this.fb.group({
    purchaseDate: [new Date().toISOString().slice(0, 10), Validators.required],
    supplierId: [null as number | null, Validators.required],
    invoiceNumber: [''],
    remarks: [''],
    details: this.fb.array([])
  });
  get details() { return this.form.get('details') as FormArray; }

  ngOnInit() {
    this.invSvc.getItems(undefined, undefined, true).subscribe(i => this.items.set(i));
    this.invSvc.getSuppliers(undefined, true).subscribe(s => this.suppliers.set(s));
    this.load();
  }
  load() { this.purchaseSvc.getPurchases().subscribe(p => this.purchases.set(p)); }

  newLine() {
    return this.fb.group({
      itemId: [null as number | null, Validators.required],
      quantity: [1, Validators.required],
      purchasePrice: [0, Validators.required],
      discount: [0],
      tax: [0]
    });
  }
  addLine() { this.details.push(this.newLine()); }
  removeLine(i: number) { this.details.removeAt(i); }

  lineNet(i: number): number {
    const v = this.details.at(i).value;
    return (v.quantity || 0) * (v.purchasePrice || 0) - (v.discount || 0) + (v.tax || 0);
  }

  // Plain method (not a computed signal) — reactive forms aren't signal-based, so this
  // is re-evaluated on every change-detection pass, which input/select (input) events trigger.
  totals(): { gross: number; discount: number; tax: number; net: number } {
    let gross = 0, discount = 0, tax = 0, net = 0;
    for (let i = 0; i < this.details.length; i++) {
      const v = this.details.at(i).value;
      gross += (v.quantity || 0) * (v.purchasePrice || 0);
      discount += v.discount || 0;
      tax += v.tax || 0;
      net += this.lineNet(i);
    }
    return { gross, discount, tax, net };
  }

  openNew() {
    this.form.reset({ purchaseDate: new Date().toISOString().slice(0, 10) });
    this.details.clear();
    this.addLine();
    this.formError.set('');
    this.view.set('new');
  }

  save() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.details.length === 0) { this.formError.set('Add at least one valid line.'); return; }
    this.saving.set(true); this.formError.set('');
    const v = this.form.value;
    this.purchaseSvc.createPurchase({
      purchaseDate: v.purchaseDate!, supplierId: v.supplierId!, invoiceNumber: v.invoiceNumber || null, remarks: v.remarks || null,
      details: (v.details as any[]).map(d => ({ itemId: d.itemId, quantity: d.quantity, purchasePrice: d.purchasePrice, discount: d.discount || 0, tax: d.tax || 0 }))
    }).subscribe({
      next: () => { this.saving.set(false); this.view.set('list'); this.load(); },
      error: (e: any) => { this.saving.set(false); this.formError.set(e?.error?.error ?? 'Save failed.'); }
    });
  }

  cancel(p: PurchaseDto) {
    if (!confirm(`Cancel purchase ${p.purchaseNo}? This will reverse the stock it added.`)) return;
    this.purchaseSvc.cancelPurchase(p.purchaseId).subscribe(() => this.load());
  }
}
