import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  PurchaseSummaryRowDto, PurchaseDetailRowDto, SalesSummaryRowDto,
  CurrentStockDto, StockLedgerDto, StockValuationRowDto,
  ProfitRowDto, PackageSalesRowDto,
  InventorySettingsDto, UpdateInventorySettingsDto
} from '../models/inventory.model';

@Injectable({ providedIn: 'root' })
export class InventoryReportService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/inventory/reports`;
  private settingsBase = `${environment.apiUrl}/inventory/settings`;

  private dateParams(from?: string, to?: string, extra: Record<string, string | number> = {}) {
    let p = new HttpParams();
    if (from) p = p.set('from', from);
    if (to)   p = p.set('to', to);
    for (const k of Object.keys(extra)) p = p.set(k, extra[k]);
    return p;
  }

  // ── Purchase Reports ─────────────────────────────────────────────────────
  getPurchaseSummary(from?: string, to?: string, supplierId?: number) {
    return this.http.get<PurchaseSummaryRowDto[]>(`${this.base}/purchase-summary`, { params: this.dateParams(from, to, supplierId ? { supplierId } : {}) });
  }
  getPurchaseDetail(from?: string, to?: string, supplierId?: number) {
    return this.http.get<PurchaseDetailRowDto[]>(`${this.base}/purchase-detail`, { params: this.dateParams(from, to, supplierId ? { supplierId } : {}) });
  }
  getSupplierPurchaseReport(from?: string, to?: string) {
    return this.http.get<SalesSummaryRowDto[]>(`${this.base}/supplier-purchase`, { params: this.dateParams(from, to) });
  }

  // ── Sales Reports ────────────────────────────────────────────────────────
  getSalesReport(groupBy: 'Day' | 'Month' | 'Item' | 'Student' | 'User', from?: string, to?: string) {
    return this.http.get<SalesSummaryRowDto[]>(`${this.base}/sales`, { params: this.dateParams(from, to, { groupBy }) });
  }

  // ── Inventory Reports ────────────────────────────────────────────────────
  getStockBalance()   { return this.http.get<CurrentStockDto[]>(`${this.base}/stock-balance`); }
  getStockLedger(itemId?: number, from?: string, to?: string) {
    return this.http.get<StockLedgerDto[]>(`${this.base}/stock-ledger`, { params: this.dateParams(from, to, itemId ? { itemId } : {}) });
  }
  getLowStock()       { return this.http.get<CurrentStockDto[]>(`${this.base}/low-stock`); }
  getOutOfStock()     { return this.http.get<CurrentStockDto[]>(`${this.base}/out-of-stock`); }
  getStockValuation() { return this.http.get<StockValuationRowDto[]>(`${this.base}/stock-valuation`); }

  // ── Financial Reports ────────────────────────────────────────────────────
  getGrossProfit(from?: string, to?: string)     { return this.http.get<ProfitRowDto>(`${this.base}/gross-profit`, { params: this.dateParams(from, to) }); }
  getProfitByItem(from?: string, to?: string)     { return this.http.get<ProfitRowDto[]>(`${this.base}/profit-by-item`, { params: this.dateParams(from, to) }); }
  getProfitByCategory(from?: string, to?: string) { return this.http.get<ProfitRowDto[]>(`${this.base}/profit-by-category`, { params: this.dateParams(from, to) }); }

  // ── Package Reports ──────────────────────────────────────────────────────
  getPackageSales(from?: string, to?: string)       { return this.http.get<PackageSalesRowDto[]>(`${this.base}/package-sales`, { params: this.dateParams(from, to) }); }
  getPackagePerformance(from?: string, to?: string) { return this.http.get<PackageSalesRowDto[]>(`${this.base}/package-performance`, { params: this.dateParams(from, to) }); }

  // ── Settings ─────────────────────────────────────────────────────────────
  getSettings()                                     { return this.http.get<InventorySettingsDto>(this.settingsBase); }
  updateSettings(dto: UpdateInventorySettingsDto)    { return this.http.put<InventorySettingsDto>(this.settingsBase, dto); }
}
