import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { TimetableEntryDto, PeriodDto } from '../models/timetable.model';

@Injectable({ providedIn: 'root' })
export class TimetableService {
  private base = environment.apiUrl;
  constructor(private http: HttpClient) {}

  getForClass(classId: number, dayOfWeek?: number, academicYearId?: number) {
    let params = new HttpParams().set('classId', classId);
    if (dayOfWeek)      params = params.set('dayOfWeek', dayOfWeek);
    if (academicYearId) params = params.set('academicYearId', academicYearId);
    return this.http.get<TimetableEntryDto[]>(`${this.base}/timetable`, { params });
  }

  getForTeacher(teacherId: number, academicYearId?: number) {
    let params = new HttpParams();
    if (academicYearId) params = params.set('academicYearId', academicYearId);
    return this.http.get<any[]>(`${this.base}/timetable/teacher/${teacherId}`, { params });
  }

  getPeriods() { return this.http.get<PeriodDto[]>(`${this.base}/periods`); }

  create(dto: any) { return this.http.post<TimetableEntryDto>(`${this.base}/timetable`, dto); }
  update(id: number, dto: any) { return this.http.put(`${this.base}/timetable/${id}`, dto); }
  delete(id: number) { return this.http.delete(`${this.base}/timetable/${id}`); }
}
