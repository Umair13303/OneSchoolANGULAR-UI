import { Injectable, Injector, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StudentListDto, CreateStudentAdmissionDto, PagedResult } from '../models/student.model';
import { SetupNotificationService } from './setup-notification.service';

export interface StudentTransferDto {
  academicYearId: number;
  classId: number;
  mode: 'Transfer' | 'Promote' | 'Readmit';
  effectiveDate?: string | null;
}

export interface BulkPromoteDto {
  sourceClassId: number;
  sourceAcademicYearId: number;
  targetClassId: number;
  targetAcademicYearId: number;
  studentIds?: number[] | null;
  effectiveDate?: string | null;
}

export interface GuardianPortalDto {
  userId?: number | null;
  email?: string | null;
  password?: string | null;
}

export interface GuardianPortalResult {
  guardianId: number;
  userId: number;
  email: string;
  fullName: string;
  temporaryPassword?: string | null;
  created: boolean;
  inviteMessage?: string | null;
}

export interface StudentDocumentDto {
  fileId: number;
  entityType: string;
  originalName: string;
  fileType?: string | null;
  sizeBytes?: number | null;
  uploadedAt: string;
  fileUrl: string;
}

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

  getStudents(
    classId?: number,
    academicYearId?: number,
    search?: string,
    page = 1,
    pageSize = 25,
    isActive?: boolean | null,
    includeDeleted = false
  ) {
    const key = [classId ?? '', academicYearId ?? '', search ?? '', page, pageSize, isActive ?? '', includeDeleted].join('|');
    let cached = this.listCache.get(key);
    if (!cached) {
      let params = new HttpParams().set('page', page).set('pageSize', pageSize);
      if (classId)        params = params.set('classId', classId);
      if (academicYearId) params = params.set('academicYearId', academicYearId);
      if (search)         params = params.set('search', search);
      if (isActive === true || isActive === false) params = params.set('isActive', String(isActive));
      if (includeDeleted) params = params.set('includeDeleted', 'true');
      cached = this.http.get<PagedResult<StudentListDto>>(this.url, { params }).pipe(
        tap({ error: () => this.listCache.delete(key) }),
        shareReplay({ bufferSize: 1, refCount: false })
      );
      this.listCache.set(key, cached);
    }
    return cached;
  }

  getById(id: number)                          { return this.http.get<any>(`${this.url}/${id}`); }
  /** Students linked to the logged-in user via StudentGuardians.UserId (parent / teacher-as-parent). */
  getMyChildren()                              { return this.http.get<StudentListDto[]>(`${this.url}/my-children`); }
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

  transfer(id: number, dto: StudentTransferDto) {
    return this.http.post<any>(`${this.url}/${id}/transfer`, dto).pipe(tap(() => this.clearCaches()));
  }

  promoteBulk(dto: BulkPromoteDto) {
    return this.http.post<{ promoted: number; skipped: number }>(`${this.url}/promote-bulk`, dto)
      .pipe(tap(() => this.clearCaches()));
  }

  getDocuments(id: number) {
    return this.http.get<StudentDocumentDto[]>(`${this.url}/${id}/documents`);
  }

  tagDocument(id: number, fileId: number, entityType: string) {
    return this.http.post<StudentDocumentDto>(`${this.url}/${id}/documents`, { fileId, entityType })
      .pipe(tap(() => this.clearCaches()));
  }

  linkGuardianPortal(studentId: number, guardianId: number, dto: GuardianPortalDto) {
    return this.http.post<GuardianPortalResult>(`${this.url}/${studentId}/guardians/${guardianId}/portal`, dto);
  }

  unlinkGuardianPortal(studentId: number, guardianId: number) {
    return this.http.delete(`${this.url}/${studentId}/guardians/${guardianId}/portal`);
  }

  softDelete(id: number) {
    return this.http.delete(`${this.url}/${id}`).pipe(tap(() => this.clearCaches()));
  }

  restore(id: number) {
    return this.http.post(`${this.url}/${id}/restore`, {}).pipe(tap(() => this.clearCaches()));
  }

  downloadIdCardPdf(id: number) {
    return this.http.get(`${this.url}/${id}/id-card.pdf`, { responseType: 'blob' });
  }

  export(classId?: number, academicYearId?: number, search?: string, isActive?: boolean | null) {
    let params = new HttpParams();
    if (classId)        params = params.set('classId', classId);
    if (academicYearId) params = params.set('academicYearId', academicYearId);
    if (search)         params = params.set('search', search);
    if (isActive === true || isActive === false) params = params.set('isActive', String(isActive));
    return this.http.get(`${this.url}/export`, { params, responseType: 'blob' });
  }
}
