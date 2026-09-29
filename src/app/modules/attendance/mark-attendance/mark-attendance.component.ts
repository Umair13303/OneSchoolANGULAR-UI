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

export interface Row {
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
    <app-page-header title="Mark Attendance" subtitle="Select class, period & date, then record student attendance" />

    <!-- ── Filter & Search Bar ── -->
    <div class="filter-card card">
      <div class="filter-header-bar">
        <div class="filter-title-wrap">
          <span class="material-icons-round filter-icon">how_to_reg</span>
          <span class="filter-card-title">Class Roll Call</span>
        </div>
        <div class="date-quick-info">
          @if (isToday()) {
            <span class="day-chip chip-today">Today</span>
          }
          @if (isOffDay()) {
            <span class="day-chip chip-off"><span class="material-icons-round">event_busy</span> Non-working Day</span>
          } @else {
            <span class="day-chip chip-work"><span class="material-icons-round">check_circle</span> Working Day</span>
          }
        </div>
      </div>

      <div class="filter-grid">

        <!-- 1. Class Field -->
        <div class="field-wrap">
          <label class="field-label">
            <span class="material-icons-round label-icon">school</span> Class & Section
          </label>
          <div class="input-box">
            <select [(ngModel)]="selectedClass" (change)="onClassChange()" class="form-select">
              <option [ngValue]="null">Select class & section…</option>
              @for (c of classes(); track c.classId) {
                <option [ngValue]="c.classId">{{ c.className }}{{ c.section ? ' · Section ' + c.section : '' }}</option>
              }
            </select>
            <span class="material-icons-round select-caret">expand_more</span>
          </div>
        </div>

        <!-- 2. Period Field -->
        <div class="field-wrap">
          <label class="field-label">
            <span class="material-icons-round label-icon">schedule</span> Period / Slot
          </label>
          <div class="input-box">
            <select [(ngModel)]="selectedPeriod" class="form-select" [disabled]="!selectedClass">
              <option [ngValue]="null">{{ selectedClass ? 'Select period…' : 'Choose class first…' }}</option>
              @for (p of periods(); track p.periodId) {
                @if (!p.isBreak) {
                  <option [ngValue]="p.periodId">{{ p.periodName }} ({{ fmt(p.startTime) }} – {{ fmt(p.endTime) }})</option>
                }
              }
            </select>
            <span class="material-icons-round select-caret">expand_more</span>
          </div>
        </div>

        <!-- 3. Date Field -->
        <div class="field-wrap">
          <label class="field-label">
            <span class="material-icons-round label-icon">calendar_today</span> Attendance Date
          </label>
          <div class="date-picker-container">
            <app-date-picker [(ngModel)]="date" (dateChange)="onDateChange()" />
          </div>
        </div>

        <!-- 4. Action Button -->
        <div class="field-wrap btn-field">
          <button class="search-btn"
                  [disabled]="!selectedClass || searching() || isOffDay()"
                  (click)="search()">
            @if (searching()) {
              <span class="spin material-icons-round btn-icon">sync</span>
              <span>Loading…</span>
            } @else {
              <span class="material-icons-round btn-icon">groups</span>
              <span>Fetch Roster</span>
            }
          </button>
        </div>

      </div>

      @if (isOffDay()) {
        <div class="off-day-banner">
          <span class="material-icons-round">event_busy</span>
          <div class="off-day-text">
            <strong>Off Day Notice:</strong> The selected date is marked as a non-working day in school settings.
          </div>
        </div>
      }
    </div>

    <!-- ── State 1: Searching ── -->
    @if (searching()) {
      <app-loading />
    }

    <!-- ── State 2: Empty Roster Result ── -->
    @else if (searched() && rows().length === 0) {
      <div class="splash card">
        <div class="splash-icon-wrap">
          <span class="material-icons-round">groups</span>
        </div>
        <h3 class="splash-title">No Enrolled Students Found</h3>
        <p class="splash-sub">No active students are currently enrolled in the selected class and section.</p>
      </div>
    }

    <!-- ── State 3: Active Student Roster ── -->
    @else if (rows().length > 0) {

      <!-- Summary Statistics & Metrics Cards -->
      <div class="metrics-grid">
        <div class="metric-card card-present">
          <div class="metric-icon-box">
            <span class="material-icons-round">check_circle</span>
          </div>
          <div class="metric-details">
            <div class="metric-num">{{ presentCount() }}</div>
            <div class="metric-name">Present</div>
          </div>
          <div class="metric-badge badge-p">{{ calcPercent(presentCount()) }}%</div>
        </div>

        <div class="metric-card card-absent">
          <div class="metric-icon-box">
            <span class="material-icons-round">cancel</span>
          </div>
          <div class="metric-details">
            <div class="metric-num">{{ absentCount() }}</div>
            <div class="metric-name">Absent</div>
          </div>
          <div class="metric-badge badge-a">{{ calcPercent(absentCount()) }}%</div>
        </div>

        <div class="metric-card card-leave">
          <div class="metric-icon-box">
            <span class="material-icons-round">pause_circle</span>
          </div>
          <div class="metric-details">
            <div class="metric-num">{{ leaveCount() }}</div>
            <div class="metric-name">On Leave</div>
          </div>
          <div class="metric-badge badge-l">{{ calcPercent(leaveCount()) }}%</div>
        </div>

        <div class="metric-card card-total">
          <div class="metric-icon-box">
            <span class="material-icons-round">people</span>
          </div>
          <div class="metric-details">
            <div class="metric-num">{{ totalCount() }}</div>
            <div class="metric-name">Total Students</div>
          </div>
          <div class="metric-badge badge-t">100%</div>
        </div>
      </div>

      <!-- Live Attendance Progress Bar -->
      <div class="progress-bar-card card">
        <div class="pb-header">
          <span class="pb-title">Attendance Ratio</span>
          <span class="pb-rate">{{ calcPercent(presentCount()) }}% Present Rate</span>
        </div>
        <div class="multi-progress-bar">
          <div class="bar-seg seg-present" [style.width.%]="calcPercent(presentCount())" [title]="'Present: ' + presentCount()"></div>
          <div class="bar-seg seg-absent" [style.width.%]="calcPercent(absentCount())" [title]="'Absent: ' + absentCount()"></div>
          <div class="bar-seg seg-leave" [style.width.%]="calcPercent(leaveCount())" [title]="'Leave: ' + leaveCount()"></div>
        </div>
      </div>

      <!-- Roster Controls Bar -->
      <div class="roster-toolbar card">
        <!-- Live Search Filter -->
        <div class="roster-search-box">
          <span class="material-icons-round search-lens">search</span>
          <input type="text"
                 [(ngModel)]="searchFilter"
                 placeholder="Search student by name or admission #…"
                 class="search-input" />
          @if (searchFilter) {
            <button class="clear-search-btn" (click)="searchFilter = ''">
              <span class="material-icons-round">close</span>
            </button>
          }
        </div>

        <!-- Filter Status Chips -->
        <div class="filter-chips">
          <button class="filter-chip" [class.active]="activeStatusFilter() === 'ALL'" (click)="activeStatusFilter.set('ALL')">
            All ({{ rows().length }})
          </button>
          <button class="filter-chip chip-p" [class.active]="activeStatusFilter() === 'Present'" (click)="activeStatusFilter.set('Present')">
            Present ({{ presentCount() }})
          </button>
          <button class="filter-chip chip-a" [class.active]="activeStatusFilter() === 'Absent'" (click)="activeStatusFilter.set('Absent')">
            Absent ({{ absentCount() }})
          </button>
          <button class="filter-chip chip-l" [class.active]="activeStatusFilter() === 'Leave'" (click)="activeStatusFilter.set('Leave')">
            Leave ({{ leaveCount() }})
          </button>
        </div>

        <!-- Quick Bulk Actions -->
        <div class="bulk-actions-group">
          <span class="bulk-lbl">Quick Mark:</span>
          <button class="bulk-btn btn-bp" (click)="markAll('Present')" title="Set all students to Present">
            <span class="material-icons-round">done_all</span> All Present
          </button>
          <button class="bulk-btn btn-ba" (click)="markAll('Absent')" title="Set all students to Absent">
            <span class="material-icons-round">close</span> All Absent
          </button>
          <button class="bulk-btn btn-bl" (click)="markAll('Leave')" title="Set all students to Leave">
            <span class="material-icons-round">pause</span> All Leave
          </button>
        </div>
      </div>

      <!-- Desktop Table View (>= 768px) -->
      <div class="roster-card card desktop-view">
        <table class="roster-table">
          <thead>
            <tr>
              <th class="th-num">#</th>
              <th class="th-student">Student Name</th>
              <th class="th-adm">Admission No</th>
              <th class="th-gender">Gender</th>
              <th class="th-status">Attendance Status</th>
            </tr>
          </thead>
          <tbody>
            @for (row of displayedRows(); track row.studentId; let i = $index) {
              <tr [class.row-p]="row.status === 'Present'"
                  [class.row-a]="row.status === 'Absent'"
                  [class.row-l]="row.status === 'Leave'">
                <td class="td-num">{{ i + 1 }}</td>
                <td class="td-student">
                  <div class="student-profile">
                    <div class="student-avatar" [style.background]="getAvatarBg(row.name)">
                      {{ getInitials(row.name) }}
                    </div>
                    <div class="student-meta">
                      <span class="student-name">{{ row.name }}</span>
                    </div>
                  </div>
                </td>
                <td class="td-adm">
                  <span class="adm-badge">{{ row.admissionNo }}</span>
                </td>
                <td class="td-gender">
                  <span class="gender-pill" [class.male]="row.gender?.toLowerCase() === 'male'" [class.female]="row.gender?.toLowerCase() === 'female'">
                    {{ row.gender || '—' }}
                  </span>
                </td>
                <td class="td-status">
                  <div class="status-segmented-control">
                    <button class="seg-btn seg-p"
                            [class.active]="row.status === 'Present'"
                            (click)="setStatus(row, 'Present')"
                            type="button">
                      <span class="material-icons-round seg-icon">check</span>
                      <span>Present</span>
                    </button>
                    <button class="seg-btn seg-a"
                            [class.active]="row.status === 'Absent'"
                            (click)="setStatus(row, 'Absent')"
                            type="button">
                      <span class="material-icons-round seg-icon">close</span>
                      <span>Absent</span>
                    </button>
                    <button class="seg-btn seg-l"
                            [class.active]="row.status === 'Leave'"
                            (click)="setStatus(row, 'Leave')"
                            type="button">
                      <span class="material-icons-round seg-icon">pause</span>
                      <span>Leave</span>
                    </button>
                  </div>
                </td>
              </tr>
            }
            @if (displayedRows().length === 0) {
              <tr>
                <td colspan="5" class="td-empty-filter">
                  No students match the active filter or search query.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Mobile Cards View (< 768px) -->
      <div class="mobile-roster-list mobile-view">
        @for (row of displayedRows(); track row.studentId; let i = $index) {
          <div class="student-card card"
               [class.card-p]="row.status === 'Present'"
               [class.card-a]="row.status === 'Absent'"
               [class.card-l]="row.status === 'Leave'">
            <div class="sc-top">
              <div class="sc-index">#{{ i + 1 }}</div>
              <div class="student-profile">
                <div class="student-avatar" [style.background]="getAvatarBg(row.name)">
                  {{ getInitials(row.name) }}
                </div>
                <div class="student-meta">
                  <span class="student-name">{{ row.name }}</span>
                  <div class="sc-sub-meta">
                    <span class="adm-badge">{{ row.admissionNo }}</span>
                    @if (row.gender) {
                      <span class="gender-pill" [class.male]="row.gender.toLowerCase() === 'male'" [class.female]="row.gender.toLowerCase() === 'female'">
                        {{ row.gender }}
                      </span>
                    }
                  </div>
                </div>
              </div>
            </div>

            <!-- Segmented Control for Mobile -->
            <div class="status-segmented-control mob-seg">
              <button class="seg-btn seg-p"
                      [class.active]="row.status === 'Present'"
                      (click)="setStatus(row, 'Present')"
                      type="button">
                <span class="material-icons-round seg-icon">check</span>
                <span>Present</span>
              </button>
              <button class="seg-btn seg-a"
                      [class.active]="row.status === 'Absent'"
                      (click)="setStatus(row, 'Absent')"
                      type="button">
                <span class="material-icons-round seg-icon">close</span>
                <span>Absent</span>
              </button>
              <button class="seg-btn seg-l"
                      [class.active]="row.status === 'Leave'"
                      (click)="setStatus(row, 'Leave')"
                      type="button">
                <span class="material-icons-round seg-icon">pause</span>
                <span>Leave</span>
              </button>
            </div>
          </div>
        }
        @if (displayedRows().length === 0) {
          <div class="empty-filter-card card">
            No students match the current filter.
          </div>
        }
      </div>

      <!-- ── Bottom Sticky Save Footer ── -->
      <div class="save-footer card">
        <div class="save-left">
          <span class="save-summary">
            <span class="material-icons-round save-icon">task_alt</span>
            <strong>{{ totalCount() }}</strong> Students in Roster
          </span>

          <div class="save-counts-summary">
            <span class="sc-pill sc-p">{{ presentCount() }} Present</span>
            <span class="sc-pill sc-a">{{ absentCount() }} Absent</span>
            <span class="sc-pill sc-l">{{ leaveCount() }} Leave</span>
          </div>

          @if (successMsg()) {
            <span class="feedback-msg msg-success">
              <span class="material-icons-round">check_circle</span>
              {{ successMsg() }}
            </span>
          }
          @if (errorMsg()) {
            <span class="feedback-msg msg-error">
              <span class="material-icons-round">error</span>
              {{ errorMsg() }}
            </span>
          }
          @if (!selectedPeriod) {
            <span class="feedback-msg msg-warning">
              <span class="material-icons-round">info</span>
              Select a period above before saving.
            </span>
          }
        </div>

        <div class="save-right">
          <button class="save-action-btn"
                  (click)="submit()"
                  [disabled]="saving() || !selectedPeriod || isOffDay()">
            @if (saving()) {
              <span class="spin material-icons-round">sync</span>
              <span>Saving Attendance…</span>
            } @else {
              <span class="material-icons-round">save</span>
              <span>Save Attendance</span>
            }
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    /* ═══ FILTER CARD ════════════════════════════════ */
    .filter-card {
      padding: 22px 24px;
      margin-bottom: 20px;
      border-radius: var(--r-xl);
      background: var(--surface);
      border: 1px solid var(--border);
      box-shadow: var(--sh);
      position: relative;
    }
    .filter-header-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 18px;
      padding-bottom: 14px;
      border-bottom: 1px solid var(--border);
      flex-wrap: wrap;
      gap: 10px;
    }
    .filter-title-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .filter-icon {
      font-size: 22px;
      color: var(--accent);
    }
    .filter-card-title {
      font-size: 15px;
      font-weight: 800;
      color: var(--t1);
      letter-spacing: -0.2px;
    }
    .date-quick-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .day-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 11.5px;
      font-weight: 700;
    }
    .day-chip .material-icons-round { font-size: 15px; }
    .chip-today { background: var(--accent-s); color: var(--accent); }
    .chip-work { background: var(--green-s); color: var(--green); }
    .chip-off { background: var(--red-s); color: var(--red); }

    .filter-grid {
      display: grid;
      grid-template-columns: 1.25fr 1.25fr 1.15fr 170px;
      gap: 16px;
      align-items: flex-end;
    }
    .field-wrap {
      display: flex;
      flex-direction: column;
      gap: 7px;
    }
    .field-label {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      font-weight: 700;
      color: var(--t2);
      letter-spacing: 0.2px;
    }
    .label-icon {
      font-size: 15px;
      color: var(--accent);
    }
    .input-box {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
    }
    .form-select {
      appearance: none;
      -webkit-appearance: none;
      width: 100%;
      height: 44px;
      padding: 0 36px 0 14px;
      border: 1.5px solid var(--border);
      border-radius: var(--r-lg);
      font-size: 13.5px;
      font-weight: 600;
      font-family: inherit;
      background: var(--surface-2);
      color: var(--t1);
      cursor: pointer;
      transition: all 0.18s ease;
    }
    .form-select:hover:not(:disabled) {
      border-color: var(--border-2);
      background: var(--surface);
    }
    .form-select:focus {
      outline: none;
      border-color: var(--accent);
      background: var(--surface);
      box-shadow: 0 0 0 3.5px var(--accent-g);
    }
    .form-select:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      background: var(--surface-3);
    }
    .select-caret {
      position: absolute;
      right: 12px;
      font-size: 20px;
      color: var(--t4);
      pointer-events: none;
    }

    .date-picker-container {
      width: 100%;
    }
    ::ng-deep .date-picker-container .dp-input {
      height: 44px !important;
      border-radius: var(--r-lg) !important;
      background: var(--surface-2) !important;
      border: 1.5px solid var(--border) !important;
      font-size: 13.5px !important;
      font-weight: 600 !important;
      transition: all 0.18s ease !important;
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

    .btn-field {
      display: flex;
      justify-content: flex-end;
    }
    .search-btn {
      width: 100%;
      height: 44px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: linear-gradient(135deg, var(--accent), var(--accent-h));
      color: #fff;
      border: none;
      border-radius: var(--r-lg);
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 3px 12px rgba(var(--accent-rgb), 0.35);
      transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
    }
    .search-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(var(--accent-rgb), 0.45);
    }
    .search-btn:active:not(:disabled) {
      transform: translateY(0);
    }
    .search-btn:disabled {
      opacity: 0.55;
      cursor: not-allowed;
      box-shadow: none;
    }
    .btn-icon { font-size: 19px; }

    .off-day-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 16px;
      padding: 12px 16px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: var(--r-lg);
      color: #991b1b;
      font-size: 13px;
    }
    .off-day-banner .material-icons-round { font-size: 20px; color: #dc2626; }

    /* ═══ SPLASH EMPTY ════════════════════════════════ */
    .splash {
      text-align: center;
      padding: 50px 20px;
      border-radius: var(--r-xl);
      margin-bottom: 20px;
      background: var(--surface);
      border: 1px solid var(--border);
    }
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

    /* ═══ METRICS GRID ════════════════════════════════ */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      margin-bottom: 14px;
    }
    .metric-card {
      display: flex;
      align-items: center;
      position: relative;
      padding: 16px 18px;
      border-radius: var(--r-xl);
      background: var(--surface);
      border: 1.5px solid transparent;
      box-shadow: var(--sh-xs);
      gap: 14px;
    }
    .card-present { background: #f0fdf4; border-color: #bbf7d0; }
    .card-absent  { background: #fef2f2; border-color: #fecaca; }
    .card-leave   { background: #fffbeb; border-color: #fde68a; }
    .card-total   { background: var(--surface); border-color: var(--border); }

    .metric-icon-box {
      width: 40px;
      height: 40px;
      border-radius: var(--r-lg);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .card-present .metric-icon-box { background: #dcfce7; color: #16a34a; }
    .card-absent  .metric-icon-box { background: #fee2e2; color: #dc2626; }
    .card-leave   .metric-icon-box { background: #fef3c7; color: #d97706; }
    .card-total   .metric-icon-box { background: var(--surface-2); color: var(--accent); }
    .metric-icon-box .material-icons-round { font-size: 22px; }

    .metric-details { display: flex; flex-direction: column; }
    .metric-num { font-size: 22px; font-weight: 900; line-height: 1.1; color: var(--t1); }
    .metric-name { font-size: 12px; font-weight: 700; color: var(--t3); text-transform: uppercase; letter-spacing: 0.3px; }

    .metric-badge {
      margin-left: auto;
      font-size: 11.5px;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 12px;
    }
    .badge-p { background: #dcfce7; color: #15803d; }
    .badge-a { background: #fee2e2; color: #b91c1c; }
    .badge-l { background: #fef3c7; color: #b45309; }
    .badge-t { background: var(--surface-2); color: var(--t3); }

    /* Progress bar */
    .progress-bar-card {
      padding: 14px 20px;
      border-radius: var(--r-xl);
      background: var(--surface);
      border: 1px solid var(--border);
      margin-bottom: 16px;
    }
    .pb-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .pb-title { font-size: 12px; font-weight: 700; color: var(--t3); text-transform: uppercase; letter-spacing: 0.4px; }
    .pb-rate { font-size: 13px; font-weight: 800; color: var(--accent); }
    .multi-progress-bar {
      height: 8px;
      border-radius: 10px;
      background: var(--surface-3);
      display: flex;
      overflow: hidden;
    }
    .bar-seg {
      height: 100%;
      transition: width 0.3s ease;
    }
    .seg-present { background: var(--green); }
    .seg-absent  { background: var(--red); }
    .seg-leave   { background: var(--amber); }

    /* ═══ ROSTER TOOLBAR ══════════════════════════════ */
    .roster-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      padding: 12px 18px;
      margin-bottom: 14px;
      border-radius: var(--r-xl);
      background: var(--surface);
      border: 1px solid var(--border);
      flex-wrap: wrap;
    }
    .roster-search-box {
      position: relative;
      display: flex;
      align-items: center;
      min-width: 260px;
      flex: 1;
    }
    .search-lens {
      position: absolute;
      left: 10px;
      font-size: 18px;
      color: var(--t4);
    }
    .search-input {
      width: 100%;
      height: 38px;
      padding: 0 30px 0 34px;
      border-radius: var(--r-lg);
      border: 1.5px solid var(--border);
      background: var(--surface-2);
      font-size: 13px;
      font-family: inherit;
      color: var(--t1);
      transition: all 0.15s;
    }
    .search-input:focus {
      outline: none;
      border-color: var(--accent);
      background: var(--surface);
      box-shadow: 0 0 0 3px var(--accent-g);
    }
    .clear-search-btn {
      position: absolute;
      right: 8px;
      background: transparent;
      border: none;
      color: var(--t4);
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: 2px;
    }
    .clear-search-btn .material-icons-round { font-size: 16px; }

    .filter-chips {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .filter-chip {
      padding: 6px 12px;
      border-radius: 20px;
      border: 1.5px solid var(--border);
      background: var(--surface-2);
      color: var(--t2);
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s;
    }
    .filter-chip:hover { border-color: var(--border-2); background: var(--surface); }
    .filter-chip.active { background: var(--t1); color: #fff; border-color: var(--t1); }
    .filter-chip.chip-p.active { background: var(--green); color: #fff; border-color: var(--green); }
    .filter-chip.chip-a.active { background: var(--red); color: #fff; border-color: var(--red); }
    .filter-chip.chip-l.active { background: var(--amber); color: #fff; border-color: var(--amber); }

    .bulk-actions-group {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .bulk-lbl {
      font-size: 11px;
      font-weight: 700;
      color: var(--t3);
      text-transform: uppercase;
      margin-right: 2px;
    }
    .bulk-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 6px 11px;
      border: none;
      border-radius: var(--r);
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: transform 0.12s, box-shadow 0.12s;
    }
    .bulk-btn .material-icons-round { font-size: 15px; }
    .btn-bp { background: var(--green-s); color: var(--green); }
    .btn-bp:hover { background: var(--green-b); transform: translateY(-1px); }
    .btn-ba { background: var(--red-s); color: var(--red); }
    .btn-ba:hover { background: var(--red-b); transform: translateY(-1px); }
    .btn-bl { background: var(--amber-s); color: var(--amber); }
    .btn-bl:hover { background: var(--amber-b); transform: translateY(-1px); }

    /* ═══ STUDENT ROSTER TABLE (DESKTOP) ══════════════ */
    .desktop-view { display: block; }
    .mobile-view { display: none; }

    .roster-card {
      padding: 0;
      overflow-x: auto;
      margin-bottom: 20px;
      border-radius: var(--r-xl);
      background: var(--surface);
      border: 1px solid var(--border);
    }
    .roster-table {
      width: 100%;
      border-collapse: collapse;
      min-width: 650px;
    }

    th {
      padding: 14px 20px;
      font-size: 11.5px;
      font-weight: 800;
      color: var(--t3);
      text-transform: uppercase;
      letter-spacing: 0.6px;
      text-align: left;
      background: var(--surface-2);
      border-bottom: 1.5px solid var(--border);
      white-space: nowrap;
    }
    .th-num { width: 50px; text-align: center; }
    .th-student { min-width: 220px; }
    .th-adm { width: 140px; }
    .th-gender { width: 110px; }
    .th-status { width: 250px; text-align: right; }

    td {
      padding: 13px 20px;
      border-bottom: 1px solid var(--border);
      vertical-align: middle;
      font-size: 13.5px;
      transition: background 0.12s;
    }
    tr:last-child td { border-bottom: none; }

    tr:hover td { background: var(--surface-2); }
    tr.row-p { border-left: 3.5px solid var(--green); }
    tr.row-a { border-left: 3.5px solid var(--red); }
    tr.row-l { border-left: 3.5px solid var(--amber); }

    tr.row-a td { background: rgba(239, 68, 68, 0.03); }
    tr.row-a:hover td { background: rgba(239, 68, 68, 0.06); }
    tr.row-l td { background: rgba(245, 158, 11, 0.03); }
    tr.row-l:hover td { background: rgba(245, 158, 11, 0.06); }

    .td-num {
      text-align: center;
      font-weight: 700;
      color: var(--t4);
      font-size: 12px;
    }
    .td-status {
      text-align: right;
    }

    .student-profile {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .student-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 800;
      flex-shrink: 0;
      box-shadow: 0 2px 5px rgba(0,0,0,0.12);
    }
    .student-name {
      font-weight: 700;
      color: var(--t1);
      font-size: 14px;
    }

    .adm-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 6px;
      background: var(--surface-2);
      border: 1px solid var(--border);
      font-family: monospace;
      font-size: 12px;
      font-weight: 700;
      color: var(--t2);
    }

    .gender-pill {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 11.5px;
      font-weight: 700;
    }
    .gender-pill.male   { background: #eff6ff; color: #1d4ed8; }
    .gender-pill.female { background: #fdf2f8; color: #9d174d; }

    /* Segmented status control */
    .status-segmented-control {
      display: inline-flex;
      align-items: center;
      background: var(--surface-2);
      border: 1.5px solid var(--border);
      border-radius: var(--r-lg);
      padding: 3px;
      gap: 3px;
    }
    .seg-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 6px 12px;
      border: none;
      background: transparent;
      color: var(--t3);
      font-size: 12px;
      font-weight: 700;
      border-radius: var(--r);
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .seg-icon { font-size: 15px; }
    .seg-btn:hover:not(.active) {
      background: var(--surface);
      color: var(--t1);
    }
    .seg-btn.seg-p.active {
      background: var(--green);
      color: #fff;
      box-shadow: 0 2px 6px rgba(22, 163, 74, 0.4);
    }
    .seg-btn.seg-a.active {
      background: var(--red);
      color: #fff;
      box-shadow: 0 2px 6px rgba(220, 38, 38, 0.4);
    }
    .seg-btn.seg-l.active {
      background: var(--amber);
      color: #fff;
      box-shadow: 0 2px 6px rgba(217, 119, 6, 0.4);
    }

    .td-empty-filter {
      text-align: center;
      padding: 30px;
      color: var(--t3);
      font-size: 13.5px;
    }

    /* ═══ MOBILE CARDS VIEW ═══════════════════════════ */
    .mobile-roster-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 20px;
    }
    .student-card {
      padding: 14px;
      border-radius: var(--r-xl);
      background: var(--surface);
      border: 1.5px solid var(--border);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .student-card.card-p { border-left: 4px solid var(--green); }
    .student-card.card-a { border-left: 4px solid var(--red); }
    .student-card.card-l { border-left: 4px solid var(--amber); }

    .sc-top {
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }
    .sc-index {
      font-size: 11px;
      font-weight: 800;
      color: var(--t4);
      margin-top: 2px;
    }
    .sc-sub-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 4px;
    }
    .mob-seg {
      width: 100%;
      display: flex;
    }
    .mob-seg .seg-btn {
      flex: 1;
      justify-content: center;
      padding: 8px 4px;
    }
    .empty-filter-card {
      text-align: center;
      padding: 24px;
      color: var(--t3);
    }

    /* ═══ BOTTOM SAVE FOOTER ══════════════════════════ */
    .save-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 16px 22px;
      border-radius: var(--r-xl);
      background: var(--surface);
      border: 1px solid var(--border);
      box-shadow: var(--sh-lg);
      position: sticky;
      bottom: 20px;
      z-index: 10;
    }
    .save-left {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
    }
    .save-summary {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13.5px;
      color: var(--t2);
    }
    .save-icon { font-size: 20px; color: var(--accent); }

    .save-counts-summary {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .sc-pill {
      font-size: 11.5px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 12px;
    }
    .sc-p { background: var(--green-s); color: var(--green); }
    .sc-a { background: var(--red-s); color: var(--red); }
    .sc-l { background: var(--amber-s); color: var(--amber); }

    .feedback-msg {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12.5px;
      font-weight: 700;
      padding: 5px 12px;
      border-radius: 20px;
    }
    .feedback-msg .material-icons-round { font-size: 16px; }
    .msg-success { background: var(--green-s); color: var(--green); }
    .msg-error   { background: var(--red-s);   color: var(--red); }
    .msg-warning { background: var(--amber-s); color: var(--amber); }

    .save-action-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 11px 26px;
      background: linear-gradient(135deg, var(--accent), var(--accent-h));
      color: #fff;
      border: none;
      border-radius: var(--r-lg);
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(var(--accent-rgb), 0.4);
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .save-action-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(var(--accent-rgb), 0.5);
    }
    .save-action-btn:disabled {
      opacity: 0.55;
      cursor: not-allowed;
      box-shadow: none;
    }
    .save-action-btn .material-icons-round { font-size: 20px; }

    @keyframes spin { to { transform: rotate(360deg); } }
    .spin { animation: spin 0.8s linear infinite; display: inline-block; }

    /* ═══ RESPONSIVE QUERIES ══════════════════════════ */
    @media (max-width: 992px) {
      .filter-grid {
        grid-template-columns: 1fr 1fr;
      }
      .btn-field {
        grid-column: span 2;
      }
      .metrics-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 768px) {
      .desktop-view { display: none; }
      .mobile-view { display: flex; }
      .filter-card { padding: 16px; }
      .filter-grid {
        grid-template-columns: 1fr;
        gap: 12px;
      }
      .btn-field {
        grid-column: span 1;
      }
      .roster-toolbar {
        flex-direction: column;
        align-items: stretch;
      }
      .roster-search-box {
        width: 100%;
      }
      .filter-chips {
        width: 100%;
        justify-content: space-between;
      }
      .filter-chip {
        flex: 1;
        text-align: center;
        padding: 6px 4px;
        font-size: 11px;
      }
      .bulk-actions-group {
        width: 100%;
        justify-content: space-between;
      }
      .bulk-btn {
        flex: 1;
        justify-content: center;
        padding: 8px 4px;
        font-size: 11px;
      }
      .save-footer {
        flex-direction: column;
        align-items: stretch;
        padding: 14px;
      }
      .save-action-btn {
        width: 100%;
        justify-content: center;
      }
    }
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

  searchFilter = '';
  activeStatusFilter = signal<'ALL' | 'Present' | 'Absent' | 'Leave'>('ALL');

  private workingDays = new Set<number>();
  private isTeacher   = false;

  selectedClass:  number | null = null;
  selectedPeriod: number | null = null;
  date = new Date().toISOString().slice(0, 10);

  private avatarColors = ['#6366f1', '#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#3b82f6'];

  presentCount = computed(() => this.rows().filter(r => r.status === 'Present').length);
  absentCount  = computed(() => this.rows().filter(r => r.status === 'Absent').length);
  leaveCount   = computed(() => this.rows().filter(r => r.status === 'Leave').length);
  totalCount   = computed(() => this.rows().length);

  displayedRows = computed(() => {
    let list = this.rows();
    const query = this.searchFilter.trim().toLowerCase();
    const status = this.activeStatusFilter();

    if (status !== 'ALL') {
      list = list.filter(r => r.status === status);
    }
    if (query) {
      list = list.filter(r =>
        r.name.toLowerCase().includes(query) ||
        (r.admissionNo && r.admissionNo.toLowerCase().includes(query))
      );
    }
    return list;
  });

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

  isToday(): boolean {
    const today = new Date().toISOString().slice(0, 10);
    return this.date === today;
  }

  onDateChange() { this.checkOffDay(); }

  onClassChange() {
    this.selectedPeriod = null;
    this.periods.set([]);
    this.rows.set([]);
    this.searched.set(false);
    this.searchFilter = '';
    this.activeStatusFilter.set('ALL');
    if (!this.selectedClass) return;

    // Load periods assigned to this class via timetable
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

  calcPercent(count: number): number {
    const total = this.rows().length;
    return total > 0 ? Math.round((count / total) * 100) : 0;
  }

  markAll(status: 'Present' | 'Absent' | 'Leave') {
    this.rows.update(list => list.map(r => ({ ...r, status })));
  }

  setStatus(row: Row, status: 'Present' | 'Absent' | 'Leave') {
    this.rows.update(list => list.map(r => r.studentId === row.studentId ? { ...r, status } : r));
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
      next: () => {
        this.saving.set(false);
        this.successMsg.set('Attendance saved successfully!');
        setTimeout(() => this.successMsg.set(''), 4000);
      },
      error: (e: any) => {
        this.saving.set(false);
        this.errorMsg.set(e?.error?.error ?? 'Failed to save attendance.');
      }
    });
  }
}
