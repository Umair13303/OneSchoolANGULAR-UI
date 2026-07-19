import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { StudentListDto, CreateStudentAdmissionDto, PagedResult } from '../models/student.model';

@Injectable({ providedIn: 'root' })
export class StudentService {
  private url = `${environment.apiUrl}/students`;
  constructor(private http: HttpClient) {}

  getStudents(classId?: number, academicYearId?: number, search?: string, page = 1, pageSize = 25) {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (classId)         params = params.set('classId', classId);
    if (academicYearId)  params = params.set('academicYearId', academicYearId);
    if (search)          params = params.set('search', search);
    return this.http.get<PagedResult<StudentListDto>>(this.url, { params });
  }

  getById(id: number)                          { return this.http.get<any>(`${this.url}/${id}`); }
  create(dto: CreateStudentAdmissionDto)        { return this.http.post<any>(this.url, dto); }
  /** Preview of the number the next admission will get (from institute/campus settings). */
  getNextAdmissionNo()                          { return this.http.get<{ admissionNo: string }>(`${this.url}/next-admission-no`); }
  update(id: number, dto: any)                  { return this.http.put(`${this.url}/${id}`, dto); }

  siblingCheck(cnic: string)                    { return this.http.get<{ siblingCount: number; siblingOrder: number; siblings: any[] }>(`${this.url}/sibling-check`, { params: { cnic } }); }
  getDues(id: number)                           { return this.http.get<any>(`${this.url}/${id}/dues`); }
  withdraw(id: number, dto: { leavingDate: string; leavingReason: string; forceWithdraw: boolean }) { return this.http.post<any>(`${this.url}/${id}/withdraw`, dto); }
}
