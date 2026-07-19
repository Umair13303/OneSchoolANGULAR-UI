import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  PurchaseDto, CreatePurchaseDto, PurchaseReturnDto, CreatePurchaseReturnDto
} from '../models/inventory.model';

@Injectable({ providedIn: 'root' })
export class PurchaseService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/inventory`;

  getPurchases(from?: string, to?: string, supplierId?: number) {
    let p = new HttpParams();
    if (from) p = p.set('from', from);
    if (to)   p = p.set('to', to);
    if (supplierId) p = p.set('supplierId', supplierId);
    return this.http.get<PurchaseDto[]>(`${this.base}/purchases`, { params: p });
  }
  getPurchase(id: number)                    { return this.http.get<PurchaseDto>(`${this.base}/purchases/${id}`); }
  createPurchase(dto: CreatePurchaseDto)     { return this.http.post<PurchaseDto>(`${this.base}/purchases`, dto); }
  cancelPurchase(id: number)                 { return this.http.post(`${this.base}/purchases/${id}/cancel`, {}); }

  getPurchaseReturns()                       { return this.http.get<PurchaseReturnDto[]>(`${this.base}/purchase-returns`); }
  getPurchaseReturn(id: number)              { return this.http.get<PurchaseReturnDto>(`${this.base}/purchase-returns/${id}`); }
  createPurchaseReturn(dto: CreatePurchaseReturnDto) { return this.http.post<PurchaseReturnDto>(`${this.base}/purchase-returns`, dto); }
}
