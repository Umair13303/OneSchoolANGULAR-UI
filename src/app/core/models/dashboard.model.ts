export interface DashboardClassCount {
  name: string;
  count: number;
}

/** One day of the dashboard attendance chart. Counts are distinct students. */
export interface DashboardAttendanceDay {
  day: string;
  date: string;
  present: number;
  absent: number;
}

/** Aggregate student stats for the admin dashboard (GET /api/dashboard/summary). */
export interface DashboardSummary {
  totalStudents: number;
  maleCount: number;
  femaleCount: number;
  byClass: DashboardClassCount[];
  weeklyAttendance: DashboardAttendanceDay[];
}
