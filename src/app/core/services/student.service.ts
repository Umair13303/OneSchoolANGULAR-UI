import { Injectable, Injector, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StudentListDto, CreateStudentAdmissionDto, PagedResult } from '../models/student.model';
import { SetupNotificationService } from './setup-notification.service';

@Injectable({ providedIn: 'root' })
export class StudentService {
  private url = `${environment.apiUrl}/students`;
  private listCache = new Map<string, Observable<PagedResult<StudentListDto>>>();
  private injector = inject(Injector);

  constructor(private http: HttpClient) {}

  /** Drop session list caches (login/logout / after student mutations). */
  clearCaches() {
    this.listCache.clear();
    this.injector.get(SetupNotificationService).invalidate();
  }

  getStudents(classId?: number, academicYearId?: number, search?: string, page = 1, pageSize = 25) {
    const key = [classId ?? '', academicYearId ?? '', search ?? '', page, pageSize].join('|');
    let cached = this.listCache.get(key);
    if (!cached) {
      let params = new HttpParams().set('page', page).set('pageSize', pageSize);
      if (classId)        params = params.set('classId', classId);
      if (academicYearId) params = params.set('academicYearId', academicYearId);
      if (search)         params = params.set('search', search);
      cached = this.http.get<PagedResult<StudentListDto>>(this.url, { params }).pipe(
        tap({ error: () => this.listCache.delete(key) }),
        shareReplay({ bufferSize: 1, refCount: false })
      );
      this.listCache.set(key, cached);
    }
    return cached;
  }

  getById(id: number)                          { return this.http.get<any>(`${this.url}/${id}`); }
  create(dto: CreateStudentAdmissionDto) {
    return this.http.post<any>(this.url, dto).pipe(tap(() => this.clearCaches()));
  }
  /** Preview of the number the next admission will get (from institute/campus settings). */
  getNextAdmissionNo()                          { return this.http.get<{ admissionNo: string }>(`${this.url}/next-admission-no`); }
  update(id: number, dto: any) {
    return this.http.put(`${this.url}/${id}`, dto).pipe(tap(() => this.clearCaches()));
  }

  siblingCheck(cnic: string)                    { return this.http.get<{ siblingCount: number; siblingOrder: number; siblings: any[] }>(`${this.url}/sibling-check`, { params: { cnic } }); }
  getDues(id: number)                           { return this.http.get<any>(`${this.url}/${id}/dues`); }
  withdraw(id: number, dto: { leavingDate: string; leavingReason: string; forceWithdraw: boolean }) {
    return this.http.post<any>(`${this.url}/${id}/withdraw`, dto).pipe(tap(() => this.clearCaches()));
  }
}
