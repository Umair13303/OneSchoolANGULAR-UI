import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryReportService } from '../../../core/services/inventory-report.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';

interface ColumnDef { key: string; label: string; money?: boolean; }
interface ReportDef { value: string; label: string; group: string; columns: ColumnDef[]; needsGroupBy?: boolean; }

const REPORTS: ReportDef[] = [
  { value: 'purchaseSummary', label: 'Purchase Summary', group: 'Purchase',
    columns: [{ key: 'purchaseNo', label: 'Purchase No' }, { key: 'purchaseDate', label: 'Date' }, { key: 'supplierName', label: 'Supplier' },
              { key: 'grossAmount', label: 'Gross', money: true }, { key: 'discountAmount', label: 'Discount', money: true }, { key: 'taxAmount', label: 'Tax', money: true }, { key: 'netAmount', label: 'Net', money: true }] },
  { value: 'purchaseDetail', label: 'Purchase Detail', group: 'Purchase',
    columns: [{ key: 'purchaseDate', label: 'Date' }, { key: 'purchaseNo', label: 'Purchase No' }, { key: 'supplierName', label: 'Supplier' },
              { key: 'itemName', label: 'Item' }, { key: 'quantity', label: 'Qty' }, { key: 'purchasePrice', label: 'Price', money: true }, { key: 'netAmount', label: 'Net', money: true }] },
  { value: 'supplierPurchase', label: 'Supplier Purchase Report', group: 'Purchase',
    columns: [{ key: 'label', label: 'Supplier' }, { key: 'invoiceCount', label: 'Purchases' }, { key: 'grossAmount', label: 'Gross', money: true }, { key: 'netAmount', label: 'Net', money: true }] },

  { value: 'salesDay', label: 'Daily Sales', group: 'Sales', needsGroupBy: true,
    columns: [{ key: 'label', label: 'Date' }, { key: 'invoiceCount', label: 'Invoices' }, { key: 'quantity', label: 'Qty' }, { key: 'grossAmount', label: 'Gross', money: true }, { key: 'netAmount', label: 'Net', money: true }] },
  { value: 'salesMonth', label: 'Monthly Sales', group: 'Sales', needsGroupBy: true,
    columns: [{ key: 'label', label: 'Month' }, { key: 'invoiceCount', label: 'Invoices' }, { key: 'quantity', label: 'Qty' }, { key: 'grossAmount', label: 'Gross', money: true }, { key: 'netAmount', label: 'Net', money: true }] },
  { value: 'salesItem', label: 'Sales by Item', group: 'Sales', needsGroupBy: true,
    columns: [{ key: 'label', label: 'Item' }, { key: 'quantity', label: 'Qty Sold' }, { key: 'netAmount', label: 'Net', money: true }] },
  { value: 'salesStudent', label: 'Sales by Student', group: 'Sales', needsGroupBy: true,
    columns: [{ key: 'label', label: 'Student' }, { key: 'invoiceCount', label: 'Invoices' }, { key: 'netAmount', label: 'Net', money: true }] },
  { value: 'salesUser', label: 'Sales by User', group: 'Sales', needsGroupBy: true,
    columns: [{ key: 'label', label: 'Cashier' }, { key: 'invoiceCount', label: 'Invoices' }, { key: 'netAmount', label: 'Net', money: true }] },

  { value: 'stockBalance', label: 'Stock Balance', group: 'Inventory',
    columns: [{ key: 'itemCode', label: 'Code' }, { key: 'itemName', label: 'Item' }, { key: 'categoryName', label: 'Category' }, { key: 'quantityOnHand', label: 'Qty' }, { key: 'stockValue', label: 'Value', money: true }] },
  { value: 'lowStock', label: 'Low Stock', group: 'Inventory',
    columns: [{ key: 'itemCode', label: 'Code' }, { key: 'itemName', label: 'Item' }, { key: 'quantityOnHand', label: 'Qty' }, { key: 'reorderLevel', label: 'Reorder Lvl' }] },
  { value: 'outOfStock', label: 'Out of Stock', group: 'Inventory',
    columns: [{ key: 'itemCode', label: 'Code' }, { key: 'itemName', label: 'Item' }, { key: 'categoryName', label: 'Category' }] },
  { value: 'stockValuation', label: 'Stock Valuation', group: 'Inventory',
    columns: [{ key: 'itemName', label: 'Item' }, { key: 'categoryName', label: 'Category' }, { key: 'quantityOnHand', label: 'Qty' }, { key: 'averageCost', label: 'Avg Cost', money: true }, { key: 'stockValue', label: 'Value', money: true }] },

  { value: 'profitByItem', label: 'Profit by Item', group: 'Financial',
    columns: [{ key: 'label', label: 'Item' }, { key: 'quantitySold', label: 'Qty Sold' }, { key: 'saleAmount', label: 'Sales', money: true }, { key: 'costAmount', label: 'Cost', money: true }, { key: 'profit', label: 'Profit', money: true }, { key: 'marginPercent', label: 'Margin %' }] },
  { value: 'profitByCategory', label: 'Profit by Category', group: 'Financial',
    columns: [{ key: 'label', label: 'Category' }, { key: 'quantitySold', label: 'Qty Sold' }, { key: 'saleAmount', label: 'Sales', money: true }, { key: 'costAmount', label: 'Cost', money: true }, { key: 'profit', label: 'Profit', money: true }, { key: 'marginPercent', label: 'Margin %' }] },

  { value: 'packageSales', label: 'Package Sales', group: 'Package',
    columns: [{ key: 'packageName', label: 'Package' }, { key: 'invoiceCount', label: 'Invoices' }, { key: 'quantitySold', label: 'Qty Sold' }, { key: 'netAmount', label: 'Net', money: true }] },
  { value: 'packagePerformance', label: 'Package Performance', group: 'Package',
    columns: [{ key: 'packageName', label: 'Package' }, { key: 'invoiceCount', label: 'Invoices' }, { key: 'quantitySold', label: 'Qty Sold' }, { key: 'netAmount', label: 'Net', money: true }] },
];

@Component({
  selector: 'app-inventory-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, DatePickerComponent],
  template: `
    <app-page-header title="Reports" subtitle="Purchase, Sales, Inventory, Financial and Package reports" />

    <div class="toolbar">
      <select [(ngModel)]="reportKey" (ngModelChange)="run()">
        @for (grp of groups; track grp) {
          <optgroup [label]="grp">
            @for (r of reportsIn(grp); track r.value) { <option [value]="r.value">{{ r.label }}</option> }
          </optgroup>
        }
      </select>
      <app-date-picker [(ngModel)]="from"/>
      <app-date-picker [(ngModel)]="to"/>
      <button class="btn-primary" (click)="run()">Run Report</button>
      <div class="grow"></div>
      @if (grossProfitSummary()) {
        <div class="mini-summary">
          Overall Profit: <strong>{{ grossProfitSummary()!.profit | number:'1.2-2' }}</strong> ({{ grossProfitSummary()!.marginPercent }}% margin)
        </div>
      }
    </div>

    <div class="card">
      <table class="table">
        <thead><tr>@for (c of currentDef().columns; track c.key) { <th>{{ c.label }}</th> }</tr></thead>
        <tbody>
          @for (row of rows(); track $index) {
            <tr>
              @for (c of currentDef().columns; track c.key) {
                <td>{{ c.money ? (row[c.key] | number:'1.2-2') : row[c.key] }}</td>
              }
            </tr>
          }
          @if (!rows().length) { <tr><td [attr.colspan]="currentDef().columns.length" class="empty">{{ loading() ? 'Loading…' : 'No data for the selected filters.' }}</td></tr> }
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .toolbar { display:flex; gap:10px; align-items:center; margin-bottom:16px; flex-wrap:wrap; }
    .toolbar select, .toolbar input { padding:9px 12px; border:1.5px solid var(--border); border-radius:8px; font-size:13px; background:var(--surface); color:var(--t1); }
    .grow { flex:1; }
    .mini-summary { font-size:13px; color:var(--t3); }
    .mini-summary strong { color:var(--t1); }
    .card { background:var(--surface); border:1px solid var(--border); border-radius:14px; overflow:hidden; }
    .empty { text-align:center; color:var(--t4); padding:32px 0; font-size:13px; }
  `]
})
export class InventoryReportsComponent implements OnInit {
  private svc = inject(InventoryReportService);

  reports = REPORTS;
  groups = ['Purchase', 'Sales', 'Inventory', 'Financial', 'Package'];
  reportsIn(g: string) { return this.reports.filter(r => r.group === g); }

  reportKey = 'purchaseSummary';
  from = '';
  to = '';
  rows = signal<any[]>([]);
  loading = signal(false);
  grossProfitSummary = signal<{ profit: number; marginPercent: number } | null>(null);

  currentDef(): ReportDef { return this.reports.find(r => r.value === this.reportKey)!; }

  ngOnInit() { this.run(); }

  run() {
    this.loading.set(true); this.rows.set([]); this.grossProfitSummary.set(null);
    const from = this.from || undefined, to = this.to || undefined;

    switch (this.reportKey) {
      case 'purchaseSummary':   this.load(this.svc.getPurchaseSummary(from, to)); break;
      case 'purchaseDetail':    this.load(this.svc.getPurchaseDetail(from, to)); break;
      case 'supplierPurchase':  this.load(this.svc.getSupplierPurchaseReport(from, to)); break;
      case 'salesDay':          this.load(this.svc.getSalesReport('Day', from, to)); break;
      case 'salesMonth':        this.load(this.svc.getSalesReport('Month', from, to)); break;
      case 'salesItem':         this.load(this.svc.getSalesReport('Item', from, to)); break;
      case 'salesStudent':      this.load(this.svc.getSalesReport('Student', from, to)); break;
      case 'salesUser':         this.load(this.svc.getSalesReport('User', from, to)); break;
      case 'stockBalance':      this.load(this.svc.getStockBalance()); break;
      case 'lowStock':          this.load(this.svc.getLowStock()); break;
      case 'outOfStock':        this.load(this.svc.getOutOfStock()); break;
      case 'stockValuation':    this.load(this.svc.getStockValuation()); break;
      case 'profitByItem':      this.load(this.svc.getProfitByItem(from, to)); this.loadGrossProfit(from, to); break;
      case 'profitByCategory':  this.load(this.svc.getProfitByCategory(from, to)); this.loadGrossProfit(from, to); break;
      case 'packageSales':      this.load(this.svc.getPackageSales(from, to)); break;
      case 'packagePerformance':this.load(this.svc.getPackagePerformance(from, to)); break;
    }
  }

  private load(obs: any) {
    obs.subscribe({
      next: (data: any) => { this.rows.set(Array.isArray(data) ? data : [data]); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  private loadGrossProfit(from?: string, to?: string) {
    this.svc.getGrossProfit(from, to).subscribe(p => this.grossProfitSummary.set({ profit: p.profit, marginPercent: p.marginPercent }));
  }
}
