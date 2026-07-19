import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface DaySlotDto {
  timetableId:           number;
  periodId:              number;
  periodNo:              number;
  periodName:            string;
  startTime:             string;
  endTime:               string;
  classId:               number;
  className:             string;
  section:               string;
  subjectId:             number;
  subjectName:           string;
  originalTeacherId:     number;
  originalTeacherName:   string;
  substitutionId:        number | null;
  substituteTeacherId:   number | null;
  substituteTeacherName: string;
  reason:                string;
}

export interface SubstitutionDto {
  substitutionId:        number;
  timetableId:           number;
  date:                  string;
  originalTeacherId:     number;
  originalTeacherName:   string;
  substituteTeacherId:   number;
  substituteTeacherName: string;
  classId:               number;
  className:             string;
  section:               string;
  subjectId:             number;
  subjectName:           string;
  periodId:              number;
  periodNo:              number;
  periodName:            string;
  startTime:             string;
  endTime:               string;
  dayOfWeek:             number;
  reason:                string;
}

@Injectable({ providedIn: 'root' })
export class SubstitutionService {
  private base = environment.apiUrl;
  constructor(private http: HttpClient) {}

  getDaySlots(date: string, classId?: number) {
    let params = new HttpParams().set('date', date);
    if (classId) params = params.set('classId', classId);
    return this.http.get<DaySlotDto[]>(`${this.base}/substitutions/day-slots`, { params });
  }

  getByDateRange(from: string, to: string, classId?: number) {
    let params = new HttpParams().set('from', from).set('to', to);
    if (classId) params = params.set('classId', classId);
    return this.http.get<SubstitutionDto[]>(`${this.base}/substitutions`, { params });
  }

  create(dto: { timetableId: number; date: string; substituteTeacherId: number; reason: string }) {
    return this.http.post<SubstitutionDto>(`${this.base}/substitutions`, dto);
  }

  update(id: number, dto: { substituteTeacherId: number; reason: string }) {
    return this.http.put<SubstitutionDto>(`${this.base}/substitutions/${id}`, dto);
  }

  delete(id: number) {
    return this.http.delete(`${this.base}/substitutions/${id}`);
  }
}
