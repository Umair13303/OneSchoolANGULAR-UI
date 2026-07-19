export interface PeriodDto {
  periodId: number;
  periodNo: number;
  periodName: string;
  startTime: string;
  endTime: string;
  isBreak: boolean;
}

export interface TimetableEntryDto {
  timetableId: number;
  classId: number;
  className: string;
  section: string | null;
  subjectId: number;
  subjectName: string;
  teacherId: number;
  teacherName: string;
  periodId: number;
  periodNo: number;
  periodName: string;
  startTime: string;
  endTime: string;
  isBreak: boolean;
  dayOfWeek: number;
  academicYearId: number;
  academicYearLabel: string | null;
}

export const DAY_NAMES: Record<number, string> = {
  1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
  4: 'Thursday', 5: 'Friday', 6: 'Saturday', 7: 'Sunday'
};
