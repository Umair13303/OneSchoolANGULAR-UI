import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { switchMap, of } from 'rxjs';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AttendanceService } from '../../../core/services/attendance.service';
import { AcademicService } from '../../../core/services/academic.service';
import { TimetableService } from '../../../core/services/timetable.service';
import { StudentService } from '../../../core/services/student.service';
import { SettingsService } from '../../../core/services/settings.service';
import { AuthService } from '../../../core/services/auth.service';
import { ClassDto } from '../../../core/models/academic.model';
import { PeriodDto } from '../../../core/models/timetable.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';

interface Row {
  studentId:   number;
  admissionNo: string;
  name:        string;
  gender:      string;
  status:      'Present' | 'Absent' | 'Leave';
}

@Component({
  selector: 'app-mark-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, LoadingComponent, DatePickerComponent],
  template: `
    <app-page-header title="Mark Attendance" subtitle="Select class and period, then mark each student" />

    <!-- Filter bar -->
    <div class="filter-card card">
      <div class="filter-row">

        <div class="sel-wrap">
          <span class="sel-label">Class</span>
          <div class="sel-inner">
            <select [(ngModel)]="selectedClass" (change)="onClassChange()">
              <option [ngValue]="null">Select class…</option>
              @for (c of classes(); track c.classId) {
                <option [ngValue]="c.classId">{{ c.className }}{{ c.section ? ' · ' + c.section : '' }}</option>
              }
            </select>
            <span class="sel-arrow">⌄</span>
          </div>
        </div>

        <div class="sel-wrap">
          <span class="sel-label">Period</span>
          <div class="sel-inner">
            <select [(ngModel)]="selectedPeriod">
              <option [ngValue]="null">Select period…</option>
              @for (p of periods(); track p.periodId) {
                @if (!p.isBreak) {
                  <option [ngValue]="p.periodId">{{ p.periodName }} · {{ p.startTime }}–{{ p.endTime }}</option>
                }
              }
            </select>
            <span class="sel-arrow">⌄</span>
          </div>
        </div>

        <div class="sel-wrap">
          <span class="sel-label">Date</span>
          <app-date-picker [(ngModel)]="date" (dateChange)="onDateChange()" />
        </div>

        <button class="search-btn" [disabled]="!selectedClass || searching() || isOffDay()" (click)="search()">
          @if (searching()) { <span class="spin">⟳</span> Searching… }
          @else { 🔍 Search }
        </button>

      </div>
      @if (isOffDay()) {
        <div class="off-day-warn">
          <span class="material-icons-round">event_busy</span>
          Off day — attendance cannot be marked on this date
        </div>
      }
    </div>

    @if (searching()) { <app-loading /> }
    @else if (searched() && rows().length === 0) {
      <div class="splash">
        <div class="splash-icon">👥</div>
        <div class="splash-title">No students found</div>
        <div class="splash-sub">No enrolled students found for this class.</div>
      </div>
    } @else if (rows().length > 0) {

      <!-- Summary + bulk actions -->
      <div class="action-bar card">
        <div class="summary-chips">
          <div class="chip chip-p"><span class="chip-n">{{ countOf('Present') }}</span><span class="chip-l">Present</span></div>
          <div class="chip chip-a"><span class="chip-n">{{ countOf('Absent') }}</span><span class="chip-l">Absent</span></div>
          <div class="chip chip-l"><span class="chip-n">{{ countOf('Leave') }}</span><span class="chip-l">Leave</span></div>
          <div class="chip chip-t"><span class="chip-n">{{ rows().length }}</span><span class="chip-l">Total</span></div>
        </div>
        <div class="bulk-btns">
          <span class="bulk-label">Mark all:</span>
          <button class="bulk-btn bulk-p" (click)="markAll('Present')">P Present</button>
          <button class="bulk-btn bulk-a" (click)="markAll('Absent')">A Absent</button>
          <button class="bulk-btn bulk-l" (click)="markAll('Leave')">L Leave</button>
        </div>
      </div>

      <!-- Student table -->
      <div class="table-card card">
        <table class="att-table">
          <thead>
            <tr>
              <th class="th-no">#</th>
              <th class="th-adm">Admission No</th>
              <th class="th-name">Student Name</th>
              <th class="th-gender">Gender</th>
              <th class="th-att">Attendance</th>
            </tr>
          </thead>
          <tbody>
            @for (row of rows(); track row.studentId; let i = $index) {
              <tr [class.row-absent]="row.status === 'Absent'" [class.row-leave]="row.status === 'Leave'">
                <td class="td-no">{{ i + 1 }}</td>
                <td class="td-adm">{{ row.admissionNo }}</td>
                <td class="td-name">{{ row.name }}</td>
                <td class="td-gender">
                  <span class="gender-badge" [class.male]="row.gender?.toLowerCase() === 'male'" [class.female]="row.gender?.toLowerCase() === 'female'">
                    {{ row.gender || '—' }}
                  </span>
                </td>
                <td class="td-att">
                  <div class="att-toggle">
                    <button class="att-btn btn-p" [class.active]="row.status === 'Present'" (click)="setStatus(row, 'Present')">P</button>
                    <button class="att-btn btn-a" [class.active]="row.status === 'Absent'"  (click)="setStatus(row, 'Absent')">A</button>
                    <button class="att-btn btn-l" [class.active]="row.status === 'Leave'"   (click)="setStatus(row, 'Leave')">L</button>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Save bar -->
      <div class="save-bar card">
        @if (successMsg()) { <span class="msg-ok">✓ {{ successMsg() }}</span> }
        @if (errorMsg())   { <span class="msg-err">✕ {{ errorMsg() }}</span> }
        @if (!selectedPeriod) {
          <span class="msg-err">Please select a period before saving.</span>
        }
        <button class="save-btn" (click)="submit()" [disabled]="saving() || !selectedPeriod">
          {{ saving() ? 'Saving…' : 'Save Attendance' }}
        </button>
      </div>
    }
  `,
  styles: [`
    /* Filter card */
    .filter-card { padding:16px 20px; margin-bottom:16px; }
    .filter-row  { display:flex; gap:16px; flex-wrap:wrap; align-items:flex-end; }

    .sel-wrap  { display:flex; flex-direction:column; gap:5px; }
    .sel-label { font-size:10.5px; font-weight:700; color:var(--t3); text-transform:uppercase; letter-spacing:.6px; }
    .sel-inner { position:relative; display:flex; align-items:center; }
    .sel-inner select {
      appearance:none; -webkit-appearance:none;
      padding:9px 36px 9px 13px;
      border:1.5px solid var(--border); border-radius:var(--r);
      font-size:13.5px; font-family:inherit;
      background:var(--surface); color:var(--t1);
      min-width:200px; cursor:pointer;
      transition:border-color .15s, box-shadow .15s;
      box-shadow:var(--sh-xs);
    }
    .sel-inner select:hover  { border-color:var(--border-2); }
    .sel-inner select:focus  { outline:none; border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-g); }
    .sel-arrow { pointer-events:none; position:absolute; right:11px; color:var(--t4); font-size:16px; line-height:1; transition:color .15s; }
    .sel-inner:focus-within .sel-arrow { color:var(--accent); }

    .date-inner { display:flex; }
    .date-input {
      padding:9px 13px;
      border:1.5px solid var(--border); border-radius:var(--r);
      font-size:13.5px; font-family:inherit;
      background:var(--surface); color:var(--t1);
      cursor:pointer; box-shadow:var(--sh-xs);
      transition:border-color .15s, box-shadow .15s;
    }
    .date-input:focus { outline:none; border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-g); }
    .off-day-warn {
      display:flex; align-items:center; gap:6px;
      margin-top:12px; padding:8px 12px;
      background:#fef2f2; border:1px solid #fecaca; border-radius:8px;
      font-size:12px; font-weight:600; color:#dc2626;
    }
    .off-day-warn .material-icons-round { font-size:16px; }

    .search-btn {
      padding:9px 22px; background:var(--accent); color:#fff;
      border:none; border-radius:var(--r); font-size:13px; font-weight:700;
      cursor:pointer; white-space:nowrap; height:40px; align-self:flex-end;
      box-shadow:0 1px 4px rgba(var(--accent-rgb),.4);
      transition:background .15s, box-shadow .15s;
    }
    .search-btn:hover:not(:disabled) { background:var(--accent-h); box-shadow:0 4px 12px rgba(var(--accent-rgb),.4); }
    .search-btn:disabled { opacity:.55; cursor:not-allowed; }
    .spin { display:inline-block; animation:spin .7s linear infinite; }

    /* Splash */
    .splash { text-align:center; padding:60px 24px; }
    .splash-icon  { font-size:48px; margin-bottom:12px; }
    .splash-title { font-size:17px; font-weight:700; color:var(--t1); margin-bottom:5px; }
    .splash-sub   { font-size:13px; color:var(--t3); }

    /* Action bar */
    .action-bar { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; padding:12px 20px; margin-bottom:12px; }
    .summary-chips { display:flex; gap:8px; flex-wrap:wrap; }
    .chip { display:flex; flex-direction:column; align-items:center; padding:6px 16px; border-radius:10px; min-width:60px; }
    .chip-n { font-size:18px; font-weight:800; line-height:1; }
    .chip-l { font-size:9px; font-weight:700; margin-top:2px; text-transform:uppercase; letter-spacing:.4px; }
    .chip-p { background:var(--green-s);  color:var(--green); }
    .chip-a { background:var(--red-s);    color:var(--red); }
    .chip-l { background:var(--amber-s);  color:var(--amber); }
    .chip-t { background:var(--accent-s); color:var(--accent); }

    .bulk-btns  { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
    .bulk-label { font-size:11px; font-weight:700; color:var(--t3); text-transform:uppercase; letter-spacing:.4px; }
    .bulk-btn   { padding:5px 14px; border:none; border-radius:6px; font-size:12px; font-weight:700; cursor:pointer; transition:opacity .15s; }
    .bulk-p { background:var(--green-s); color:var(--green); }
    .bulk-a { background:var(--red-s);   color:var(--red); }
    .bulk-l { background:var(--amber-s); color:var(--amber); }
    .bulk-p:hover { background:var(--green-b); }
    .bulk-a:hover { background:var(--red-b); }
    .bulk-l:hover { background:var(--amber-b); }

    /* Table */
    .table-card { padding:0; overflow-x:auto; margin-bottom:12px; }
    .att-table  { width:100%; border-collapse:collapse; min-width:560px; }

    th { padding:10px 16px; font-size:10.5px; font-weight:700; color:var(--t4); text-transform:uppercase; letter-spacing:.6px; text-align:left; background:var(--surface-2); border-bottom:1px solid var(--border); white-space:nowrap; }
    .th-no     { width:48px; text-align:center; }
    .th-adm    { width:130px; }
    .th-gender { width:90px; }
    .th-att    { width:130px; }

    td { padding:11px 16px; border-bottom:1px solid var(--border); color:var(--t2); font-size:13.5px; vertical-align:middle; transition:background .1s; }
    tr:last-child td { border-bottom:none; }
    tr:hover td { background:var(--surface-2); }
    tr.row-absent td  { background:#fff5f5; }
    tr.row-absent:hover td { background:#fee2e2; }
    tr.row-leave td   { background:#fffbeb; }
    tr.row-leave:hover td  { background:#fef3c7; }

    .td-no   { text-align:center; font-size:12px; color:var(--t4); font-weight:600; }
    .td-adm  { font-size:12px; color:var(--t3); font-family:monospace; letter-spacing:.3px; }
    .td-name { font-weight:600; color:var(--t1); }

    .gender-badge { display:inline-block; padding:2px 10px; border-radius:20px; font-size:11px; font-weight:600; }
    .gender-badge.male   { background:#eff6ff; color:#1d4ed8; }
    .gender-badge.female { background:#fdf2f8; color:#9d174d; }

    /* Attendance toggle */
    .att-toggle { display:flex; gap:0; border-radius:8px; overflow:hidden; border:1.5px solid var(--border); width:fit-content; }
    .att-btn {
      padding:5px 14px; border:none; background:var(--surface-2); color:var(--t3);
      font-size:12px; font-weight:800; cursor:pointer; letter-spacing:.5px;
      transition:background .12s, color .12s;
    }
    .att-btn:not(:last-child) { border-right:1px solid var(--border); }
    .att-btn.btn-p.active { background:var(--green); color:#fff; }
    .att-btn.btn-a.active { background:var(--red);   color:#fff; }
    .att-btn.btn-l.active { background:var(--amber); color:#fff; }
    .att-btn:hover:not(.active) { background:var(--surface-3,#eef0f3); }

    /* Save bar */
    .save-bar { display:flex; justify-content:flex-end; align-items:center; gap:14px; padding:14px 20px; }
    .msg-ok  { font-size:13px; font-weight:600; color:var(--green); }
    .msg-err { font-size:13px; font-weight:600; color:var(--red); }
    .save-btn {
      padding:9px 28px; background:var(--accent); color:#fff;
      border:none; border-radius:var(--r); font-size:13px; font-weight:700;
      cursor:pointer; box-shadow:0 1px 4px rgba(var(--accent-rgb),.4);
      transition:background .15s;
    }
    .save-btn:hover:not(:disabled) { background:var(--accent-h); }
    .save-btn:disabled { opacity:.55; cursor:not-allowed; }

    @keyframes spin { to { transform:rotate(360deg); } }
  `]
})
export class MarkAttendanceComponent implements OnInit {
  private attendanceSvc = inject(AttendanceService);
  private academicSvc   = inject(AcademicService);
  private ttSvc         = inject(TimetableService);
  private studentSvc    = inject(StudentService);
  private settingsSvc   = inject(SettingsService);
  private authSvc       = inject(AuthService);

  classes  = signal<ClassDto[]>([]);
  periods  = signal<PeriodDto[]>([]);
  rows     = signal<Row[]>([]);

  searching  = signal(false);
  searched   = signal(false);
  saving     = signal(false);
  successMsg = signal('');
  errorMsg   = signal('');
  isOffDay   = signal(false);

  private workingDays = new Set<number>();
  private isTeacher   = false;

  selectedClass:  number | null = null;
  selectedPeriod: number | null = null;
  date = new Date().toISOString().slice(0, 10);

  ngOnInit() {
    const user = this.authSvc.currentUser();
    this.isTeacher = this.authSvc.hasRole('teacher');

    if (this.isTeacher && user) {
      // Teacher: only classes they are assigned to
      this.academicSvc.getAssignmentsByTeacher(user.userId).pipe(
        switchMap(assignments => {
          const classIds = new Set(assignments.filter(a => a.isActive).map(a => a.classId));
          return this.academicSvc.getClasses().pipe(
            switchMap(allClasses => of(allClasses.filter(c => classIds.has(c.classId))))
          );
        })
      ).subscribe({
        next: classes => this.classes.set(classes),
        error: () => this.academicSvc.getClasses().subscribe(c => this.classes.set(c))
      });
    } else {
      this.academicSvc.getClasses().subscribe(c => this.classes.set(c));
    }

    this.settingsSvc.getWorkingDays().subscribe(wd => {
      this.workingDays = wd;
      this.checkOffDay();
    });
  }

  onDateChange() { this.checkOffDay(); }

  onClassChange() {
    this.selectedPeriod = null;
    this.periods.set([]);
    this.rows.set([]);
    this.searched.set(false);
    if (!this.selectedClass) return;

    // Load periods actually assigned to this class via timetable
    this.ttSvc.getForClass(this.selectedClass).subscribe({
      next: entries => {
        const periodMap = new Map<number, PeriodDto>();
        entries.filter(e => !e.isBreak && e.periodId).forEach(e =>
          periodMap.set(e.periodId, {
            periodId:   e.periodId,
            periodNo:   e.periodNo,
            periodName: e.periodName ?? `Period ${e.periodNo}`,
            startTime:  e.startTime,
            endTime:    e.endTime,
            isBreak:    false
          })
        );
        // Fall back to all periods if timetable not built yet
        if (periodMap.size === 0) {
          this.ttSvc.getPeriods().subscribe(p =>
            this.periods.set(p.filter(x => !x.isBreak).sort((a, b) => a.startTime.localeCompare(b.startTime)))
          );
        } else {
          this.periods.set([...periodMap.values()].sort((a, b) => a.startTime.localeCompare(b.startTime)));
        }
      },
      error: () => this.ttSvc.getPeriods().subscribe(p =>
        this.periods.set(p.filter(x => !x.isBreak).sort((a, b) => a.startTime.localeCompare(b.startTime)))
      )
    });
  }

  private checkOffDay() {
    if (!this.date) { this.isOffDay.set(false); return; }
    const d = new Date(this.date + 'T00:00:00');
    this.isOffDay.set(!this.settingsSvc.isWorkingDate(d, this.workingDays));
  }

  search() {
    if (!this.selectedClass) return;
    this.searching.set(true);
    this.searched.set(false);
    this.successMsg.set('');
    this.errorMsg.set('');
    this.studentSvc.getStudents(this.selectedClass, undefined, undefined, 1, 0).subscribe({
      next: r => {
        this.rows.set(r.items.map(s => ({
          studentId:   s.studentId,
          admissionNo: s.admissionNo,
          name:        s.fullName,
          gender:      s.gender ?? '',
          status:      'Present',
        })));
        this.searching.set(false);
        this.searched.set(true);
      },
      error: () => { this.searching.set(false); this.searched.set(true); }
    });
  }

  countOf(status: string) { return this.rows().filter(r => r.status === status).length; }

  markAll(status: 'Present' | 'Absent' | 'Leave') {
    this.rows.update(list => list.map(r => ({ ...r, status })));
  }

  setStatus(row: Row, status: 'Present' | 'Absent' | 'Leave') {
    this.rows.update(list => list.map(r => r.studentId === row.studentId ? { ...r, status } : r));
  }

  submit() {
    if (!this.selectedClass || !this.selectedPeriod || !this.date) {
      this.errorMsg.set('Please select class, period and date.'); return;
    }
    if (this.isOffDay()) {
      this.errorMsg.set('Attendance cannot be marked on an off day.'); return;
    }
    this.saving.set(true);
    this.successMsg.set('');
    this.errorMsg.set('');
    this.attendanceSvc.bulkMark({
      classId:  this.selectedClass,
      periodId: this.selectedPeriod,
      date:     this.date,
      entries:  this.rows().map(r => ({ studentId: r.studentId, status: r.status, remarks: null }))
    }).subscribe({
      next: () => { this.saving.set(false); this.successMsg.set('Attendance saved successfully!'); },
      error: (e: any) => { this.saving.set(false); this.errorMsg.set(e?.error?.error ?? 'Failed to save.'); }
    });
  }
}
