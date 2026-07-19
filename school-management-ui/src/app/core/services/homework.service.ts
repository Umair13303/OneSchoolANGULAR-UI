import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { HomeworkDto, CreateHomeworkDto, SubmissionDto } from '../models/homework.model';

@Injectable({ providedIn: 'root' })
export class HomeworkService {
  private url = `${environment.apiUrl}/homework`;
  constructor(private http: HttpClient) {}

  getForClass(classId: number, date?: string, subjectId?: number) {
    let params = new HttpParams().set('classId', classId);
    if (date)      params = params.set('date', date);
    if (subjectId) params = params.set('subjectId', subjectId);
    return this.http.get<HomeworkDto[]>(this.url, { params });
  }

  getForStudent(studentId: number, from?: string, to?: string) {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to)   params = params.set('to', to);
    return this.http.get<HomeworkDto[]>(`${this.url}/student/${studentId}`, { params });
  }

  getById(id: number)                     { return this.http.get<HomeworkDto>(`${this.url}/${id}`); }
  create(dto: CreateHomeworkDto)           { return this.http.post<HomeworkDto>(this.url, dto); }
  update(id: number, dto: any)             { return this.http.put(`${this.url}/${id}`, dto); }
  delete(id: number)                       { return this.http.delete(`${this.url}/${id}`); }

  getSubmissions(homeworkId: number)       { return this.http.get<SubmissionDto[]>(`${this.url}/${homeworkId}/submissions`); }
  submit(homeworkId: number, dto: any)     { return this.http.post<SubmissionDto>(`${this.url}/${homeworkId}/submit`, dto); }
  review(submissionId: number, status: string) {
    return this.http.put(`${this.url}/submissions/${submissionId}/review`, { status });
  }
}
