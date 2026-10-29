import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { DashboardSummary } from '../models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/dashboard`;

  /** Fresh each call — no session cache (dashboard must reflect admissions/edits). */
  getSummary() {
    return this.http.get<DashboardSummary>(`${this.url}/summary`);
  }
}
