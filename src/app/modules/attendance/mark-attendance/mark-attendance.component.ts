import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { switchMap, of, forkJoin, catchError, map } from 'rxjs';
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
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { OsSelectComponent, OsSelectOption } from '../../../shared/components/os-select/os-select.component';
import { MenuService } from '../../../core/services/menu.service';
import {
  classroomReturnQueryFromParamMap,
  isFromClassroom
} from '../../classroom/classroom-context.util';

export interface Row {
  studentId:   number;
  admissionNo: string;
  name:        string;
  gender:      string;
  status:      'Present' | 'Absent' | 'Leave';
  /**
   * The saved record's own AttendanceId, or null when this student has no
   * record for the selected class + period + date. This is what decides
   * insert vs update on save; it is only ever read from the server response
   * and never generated locally.
   */
  attendanceId: number | null;
  /**
   * Remarks as currently stored. Echoed back on update because the server's
   * UpdateAsync assigns Remarks unconditionally, so sending null would erase
   * any existing note. This phase never edits the value.
   */
  remarks: string | null;
  /**
   * The stored status exactly as the server returned it. Needed because a
   * record may hold a status this screen cannot represent yet ("Late"): such
   * a row is excluded from the save so its stored value is neither
   * duplicated nor silently overwritten with the displayed default.
   */
  savedStatus: string | null;
}

@Component({
  selector: 'app-mark-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, LoadingComponent, EmptyStateComponent, DatePickerComponent, OsSelectComponent],
  template: `
    <div class="os-page compact mark-att-page">
    <app-page-header [dense]="true" [title]="pageTitle()" routeUrl="/attendance/mark" />

    <div class="os-stage att-stage">
    <div class="os-stage-bar att-bar">
      @if (classDateLocked()) {
        <div class="session-context">
          <span class="ctx-lock material-icons-round" title="Fixed from today’s period">lock</span>
          <span class="ctx-item">
            <span class="material-icons-round">school</span>
            {{ lockedClassLabel() }}
          </span>
          <span class="ctx-sep">·</span>
          @if (periodLocked() && selectedPeriod) {
            <span class="ctx-item">
              <span class="material-icons-round">schedule</span>
              {{ lockedPeriodLabel() }}
            </span>
          } @else {
            <div class="ctx-period-pick">
              <app-os-select
                icon="schedule"
                placeholder="Select period…"
                ariaLabel="Select period"
                [options]="periodOptions()"
                [value]="selectedPeriod"
                (valueChange)="selectedPeriod = $event; onPeriodChange()" />
            </div>
          }
          <span class="ctx-sep">·</span>
          <span class="ctx-item">
            <span class="material-icons-round">event</span>
            {{ lockedDateLabel() }}
          </span>
          @if (isToday()) { <span class="os-meta-chip">Today</span> }
          @if (isOffDay()) {
            <span class="day-chip chip-off"><span class="material-icons-round">event_busy</span> Off day</span>
          } @else {
            <span class="day-chip chip-work"><span class="material-icons-round">check_circle</span> Working</span>
          }
          @if (rows().length && !isOffDay()) {
            <button type="button" class="icon-refresh" (click)="search()" [disabled]="searching()" title="Reload roster">
              <span class="material-icons-round" [class.spin]="searching()">refresh</span>
            </button>
          }
        </div>
      } @else {
        <div class="os-toolbar-group att-fields">
          <div class="os-field inline grow">
            <app-os-select
              icon="school"
              placeholder="Class…"
              ariaLabel="Select class"
              [searchable]="classOptions().length > 6"
              [options]="classOptions()"
              [value]="selectedClass"
              (valueChange)="selectedClass = $event; onClassChange()" />
          </div>
          <div class="os-field inline grow period-field">
            <app-os-select
              icon="schedule"
              [placeholder]="selectedClass ? 'Period…' : 'Class first…'"
              ariaLabel="Select period"
              [disabled]="!selectedClass"
              [options]="periodOptions()"
              [value]="selectedPeriod"
              (valueChange)="selectedPeriod = $event; onPeriodChange()" />
          </div>
          <div class="os-field inline date-field">
            <div class="os-date-wrap">
              <app-date-picker
                [(ngModel)]="date"
                (dateChange)="onDateChange()" />
            </div>
          </div>
        </div>
        <div class="os-toolbar-group end">
          @if (isToday()) { <span class="os-meta-chip">Today</span> }
          @if (isOffDay()) {
            <span class="day-chip chip-off"><span class="material-icons-round">event_busy</span> Off day</span>
          } @else {
            <span class="day-chip chip-work"><span class="material-icons-round">check_circle</span> Working</span>
          }
          @if (rows().length) {
            <button type="button" class="icon-refresh" (click)="search()"
                    [disabled]="!selectedClass || !selectedPeriod || searching() || isOffDay()"
                    title="Reload roster">
              <span class="material-icons-round" [class.spin]="searching()">refresh</span>
            </button>
          } @else {
            <button type="button" class="search-btn btn-primary"
                    [disabled]="!selectedClass || !selectedPeriod || searching() || isOffDay()"
                    (click)="search()">
              @if (searching()) {
                <span class="spin material-icons-round btn-icon">sync</span>
                <span>Loading…</span>
              } @else {
                <span class="material-icons-round btn-icon">groups</span>
                <span>Load students</span>
              }
            </button>
          }
        </div>
      }
    </div>

    <div class="os-stage-body att-body">
      @if (isOffDay()) {
        <div class="off-day-banner">
          <span class="material-icons-round">event_busy</span>
          <div class="off-day-text">
            <strong>Off day:</strong> this date is a non-working day — attendance is disabled.
          </div>
        </div>
      }

      @if (searching()) {
        <app-loading />
      } @else if (searched() && rows().length === 0) {
        <app-empty-state
          title="No enrolled students"
          message="No active students are enrolled in this class."
          icon="groups" />
      } @else if (rows().length > 0) {
        <div class="att-workbench">
          <div class="att-sticky">
            <div class="stats-strip">
              <div class="stat s-total"><strong>{{ totalCount() }}</strong><span>students</span></div>
              <button type="button" class="stat s-p" [class.on]="activeStatusFilter() === 'Present'"
                      (click)="toggleFilter('Present')">
                <strong>{{ presentCount() }}</strong><span>Present</span>
              </button>
              <button type="button" class="stat s-a" [class.on]="activeStatusFilter() === 'Absent'"
                      (click)="toggleFilter('Absent')">
                <strong>{{ absentCount() }}</strong><span>Absent</span>
              </button>
              <button type="button" class="stat s-l" [class.on]="activeStatusFilter() === 'Leave'"
                      (click)="toggleFilter('Leave')">
                <strong>{{ leaveCount() }}</strong><span>Leave</span>
              </button>
              <div class="ratio">
                <div class="ratio-track">
                  <div class="ratio-p" [style.width.%]="calcPercent(presentCount())"></div>
                  <div class="ratio-a" [style.width.%]="calcPercent(absentCount())"></div>
                  <div class="ratio-l" [style.width.%]="calcPercent(leaveCount())"></div>
                </div>
                <span>{{ calcPercent(presentCount()) }}%</span>
              </div>
              <div class="legend">
                <span class="lg lg-p">P Present</span>
                <span class="lg lg-a">A Absent</span>
                <span class="lg lg-l">L Leave</span>
              </div>
            </div>

            <div class="roster-controls">
              <div class="roster-search-box">
                <span class="material-icons-round search-lens">search</span>
                <input type="text"
                       [ngModel]="searchFilter()"
                       (ngModelChange)="searchFilter.set($event)"
                       placeholder="Search name or admission #…"
                       class="search-input" />
                @if (searchFilter()) {
                  <button type="button" class="clear-search-btn" (click)="searchFilter.set('')">
                    <span class="material-icons-round">close</span>
                  </button>
                }
              </div>
              <div class="bulk-actions-group">
                <button type="button" class="bulk-btn btn-bp" (click)="markAll('Present')">
                  <span class="material-icons-round">done_all</span>
                  <span class="bulk-txt">All present</span>
                  <span class="bulk-txt-sm">All P</span>
                </button>
                <button type="button" class="bulk-btn btn-ba" (click)="markAll('Absent')">
                  <span class="material-icons-round">close</span>
                  <span class="bulk-txt">All absent</span>
                  <span class="bulk-txt-sm">All A</span>
                </button>
                <button type="button" class="bulk-btn btn-bl" (click)="markAll('Leave')">
                  <span class="material-icons-round">pause</span>
                  <span class="bulk-txt">All leave</span>
                  <span class="bulk-txt-sm">All L</span>
                </button>
              </div>
              <span class="hint-tip">Everyone starts Present — tap Absents / Leaves only</span>
            </div>
          </div>

          <div class="roll-grid" [class.many]="totalCount() >= 20">
            @for (row of displayedRows(); track row.studentId; let i = $index) {
              <div class="roll-item"
                   [class.row-p]="row.status === 'Present'"
                   [class.row-a]="row.status === 'Absent'"
                   [class.row-l]="row.status === 'Leave'">
                <span class="roll-num">{{ i + 1 }}</span>
                <button type="button" class="name-btn" (click)="cycleStatus(row)" title="Tap name to cycle status">
                  <span class="av" [style.background]="getAvatarBg(row.name)">{{ getInitials(row.name) }}</span>
                  <span class="m-meta">
                    <span class="nm">{{ row.name }}</span>
                    <span class="adm">{{ row.admissionNo }}</span>
                  </span>
                </button>
                <div class="mark-group" role="group" [attr.aria-label]="'Status for ' + row.name">
                  <button type="button" class="mk mk-p" [class.on]="row.status === 'Present'"
                          (click)="setStatus(row, 'Present')" aria-label="Present">
                    <span class="material-icons-round">check</span>
                    <em>P</em>
                  </button>
                  <button type="button" class="mk mk-a" [class.on]="row.status === 'Absent'"
                          (click)="setStatus(row, 'Absent')" aria-label="Absent">
                    <span class="material-icons-round">close</span>
                    <em>A</em>
                  </button>
                  <button type="button" class="mk mk-l" [class.on]="row.status === 'Leave'"
                          (click)="setStatus(row, 'Leave')" aria-label="Leave">
                    <span class="material-icons-round">pause</span>
                    <em>L</em>
                  </button>
                </div>
              </div>
            } @empty {
              <div class="empty-filter-card">No students match your search or filter.</div>
            }
          </div>
        </div>
      } @else if (!isOffDay()) {
        <div class="start-hint">
          <span class="material-icons-round">how_to_reg</span>
          <div>
            <strong>Ready to mark attendance</strong>
            <p>Choose class and period — students load automatically.</p>
          </div>
        </div>
      }
    </div>

    @if (rows().length > 0) {
      <div class="os-stage-foot att-foot" [class.has-dirty]="dirty()">
        <div class="save-left">
          <span class="save-summary" aria-label="Attendance summary">
            <span class="sum-pill sum-p"><strong>{{ presentCount() }}</strong> Present</span>
            <span class="sum-pill sum-a"><strong>{{ absentCount() }}</strong> Absent</span>
            <span class="sum-pill sum-l"><strong>{{ leaveCount() }}</strong> Leave</span>
            @if (dirty()) { <em class="dirty-dot">Unsaved</em> }
          </span>
          @if (successMsg()) {
            <span class="feedback-msg msg-success">
              <span class="material-icons-round">check_circle</span> {{ successMsg() }}
            </span>
          }
          @if (errorMsg()) {
            <span class="feedback-msg msg-error">
              <span class="material-icons-round">error</span> {{ errorMsg() }}
            </span>
          }
          @if (fromClassroom() && !dirty() && successMsg()) {
            <a class="btn-secondary btn-sm back-class" [routerLink]="['/classroom/today']" [queryParams]="classroomReturnQp()">
              Back to class
            </a>
          }
        </div>
        <div class="save-right">
          @if (fromClassroom() && !(successMsg() && !dirty())) {
            <a class="btn-secondary btn-sm back-class" [routerLink]="['/classroom/today']" [queryParams]="classroomReturnQp()">
              Cancel
            </a>
          }
          <button type="button" class="save-action-btn"
                  [class.ready]="canSave()"
                  (click)="submit()"
                  [disabled]="!canSave() || saving() || isOffDay()">
            @if (saving()) {
              <span class="spin material-icons-round">sync</span>
              <span>Saving…</span>
            } @else {
              <span class="material-icons-round">save</span>
              <span>Save</span>
            }
          </button>
        </div>
      </div>
    }
    </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-width: 0;
    }
    .session-context {
      display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px;
      width: 100%; min-width: 0;
      font-size: 13px; font-weight: 700; color: var(--t1);
    }
    .ctx-lock {
      font-size: 16px; color: var(--t4); flex-shrink: 0;
    }
    .ctx-item {
      display: inline-flex; align-items: center; gap: 5px;
      white-space: nowrap;
      .material-icons-round { font-size: 16px; color: var(--accent); }
    }
    .ctx-sep { color: var(--t4); font-weight: 800; }
    .ctx-period-pick {
      flex: 1 1 220px; min-width: 180px; max-width: 320px;
      app-os-select { width: 100%; min-width: 0; }
    }
    .mark-att-page { gap: 8px; }
    .att-stage { align-self: flex-start; width: 100%; }
    .att-bar { gap: 10px; }
    .att-fields { flex: 1; min-width: 0; }
    .att-fields .os-field-label { display: none; }
    .period-field { flex: 1.3 1 260px; }
    .period-field app-os-select { min-width: 260px; width: 100%; }
    .date-field { flex: 0 0 150px; }
    .att-body { padding: 10px 12px 12px; }
    .icon-refresh {
      width: 40px; height: 40px; border-radius: 10px;
      border: 1px solid var(--border); background: var(--surface-2);
      color: var(--t2); display: inline-flex; align-items: center; justify-content: center;
      cursor: pointer; touch-action: manipulation;
      .material-icons-round { font-size: 20px; }
    }
    .icon-refresh:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
    .icon-refresh:disabled { opacity: .5; cursor: not-allowed; }

    .start-hint {
      display: flex; align-items: center; gap: 12px;
      padding: 18px 14px; color: var(--t3);
      .material-icons-round { font-size: 28px; color: var(--accent); }
      strong { display: block; font-size: 14px; font-weight: 800; color: var(--t1); }
      p { margin: 2px 0 0; font-size: 12.5px; font-weight: 600; }
    }

    /* ── Roll-call workbench (touch / future mobile app) ── */
    .att-workbench { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
    .att-sticky {
      position: sticky; top: 0; z-index: 5;
      background: var(--surface);
      padding-bottom: 2px;
    }
    .stats-strip {
      display: flex; flex-wrap: wrap; align-items: center; gap: 6px;
      padding: 0 0 8px;
    }
    .stat {
      display: inline-flex; align-items: baseline; gap: 4px;
      min-height: 36px; padding: 0 12px; border-radius: 10px;
      border: 1px solid var(--border); background: var(--surface-2);
      font: inherit; cursor: default; color: var(--t2);
      touch-action: manipulation;
      strong { font-size: 15px; font-weight: 800; color: var(--t1); }
      span { font-size: 11px; font-weight: 700; }
    }
    button.stat { cursor: pointer; }
    button.stat:hover { border-color: var(--accent); }
    .stat.s-p { background: #f0fdf4; border-color: #bbf7d0; strong { color: #15803d; } }
    .stat.s-a { background: #fef2f2; border-color: #fecaca; strong { color: #b91c1c; } }
    .stat.s-l { background: #fffbeb; border-color: #fde68a; strong { color: #b45309; } }
    .stat.on { box-shadow: inset 0 0 0 1.5px currentColor; }
    .ratio {
      display: flex; align-items: center; gap: 8px;
      font-size: 11.5px; font-weight: 800; color: var(--t3);
    }
    .ratio-track {
      width: 88px; height: 6px; border-radius: 99px; overflow: hidden;
      background: var(--surface-3); display: flex;
    }
    .ratio-p { background: var(--green, #16a34a); }
    .ratio-a { background: var(--red, #dc2626); }
    .ratio-l { background: var(--amber, #d97706); }
    .legend {
      display: inline-flex; gap: 8px; margin-left: auto;
      font-size: 11px; font-weight: 800;
    }
    .lg-p { color: #15803d; }
    .lg-a { color: #b91c1c; }
    .lg-l { color: #b45309; }

    .roster-controls {
      display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
      .roster-search-box { min-width: 200px; flex: 1 1 200px; max-width: 300px; }
      .search-input {
        height: 40px; border-radius: 10px; border-width: 1px;
        font-size: 15px; /* avoids iOS zoom on focus */
      }
      .bulk-btn {
        min-height: 40px; padding: 0 12px; border-radius: 10px;
        font-size: 12.5px; touch-action: manipulation;
        display: inline-flex; align-items: center; gap: 4px;
      }
      .bulk-txt-sm { display: none; }
    }
    .hint-tip {
      font-size: 11px; font-weight: 600; color: var(--t4);
      margin-left: auto;
    }

    .roll-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 6px;
      max-height: min(68vh, 780px);
      overflow: auto;
      padding: 2px;
      -webkit-overflow-scrolling: touch;
    }
    .roll-grid.many {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 6px;
    }
    .roll-item {
      display: flex; align-items: center; gap: 8px;
      min-height: 52px; padding: 8px 10px;
      border: 1px solid var(--border); border-radius: 12px;
      background: var(--surface-2);
    }
    .roll-item:hover { border-color: color-mix(in srgb, var(--accent) 35%, var(--border)); }
    .roll-item.row-a { background: #fef2f2; border-color: #fecaca; }
    .roll-item.row-l { background: #fffbeb; border-color: #fde68a; }
    .roll-item.row-p { background: color-mix(in srgb, #16a34a 4%, var(--surface)); }
    .roll-num {
      width: 22px; flex-shrink: 0;
      font-size: 12px; font-weight: 800; color: var(--t4);
      font-variant-numeric: tabular-nums;
    }
    .name-btn {
      display: inline-flex; align-items: center; gap: 8px;
      border: 0; background: transparent; padding: 4px 0; margin: 0;
      font: inherit; color: inherit; cursor: pointer; text-align: left;
      min-width: 0; flex: 1; touch-action: manipulation;
    }
    .name-btn:hover .nm { color: var(--accent); }
    .av {
      width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
      display: inline-flex; align-items: center; justify-content: center;
      color: #fff; font-size: 11px; font-weight: 800;
    }
    .m-meta { display: flex; flex-direction: column; min-width: 0; }
    .nm {
      font-size: 14px; font-weight: 700; color: var(--t1);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .adm { font-size: 11px; font-weight: 600; color: var(--t4); }
    .mark-group {
      display: inline-flex; border: 1px solid var(--border); border-radius: 10px;
      overflow: hidden; background: var(--surface); flex-shrink: 0;
    }
    .mk {
      display: inline-flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 0; width: 44px; min-height: 44px; border: 0;
      border-right: 1px solid var(--border);
      background: transparent; font: inherit; color: var(--t4); cursor: pointer;
      touch-action: manipulation; -webkit-tap-highlight-color: transparent;
      .material-icons-round { font-size: 18px; line-height: 1; }
      em { font-style: normal; font-size: 10px; font-weight: 800; line-height: 1; }
    }
    .mk:last-child { border-right: 0; }
    .mk:hover { background: var(--surface-2); }
    .mk-p.on { background: #16a34a; color: #fff; }
    .mk-a.on { background: #dc2626; color: #fff; }
    .mk-l.on { background: #d97706; color: #fff; }

    .att-foot {
      gap: 10px;
      width: 100%;
      box-sizing: border-box;
      justify-content: space-between;
      align-items: center;
      .save-left { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; min-width: 0; flex: 1 1 auto; }
      .save-right {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        flex-shrink: 0;
        margin-left: auto;
      }
      .save-summary {
        display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap;
        font-size: 13px; font-weight: 700; color: var(--t3);
      }
      .sum-pill {
        display: inline-flex; align-items: center; gap: 4px;
        padding: 3px 8px; border-radius: 999px; font-size: 12px; font-weight: 700;
        strong { font-weight: 800; }
      }
      .sum-p { background: #dcfce7; color: #166534; }
      .sum-a { background: #fee2e2; color: #b91c1c; }
      .sum-l { background: #fef3c7; color: #92400e; }
      .dirty-dot {
        font-style: normal; font-size: 11px; font-weight: 800;
        color: #b45309; background: #fffbeb; border: 1px solid #fde68a;
        padding: 2px 7px; border-radius: 999px;
      }
      .back-class { white-space: nowrap; text-decoration: none; }
    }
    .save-action-btn.ready {
      box-shadow: 0 4px 14px rgba(var(--accent-rgb), .28);
    }

    .off-day-banner {
      display: flex; align-items: flex-start; gap: 8px;
      padding: 10px 12px; margin-bottom: 8px; border-radius: 10px;
      background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c;
      font-size: 13px; font-weight: 600;
      .material-icons-round { font-size: 20px; flex-shrink: 0; }
    }
    .empty-filter-card {
      grid-column: 1 / -1;
      text-align: center; padding: 20px; color: var(--t3); font-size: 13px;
    }

    /* Phone / future teacher app: thumb-friendly single column + docked save */
    @media (max-width: 900px) {
      .roll-grid.many { grid-template-columns: 1fr; }
      .legend, .hint-tip { display: none; }
      .period-field app-os-select { min-width: 0; }
      .att-bar { flex-direction: column; align-items: stretch; }
      .att-fields { width: 100%; flex-direction: column; align-items: stretch; }
      .att-fields .os-field,
      .period-field, .date-field { flex: 1 1 auto; width: 100%; }
      .att-fields .os-toolbar-group.end,
      .os-toolbar-group.end { margin-left: 0; width: 100%; justify-content: space-between; }
      .att-fields app-os-select,
      .period-field app-os-select { width: 100%; min-width: 0; }
      .os-date-wrap { width: 100%; }
      .session-context { gap: 6px 8px; }
      .ctx-sep { display: none; }
      .ctx-item {
        flex: 1 1 auto; min-width: 0;
        padding: 6px 8px; border-radius: 8px;
        background: var(--surface-2); border: 1px solid var(--border);
      }
      .roster-controls {
        .roster-search-box { max-width: none; flex: 1 1 100%; }
        .bulk-actions-group { width: 100%; display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
        .bulk-btn { width: 100%; justify-content: center; }
      }
      .stats-strip { gap: 6px; }
      .stat { flex: 1 1 calc(50% - 6px); justify-content: center; }
      .ratio { width: 100%; margin-top: 2px; }
      .ratio-track { flex: 1; width: auto; }
      .roll-grid {
        max-height: none;
        padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px));
      }
      .roll-item { min-height: 56px; padding: 10px; border-radius: 14px; }
      .mk { width: 48px; min-height: 48px; }
      .mk .material-icons-round { font-size: 20px; }
      .att-foot {
        position: sticky;
        bottom: 0;
        z-index: var(--z-sticky-footer, 50);
        margin: 0 -12px -12px;
        padding: 10px 12px calc(10px + env(safe-area-inset-bottom, 0px));
        background: color-mix(in srgb, var(--surface) 94%, transparent);
        backdrop-filter: blur(10px);
        box-shadow: 0 -6px 20px rgba(15, 23, 42, .08);
      }
      .att-foot .save-action-btn {
        min-height: 48px; justify-content: center;
        border-radius: 12px; font-size: 15px;
        padding-inline: 22px;
      }
      .att-foot .save-right { width: auto; margin-left: auto; }
      .att-foot .back-class { flex: 0 0 auto; }
      .search-btn.btn-primary { width: 100%; min-height: 44px; justify-content: center; }
    }

    @media (max-width: 560px) {
      .att-body { padding: 8px 10px 10px; }
      .stat span { display: none; }
      .stat { min-height: 40px; }
      .bulk-txt { display: none; }
      .bulk-txt-sm { display: inline; }
      .mk em { display: none; }
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
    .chip-work { background: var(--green-s); color: var(--green); }
    .chip-off { background: var(--red-s); color: var(--red); }

    /* ═══ FILTER CARD (legacy unused shell kept minimal) ════════════════════════════════ */
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
    /* display is controlled by .mobile-view / media query — do not set display here
       or it overrides .mobile-view { display: none } on desktop (duplicate roster). */
    .mobile-roster-list {
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
      gap: 12px;
      padding: 10px 12px;
      margin-top: 10px;
      border-radius: 10px;
      background: var(--surface);
      border: 1px solid var(--border);
      box-shadow: 0 8px 24px rgba(15, 23, 42, .12);
      position: sticky;
      bottom: 12px;
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
      .desktop-view { display: none !important; }
      .mobile-view,
      .mobile-roster-list.mobile-view { display: flex !important; }
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
  private menuSvc       = inject(MenuService);
  private route         = inject(ActivatedRoute);

  classes  = signal<ClassDto[]>([]);
  periods  = signal<PeriodDto[]>([]);
  rows     = signal<Row[]>([]);

  searching  = signal(false);
  searched   = signal(false);
  saving     = signal(false);
  successMsg = signal('');
  errorMsg   = signal('');
  isOffDay   = signal(false);
  dirty      = signal(false);

  searchFilter = signal('');
  activeStatusFilter = signal<'ALL' | 'Present' | 'Absent' | 'Leave'>('ALL');

  private workingDays = new Set<number>();
  private isTeacher   = false;

  selectedClass:  number | null = null;
  selectedPeriod: number | null = null;
  date = new Date().toISOString().slice(0, 10);

  /** Class + date fixed when opened from Classroom / dashboard period. */
  classDateLocked = signal(false);
  fromClassroom = signal(false);
  private classroomReturn: Record<string, string | number> | null = null;
  /** Period fixed when periodId was provided in the deep link. */
  periodLocked = signal(false);

  private avatarColors = ['#6366f1', '#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#3b82f6'];

  presentCount = computed(() => this.rows().filter(r => r.status === 'Present').length);
  absentCount  = computed(() => this.rows().filter(r => r.status === 'Absent').length);
  leaveCount   = computed(() => this.rows().filter(r => r.status === 'Leave').length);
  totalCount   = computed(() => this.rows().length);

  classOptions = computed<OsSelectOption<number>[]>(() =>
    this.classes().map(c => ({
      value: c.classId,
      label: c.section ? `${c.className} · Section ${c.section}` : c.className
    }))
  );

  periodOptions = computed<OsSelectOption<number>[]>(() =>
    this.periods()
      .filter(p => !p.isBreak)
      .map(p => ({
        value: p.periodId,
        label: this.formatPeriod(p)
      }))
  );

  lockedClassLabel(): string {
    const c = this.classes().find(x => x.classId === this.selectedClass);
    if (!c) return 'Class';
    return c.section ? `${c.className} · Section ${c.section}` : c.className;
  }

  lockedPeriodLabel(): string {
    const p = this.periods().find(x => x.periodId === this.selectedPeriod);
    return p ? this.formatPeriod(p) : (this.selectedPeriod ? `Period #${this.selectedPeriod}` : 'Period');
  }

  lockedDateLabel(): string {
    return this.formatDisplayDate(this.date);
  }

  /** First save (no ids yet) or after teacher edits. */
  canSave(): boolean {
    if (!this.selectedPeriod || this.isOffDay() || this.saving()) return false;
    if (this.dirty()) return true;
    const list = this.rows();
    return list.length > 0 && list.some(r => r.attendanceId === null);
  }

  pageTitle = computed(() =>
    this.menuSvc.titleForRoute('/attendance/mark', 'Mark Attendance')
  );

  displayedRows = computed(() => {
    let list = this.rows();
    const query = this.searchFilter().trim().toLowerCase();
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
    this.menuSvc.ensureLoaded().subscribe();
    const user = this.authSvc.currentUser();
    this.isTeacher = this.authSvc.hasRole('teacher');

    const applyPrefill = (classes: ClassDto[]) => {
      this.classes.set(classes);
      const qp = this.route.snapshot.queryParamMap;
      const classId = Number(qp.get('classId'));
      const periodId = Number(qp.get('periodId'));
      const date = qp.get('date');
      const fromSession = !!(classId && date);
      this.fromClassroom.set(isFromClassroom(qp));
      this.classroomReturn = classroomReturnQueryFromParamMap(qp);

      if (date) {
        this.date = date;
        this.checkOffDay();
      }

      const classOk = !!(classId && classes.some(c => c.classId === classId));
      if (fromSession && classOk) {
        this.classDateLocked.set(true);
        if (periodId) this.periodLocked.set(true);
      }

      if (classOk) {
        this.selectedClass = classId;
        this.loadPeriodsForClass(classId, periodId || null, fromSession && !!periodId);
      }
    };

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
        next: classes => applyPrefill(classes),
        error: () => this.academicSvc.getClasses().subscribe(c => applyPrefill(c))
      });
    } else {
      this.academicSvc.getClasses().subscribe(c => applyPrefill(c));
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

  onDateChange() {
    if (this.classDateLocked()) return;
    this.checkOffDay();
    if (this.selectedClass && this.selectedPeriod && !this.isOffDay()) {
      this.search();
    } else if (this.isOffDay()) {
      this.rows.set([]);
      this.searched.set(false);
      this.dirty.set(false);
    }
  }

  onClassChange() {
    if (this.classDateLocked()) return;
    this.selectedPeriod = null;
    this.periods.set([]);
    this.rows.set([]);
    this.searched.set(false);
    this.searchFilter.set('');
    this.activeStatusFilter.set('ALL');
    if (!this.selectedClass) return;
    this.loadPeriodsForClass(this.selectedClass, null, false);
  }

  /**
   * Loads periods for a class. When preferPeriodId is set, selects it and
   * (for classroom deep links) auto-fetches the roster.
   */
  private loadPeriodsForClass(
    classId: number,
    preferPeriodId: number | null,
    autoSearch: boolean
  ) {
    const applyList = (list: PeriodDto[]) => {
      const sorted = list
        .filter(x => !x.isBreak)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

      if (preferPeriodId) this.selectedPeriod = preferPeriodId;
      this.periods.set(sorted);

      if (preferPeriodId && !sorted.some(p => p.periodId === preferPeriodId)) {
        this.ttSvc.getPeriods().subscribe(all => {
          const hit = all.find(p => p.periodId === preferPeriodId && !p.isBreak);
          if (!hit) return;
          this.periods.set(
            [...sorted, hit].sort((a, b) => a.startTime.localeCompare(b.startTime))
          );
        });
      }

      if (autoSearch && this.selectedClass && !this.isOffDay()) {
        this.search();
      }
    };

    this.ttSvc.getForClass(classId).subscribe({
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
        if (periodMap.size === 0) {
          this.ttSvc.getPeriods().subscribe(p => applyList(p));
        } else {
          applyList([...periodMap.values()]);
        }
      },
      error: () => this.ttSvc.getPeriods().subscribe(p => applyList(p))
    });
  }

  private checkOffDay() {
    if (!this.date) { this.isOffDay.set(false); return; }
    const d = new Date(this.date + 'T00:00:00');
    this.isOffDay.set(!this.settingsSvc.isWorkingDate(d, this.workingDays));
  }

  search() {
    if (!this.selectedClass || !this.selectedPeriod) return;
    this.searching.set(true);
    this.searched.set(false);
    this.successMsg.set('');
    this.errorMsg.set('');
    this.dirty.set(false);
    this.studentSvc.getStudents(this.selectedClass, undefined, undefined, 1, 0).subscribe({
      next: r => {
        this.rows.set(r.items.map(s => ({
          studentId:   s.studentId,
          admissionNo: s.admissionNo,
          name:        s.fullName,
          gender:      s.gender ?? '',
          status:      'Present',
          attendanceId: null,
          remarks:      null,
          savedStatus:  null,
        })));
        this.searching.set(false);
        this.searched.set(true);
        this.applySavedStatuses();
      },
      error: () => { this.searching.set(false); this.searched.set(true); }
    });
  }

  /**
   * Re-reads saved attendance when the period changes after a roster is already
   * on screen. Attendance is stored per period, so the displayed statuses are
   * only meaningful for the selected one.
   */
  onPeriodChange() {
    if (!this.selectedClass || !this.selectedPeriod) return;
    if (this.isOffDay()) return;
    // Always reload for the selected period so large classes stay in sync.
    this.search();
  }

  toggleFilter(status: 'Present' | 'Absent' | 'Leave') {
    this.activeStatusFilter.update(cur => cur === status ? 'ALL' : status);
  }

  cycleStatus(row: Row) {
    const order: Array<Row['status']> = ['Present', 'Absent', 'Leave'];
    const next = order[(order.indexOf(row.status) + 1) % order.length];
    this.setStatus(row, next);
  }

  /**
   * Back to the Present default before overlaying another period's records.
   * Clears attendanceId and remarks too: those identify a record in the
   * PREVIOUS period, and carrying them over would make a save update the
   * wrong row.
   */
  private resetStatusesToDefault() {
    this.rows.update(list => list.map(r => ({
      ...r,
      status: 'Present' as Row['status'],
      attendanceId: null,
      remarks: null,
      savedStatus: null
    })));
  }

  /**
   * Overlays already-saved attendance onto the loaded roster, so reopening a
   * class no longer shows everyone as Present regardless of what was stored.
   *
   * Scoped to class + period + date deliberately: a record exists per period,
   * so without a selected period getForClass returns the whole day and one
   * student may hold different statuses in different periods — there would be
   * no correct single value to show. With no period selected the screen keeps
   * its previous default-Present behaviour, unchanged.
   *
   * Students with no saved record keep the Present default. Read-only: this
   * sends nothing and alters no attendance rule.
   */
  private applySavedStatuses(done?: () => void) {
    const classId  = this.selectedClass;
    const periodId = this.selectedPeriod;
    if (!classId || !periodId || !this.date) {
      done?.();
      return;
    }

    this.attendanceSvc.getForClass(classId, this.date, periodId).subscribe({
      next: records => {
        const savedByStudent = new Map(
          records.map(rec => [rec.studentId, rec])
        );
        if (savedByStudent.size) {
          this.rows.update(list => list.map(r => {
            const saved = savedByStudent.get(r.studentId);
            if (!saved) return r;

            const known = MarkAttendanceComponent.toUiStatus(saved.status);
            // The record's identity is kept even when its status is one this
            // screen cannot yet show (currently only "Late"), so a later save
            // still UPDATES that row rather than trying to insert a duplicate.
            return {
              ...r,
              status: known ?? r.status,
              attendanceId: saved.attendanceId,
              remarks: saved.remarks,
              savedStatus: saved.status
            };
          }));
        }
        done?.();
      },
      // A failed read must not block marking — the roster stays usable with
      // defaults, exactly as before this change.
      error: () => done?.()
    });
  }

  /** Maps a stored status onto the statuses this screen supports, or null. */
  private static toUiStatus(stored: string): Row['status'] | null {
    const match = (['Present', 'Absent', 'Leave'] as const)
      .find(s => s.toLowerCase() === stored.trim().toLowerCase());
    return match ?? null;
  }

  calcPercent(count: number): number {
    const total = this.rows().length;
    return total > 0 ? Math.round((count / total) * 100) : 0;
  }

  markAll(status: 'Present' | 'Absent' | 'Leave') {
    this.rows.update(list => list.map(r => ({ ...r, status })));
    this.dirty.set(true);
    this.successMsg.set('');
  }

  setStatus(row: Row, status: 'Present' | 'Absent' | 'Leave') {
    if (row.status === status) return;
    this.rows.update(list => list.map(r => r.studentId === row.studentId ? { ...r, status } : r));
    this.dirty.set(true);
    this.successMsg.set('');
  }

  fmt(t: string): string { return t ? t.slice(0, 5) : ''; }

  private formatPeriod(p: PeriodDto): string {
    const name = p.periodName || (p.periodNo ? `Period ${p.periodNo}` : 'Period');
    const start = this.fmt(p.startTime);
    const end = this.fmt(p.endTime);
    return start && end ? `${name} · ${start}–${end}` : name;
  }

  private formatDisplayDate(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

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

  classroomReturnQp() {
    return this.classroomReturn ?? {
      classId: this.selectedClass || 0,
      subjectId: 0,
      ...(this.selectedPeriod ? { periodId: this.selectedPeriod } : {})
    };
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

    // Split the roster by whether the server already holds a record for this
    // class + period + date. attendanceId comes only from getForClass, so a
    // row can never be mistaken for an insert when a record exists — which is
    // what previously made the whole save fail on the second attempt.
    const rows     = this.rows();
    const existing = rows.filter(r => r.attendanceId !== null);
    const fresh    = rows.filter(r => r.attendanceId === null);

    // A record whose stored status this screen cannot represent yet ("Late")
    // is left completely alone: not re-inserted, and not overwritten with the
    // Present we are displaying in its place.
    const updatable = existing.filter(
      r => r.savedStatus === null || MarkAttendanceComponent.toUiStatus(r.savedStatus) !== null
    );
    const skipped = existing.length - updatable.length;

    const inserts = fresh.length
      ? [this.attendanceSvc.bulkMark({
          classId:  this.selectedClass,
          periodId: this.selectedPeriod,
          date:     this.date,
          entries:  fresh.map(r => ({ studentId: r.studentId, status: r.status, remarks: null }))
        }).pipe(
          map(() => ({ ok: true, label: '' })),
          catchError((e: any) => of({
            ok: false,
            label: `${fresh.length} new record(s): ${this.extractError(e)}`
          }))
        )]
      : [];

    // One PUT per existing record, by its own AttendanceId. remarks is echoed
    // back unchanged because the server assigns Remarks unconditionally.
    const updates = updatable.map(r =>
      this.attendanceSvc.update(r.attendanceId!, { status: r.status, remarks: r.remarks }).pipe(
        map(() => ({ ok: true, label: '' })),
        catchError((e: any) => of({ ok: false, label: `${r.name}: ${this.extractError(e)}` }))
      )
    );

    const calls = [...inserts, ...updates];
    if (!calls.length) {
      this.saving.set(false);
      this.errorMsg.set('Nothing to save.');
      return;
    }

    // forkJoin with per-call catchError: one failure cannot cancel the rest,
    // and every outcome is collected so a partial failure is reported rather
    // than reported as success.
    forkJoin(calls).subscribe({
      next: results => {
        const failures = results.filter(r => !r.ok);

        // Keep Saving… until ids reload — prevents double insert on fast re-click.
        this.applySavedStatuses(() => {
          this.saving.set(false);
          if (failures.length) {
            this.errorMsg.set(
              `Saved with ${failures.length} failure(s). ` +
              failures.map(f => f.label).join(' | ')
            );
            return;
          }

          this.dirty.set(false);
          this.successMsg.set(
            skipped > 0
              ? `Attendance saved. ${skipped} record(s) with a status this screen cannot edit yet were left unchanged.`
              : 'Attendance saved successfully!'
          );
          setTimeout(() => this.successMsg.set(''), 4000);
        });
      },
      error: (e: any) => {
        this.saving.set(false);
        this.errorMsg.set(this.extractError(e));
      }
    });
  }

  /** Pulls the server's message out of an HttpErrorResponse, as before. */
  private extractError(e: any): string {
    return e?.error?.error ?? 'Failed to save attendance.';
  }
}
