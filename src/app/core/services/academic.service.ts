import { Injectable, Injector, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AcademicYear, ClassDto, SubjectDto, ClassSubjectDto, CreateAcademicYearDto, CreateClassDto, CreateSubjectDto, AssignSubjectDto, AcademicCalendarEvent, CreateCalendarEventDto, CalendarEventType, CreateCalendarEventTypeDto } from '../models/academic.model';
import { SetupNotificationService } from './setup-notification.service';

@Injectable({ providedIn: 'root' })
export class AcademicService {
  private base = environment.apiUrl;
  private years$?: Observable<AcademicYear[]>;
  private classes$?: Observable<ClassDto[]>;
  private subjects$?: Observable<SubjectDto[]>;
  private injector = inject(Injector);

  constructor(private http: HttpClient) {}

  /** Drop session caches (login/logout / after mutations). */
  clearCaches() {
    this.years$ = undefined;
    this.classes$ = undefined;
    this.subjects$ = undefined;
    this.invalidateSetup();
  }

  private invalidateSetup() {
    this.injector.get(SetupNotificationService).invalidate();
  }

  // Academic Years
  getYears() {
    if (!this.years$) {
      this.years$ = this.http.get<AcademicYear[]>(`${this.base}/academic-years`).pipe(
        tap({ error: () => { this.years$ = undefined; } }),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.years$;
  }
  createYear(dto: CreateAcademicYearDto) {
    return this.http.post<AcademicYear>(`${this.base}/academic-years`, dto).pipe(
      tap(() => { this.years$ = undefined; this.invalidateSetup(); })
    );
  }
  updateYear(id: number, dto: Partial<CreateAcademicYearDto>) {
    return this.http.put(`${this.base}/academic-years/${id}`, dto).pipe(
      tap(() => { this.years$ = undefined; this.invalidateSetup(); })
    );
  }

  // Calendar Event Types
  getCalendarEventTypes() { return this.http.get<CalendarEventType[]>(`${this.base}/calendar-event-types`); }
  createCalendarEventType(dto: CreateCalendarEventTypeDto) { return this.http.post<CalendarEventType>(`${this.base}/calendar-event-types`, dto); }
  updateCalendarEventType(id: number, dto: CreateCalendarEventTypeDto) { return this.http.put(`${this.base}/calendar-event-types/${id}`, dto); }
  deleteCalendarEventType(id: number) { return this.http.delete(`${this.base}/calendar-event-types/${id}`); }

  // Calendar Events
  getCalendarEvents(yearId: number) { return this.http.get<AcademicCalendarEvent[]>(`${this.base}/academic-years/${yearId}/events`); }
  createCalendarEvent(yearId: number, dto: CreateCalendarEventDto) { return this.http.post<AcademicCalendarEvent>(`${this.base}/academic-years/${yearId}/events`, dto); }
  updateCalendarEvent(yearId: number, eventId: number, dto: CreateCalendarEventDto) { return this.http.put(`${this.base}/academic-years/${yearId}/events/${eventId}`, dto); }
  deleteCalendarEvent(yearId: number, eventId: number) { return this.http.delete(`${this.base}/academic-years/${yearId}/events/${eventId}`); }

  // Classes
  getClasses(_yearId?: number) {
    if (!this.classes$) {
      this.classes$ = this.http.get<ClassDto[]>(`${this.base}/classes`).pipe(
        tap({ error: () => { this.classes$ = undefined; } }),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.classes$;
  }
  createClass(dto: CreateClassDto) {
    return this.http.post<ClassDto>(`${this.base}/classes`, dto).pipe(
      tap(() => { this.classes$ = undefined; this.invalidateSetup(); })
    );
  }
  updateClass(id: number, dto: Partial<CreateClassDto>) {
    return this.http.put(`${this.base}/classes/${id}`, dto).pipe(
      tap(() => { this.classes$ = undefined; this.invalidateSetup(); })
    );
  }
  deleteClass(id: number) {
    return this.http.delete(`${this.base}/classes/${id}`, { responseType: 'text' }).pipe(
      tap(() => { this.classes$ = undefined; this.invalidateSetup(); })
    );
  }

  // Subjects
  getSubjects() {
    if (!this.subjects$) {
      this.subjects$ = this.http.get<SubjectDto[]>(`${this.base}/subjects`).pipe(
        tap({ error: () => { this.subjects$ = undefined; } }),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.subjects$;
  }
  createSubject(dto: CreateSubjectDto) {
    return this.http.post<SubjectDto>(`${this.base}/subjects`, dto).pipe(
      tap(() => { this.subjects$ = undefined; this.invalidateSetup(); })
    );
  }
  updateSubject(id: number, dto: Partial<CreateSubjectDto>) {
    return this.http.put(`${this.base}/subjects/${id}`, dto).pipe(
      tap(() => { this.subjects$ = undefined; this.invalidateSetup(); })
    );
  }

  // Class-wise subjects
  getClassSubjects(classId: number) { return this.http.get<ClassSubjectDto[]>(`${this.base}/classes/${classId}/subjects`); }
  assignSubjectToClass(classId: number, dto: AssignSubjectDto) {
    return this.http.post<ClassSubjectDto>(`${this.base}/classes/${classId}/assign-teacher`, dto).pipe(
      tap(() => { this.classes$ = undefined; })
    );
  }
  removeClassSubject(classId: number, classSubjectId: number) {
    return this.http.delete(`${this.base}/classes/${classId}/subjects/${classSubjectId}`, { responseType: 'text' }).pipe(
      tap(() => { this.classes$ = undefined; })
    );
  }
  toggleClassSubjectStatus(classId: number, classSubjectId: number) {
    return this.http.patch<ClassSubjectDto>(`${this.base}/classes/${classId}/subjects/${classSubjectId}/toggle-status`, {}).pipe(
      tap(() => { this.classes$ = undefined; })
    );
  }
  getAssignmentsByTeacher(teacherId: number) { return this.http.get<ClassSubjectDto[]>(`${this.base}/classes/teacher-assignments/${teacherId}`); }
  unassignTeacherFromSubject(classId: number, classSubjectId: number) {
    return this.http.patch<ClassSubjectDto>(`${this.base}/classes/${classId}/subjects/${classSubjectId}/unassign-teacher`, {}).pipe(
      tap(() => { this.classes$ = undefined; })
    );
  }
}
