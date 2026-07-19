import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { StaffDto, CreateStaffDto, CreateStaffLoginDto, StaffDocumentDto, TagStaffDocumentDto } from '../models/staff.model';

@Injectable({ providedIn: 'root' })
export class StaffService {
  private base = `${environment.apiUrl}/staff`;
  constructor(private http: HttpClient) {}

  getAll(search?: string, department?: string, status?: string) {
    let params = new HttpParams();
    if (search)     params = params.set('search', search);
    if (department) params = params.set('department', department);
    if (status)     params = params.set('status', status);
    return this.http.get<StaffDto[]>(this.base, { params });
  }

  getById(id: number)                        { return this.http.get<StaffDto>(`${this.base}/${id}`); }
  create(dto: CreateStaffDto)                { return this.http.post<StaffDto>(this.base, dto); }
  update(id: number, dto: CreateStaffDto)    { return this.http.put<void>(`${this.base}/${id}`, dto); }
  delete(id: number)                         { return this.http.delete<void>(`${this.base}/${id}`); }
  createLogin(id: number, dto: CreateStaffLoginDto) { return this.http.post<StaffDto>(`${this.base}/${id}/create-login`, dto); }

  getDocuments(id: number)                       { return this.http.get<StaffDocumentDto[]>(`${this.base}/${id}/documents`); }
  tagDocument(id: number, dto: TagStaffDocumentDto) { return this.http.post<StaffDocumentDto>(`${this.base}/${id}/documents`, dto); }
  removeDocument(id: number, fileId: number)     { return this.http.delete<void>(`${this.base}/${id}/documents/${fileId}`); }
}
