export interface AttendanceRecordDto {
  attendanceId: number;
  studentId: number;
  studentName: string;
  admissionNo: string;
  classId: number;
  className: string;
  section: string | null;
  periodId: number;
  periodName: string;
  date: string;
  status: string;
  remarks: string | null;
  markedBy: number;
  markedByName: string;
  markedAt: string;
}

export interface MarkAttendanceDto {
  studentId: number;
  classId: number;
  periodId: number;
  date: string;
  status: string;
  remarks: string | null;
}

export interface BulkMarkAttendanceDto {
  classId: number;
  periodId: number;
  date: string;
  entries: StudentAttendanceEntry[];
}

export interface StudentAttendanceEntry {
  studentId: number;
  status: string;
  remarks: string | null;
}

export interface AttendanceSummaryDto {
  studentId: number;
  studentName: string;
  admissionNo: string;
  totalDays: number;
  present: number;
  absent: number;
  late: number;
  attendancePercent: number;
}
