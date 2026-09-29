import { Component, inject, OnInit, signal, computed } from '@angular/core';
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
    <app-page-header title="View Attendance" subtitle="Search, review & analyze historical attendance records" />

    <!-- ── Mode Tabs Bar ── -->
    <div class="tabs-nav-bar">
      <div class="tabs-pill-container">
        <button class="tab-pill" [class.active]="tab() === 'daily'" (click)="switchTab('daily')">
          <span class="material-icons-round tab-icon">view_list</span>
          <span>Daily Roll Call</span>
        </button>
        <button class="tab-pill" [class.active]="tab() === 'summary'" (click)="switchTab('summary')">
          <span class="material-icons-round tab-icon">analytics</span>
          <span>Class Summary & Analytics</span>
        </button>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════
         1. DAILY ROLL CALL TAB
    ═══════════════════════════════════════════════════ -->
    @if (tab() === 'daily') {
      <div class="filter-card card">
        <div class="filter-grid daily-grid">

          <div class="field-wrap">
            <label class="field-label">Class & Section</label>
            <div class="input-box">
              <span class="material-icons-round input-icon">school</span>
              <select [(ngModel)]="selectedClass" class="form-select">
                <option [ngValue]="null">Select class…</option>
                @for (c of classes(); track c.classId) {
                  <option [ngValue]="c.classId">{{ c.className }}{{ c.section ? ' · ' + c.section : '' }}</option>
                }
              </select>
              <span class="material-icons-round select-caret">expand_more</span>
            </div>
          </div>

          <div class="field-wrap">
            <label class="field-label">Period (Optional)</label>
            <div class="input-box">
              <span class="material-icons-round input-icon">schedule</span>
              <select [(ngModel)]="selectedPeriod" class="form-select">
                <option [ngValue]="null">All Periods</option>
                @for (p of periods(); track p.periodId) {
                  @if (!p.isBreak) {
                    <option [ngValue]="p.periodId">{{ p.periodName }} ({{ fmt(p.startTime) }}–{{ fmt(p.endTime) }})</option>
                  }
                }
              </select>
              <span class="material-icons-round select-caret">expand_more</span>
            </div>
          </div>

          <div class="field-wrap">
            <label class="field-label">Date</label>
            <div class="date-picker-container">
              <app-date-picker [(ngModel)]="date" />
            </div>
          </div>

          <div class="field-wrap btn-field">
            <button class="search-btn" [disabled]="!selectedClass || !date || loading()" (click)="loadDaily()">
              @if (loading()) {
                <span class="spin material-icons-round">sync</span>
                <span>Loading…</span>
              } @else {
                <span class="material-icons-round">search</span>
                <span>Search</span>
              }
            </button>
          </div>

        </div>
      </div>

      @if (loading()) {
        <app-loading />
      } @else if (searched() && records().length === 0) {
        <div class="splash card">
          <div class="splash-icon-wrap"><span class="material-icons-round">event_available</span></div>
          <h3 class="splash-title">No Records Found</h3>
          <p class="splash-sub">No attendance records match the selected class, period, and date.</p>
        </div>
      } @else if (records().length > 0) {

        <!-- Stats Bar -->
        <div class="action-card card">
          <div class="stats-group">
            @for (s of dailyStats(); track s.label) {
              <div class="stat-pill" [style.background]="s.bg" [style.color]="s.color">
                <div class="stat-info">
                  <span class="stat-value">{{ s.count }}</span>
                  <span class="stat-label">{{ s.label }}</span>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Table -->
        <div class="roster-card card">
          <table class="roster-table">
            <thead>
              <tr>
                <th class="th-num">#</th>
                <th class="th-student">Student Name</th>
                <th class="th-adm">Admission No</th>
                <th class="th-period">Period</th>
                <th class="th-date">Date</th>
                <th class="th-status">Status</th>
              </tr>
            </thead>
            <tbody>
              @for (r of records(); track r.attendanceId; let i = $index) {
                <tr>
                  <td class="td-num">{{ i + 1 }}</td>
                  <td class="td-student">
                    <div class="student-profile">
                      <div class="student-avatar" [style.background]="getAvatarBg(r.studentName)">
                        {{ getInitials(r.studentName) }}
                      </div>
                      <span class="student-name">{{ r.studentName }}</span>
                    </div>
                  </td>
                  <td class="td-adm"><span class="adm-badge">{{ r.admissionNo }}</span></td>
                  <td class="td-period">{{ r.periodName }}</td>
                  <td class="td-date">{{ r.date }}</td>
                  <td class="td-status">
                    <span class="status-badge" [class]="'s-' + r.status.toLowerCase()">
                      <span class="material-icons-round badge-icon">
                        {{ r.status.toLowerCase() === 'present' ? 'check_circle' : r.status.toLowerCase() === 'absent' ? 'cancel' : 'pause_circle' }}
                      </span>
                      {{ r.status }}
                    </span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    }

    <!-- ═══════════════════════════════════════════════════
         2. CLASS SUMMARY & ANALYTICS TAB
    ═══════════════════════════════════════════════════ -->
    @if (tab() === 'summary') {
      <div class="filter-card card">
        <div class="filter-grid summary-grid">

          <div class="field-wrap">
            <label class="field-label">Class & Section</label>
            <div class="input-box">
              <span class="material-icons-round input-icon">school</span>
              <select [(ngModel)]="selectedClass" class="form-select">
                <option [ngValue]="null">Select class…</option>
                @for (c of classes(); track c.classId) {
                  <option [ngValue]="c.classId">{{ c.className }}{{ c.section ? ' · ' + c.section : '' }}</option>
                }
              </select>
              <span class="material-icons-round select-caret">expand_more</span>
            </div>
          </div>

          <div class="field-wrap">
            <label class="field-label">From Date</label>
            <div class="date-picker-container">
              <app-date-picker [(ngModel)]="fromDate" />
            </div>
          </div>

          <div class="field-wrap">
            <label class="field-label">To Date</label>
            <div class="date-picker-container">
              <app-date-picker [(ngModel)]="toDate" />
            </div>
          </div>

          <div class="field-wrap btn-field">
            <button class="search-btn" [disabled]="!selectedClass || !fromDate || !toDate || loading()" (click)="loadSummary()">
              @if (loading()) {
                <span class="spin material-icons-round">sync</span>
                <span>Generating…</span>
              } @else {
                <span class="material-icons-round">analytics</span>
                <span>Generate</span>
              }
            </button>
          </div>

        </div>
      </div>

      @if (loading()) {
        <app-loading />
      } @else if (searched() && summaries().length === 0) {
        <div class="splash card">
          <div class="splash-icon-wrap"><span class="material-icons-round">bar_chart</span></div>
          <h3 class="splash-title">No Summary Data</h3>
          <p class="splash-sub">No attendance records found for this class within the specified date range.</p>
        </div>
      } @else if (summaries().length > 0) {
        <div class="roster-card card">
          <table class="roster-table">
            <thead>
              <tr>
                <th class="th-num">#</th>
                <th class="th-student">Student Name</th>
                <th class="th-adm">Admission No</th>
                <th class="th-metric text-present">Present</th>
                <th class="th-metric text-absent">Absent</th>
                <th class="th-metric text-leave">Leave</th>
                <th class="th-metric">Total</th>
                <th class="th-pct">Attendance %</th>
              </tr>
            </thead>
            <tbody>
              @for (s of summaries(); track s.studentId; let i = $index) {
                <tr>
                  <td class="td-num">{{ i + 1 }}</td>
                  <td class="td-student">
                    <div class="student-profile">
                      <div class="student-avatar" [style.background]="getAvatarBg(s.studentName)">
                        {{ getInitials(s.studentName) }}
                      </div>
                      <span class="student-name">{{ s.studentName }}</span>
                    </div>
                  </td>
                  <td class="td-adm"><span class="adm-badge">{{ s.admissionNo }}</span></td>
                  <td class="td-metric text-present font-bold">{{ s.present }}</td>
                  <td class="td-metric text-absent font-bold">{{ s.absent }}</td>
                  <td class="td-metric text-leave font-bold">{{ s.late }}</td>
                  <td class="td-metric font-bold">{{ s.totalDays }}</td>
                  <td class="td-pct">
                    <div class="pct-cell">
                      <div class="pct-bar-bg">
                        <div class="pct-bar-fill" [style.width.%]="s.attendancePercent"
                          [class.fill-green]="s.attendancePercent >= 75"
                          [class.fill-amber]="s.attendancePercent >= 50 && s.attendancePercent < 75"
                          [class.fill-red]="s.attendancePercent < 50">
                        </div>
                      </div>
                      <span class="pct-value"
                        [class.text-green]="s.attendancePercent >= 75"
                        [class.text-amber]="s.attendancePercent >= 50 && s.attendancePercent < 75"
                        [class.text-red]="s.attendancePercent < 50">
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
    /* ═══ TABS NAV BAR ═══════════════════════════════ */
    .tabs-nav-bar {
      margin-bottom: 18px;
    }
    .tabs-pill-container {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 99px;
      padding: 4px;
      box-shadow: var(--sh-xs);
    }
    .tab-pill {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 8px 18px;
      border: none;
      background: transparent;
      color: var(--t3);
      font-size: 13px;
      font-weight: 600;
      border-radius: 99px;
      cursor: pointer;
      transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .tab-pill:hover { background: var(--surface-2); color: var(--t1); }
    .tab-pill.active {
      background: var(--accent);
      color: #fff;
      box-shadow: 0 3px 10px rgba(var(--accent-rgb), 0.35);
    }
    .tab-icon { font-size: 17px; }

    /* ═══ FILTER CARD ════════════════════════════════ */
    .filter-card {
      padding: 20px;
      margin-bottom: 20px;
      border-radius: var(--r-xl);
      background: var(--surface);
      border: 1px solid var(--border);
      box-shadow: var(--sh-xs);
    }
    .filter-grid {
      display: grid;
      gap: 16px;
      align-items: flex-end;
    }
    .daily-grid {
      grid-template-columns: 1.2fr 1.2fr 1.2fr 160px;
    }
    .summary-grid {
      grid-template-columns: 1.2fr 1.2fr 1.2fr 160px;
    }

    .field-wrap { display: flex; flex-direction: column; gap: 6px; }
    .field-label {
      font-size: 11.5px;
      font-weight: 700;
      color: var(--t3);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .input-box {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
    }
    .input-icon {
      position: absolute;
      left: 12px;
      font-size: 19px;
      color: var(--accent);
      pointer-events: none;
    }
    .form-select {
      appearance: none;
      -webkit-appearance: none;
      width: 100%;
      height: 42px;
      padding: 0 36px 0 38px;
      border: 1.5px solid var(--border);
      border-radius: var(--r-lg);
      font-size: 13.5px;
      font-weight: 600;
      font-family: inherit;
      background: var(--surface-2);
      color: var(--t1);
      cursor: pointer;
      transition: all 0.15s;
    }
    .form-select:hover { border-color: var(--border-2); background: var(--surface); }
    .form-select:focus {
      outline: none;
      border-color: var(--accent);
      background: var(--surface);
      box-shadow: 0 0 0 3.5px var(--accent-g);
    }
    .select-caret {
      position: absolute;
      right: 10px;
      font-size: 20px;
      color: var(--t4);
      pointer-events: none;
    }

    .date-picker-container { width: 100%; }
    ::ng-deep .date-picker-container .dp-input {
      height: 42px !important;
      border-radius: var(--r-lg) !important;
      background: var(--surface-2) !important;
      border: 1.5px solid var(--border) !important;
      font-size: 13.5px !important;
      font-weight: 600 !important;
    }
    ::ng-deep .date-picker-container .dp-input:hover {
      border-color: var(--border-2) !important;
      background: var(--surface) !important;
    }
    ::ng-deep .date-picker-container .dp-input.dp-focus {
      border-color: var(--accent) !important;
      box-shadow: 0 0 0 3.5px var(--accent-g) !important;
      background: var(--surface) !important;
    }

    .btn-field { display: flex; justify-content: flex-end; }
    .search-btn {
      width: 100%;
      height: 42px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: linear-gradient(135deg, var(--accent), var(--accent-h));
      color: #fff;
      border: none;
      border-radius: var(--r-lg);
      font-size: 13.5px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 3px 10px rgba(var(--accent-rgb), 0.35);
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .search-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 5px 14px rgba(var(--accent-rgb), 0.45);
    }
    .search-btn:disabled { opacity: 0.55; cursor: not-allowed; box-shadow: none; }
    .search-btn .material-icons-round { font-size: 18px; }

    /* ═══ STATS & ACTION CARDS ════════════════════════ */
    .action-card {
      padding: 14px 20px;
      margin-bottom: 16px;
      border-radius: var(--r-xl);
      background: var(--surface);
      border: 1px solid var(--border);
    }
    .stats-group {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .stat-pill {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 18px;
      border-radius: var(--r-lg);
    }
    .stat-info { display: flex; flex-direction: column; }
    .stat-value { font-size: 18px; font-weight: 800; line-height: 1.1; }
    .stat-label { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; }

    /* ═══ ROSTER TABLE ════════════════════════════════ */
    .roster-card {
      padding: 0;
      overflow-x: auto;
      margin-bottom: 24px;
      border-radius: var(--r-xl);
      background: var(--surface);
      border: 1px solid var(--border);
    }
    .roster-table {
      width: 100%;
      border-collapse: collapse;
      min-width: 680px;
    }

    th {
      padding: 12px 18px;
      font-size: 11px;
      font-weight: 700;
      color: var(--t4);
      text-transform: uppercase;
      letter-spacing: 0.6px;
      text-align: left;
      background: var(--surface-2);
      border-bottom: 1.5px solid var(--border);
      white-space: nowrap;
    }
    .th-num { width: 50px; text-align: center; }
    .th-adm { width: 140px; }
    .th-period { width: 130px; }
    .th-date { width: 130px; }
    .th-status { width: 140px; }
    .th-metric { text-align: center; width: 85px; }
    .th-pct { min-width: 170px; }

    td {
      padding: 12px 18px;
      border-bottom: 1px solid var(--border);
      vertical-align: middle;
      font-size: 13.5px;
      transition: background 0.12s;
    }
    tr:last-child td { border-bottom: none; }
    tbody tr:hover td { background: var(--surface-2); }

    .td-num { text-align: center; font-weight: 700; color: var(--t4); font-size: 12px; }
    .student-profile { display: flex; align-items: center; gap: 10px; }
    .student-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11.5px;
      font-weight: 800;
      flex-shrink: 0;
    }
    .student-name { font-weight: 700; color: var(--t1); font-size: 13.5px; }

    .adm-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 6px;
      background: var(--surface-2);
      border: 1px solid var(--border);
      font-family: monospace;
      font-size: 11.5px;
      font-weight: 600;
      color: var(--t2);
    }
    .td-period, .td-date { font-size: 12.5px; color: var(--t3); }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11.5px;
      font-weight: 700;
    }
    .badge-icon { font-size: 15px; }
    .s-present { background: var(--green-s); color: var(--green); }
    .s-absent  { background: var(--red-s);   color: var(--red); }
    .s-late, .s-leave { background: var(--amber-s); color: var(--amber); }

    /* Summary metrics */
    .td-metric { text-align: center; font-size: 14px; }
    .font-bold { font-weight: 700; }
    .text-present { color: var(--green); }
    .text-absent  { color: var(--red); }
    .text-leave   { color: var(--amber); }

    .pct-cell { display: flex; align-items: center; gap: 10px; }
    .pct-bar-bg {
      flex: 1;
      height: 8px;
      background: var(--surface-3);
      border-radius: 99px;
      overflow: hidden;
      max-width: 100px;
    }
    .pct-bar-fill { height: 100%; border-radius: 99px; transition: width 0.3s; }
    .pct-value { font-size: 12.5px; font-weight: 800; min-width: 40px; }

    .fill-green { background: var(--green); }
    .fill-amber { background: var(--amber); }
    .fill-red   { background: var(--red); }
    .text-green { color: var(--green); }
    .text-amber { color: var(--amber); }
    .text-red   { color: var(--red); }

    /* Splash */
    .splash { text-align: center; padding: 50px 20px; border-radius: var(--r-xl); margin-bottom: 20px; }
    .splash-icon-wrap {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: var(--surface-2);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 12px;
    }
    .splash-icon-wrap .material-icons-round { font-size: 32px; color: var(--t4); }
    .splash-title { font-size: 17px; font-weight: 800; color: var(--t1); margin-bottom: 4px; }
    .splash-sub { font-size: 13px; color: var(--t3); }

    @keyframes spin { to { transform: rotate(360deg); } }
    .spin { animation: spin 0.8s linear infinite; display: inline-block; }

    @media (max-width: 900px) {
      .daily-grid, .summary-grid { grid-template-columns: 1fr 1fr; }
      .btn-field { grid-column: span 2; }
    }
    @media (max-width: 640px) {
      .daily-grid, .summary-grid { grid-template-columns: 1fr; gap: 12px; }
      .btn-field { grid-column: span 1; }
      .tabs-pill-container { width: 100%; justify-content: space-between; }
      .tab-pill { flex: 1; justify-content: center; padding: 8px 6px; font-size: 12px; }
    }
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

  private avatarColors = ['#6366f1', '#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#3b82f6'];

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
      { label:'Total',   count: r.length,          bg:'var(--surface-2)',color:'var(--t1)' },
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

  fmt(t: string): string { return t ? t.slice(0, 5) : ''; }

  getInitials(name: string): string {
    if (!name) return 'S';
    return name.split(' ').filter(w => !!w).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  getAvatarBg(name: string): string {
    if (!name) return this.avatarColors[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return this.avatarColors[Math.abs(hash) % this.avatarColors.length];
  }
}
