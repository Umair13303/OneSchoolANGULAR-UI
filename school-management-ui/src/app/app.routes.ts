import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./modules/auth/auth.routes').then(m => m.authRoutes)
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/layout.component').then(m => m.LayoutComponent),
    children: [
      // Dashboard
      {
        path: 'dashboard',
        loadComponent: () => import('./modules/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },

      // Students
      {
        path: 'students/list',
        canActivate: [roleGuard],
        data: { roles: ['superadmin','admin','principal'] },
        loadComponent: () => import('./modules/students/student-list/student-list.component').then(m => m.StudentListComponent)
      },
      {
        path: 'students/new',
        canActivate: [roleGuard],
        data: { roles: ['superadmin','admin','principal'] },
        loadComponent: () => import('./modules/students/student-form/student-form.component').then(m => m.StudentFormComponent)
      },
      {
        path: 'students/add',
        canActivate: [roleGuard],
        data: { roles: ['superadmin','admin','principal'] },
        loadComponent: () => import('./modules/students/add-student/add-student.component').then(m => m.AddStudentComponent)
      },
      {
        path: 'students/import',
        canActivate: [roleGuard],
        data: { roles: ['superadmin','admin','principal'] },
        loadComponent: () => import('./modules/students/import-students/import-students.component').then(m => m.ImportStudentsComponent)
      },
      {
        path: 'students/edit/:id',
        canActivate: [roleGuard],
        data: { roles: ['superadmin','admin','principal'] },
        loadComponent: () => import('./modules/students/student-form/student-form.component').then(m => m.StudentFormComponent)
      },

      // Academics
      {
        path: 'academics/classes',
        canActivate: [roleGuard],
        data: { roles: ['superadmin','admin'] },
        loadComponent: () => import('./modules/academics/classes/classes.component').then(m => m.ClassesComponent)
      },
      {
        path: 'academics/subjects',
        canActivate: [roleGuard],
        data: { roles: ['superadmin','admin'] },
        loadComponent: () => import('./modules/academics/subjects/subjects.component').then(m => m.SubjectsComponent)
      },
      {
        path: 'academics/teacher-assignments',
        canActivate: [roleGuard],
        data: { roles: ['superadmin','admin'] },
        loadComponent: () => import('./modules/academics/teacher-assignments/teacher-assignments.component').then(m => m.TeacherAssignmentsComponent)
      },
      {
        path: 'academics/years',
        canActivate: [roleGuard],
        data: { roles: ['superadmin','admin'] },
        loadComponent: () => import('./modules/academics/academic-years/academic-years.component').then(m => m.AcademicYearsComponent)
      },
      {
        path: 'academics/years/:yearId/calendar',
        canActivate: [roleGuard],
        data: { roles: ['superadmin','admin','principal'] },
        loadComponent: () => import('./modules/academics/academic-calendar/academic-calendar.component').then(m => m.AcademicCalendarComponent)
      },

      // Timetable
      {
        path: 'timetable/view',
        canActivate: [roleGuard],
        data: { roles: ['superadmin','admin','principal','teacher','parent'] },
        loadComponent: () => import('./modules/timetable/timetable-view/timetable-view.component').then(m => m.TimetableViewComponent)
      },
      {
        path: 'timetable/builder',
        canActivate: [roleGuard],
        data: { roles: ['superadmin','admin','principal'] },
        loadComponent: () => import('./modules/timetable/timetable-builder/timetable-builder.component').then(m => m.TimetableBuilderComponent)
      },
      {
        path: 'timetable/my-schedule',
        canActivate: [roleGuard],
        data: { roles: ['teacher'] },
        loadComponent: () => import('./modules/timetable/teacher-timetable/teacher-timetable.component').then(m => m.TeacherTimetableComponent)
      },
      {
        path: 'timetable/substitutions',
        canActivate: [roleGuard],
        data: { roles: ['superadmin','admin','principal'] },
        loadComponent: () => import('./modules/timetable/substitution/substitution.component').then(m => m.SubstitutionComponent)
      },

      // Attendance
      {
        path: 'attendance/mark',
        canActivate: [roleGuard],
        data: { roles: ['teacher','superadmin','admin','principal'] },
        loadComponent: () => import('./modules/attendance/mark-attendance/mark-attendance.component').then(m => m.MarkAttendanceComponent)
      },
      {
        path: 'attendance/view',
        canActivate: [roleGuard],
        data: { roles: ['superadmin','admin','principal','teacher','parent'] },
        loadComponent: () => import('./modules/attendance/view-attendance/view-attendance.component').then(m => m.ViewAttendanceComponent)
      },

      // Homework
      {
        path: 'homework/list',
        canActivate: [roleGuard],
        data: { roles: ['superadmin','admin','principal','teacher','parent'] },
        loadComponent: () => import('./modules/homework/homework-list/homework-list.component').then(m => m.HomeworkListComponent)
      },
      {
        path: 'homework/assign',
        canActivate: [roleGuard],
        data: { roles: ['teacher','superadmin','admin','principal'] },
        loadComponent: () => import('./modules/homework/assign-homework/assign-homework.component').then(m => m.AssignHomeworkComponent)
      },

      // Teachers
      {
        path: 'teachers',
        canActivate: [roleGuard],
        data: { roles: ['superadmin','admin','principal'] },
        loadComponent: () => import('./modules/teachers/teacher-list/teacher-list.component').then(m => m.TeacherListComponent)
      },
      {
        path: 'teachers/new',
        canActivate: [roleGuard],
        data: { roles: ['superadmin','admin','principal'] },
        loadComponent: () => import('./modules/teachers/teacher-form/teacher-form.component').then(m => m.TeacherFormComponent)
      },
      {
        path: 'teachers/edit/:id',
        canActivate: [roleGuard],
        data: { roles: ['superadmin','admin','principal'] },
        loadComponent: () => import('./modules/teachers/teacher-form/teacher-form.component').then(m => m.TeacherFormComponent)
      },

      // Users
      {
        path: 'users',
        canActivate: [roleGuard],
        data: { roles: ['superadmin','admin'] },
        loadComponent: () => import('./modules/users/user-list/user-list.component').then(m => m.UserListComponent)
      },

      // Fees
      {
        path: 'fees/setup',
        canActivate: [roleGuard],
        data: { roles: ['superadmin','admin'] },
        loadComponent: () => import('./modules/fees/fee-setup/fee-setup.component').then(m => m.FeeSetupComponent)
      },
      {
        path: 'fees/structures/new',
        canActivate: [roleGuard],
        data: { roles: ['superadmin','admin'] },
        loadComponent: () => import('./modules/fees/fee-structure-form/fee-structure-form.component').then(m => m.FeeStructureFormComponent)
      },
      {
        path: 'fees/types',
        canActivate: [roleGuard],
        data: { roles: ['superadmin','admin'] },
        loadComponent: () => import('./modules/fees/fee-types/fee-types.component').then(m => m.FeeTypesComponent)
      },
      {
        path: 'fees/structures',
        canActivate: [roleGuard],
        data: { roles: ['superadmin','admin'] },
        loadComponent: () => import('./modules/fees/fee-structures/fee-structures.component').then(m => m.FeeStructuresComponent)
      },
      {
        path: 'fees/discounts',
        canActivate: [roleGuard],
        data: { roles: ['superadmin','admin'] },
        loadComponent: () => import('./modules/fees/fee-discounts/fee-discounts.component').then(m => m.FeeDiscountsComponent)
      },
      {
        path: 'fees/student-fees',
        canActivate: [roleGuard],
        data: { roles: ['superadmin','admin','principal'] },
        loadComponent: () => import('./modules/fees/student-fees/student-fees.component').then(m => m.StudentFeesComponent)
      },
      {
        path: 'fees/report',
        canActivate: [roleGuard],
        data: { roles: ['superadmin','admin','principal'] },
        loadComponent: () => import('./modules/fees/fee-report/fee-report.component').then(m => m.FeeReportComponent)
      },
      {
        path: 'fees/challan',
        canActivate: [roleGuard],
        data: { roles: ['superadmin','admin','principal'] },
        loadComponent: () => import('./modules/fees/fee-challan/fee-challan.component').then(m => m.FeeChallanComponent)
      },
      {
        path: 'fees/challan-print',
        canActivate: [roleGuard],
        data: { roles: ['superadmin','admin','principal'] },
        loadComponent: () => import('./modules/fees/challan-print/challan-print.component').then(m => m.ChallanPrintComponent)
      },

      // HR — Non-Teaching Staff
      {
        path: 'hr/staff',
        canActivate: [roleGuard],
        data: { roles: ['superadmin','admin','principal'] },
        loadComponent: () => import('./modules/hr/staff-list/staff-list.component').then(m => m.StaffListComponent)
      },
      {
        path: 'hr/staff/new',
        canActivate: [roleGuard],
        data: { roles: ['superadmin','admin','principal'] },
        loadComponent: () => import('./modules/hr/staff-form/staff-form.component').then(m => m.StaffFormComponent)
      },
      {
        path: 'hr/staff/:id/edit',
        canActivate: [roleGuard],
        data: { roles: ['superadmin','admin','principal'] },
        loadComponent: () => import('./modules/hr/staff-form/staff-form.component').then(m => m.StaffFormComponent)
      },
      // HR — Teaching Staff (redirects to existing teachers page)
      {
        path: 'hr/teaching-staff',
        canActivate: [roleGuard],
        data: { roles: ['superadmin','admin','principal'] },
        loadComponent: () => import('./modules/teachers/teacher-list/teacher-list.component').then(m => m.TeacherListComponent)
      },

      // Exams
      {
        path: 'exams/papers',
        canActivate: [roleGuard],
        data: { roles: ['superadmin','admin','principal','teacher'] },
        loadComponent: () => import('./modules/exams/exam-papers/exam-papers.component').then(m => m.ExamPapersComponent)
      },
      {
        path: 'exams/papers/:paperId/questions',
        canActivate: [roleGuard],
        data: { roles: ['superadmin','admin','principal','teacher'] },
        loadComponent: () => import('./modules/exams/exam-paper-questions/exam-paper-questions.component').then(m => m.ExamPaperQuestionsComponent)
      },
      {
        path: 'exams/schedule',
        canActivate: [roleGuard],
        data: { roles: ['superadmin','admin','principal','teacher','parent'] },
        loadComponent: () => import('./modules/exams/exam-schedule/exam-schedule.component').then(m => m.ExamScheduleComponent)
      },
      {
        path: 'exams/results/enter',
        canActivate: [roleGuard],
        data: { roles: ['superadmin','admin','principal','teacher'] },
        loadComponent: () => import('./modules/exams/exam-results-entry/exam-results-entry.component').then(m => m.ExamResultsEntryComponent)
      },
      {
        path: 'exams/results/cards',
        canActivate: [roleGuard],
        data: { roles: ['superadmin','admin','principal','teacher','parent'] },
        loadComponent: () => import('./modules/exams/exam-result-cards/exam-result-cards.component').then(m => m.ExamResultCardsComponent)
      },

      // Superadmin — Institute Management
      {
        path: 'superadmin/institutes',
        canActivate: [roleGuard],
        data: { roles: ['superadmin'] },
        loadComponent: () => import('./modules/superadmin/institutes/institutes.component').then(m => m.InstitutesComponent)
      },
      {
        path: 'superadmin/activity-logs',
        canActivate: [roleGuard],
        data: { roles: ['superadmin'] },
        loadComponent: () => import('./modules/superadmin/activity-logs/activity-logs.component').then(m => m.ActivityLogsComponent)
      },
      {
        path: 'superadmin/company',
        canActivate: [roleGuard],
        data: { roles: ['superadmin'] },
        loadComponent: () => import('./modules/superadmin/dev-company/dev-company.component').then(m => m.DevCompanyComponent)
      },

      // Admin Settings
      {
        path: 'admin/settings',
        canActivate: [roleGuard],
        data: { roles: ['superadmin','admin'] },
        loadComponent: () => import('./modules/admin/settings/settings.component').then(m => m.SettingsComponent)
      },

      // Reports
      {
        path: 'reports',
        canActivate: [roleGuard],
        data: { roles: ['superadmin','admin','principal'] },
        loadComponent: () => import('./modules/reports/reports.component').then(m => m.ReportsComponent)
      },

      // Inventory & POS Module
      {
        path: 'inventory/items',
        canActivate: [roleGuard],
        data: { roles: ['superadmin','admin','store_manager'] },
        loadComponent: () => import('./modules/inventory/items/items.component').then(m => m.ItemsComponent)
      },
      {
        path: 'inventory/masters',
        canActivate: [roleGuard],
        data: { roles: ['superadmin','admin','store_manager'] },
        loadComponent: () => import('./modules/inventory/masters/masters.component').then(m => m.InventoryMastersComponent)
      },
      {
        path: 'inventory/suppliers',
        canActivate: [roleGuard],
        data: { roles: ['superadmin','admin','store_manager'] },
        loadComponent: () => import('./modules/inventory/suppliers/suppliers.component').then(m => m.SuppliersComponent)
      },
      {
        path: 'inventory/packages',
        canActivate: [roleGuard],
        data: { roles: ['superadmin','admin','store_manager'] },
        loadComponent: () => import('./modules/inventory/packages/packages.component').then(m => m.PackagesComponent)
      },
      {
        path: 'inventory/purchases',
        canActivate: [roleGuard],
        data: { roles: ['superadmin','admin','store_manager'] },
        loadComponent: () => import('./modules/inventory/purchases/purchases.component').then(m => m.PurchasesComponent)
      },
      {
        path: 'inventory/purchase-returns',
        canActivate: [roleGuard],
        data: { roles: ['superadmin','admin','store_manager'] },
        loadComponent: () => import('./modules/inventory/purchase-returns/purchase-returns.component').then(m => m.PurchaseReturnsComponent)
      },
      {
        path: 'inventory/stock',
        canActivate: [roleGuard],
        data: { roles: ['superadmin','admin','store_manager'] },
        loadComponent: () => import('./modules/inventory/stock/stock.component').then(m => m.StockComponent)
      },
      {
        path: 'inventory/sales-returns',
        canActivate: [roleGuard],
        data: { roles: ['superadmin','admin','store_manager','cashier'] },
        loadComponent: () => import('./modules/pos/sales-returns/sales-returns.component').then(m => m.SalesReturnsComponent)
      },
      {
        path: 'inventory/reports',
        canActivate: [roleGuard],
        data: { roles: ['superadmin','admin','store_manager','accountant'] },
        loadComponent: () => import('./modules/inventory/reports/inventory-reports.component').then(m => m.InventoryReportsComponent)
      },
      {
        path: 'inventory/settings',
        canActivate: [roleGuard],
        data: { roles: ['superadmin','admin'] },
        loadComponent: () => import('./modules/inventory/settings/inventory-settings.component').then(m => m.InventorySettingsComponent)
      },
      {
        path: 'pos',
        canActivate: [roleGuard],
        data: { roles: ['superadmin','admin','store_manager','cashier'] },
        loadComponent: () => import('./modules/pos/pos.component').then(m => m.PosComponent)
      },

      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  {
    path: 'unauthorized',
    loadComponent: () => import('./shared/components/unauthorized/unauthorized.component').then(m => m.UnauthorizedComponent)
  },
  { path: '**', redirectTo: '/dashboard' }
];
