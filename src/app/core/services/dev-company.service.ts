import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { DevCompany } from '../models/dev-company.model';

@Injectable({ providedIn: 'root' })
export class DevCompanyService {
  private base = environment.apiUrl;
  constructor(private http: HttpClient) {}

  get()                      { return this.http.get<DevCompany>(`${this.base}/dev-company`); }
  update(dto: DevCompany)    { return this.http.put<DevCompany>(`${this.base}/dev-company`, dto); }
}
