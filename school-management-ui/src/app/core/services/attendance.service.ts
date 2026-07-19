import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AttendanceRecordDto, MarkAttendanceDto, BulkMarkAttendanceDto, AttendanceSummaryDto } from '../models/attendance.model';

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private url = `${environment.apiUrl}/attendance`;
  constructor(private http: HttpClient) {}

  markSingle(dto: MarkAttendanceDto)     { return this.http.post<AttendanceRecordDto>(`${this.url}/mark`, dto); }
  bulkMark(dto: BulkMarkAttendanceDto)   { return this.http.post<AttendanceRecordDto[]>(`${this.url}/bulk`, dto); }
  update(id: number, dto: { status: string; remarks: string | null }) {
    return this.http.put(`${this.url}/${id}`, dto);
  }

  getForClass(classId: number, date: string, periodId?: number) {
    let params = new HttpParams().set('classId', classId).set('date', date);
    if (periodId) params = params.set('periodId', periodId);
    return this.http.get<AttendanceRecordDto[]>(this.url, { params });
  }

  getForStudent(studentId: number, from?: string, to?: string) {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to)   params = params.set('to', to);
    return this.http.get<AttendanceRecordDto[]>(`${this.url}/student/${studentId}`, { params });
  }

  getStudentSummary(studentId: number, from?: string, to?: string) {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to)   params = params.set('to', to);
    return this.http.get<AttendanceSummaryDto>(`${this.url}/student/${studentId}/summary`, { params });
  }

  getClassSummary(classId: number, from: string, to: string) {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<AttendanceSummaryDto[]>(`${this.url}/class/${classId}/summary`, { params });
  }
}
