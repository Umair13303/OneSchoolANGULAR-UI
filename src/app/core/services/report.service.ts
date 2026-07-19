import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private url = `${environment.apiUrl}/reports`;
  constructor(private http: HttpClient) {}

  attendanceDaily(classId: number, date: string) {
    const params = new HttpParams().set('classId', classId).set('date', date);
    return this.http.get<any>(`${this.url}/attendance/daily`, { params });
  }

  attendanceMonthly(classId: number, month: number, year: number) {
    const params = new HttpParams().set('classId', classId).set('month', month).set('year', year);
    return this.http.get<any>(`${this.url}/attendance/monthly`, { params });
  }

  studentAttendance(studentId: number, from?: string, to?: string) {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to)   params = params.set('to', to);
    return this.http.get<any>(`${this.url}/attendance/student/${studentId}`, { params });
  }

  homeworkReport(classId: number, from?: string, to?: string) {
    let params = new HttpParams().set('classId', classId);
    if (from) params = params.set('from', from);
    if (to)   params = params.set('to', to);
    return this.http.get<any>(`${this.url}/homework`, { params });
  }

  enrollment(academicYearId: number) {
    const params = new HttpParams().set('academicYearId', academicYearId);
    return this.http.get<any>(`${this.url}/enrollment`, { params });
  }

  teacherWorkload(academicYearId: number) {
    const params = new HttpParams().set('academicYearId', academicYearId);
    return this.http.get<any>(`${this.url}/teacher-workload`, { params });
  }

  // ── PDF downloads ────────────────────────────────────────────────────────────
  downloadDailyPdf(classId: number, date: string) {
    const params = new HttpParams().set('classId', classId).set('date', date);
    return this.http.get(`${this.url}/attendance/daily/pdf`, { params, responseType: 'blob' });
  }

  downloadMonthlyPdf(classId: number, month: number, year: number) {
    const params = new HttpParams().set('classId', classId).set('month', month).set('year', year);
    return this.http.get(`${this.url}/attendance/monthly/pdf`, { params, responseType: 'blob' });
  }

  downloadStudentPdf(studentId: number, from?: string, to?: string) {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to)   params = params.set('to', to);
    return this.http.get(`${this.url}/attendance/student/${studentId}/pdf`, { params, responseType: 'blob' });
  }

  downloadHomeworkPdf(classId: number, from?: string, to?: string) {
    let params = new HttpParams().set('classId', classId);
    if (from) params = params.set('from', from);
    if (to)   params = params.set('to', to);
    return this.http.get(`${this.url}/homework/pdf`, { params, responseType: 'blob' });
  }

  downloadEnrollmentPdf(academicYearId: number) {
    const params = new HttpParams().set('academicYearId', academicYearId);
    return this.http.get(`${this.url}/enrollment/pdf`, { params, responseType: 'blob' });
  }

  downloadWorkloadPdf(academicYearId: number) {
    const params = new HttpParams().set('academicYearId', academicYearId);
    return this.http.get(`${this.url}/teacher-workload/pdf`, { params, responseType: 'blob' });
  }

  savePdf(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
