import { Injectable, inject, signal, computed } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { AcademicService } from './academic.service';
import { StudentService } from './student.service';
import { FeeService } from './fee.service';
import { UserService } from './user.service';

export interface SetupNotification {
  id: string;
  icon: string;
  iconColor: string;
  title: string;
  desc: string;
  route: string;
}

@Injectable({ providedIn: 'root' })
export class SetupNotificationService {
  private auth        = inject(AuthService);
  private academicSvc = inject(AcademicService);
  private studentSvc  = inject(StudentService);
  private feeSvc      = inject(FeeService);
  private userSvc     = inject(UserService);

  notifications = signal<SetupNotification[]>([]);
  loading       = signal(false);
  count         = computed(() => this.notifications().length);

  private activeUserId: number | null = null;

  load() {
    const user = this.auth.currentUser();
    if (!user) return;

    const role = (user.role ?? '').toLowerCase();
    if (['superadmin', 'teacher', 'parent'].includes(role)) return;

    // Reset if a different user logs in (institute switch)
    if (this.activeUserId !== null && this.activeUserId !== user.userId) {
      this.notifications.set([]);
    }
    this.activeUserId = user.userId;

    // Prevent overlapping requests
    if (this.loading()) return;
    this.loading.set(true);

    forkJoin({
      years:         this.academicSvc.getYears().pipe(catchError(() => of(null))),
      classes:       this.academicSvc.getClasses().pipe(catchError(() => of(null))),
      students:      this.studentSvc.getStudents(undefined, undefined, undefined, 1, 1).pipe(catchError(() => of(null))),
      users:         this.userSvc.getAll().pipe(catchError(() => of(null))),
      feeTypes:      this.feeSvc.getFeeTypes().pipe(catchError(() => of(null))),
      feeStructures: this.feeSvc.getFeeStructures().pipe(catchError(() => of(null))),
    }).subscribe({
      next: r => {
        const items: SetupNotification[] = [];

        if (r.years !== null && r.years.length === 0)
          items.push({
            id: 'academic-year', icon: 'calendar_month', iconColor: 'accent',
            title: 'No Academic Year Created',
            desc: 'Create an academic year to start enrolling students.',
            route: '/academics/years'
          });

        if (r.classes !== null && r.classes.length === 0)
          items.push({
            id: 'classes', icon: 'class', iconColor: 'purple',
            title: 'No Classes Added',
            desc: 'Add classes so students can be assigned to them.',
            route: '/academics/classes'
          });

        if (r.users !== null) {
          const teachers = r.users.filter((u: any) => (u.roleName ?? '').toLowerCase() === 'teacher');
          if (teachers.length === 0)
            items.push({
              id: 'teachers', icon: 'school', iconColor: 'green',
              title: 'No Teachers Added',
              desc: 'Add teachers before setting up a timetable.',
              route: '/teachers/new'
            });
        }

        if (r.students !== null && r.students.totalCount === 0)
          items.push({
            id: 'students', icon: 'person_add', iconColor: 'blue',
            title: 'No Students Enrolled',
            desc: 'Admit your first student to get started.',
            route: '/students/new'
          });

        if (r.feeTypes !== null && r.feeTypes.length === 0)
          items.push({
            id: 'fee-types', icon: 'sell', iconColor: 'amber',
            title: 'No Fee Types Defined',
            desc: 'Define fee types like Tuition, Admission Fee etc.',
            route: '/fees/types'
          });

        if (r.feeTypes !== null && r.feeTypes.length > 0 &&
            r.feeStructures !== null && r.feeStructures.length === 0)
          items.push({
            id: 'fee-structures', icon: 'receipt_long', iconColor: 'amber',
            title: 'No Fee Structures Set',
            desc: 'Assign fee structures to classes before collecting fees.',
            route: '/fees/structures'
          });

        this.notifications.set(items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  dismiss(id: string) {
    this.notifications.update(ns => ns.filter(n => n.id !== id));
  }
}
