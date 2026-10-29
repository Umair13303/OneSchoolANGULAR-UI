export interface DashboardClassCount {
  name: string;
  count: number;
}

/** Aggregate student stats for the admin dashboard (GET /api/dashboard/summary). */
export interface DashboardSummary {
  totalStudents: number;
  maleCount: number;
  femaleCount: number;
  byClass: DashboardClassCount[];
}
