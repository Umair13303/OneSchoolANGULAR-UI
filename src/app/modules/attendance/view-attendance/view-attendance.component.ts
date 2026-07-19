import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';
import { FormsModule } from '@angular/forms';
import { AttendanceService } from '../../../core/services/attendance.service';
import { AcademicService } from '../../../core/services/academic.service';
import { TimetableService } from '../../../core/services/timetable.service';
import { AttendanceRecordDto, AttendanceSummaryDto } from '../../../core/models/attendance.model';
import { ClassDto } from '../../../core/models/academic.model';
import { PeriodDto } from '../../../core/models/timetable.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';

@Component({
  selector: 'app-view-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, LoadingComponent, DatePickerComponent],
  template: `
    <app-page-header title="View Attendance" subtitle="Search and review attendance records" />

    <!-- Tab bar -->
    <div class="tab-bar card">
      <button class="tab-btn" [class.active]="tab() === 'daily'" (click)="switchTab('daily')">
        <span class="tab-icon">📋</span> Daily Roll
      </button>
      <button class="tab-btn" [class.active]="tab() === 'summary'" (click)="switchTab('summary')">
        <span class="tab-icon">📊</span> Class Summary
      </button>
    </div>

    <!-- ── DAILY TAB ── -->
    @if (tab() === 'daily') {
      <div class="filter-card card">
        <div class="filter-row">
          <div class="sel-wrap">
            <span class="sel-label">Class</span>
            <div class="sel-inner">
              <select [(ngModel)]="selectedClass">
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
                <option [ngValue]="null">All Periods</option>
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
            <app-date-picker [(ngModel)]="date" />
          </div>

          <button class="search-btn" [disabled]="!selectedClass || !date || loading()" (click)="loadDaily()">
            @if (loading()) { <span class="spin">⟳</span> Searching… } @else { 🔍 Search }
          </button>
        </div>
      </div>

      @if (loading()) { <app-loading /> }
      @else if (searched() && records().length === 0) {
        <div class="splash"><div class="splash-icon">✅</div><div class="splash-title">No records found</div><div class="splash-sub">No attendance records match your search.</div></div>
      } @else if (records().length > 0) {
        <!-- stats -->
        <div class="stats-bar card">
          @for (s of dailyStats(); track s.label) {
            <div class="stat-chip" [style.background]="s.bg" [style.color]="s.color">
              <span class="stat-n">{{ s.count }}</span>
              <span class="stat-l">{{ s.label }}</span>
            </div>
          }
        </div>
        <div class="table-card card">
          <table class="att-table">
            <thead>
              <tr>
                <th class="th-no">#</th>
                <th>Student</th>
                <th>Admission No</th>
                <th>Period</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              @for (r of records(); track r.attendanceId; let i = $index) {
                <tr>
                  <td class="td-no">{{ i + 1 }}</td>
                  <td class="td-name">{{ r.studentName }}</td>
                  <td class="td-adm">{{ r.admissionNo }}</td>
                  <td class="td-period">{{ r.periodName }}</td>
                  <td class="td-date">{{ r.date }}</td>
                  <td><span class="status-badge" [class]="'s-' + r.status.toLowerCase()">{{ r.status }}</span></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    }

    <!-- ── SUMMARY TAB ── -->
    @if (tab() === 'summary') {
      <div class="filter-card card">
        <div class="filter-row">
          <div class="sel-wrap">
            <span class="sel-label">Class</span>
            <div class="sel-inner">
              <select [(ngModel)]="selectedClass">
                <option [ngValue]="null">Select class…</option>
                @for (c of classes(); track c.classId) {
                  <option [ngValue]="c.classId">{{ c.className }}{{ c.section ? ' · ' + c.section : '' }}</option>
                }
              </select>
              <span class="sel-arrow">⌄</span>
            </div>
          </div>

          <div class="sel-wrap">
            <span class="sel-label">From Date</span>
            <app-date-picker [(ngModel)]="fromDate" />
          </div>

          <div class="sel-wrap">
            <span class="sel-label">To Date</span>
            <app-date-picker [(ngModel)]="toDate" />
          </div>

          <button class="search-btn" [disabled]="!selectedClass || !fromDate || !toDate || loading()" (click)="loadSummary()">
            @if (loading()) { <span class="spin">⟳</span> Searching… } @else { 🔍 Search }
          </button>
        </div>
      </div>

      @if (loading()) { <app-loading /> }
      @else if (searched() && summaries().length === 0) {
        <div class="splash"><div class="splash-icon">📊</div><div class="splash-title">No data found</div><div class="splash-sub">No attendance summary found for this class and date range.</div></div>
      } @else if (summaries().length > 0) {
        <div class="table-card card">
          <table class="att-table">
            <thead>
              <tr>
                <th class="th-no">#</th>
                <th>Student</th>
                <th>Admission No</th>
                <th class="th-center">Present</th>
                <th class="th-center">Absent</th>
                <th class="th-center">Leave</th>
                <th class="th-center">Total</th>
                <th>Attendance %</th>
              </tr>
            </thead>
            <tbody>
              @for (s of summaries(); track s.studentId; let i = $index) {
                <tr>
                  <td class="td-no">{{ i + 1 }}</td>
                  <td class="td-name">{{ s.studentName }}</td>
                  <td class="td-adm">{{ s.admissionNo }}</td>
                  <td class="td-center td-present">{{ s.present }}</td>
                  <td class="td-center td-absent">{{ s.absent }}</td>
                  <td class="td-center td-leave">{{ s.late }}</td>
                  <td class="td-center">{{ s.totalDays }}</td>
                  <td class="td-pct">
                    <div class="pct-wrap">
                      <div class="pct-track">
                        <div class="pct-fill" [style.width.%]="s.attendancePercent"
                          [class.pct-green]="s.attendancePercent >= 75"
                          [class.pct-amber]="s.attendancePercent >= 50 && s.attendancePercent < 75"
                          [class.pct-red]="s.attendancePercent < 50">
                        </div>
                      </div>
                      <span class="pct-label" [class.pct-green]="s.attendancePercent >= 75"
                        [class.pct-amber]="s.attendancePercent >= 50 && s.attendancePercent < 75"
                        [class.pct-red]="s.attendancePercent < 50">
                        {{ s.attendancePercent }}%
                      </span>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    }
  `,
  styles: [`
    /* Tab bar */
    .tab-bar { display:flex; gap:4px; padding:6px; margin-bottom:16px; width:fit-content; }
    .tab-btn {
      display:flex; align-items:center; gap:7px;
      padding:9px 22px; border:none; border-radius:var(--r);
      background:transparent; color:var(--t3);
      font-size:13px; font-weight:600; font-family:inherit; cursor:pointer;
      transition:background .15s, color .15s;
    }
    .tab-btn:hover { background:var(--surface-2); color:var(--t1); }
    .tab-btn.active { background:var(--accent-s); color:var(--accent); }
    .tab-icon { font-size:15px; }

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
      min-width:190px; cursor:pointer;
      transition:border-color .15s, box-shadow .15s;
      box-shadow:var(--sh-xs);
    }
    .sel-inner select:hover  { border-color:var(--border-2); }
    .sel-inner select:focus  { outline:none; border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-g); }
    .sel-arrow { pointer-events:none; position:absolute; right:11px; color:var(--t4); font-size:16px; line-height:1; transition:color .15s; }
    .sel-inner:focus-within .sel-arrow { color:var(--accent); }

    .date-inner { display:flex; }
    .date-input {
      padding:9px 13px; border:1.5px solid var(--border); border-radius:var(--r);
      font-size:13.5px; font-family:inherit; background:var(--surface); color:var(--t1);
      cursor:pointer; box-shadow:var(--sh-xs); transition:border-color .15s, box-shadow .15s;
    }
    .date-input:focus { outline:none; border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-g); }

    .search-btn {
      padding:9px 22px; background:var(--accent); color:#fff;
      border:none; border-radius:var(--r); font-size:13px; font-weight:700;
      cursor:pointer; white-space:nowrap; height:40px; align-self:flex-end;
      box-shadow:0 1px 4px rgba(var(--accent-rgb),.4); transition:background .15s;
    }
    .search-btn:hover:not(:disabled) { background:var(--accent-h); }
    .search-btn:disabled { opacity:.55; cursor:not-allowed; }
    .spin { display:inline-block; animation:spin .7s linear infinite; }

    /* Splash */
    .splash { text-align:center; padding:60px 24px; }
    .splash-icon  { font-size:48px; margin-bottom:12px; }
    .splash-title { font-size:17px; font-weight:700; color:var(--t1); margin-bottom:5px; }
    .splash-sub   { font-size:13px; color:var(--t3); }

    /* Stats bar */
    .stats-bar { display:flex; gap:10px; flex-wrap:wrap; padding:12px 20px; margin-bottom:12px; }
    .stat-chip { display:flex; flex-direction:column; align-items:center; padding:8px 20px; border-radius:10px; min-width:70px; }
    .stat-n { font-size:20px; font-weight:800; line-height:1; }
    .stat-l { font-size:9px; font-weight:700; margin-top:2px; text-transform:uppercase; letter-spacing:.4px; }

    /* Table */
    .table-card { padding:0; overflow-x:auto; }
    .att-table  { width:100%; border-collapse:collapse; min-width:560px; }
    th {
      padding:10px 16px; font-size:10.5px; font-weight:700;
      color:var(--t4); text-transform:uppercase; letter-spacing:.6px;
      text-align:left; background:var(--surface-2);
      border-bottom:1px solid var(--border); white-space:nowrap;
    }
    .th-no     { width:48px; text-align:center; }
    .th-center { text-align:center; }
    td {
      padding:11px 16px; border-bottom:1px solid var(--border);
      color:var(--t2); font-size:13.5px; vertical-align:middle;
    }
    tr:last-child td { border-bottom:none; }
    tbody tr { transition:background .1s; }
    tbody tr:hover td { background:var(--surface-2); }

    .td-no     { text-align:center; font-size:12px; color:var(--t4); font-weight:600; }
    .td-name   { font-weight:600; color:var(--t1); }
    .td-adm    { font-size:12px; color:var(--t3); font-family:monospace; letter-spacing:.3px; }
    .td-period { font-size:12px; color:var(--t3); }
    .td-date   { font-size:12px; color:var(--t3); white-space:nowrap; }
    .td-center { text-align:center; font-weight:700; }
    .td-present { color:var(--green); }
    .td-absent  { color:var(--red); }
    .td-leave   { color:var(--amber); }

    /* Status badge */
    .status-badge { display:inline-block; padding:3px 12px; border-radius:20px; font-size:11px; font-weight:700; letter-spacing:.3px; }
    .s-present { background:var(--green-s); color:var(--green); }
    .s-absent  { background:var(--red-s);   color:var(--red); }
    .s-late    { background:var(--amber-s); color:var(--amber); }
    .s-leave   { background:var(--amber-s); color:var(--amber); }

    /* Progress bar */
    .td-pct { min-width:160px; }
    .pct-wrap  { display:flex; align-items:center; gap:10px; }
    .pct-track { flex:1; height:7px; background:var(--surface-3,#eef0f3); border-radius:99px; overflow:hidden; max-width:100px; }
    .pct-fill  { height:100%; border-radius:99px; transition:width .3s; }
    .pct-label { font-size:12px; font-weight:700; white-space:nowrap; }
    .pct-green { background:var(--green);  color:var(--green); }
    .pct-amber { background:var(--amber);  color:var(--amber); }
    .pct-red   { background:var(--red);    color:var(--red); }

    @keyframes spin { to { transform:rotate(360deg); } }
  `]
})
export class ViewAttendanceComponent implements OnInit {
  private attendanceSvc = inject(AttendanceService);
  private academicSvc   = inject(AcademicService);
  private ttSvc         = inject(TimetableService);

  tab       = signal<'daily' | 'summary'>('daily');
  classes   = signal<ClassDto[]>([]);
  periods   = signal<PeriodDto[]>([]);
  records   = signal<AttendanceRecordDto[]>([]);
  summaries = signal<AttendanceSummaryDto[]>([]);
  loading   = signal(false);
  searched  = signal(false);

  selectedClass:  number | null = null;
  selectedPeriod: number | null = null;
  date     = new Date().toISOString().slice(0, 10);
  fromDate = '';
  toDate   = '';

  ngOnInit() {
    this.academicSvc.getClasses().subscribe(c => this.classes.set(c));
    this.ttSvc.getPeriods().subscribe(p =>
      this.periods.set(p.sort((a, b) => a.startTime.localeCompare(b.startTime)))
    );
  }

  switchTab(t: 'daily' | 'summary') {
    this.tab.set(t);
    this.records.set([]);
    this.summaries.set([]);
    this.searched.set(false);
  }

  dailyStats() {
    const r = this.records();
    const count = (s: string) => r.filter(x => x.status.toLowerCase() === s).length;
    return [
      { label:'Present', count: count('present'), bg:'var(--green-s)', color:'var(--green)' },
      { label:'Absent',  count: count('absent'),  bg:'var(--red-s)',   color:'var(--red)'   },
      { label:'Leave',   count: count('leave') + count('late'), bg:'var(--amber-s)', color:'var(--amber)' },
      { label:'Total',   count: r.length,          bg:'var(--accent-s)',color:'var(--accent)' },
    ];
  }

  loadDaily() {
    if (!this.selectedClass || !this.date) return;
    this.loading.set(true);
    this.searched.set(false);
    this.attendanceSvc.getForClass(this.selectedClass, this.date, this.selectedPeriod ?? undefined).subscribe({
      next: r  => { this.records.set(r);  this.loading.set(false); this.searched.set(true); },
      error: () => { this.loading.set(false); this.searched.set(true); }
    });
  }

  loadSummary() {
    if (!this.selectedClass || !this.fromDate || !this.toDate) return;
    this.loading.set(true);
    this.searched.set(false);
    this.attendanceSvc.getClassSummary(this.selectedClass, this.fromDate, this.toDate).subscribe({
      next: s  => { this.summaries.set(s); this.loading.set(false); this.searched.set(true); },
      error: () => { this.loading.set(false); this.searched.set(true); }
    });
  }
}
