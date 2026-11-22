import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { InventoryReportService } from '../../../core/services/inventory-report.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-inventory-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageHeaderComponent, Button, Select, InputText, InputNumber, ToggleSwitch],
  template: `
    <app-page-header title="Inventory &amp; POS Settings" subtitle="Configuration for costing, barcode, packages and student sales" />

    <form [formGroup]="form" (ngSubmit)="save()" class="card form-card">
      <div class="grid grid-cols-1 gap-x-3.5 sm:grid-cols-3">
        <div class="field">
          <label>Costing Method</label>
          <p-select class="w-full" [options]="costingOptions" optionLabel="label" optionValue="value"
                    appendTo="body" formControlName="costingMethod" />
        </div>
        <div class="field"><label for="is-cur">Default Currency</label><input pInputText id="is-cur" class="w-full" formControlName="defaultCurrency" /></div>
        <div class="field"><label for="is-tax">Default Tax %</label>
          <p-inputnumber inputId="is-tax" styleClass="w-full" inputStyleClass="w-full" [minFractionDigits]="0" [maxFractionDigits]="2" formControlName="defaultTaxPercentage" />
        </div>
      </div>

      <div class="toggles">
        @for (t of toggles; track t.key) {
          <label class="toggle" [for]="'is-' + t.key">
            <p-toggleswitch [inputId]="'is-' + t.key" [formControlName]="t.key" />
            {{ t.label }}
          </label>
        }
      </div>

      @if (saved()) { <div class="alert-ok">Settings saved.</div> }
      @if (error()) { <div class="alert-err">{{ error() }}</div> }
      <p-button type="submit" [label]="saving() ? 'Saving…' : 'Save Settings'" icon="pi pi-check" [loading]="saving()" [disabled]="saving()" />
    </form>
  `,
  styles: [`
    .card { background:var(--surface); border:1px solid var(--border); border-radius:14px; }
    .form-card { padding:24px; max-width:640px; }
    .field { display:flex; flex-direction:column; gap:5px; margin-bottom:16px; }
    .field > label { font-size:11px; font-weight:700; color:var(--t3); text-transform:uppercase; letter-spacing:.5px; }
    .toggles { display:flex; flex-direction:column; gap:12px; margin:8px 0 20px; }
    .toggle { display:flex; align-items:center; gap:10px; font-size:13px; font-weight:500; color:var(--t2); cursor:pointer; }
    .alert-ok { background:#dcfce7; color:#16a34a; border:1px solid #16a34a; border-radius:8px; padding:10px 14px; font-size:13px; margin-bottom:14px; }
    .alert-err { background:#fee2e2; color:#dc2626; border:1px solid #dc2626; border-radius:8px; padding:10px 14px; font-size:13px; margin-bottom:14px; }
  `]
})
export class InventorySettingsComponent implements OnInit {
  private svc = inject(InventoryReportService);
  private fb = inject(FormBuilder);

  costingOptions = [{ label: 'Weighted Average', value: 'WeightedAverage' }, { label: 'Last Purchase Cost', value: 'LastPurchaseCost' }];
  toggles = [
    { key: 'barcodeEnabled', label: 'Barcode Enabled' },
    { key: 'autoBarcode', label: 'Auto-generate Barcodes' },
    { key: 'packageEnabled', label: 'Packages Enabled' },
    { key: 'studentSalesEnabled', label: 'Student Sales Enabled' },
    { key: 'negativeStockAllowed', label: 'Allow Negative Stock' },
    { key: 'autoInvoiceNumber', label: 'Auto Invoice Numbering' }
  ];

  saving = signal(false);
  saved = signal(false);
  error = signal('');

  form = this.fb.group({
    costingMethod: ['WeightedAverage', Validators.required],
    defaultCurrency: ['PKR', Validators.required],
    defaultTaxPercentage: [0],
    barcodeEnabled: [true],
    autoBarcode: [false],
    packageEnabled: [true],
    studentSalesEnabled: [true],
    negativeStockAllowed: [false],
    autoInvoiceNumber: [true]
  });

  ngOnInit() {
    this.svc.getSettings().subscribe(s => this.form.patchValue(s));
  }

  save() {
    this.saving.set(true); this.saved.set(false); this.error.set('');
    this.svc.updateSettings(this.form.value as any).subscribe({
      next: () => { this.saving.set(false); this.saved.set(true); },
      error: (e: any) => { this.saving.set(false); this.error.set(e?.error?.error ?? 'Save failed.'); }
    });
  }
}
