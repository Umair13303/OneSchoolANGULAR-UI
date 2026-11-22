import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormArray, Validators } from '@angular/forms';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import { Tag } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { Tooltip } from 'primeng/tooltip';
import { PurchaseService } from '../../../core/services/purchase.service';
import { InventoryService } from '../../../core/services/inventory.service';
import { PurchaseReturnDto, ItemDto, SupplierDto } from '../../../core/models/inventory.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';

@Component({
  selector: 'app-purchase-returns',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, PageHeaderComponent, DatePickerComponent,
    Button, Select, InputText, InputNumber, Tag, TableModule, Tooltip
  ],
  template: `
    <app-page-header [title]="view() === 'list' ? 'Purchase Returns' : 'New Purchase Return'" subtitle="Return purchased items back to a supplier">
      @if (view() === 'list') {
        <p-button label="New Return" icon="pi pi-plus" (onClick)="openNew()" />
      } @else {
        <p-button label="Back to list" icon="pi pi-arrow-left" severity="secondary" [outlined]="true" (onClick)="view.set('list')" />
      }
    </app-page-header>

    @if (view() === 'list') {
      <div class="card">
        <p-table [value]="returns()" dataKey="purchaseReturnId" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '36rem' }" [scrollable]="true">
          <ng-template #header><tr><th>Return No</th><th>Date</th><th>Supplier</th><th>Net Amount</th><th>Status</th></tr></ng-template>
          <ng-template #body let-r>
            <tr>
              <td>{{ r.returnNo }}</td><td>{{ r.returnDate }}</td><td>{{ r.supplierName }}</td>
              <td>{{ r.netAmount | number:'1.2-2' }}</td>
              <td><p-tag [value]="r.status" severity="success" [rounded]="true" /></td>
            </tr>
          </ng-template>
          <ng-template #emptymessage><tr><td colspan="5" class="empty">No purchase returns recorded yet.</td></tr></ng-template>
        </p-table>
      </div>
    } @else {
      <form [formGroup]="form" (ngSubmit)="save()" class="card form-card">
        <div class="grid grid-cols-1 gap-x-3.5 sm:grid-cols-2">
          <div class="field"><label>Return Date <span class="req">*</span></label><app-date-picker formControlName="returnDate"/></div>
          <div class="field"><label>Supplier <span class="req">*</span></label>
            <p-select class="w-full" [options]="suppliers()" optionLabel="supplierName" optionValue="supplierId"
                      placeholder="Select…" [filter]="true" filterBy="supplierName" appendTo="body" formControlName="supplierId" />
          </div>
        </div>
        <div class="field"><label for="pr-remarks">Remarks</label><input pInputText id="pr-remarks" class="w-full" formControlName="remarks" /></div>

        <div class="w-full overflow-x-auto">
          <table class="lines-table">
            <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Net</th><th></th></tr></thead>
            <tbody formArrayName="details">
              @for (line of details.controls; track $index; let i = $index) {
                <tr [formGroupName]="i">
                  <td class="min-w-[13rem]">
                    <p-select class="w-full" [options]="items()" optionLabel="itemName" optionValue="itemId"
                              placeholder="Select item…" [filter]="true" filterBy="itemName" appendTo="body" formControlName="itemId" />
                  </td>
                  <td><p-inputnumber styleClass="w-24" inputStyleClass="w-24" [minFractionDigits]="0" [maxFractionDigits]="2" formControlName="quantity" /></td>
                  <td><p-inputnumber styleClass="w-28" inputStyleClass="w-28" [minFractionDigits]="0" [maxFractionDigits]="2" formControlName="price" /></td>
                  <td class="net">{{ lineNet(i) | number:'1.2-2' }}</td>
                  <td><p-button type="button" icon="pi pi-times" [text]="true" [rounded]="true" size="small" severity="danger" ariaLabel="Remove line" pTooltip="Remove" (onClick)="removeLine(i)" /></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <p-button type="button" class="add-line" label="Add Line" icon="pi pi-plus" severity="secondary" [outlined]="true" size="small" (onClick)="addLine()" />

        <div class="totals"><div class="net-total"><span>Net Amount</span><strong>{{ total() | number:'1.2-2' }}</strong></div></div>

        @if (formError()) { <div class="alert-err">{{ formError() }}</div> }
        <div class="form-ft flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <p-button type="button" label="Cancel" severity="secondary" [outlined]="true" (onClick)="view.set('list')" />
          <p-button type="submit" [label]="saving() ? 'Saving…' : 'Save Return'" icon="pi pi-check" [loading]="saving()" [disabled]="saving()" />
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
    .totals { display:flex; justify-content:flex-end; padding:14px 0; border-top:1px solid var(--border); margin-top:8px; }
    .net-total { display:flex; flex-direction:column; align-items:flex-end; font-size:12px; color:var(--t4); }
    .net-total strong { color:var(--accent); font-size:16px; }
    .form-ft { padding-top:12px; border-top:1px solid var(--border); }
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
