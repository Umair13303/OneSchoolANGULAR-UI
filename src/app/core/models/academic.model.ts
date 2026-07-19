export interface CalendarEventType {
  calendarEventTypeId: number;
  name: string;
  color: string;
  icon: string;
  sortOrder: number;
}

export interface CreateCalendarEventTypeDto {
  name: string;
  color: string;
  icon: string;
  sortOrder: number;
}

export interface AcademicCalendarEvent {
  academicCalendarEventId: number;
  academicYearId: number;
  calendarEventTypeId: number;
  eventTypeName: string;
  eventTypeColor: string;
  eventTypeIcon: string;
  title: string;
  startDate: string;
  endDate: string | null;
  description: string | null;
}

export interface CreateCalendarEventDto {
  calendarEventTypeId: number;
  title: string;
  startDate: string;
  endDate: string | null;
  description: string | null;
}

export interface AcademicYear {
  academicYearId: number;
  yearLabel: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface ClassDto {
  classId: number;
  className: string;
  section: string | null;
  isActive: boolean;
  instituteId?: number | null;
  instituteName?: string | null;
  subjectCount: number;
}

export interface SubjectDto {
  subjectId: number;
  subjectName: string;
  instituteId?: number | null;
  instituteName?: string | null;
}

export interface CreateAcademicYearDto {
  yearLabel: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface CreateClassDto {
  className: string;
  section: string | null | undefined;
  isActive?: boolean;
  instituteId?: number | null;
}

export interface CreateSubjectDto {
  subjectName: string;
  instituteId?: number | null;
}

export interface ClassSubjectDto {
  id: number;
  classId: number;
  subjectId: number;
  subjectName: string;
  teacherId: number;
  teacherName: string;
  isActive: boolean;
  className?: string;
  classSection?: string;
}

export interface AssignSubjectDto {
  subjectId: number;
  teacherId: number;
}
