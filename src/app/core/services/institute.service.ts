import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  InstituteDto, CreateInstituteDto, CampusDto,
  CreateCampusDto, CreateCampusAdminDto, CampusAdminDto
} from '../models/institute.model';

@Injectable({ providedIn: 'root' })
export class InstituteService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Institutes
  getInstitutes()                          { return this.http.get<InstituteDto[]>(`${this.api}/institutes`); }
  getInstitute(id: number)                 { return this.http.get<InstituteDto>(`${this.api}/institutes/${id}`); }
  getMyInstitute(instituteId?: number)     {
    const params = instituteId ? `?instituteId=${instituteId}` : '';
    return this.http.get<{ instituteId: number; name: string; logoUrl?: string; challanTemplate: string; schoolStampUrl?: string }>(`${this.api}/my-institute${params}`, { observe: 'response' });
  }
  createInstitute(dto: CreateInstituteDto) { return this.http.post<any>(`${this.api}/institutes`, dto); }
  updateInstitute(id: number, dto: any)    { return this.http.put<any>(`${this.api}/institutes/${id}`, dto); }
  updateModules(id: number, dto: any)      { return this.http.patch<any>(`${this.api}/institutes/${id}/modules`, dto); }
  updateChallanTemplate(id: number, template: string) { return this.http.patch<any>(`${this.api}/institutes/${id}/challan-template`, { challanTemplate: template }); }
  deleteInstitute(id: number)              { return this.http.delete<any>(`${this.api}/institutes/${id}`); }
  uploadLogo(id: number, file: File) {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<{ logoUrl: string }>(`${this.api}/institutes/${id}/logo`, fd);
  }
  uploadStamp(id: number, file: File) {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<{ schoolStampUrl: string }>(`${this.api}/institutes/${id}/stamp`, fd);
  }

  // Campuses
  getCampuses(instId: number)                        { return this.http.get<CampusDto[]>(`${this.api}/institutes/${instId}/campuses`); }
  createCampus(instId: number, dto: CreateCampusDto) { return this.http.post<any>(`${this.api}/institutes/${instId}/campuses`, dto); }
  updateCampus(instId: number, cid: number, dto: any){ return this.http.put<any>(`${this.api}/institutes/${instId}/campuses/${cid}`, dto); }
  deleteCampus(instId: number, cid: number)          { return this.http.delete<any>(`${this.api}/institutes/${instId}/campuses/${cid}`); }

  // Institute-level admin
  createInstituteAdmin(instId: number, dto: CreateCampusAdminDto) {
    return this.http.post<any>(`${this.api}/institutes/${instId}/admin`, dto);
  }

  // Campus admins
  getCampusAdmins(instId: number, cid: number)       { return this.http.get<CampusAdminDto[]>(`${this.api}/institutes/${instId}/campuses/${cid}/admins`); }
  createCampusAdmin(instId: number, cid: number, dto: CreateCampusAdminDto) {
    return this.http.post<any>(`${this.api}/institutes/${instId}/campuses/${cid}/admins`, dto);
  }
}
