import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { InventoryReportService } from '../../../core/services/inventory-report.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-inventory-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageHeaderComponent],
  template: `
    <app-page-header title="Inventory &amp; POS Settings" subtitle="Configuration for costing, barcode, packages and student sales" />

    <form [formGroup]="form" (ngSubmit)="save()" class="card form-card">
      <div class="grid2">
        <div class="field">
          <label>Costing Method</label>
          <select formControlName="costingMethod">
            <option value="WeightedAverage">Weighted Average</option>
            <option value="LastPurchaseCost">Last Purchase Cost</option>
          </select>
        </div>
        <div class="field"><label>Default Currency</label><input formControlName="defaultCurrency" /></div>
        <div class="field"><label>Default Tax %</label><input type="number" step="0.01" formControlName="defaultTaxPercentage" /></div>
      </div>

      <div class="toggles">
        <label class="toggle"><input type="checkbox" formControlName="barcodeEnabled" /> Barcode Enabled</label>
        <label class="toggle"><input type="checkbox" formControlName="autoBarcode" /> Auto-generate Barcodes</label>
        <label class="toggle"><input type="checkbox" formControlName="packageEnabled" /> Packages Enabled</label>
        <label class="toggle"><input type="checkbox" formControlName="studentSalesEnabled" /> Student Sales Enabled</label>
        <label class="toggle"><input type="checkbox" formControlName="negativeStockAllowed" /> Allow Negative Stock</label>
        <label class="toggle"><input type="checkbox" formControlName="autoInvoiceNumber" /> Auto Invoice Numbering</label>
      </div>

      @if (saved()) { <div class="alert-ok">Settings saved.</div> }
      @if (error()) { <div class="alert-err">{{ error() }}</div> }
      <button type="submit" class="btn-primary" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save Settings' }}</button>
    </form>
  `,
  styles: [`
    .card { background:var(--surface); border:1px solid var(--border); border-radius:14px; }
    .form-card { padding:24px; max-width:640px; }
    .grid2 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:0 14px; }
    .field { display:flex; flex-direction:column; gap:5px; margin-bottom:16px; }
    label { font-size:11px; font-weight:700; color:var(--t3); text-transform:uppercase; letter-spacing:.5px; }
    input, select { padding:10px 12px; border:1.5px solid var(--border); border-radius:8px; font-size:13.5px; font-family:inherit; background:var(--surface); color:var(--t1); width:100%; }
    .toggles { display:flex; flex-direction:column; gap:12px; margin:8px 0 20px; }
    .toggle { display:flex; align-items:center; gap:10px; font-size:13px; font-weight:500; text-transform:none; color:var(--t2); }
    .toggle input { width:auto; }
    .alert-ok { background:#dcfce7; color:#16a34a; border:1px solid #16a34a; border-radius:8px; padding:10px 14px; font-size:13px; margin-bottom:14px; }
    .alert-err { background:#fee2e2; color:#dc2626; border:1px solid #dc2626; border-radius:8px; padding:10px 14px; font-size:13px; margin-bottom:14px; }
  `]
})
export class InventorySettingsComponent implements OnInit {
  private svc = inject(InventoryReportService);
  private fb = inject(FormBuilder);

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
