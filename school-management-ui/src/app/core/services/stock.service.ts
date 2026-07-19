import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  CurrentStockDto, StockLedgerDto, StockAdjustmentDto, CreateStockAdjustmentDto,
  StockTransferDto, CreateStockTransferDto
} from '../models/inventory.model';

@Injectable({ providedIn: 'root' })
export class StockService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/inventory/stock`;

  getCurrentStock(categoryId?: number, search?: string) {
    let p = new HttpParams();
    if (categoryId) p = p.set('categoryId', categoryId);
    if (search)     p = p.set('search', search);
    return this.http.get<CurrentStockDto[]>(`${this.base}/current`, { params: p });
  }
  getLowStock()       { return this.http.get<CurrentStockDto[]>(`${this.base}/low`); }
  getOutOfStock()     { return this.http.get<CurrentStockDto[]>(`${this.base}/out-of-stock`); }
  getValuation()      { return this.http.get<CurrentStockDto[]>(`${this.base}/valuation`); }

  getLedger(itemId?: number, from?: string, to?: string) {
    let p = new HttpParams();
    if (itemId) p = p.set('itemId', itemId);
    if (from)   p = p.set('from', from);
    if (to)     p = p.set('to', to);
    return this.http.get<StockLedgerDto[]>(`${this.base}/ledger`, { params: p });
  }

  getAdjustments()                                  { return this.http.get<StockAdjustmentDto[]>(`${this.base}/adjustments`); }
  createAdjustment(dto: CreateStockAdjustmentDto)    { return this.http.post<StockAdjustmentDto>(`${this.base}/adjustments`, dto); }

  getTransfers()                                     { return this.http.get<StockTransferDto[]>(`${this.base}/transfers`); }
  createTransfer(dto: CreateStockTransferDto)        { return this.http.post<StockTransferDto>(`${this.base}/transfers`, dto); }
}
