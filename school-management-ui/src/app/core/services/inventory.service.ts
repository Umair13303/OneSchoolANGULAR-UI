import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  ItemCategoryDto, SaveItemCategoryDto, UnitDto, SaveUnitDto, TaxDto, SaveTaxDto,
  ItemDto, CreateItemDto, UpdateItemDto, PosLookupDto,
  SupplierDto, SaveSupplierDto,
  PackageDto, CreatePackageDto, UpdatePackageDto
} from '../models/inventory.model';

/// Master data + Item Master + Supplier + Package CRUD — the non-transactional side of the Inventory & POS module.
@Injectable({ providedIn: 'root' })
export class InventoryService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/inventory`;

  // ── Categories ─────────────────────────────────────────────────────────────
  getCategories()                                        { return this.http.get<ItemCategoryDto[]>(`${this.base}/categories`); }
  createCategory(dto: SaveItemCategoryDto)               { return this.http.post<ItemCategoryDto>(`${this.base}/categories`, dto); }
  updateCategory(id: number, dto: SaveItemCategoryDto)   { return this.http.put(`${this.base}/categories/${id}`, dto); }
  deleteCategory(id: number)                             { return this.http.delete(`${this.base}/categories/${id}`); }

  // ── Units ──────────────────────────────────────────────────────────────────
  getUnits()                                             { return this.http.get<UnitDto[]>(`${this.base}/units`); }
  createUnit(dto: SaveUnitDto)                           { return this.http.post<UnitDto>(`${this.base}/units`, dto); }
  updateUnit(id: number, dto: SaveUnitDto)               { return this.http.put(`${this.base}/units/${id}`, dto); }
  deleteUnit(id: number)                                 { return this.http.delete(`${this.base}/units/${id}`); }

  // ── Tax ────────────────────────────────────────────────────────────────────
  getTaxes()                                             { return this.http.get<TaxDto[]>(`${this.base}/taxes`); }
  createTax(dto: SaveTaxDto)                             { return this.http.post<TaxDto>(`${this.base}/taxes`, dto); }
  updateTax(id: number, dto: SaveTaxDto)                 { return this.http.put(`${this.base}/taxes/${id}`, dto); }
  deleteTax(id: number)                                  { return this.http.delete(`${this.base}/taxes/${id}`); }

  // ── Items ──────────────────────────────────────────────────────────────────
  getItems(categoryId?: number, search?: string, activeOnly = false) {
    let p = new HttpParams().set('activeOnly', activeOnly);
    if (categoryId) p = p.set('categoryId', categoryId);
    if (search)     p = p.set('search', search);
    return this.http.get<ItemDto[]>(`${this.base}/items`, { params: p });
  }
  getItem(id: number)                                    { return this.http.get<ItemDto>(`${this.base}/items/${id}`); }
  getItemByBarcode(barcode: string)                      { return this.http.get<ItemDto>(`${this.base}/items/barcode/${barcode}`); }
  posSearch(term: string) {
    return this.http.get<PosLookupDto[]>(`${this.base}/items/pos-search`, { params: new HttpParams().set('term', term) });
  }
  createItem(dto: CreateItemDto)                         { return this.http.post<ItemDto>(`${this.base}/items`, dto); }
  updateItem(id: number, dto: UpdateItemDto)             { return this.http.put(`${this.base}/items/${id}`, dto); }
  deleteItem(id: number)                                 { return this.http.delete(`${this.base}/items/${id}`); }
  toggleItemStatus(id: number)                           { return this.http.patch(`${this.base}/items/${id}/toggle-status`, {}); }

  // ── Suppliers ──────────────────────────────────────────────────────────────
  getSuppliers(search?: string, activeOnly = false) {
    let p = new HttpParams().set('activeOnly', activeOnly);
    if (search) p = p.set('search', search);
    return this.http.get<SupplierDto[]>(`${this.base}/suppliers`, { params: p });
  }
  getSupplier(id: number)                                { return this.http.get<SupplierDto>(`${this.base}/suppliers/${id}`); }
  createSupplier(dto: SaveSupplierDto)                   { return this.http.post<SupplierDto>(`${this.base}/suppliers`, dto); }
  updateSupplier(id: number, dto: SaveSupplierDto)       { return this.http.put(`${this.base}/suppliers/${id}`, dto); }
  deleteSupplier(id: number)                             { return this.http.delete(`${this.base}/suppliers/${id}`); }

  // ── Packages ───────────────────────────────────────────────────────────────
  getPackages(activeOnly = false) {
    return this.http.get<PackageDto[]>(`${this.base}/packages`, { params: new HttpParams().set('activeOnly', activeOnly) });
  }
  getPackage(id: number)                                 { return this.http.get<PackageDto>(`${this.base}/packages/${id}`); }
  createPackage(dto: CreatePackageDto)                   { return this.http.post<PackageDto>(`${this.base}/packages`, dto); }
  updatePackage(id: number, dto: UpdatePackageDto)       { return this.http.put(`${this.base}/packages/${id}`, dto); }
  deletePackage(id: number)                              { return this.http.delete(`${this.base}/packages/${id}`); }
}
