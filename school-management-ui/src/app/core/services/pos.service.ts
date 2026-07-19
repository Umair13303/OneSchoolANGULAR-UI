import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  PosLookupDto, SalesDto, CreateSaleDto, CompleteSaleDto,
  SalesReturnDto, CreateSalesReturnDto
} from '../models/inventory.model';

@Injectable({ providedIn: 'root' })
export class PosService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/pos`;
  private invBase = `${environment.apiUrl}/inventory`;

  search(term: string) {
    return this.http.get<PosLookupDto[]>(`${this.base}/search`, { params: new HttpParams().set('term', term) });
  }

  getSales(params: { from?: string; to?: string; cashierId?: number; studentId?: number; status?: string } = {}) {
    let p = new HttpParams();
    if (params.from)       p = p.set('from', params.from);
    if (params.to)         p = p.set('to', params.to);
    if (params.cashierId)  p = p.set('cashierId', params.cashierId);
    if (params.studentId)  p = p.set('studentId', params.studentId);
    if (params.status)     p = p.set('status', params.status);
    return this.http.get<SalesDto[]>(`${this.base}/sales`, { params: p });
  }
  getHeldInvoices()               { return this.http.get<SalesDto[]>(`${this.base}/sales/held`); }
  getSale(id: number)             { return this.http.get<SalesDto>(`${this.base}/sales/${id}`); }
  createSale(dto: CreateSaleDto)  { return this.http.post<SalesDto>(`${this.base}/sales`, dto); }
  resumeSale(id: number, dto: CompleteSaleDto) { return this.http.post<SalesDto>(`${this.base}/sales/${id}/resume`, dto); }
  voidHeld(id: number)            { return this.http.post(`${this.base}/sales/${id}/void`, {}); }

  // ── Sales Returns ────────────────────────────────────────────────────────
  getSalesReturns()                          { return this.http.get<SalesReturnDto[]>(`${this.invBase}/sales-returns`); }
  getSalesReturn(id: number)                 { return this.http.get<SalesReturnDto>(`${this.invBase}/sales-returns/${id}`); }
  createSalesReturn(dto: CreateSalesReturnDto) { return this.http.post<SalesReturnDto>(`${this.invBase}/sales-returns`, dto); }
}
