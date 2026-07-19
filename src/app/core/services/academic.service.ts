import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AcademicYear, ClassDto, SubjectDto, ClassSubjectDto, CreateAcademicYearDto, CreateClassDto, CreateSubjectDto, AssignSubjectDto, AcademicCalendarEvent, CreateCalendarEventDto, CalendarEventType, CreateCalendarEventTypeDto } from '../models/academic.model';

@Injectable({ providedIn: 'root' })
export class AcademicService {
  private base = environment.apiUrl;
  constructor(private http: HttpClient) {}

  // Academic Years
  getYears()                          { return this.http.get<AcademicYear[]>(`${this.base}/academic-years`); }
  createYear(dto: CreateAcademicYearDto) { return this.http.post<AcademicYear>(`${this.base}/academic-years`, dto); }
  updateYear(id: number, dto: Partial<CreateAcademicYearDto>) { return this.http.put(`${this.base}/academic-years/${id}`, dto); }

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
    return this.http.get<ClassDto[]>(`${this.base}/classes`);
  }
  createClass(dto: CreateClassDto) { return this.http.post<ClassDto>(`${this.base}/classes`, dto); }
  updateClass(id: number, dto: Partial<CreateClassDto>) { return this.http.put(`${this.base}/classes/${id}`, dto); }
  deleteClass(id: number) { return this.http.delete(`${this.base}/classes/${id}`, { responseType: 'text' }); }

  // Subjects
  getSubjects()                         { return this.http.get<SubjectDto[]>(`${this.base}/subjects`); }
  createSubject(dto: CreateSubjectDto)  { return this.http.post<SubjectDto>(`${this.base}/subjects`, dto); }
  updateSubject(id: number, dto: Partial<CreateSubjectDto>) { return this.http.put(`${this.base}/subjects/${id}`, dto); }

  // Class-wise subjects
  getClassSubjects(classId: number) { return this.http.get<ClassSubjectDto[]>(`${this.base}/classes/${classId}/subjects`); }
  assignSubjectToClass(classId: number, dto: AssignSubjectDto) { return this.http.post<ClassSubjectDto>(`${this.base}/classes/${classId}/assign-teacher`, dto); }
  removeClassSubject(classId: number, classSubjectId: number) { return this.http.delete(`${this.base}/classes/${classId}/subjects/${classSubjectId}`, { responseType: 'text' }); }
  toggleClassSubjectStatus(classId: number, classSubjectId: number) { return this.http.patch<ClassSubjectDto>(`${this.base}/classes/${classId}/subjects/${classSubjectId}/toggle-status`, {}); }
  getAssignmentsByTeacher(teacherId: number) { return this.http.get<ClassSubjectDto[]>(`${this.base}/classes/teacher-assignments/${teacherId}`); }
  unassignTeacherFromSubject(classId: number, classSubjectId: number) { return this.http.patch<ClassSubjectDto>(`${this.base}/classes/${classId}/subjects/${classSubjectId}/unassign-teacher`, {}); }
}
