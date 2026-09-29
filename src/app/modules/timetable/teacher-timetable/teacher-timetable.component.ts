import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimetableService } from '../../../core/services/timetable.service';
import { AuthService } from '../../../core/services/auth.service';
import { SettingsService } from '../../../core/services/settings.service';
import { TimetableEntryDto, DAY_NAMES } from '../../../core/models/timetable.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';

@Component({
  selector: 'app-teacher-timetable',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, LoadingComponent],
  template: `
    <app-page-header
      title="My Timetable"
      [subtitle]="teacherName() ? 'Schedule for ' + teacherName() : 'Your weekly class schedule'" />

    @if (totalPeriods() > 0) {
      <div class="stats-bar card">
        <div class="stat-pill">
          <span class="material-icons-round stat-pill-icon">event_note</span>
          <div class="stat-text">
            <span class="stat-pill-val">{{ totalPeriods() }}</span>
            <span class="stat-pill-lbl">Periods / Wk</span>
          </div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-pill">
          <span class="material-icons-round stat-pill-icon">meeting_room</span>
          <div class="stat-text">
            <span class="stat-pill-val">{{ uniqueClasses() }}</span>
            <span class="stat-pill-lbl">Classes</span>
          </div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-pill">
          <span class="material-icons-round stat-pill-icon">menu_book</span>
          <div class="stat-text">
            <span class="stat-pill-val">{{ uniqueSubjects() }}</span>
            <span class="stat-pill-lbl">Subjects</span>
          </div>
        </div>
      </div>
    }

    @if (loading()) {
      <app-loading />
    } @else if (dayMap().size === 0) {
      <div class="placeholder">
        <div class="ph-icon">📋</div>
        <div class="ph-title">No timetable assigned yet</div>
        <div class="ph-sub">Contact the admin to have your schedule set up.</div>
      </div>
    } @else {

      <!-- ── Modern Day Navigator & View Switcher ── -->
      <div class="nav-control-bar">
        <div class="day-selector-scroll">
          <div class="day-pills-container">
            <button class="day-pill full-week-pill"
                    [class.active]="selectedDay() === 0"
                    (click)="selectedDay.set(0)">
              <span class="material-icons-round pill-icon">grid_view</span>
              <span>Full Week</span>
            </button>
            @for (d of days(); track d) {
              <button class="day-pill"
                      [class.active]="selectedDay() === d"
                      [class.is-today]="isToday(d)"
                      (click)="selectedDay.set(d)">
                <span class="pill-day-full">{{ dayNames[d] }}</span>
                <span class="pill-day-short">{{ dayNames[d].slice(0, 3) }}</span>
                @if (dayMap().has(d)) {
                  <span class="tab-badge">{{ dayMap().get(d)!.length }}</span>
                }
              </button>
            }
          </div>
        </div>

        <!-- Mode Toggle (Cards vs Table) -->
        <div class="view-mode-toggle">
          <button class="mode-btn"
                  [class.active]="viewMode() === 'timeline'"
                  (click)="viewMode.set('timeline')"
                  title="Timeline View">
            <span class="material-icons-round">view_agenda</span>
            <span class="mode-text">Timeline</span>
          </button>
          <button class="mode-btn"
                  [class.active]="viewMode() === 'table'"
                  (click)="viewMode.set('table')"
                  title="Table View">
            <span class="material-icons-round">table_chart</span>
            <span class="mode-text">Table</span>
          </button>
        </div>
      </div>

      <!-- ═══════════════════════════════════════════════════
           VIEW 1: MODERN TIMELINE SCHEDULE CARDS
      ═══════════════════════════════════════════════════ -->
      @if (viewMode() === 'timeline' && selectedDay() !== 0) {
        <div class="timeline-container">
          <div class="timeline-header">
            <div class="th-left">
              <h3 class="th-day-name">{{ dayNames[selectedDay()] }}</h3>
              <span class="th-subtitle">{{ dayMap().get(selectedDay())?.length || 0 }} Classes scheduled today</span>
            </div>
            @if (isToday(selectedDay())) {
              <span class="today-badge">Today's Schedule</span>
            }
          </div>

          <div class="timeline-stream">
            @for (slot of periodSlots(); track slot.periodNo) {
              @let entry = getEntry(slot.periodNo, selectedDay());
              @let meta = entry ? getSubjectMeta(entry.subjectName) : null;

              <div class="timeline-card-row">
                <!-- Left: Time column -->
                <div class="t-node">
                  <div class="t-time-box">
                    <span class="t-start">{{ fmt(slot.startTime) }}</span>
                    <span class="t-end">{{ fmt(slot.endTime) }}</span>
                  </div>
                  <div class="t-line-track">
                    <div class="t-line-dot" [class.active-dot]="entry"></div>
                  </div>
                </div>

                <!-- Right: Content card -->
                <div class="t-content">
                  @if (entry) {
                    <!-- Scheduled Subject Card -->
                    <div class="card schedule-card subject-card" [style.border-left-color]="meta?.color">
                      <div class="card-icon-wrap" [style.color]="meta?.color" [style.background]="meta?.bg">
                        <span class="material-icons-round">{{ meta?.icon }}</span>
                      </div>
                      <div class="card-body">
                        <div class="card-headline">
                          <span class="card-title">{{ entry.subjectName }}</span>
                          <span class="period-pill period-num-pill">Period {{ slot.periodNo }}</span>
                        </div>
                        <div class="card-meta">
                          <span class="meta-item class-meta">
                            <span class="material-icons-round meta-icon">meeting_room</span>
                            {{ entry.className }}{{ entry.section ? ' – ' + entry.section : '' }}
                          </span>
                          <span class="meta-dot">·</span>
                          <span class="meta-item duration-meta">
                            <span class="material-icons-round meta-icon">schedule</span>
                            {{ calcDuration(slot.startTime, slot.endTime) }} mins
                          </span>
                        </div>
                      </div>
                    </div>
                  } @else {
                    <!-- Free Period Card -->
                    <div class="card schedule-card free-card">
                      <div class="card-icon-wrap free-icon-bg">
                        <span class="material-icons-round">self_improvement</span>
                      </div>
                      <div class="card-body">
                        <div class="card-headline">
                          <span class="card-title free-title">Free Period</span>
                          <span class="period-pill free-pill">Period {{ slot.periodNo }}</span>
                        </div>
                        <p class="card-desc">No class assigned · Planning / Preparation slot</p>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- ═══════════════════════════════════════════════════
           VIEW 2: REFINED MODERN GRID TABLE VIEW
      ═══════════════════════════════════════════════════ -->
      @if (viewMode() === 'table' || selectedDay() === 0) {
        <div class="grid-card card">
          @if (selectedDay() === 0) {
            <div class="scroll-hint">
              <span class="material-icons-round hint-icon">swipe</span>
              <span>Scroll horizontally to view all weekdays</span>
            </div>
          }
          <div class="table-container" [class.is-single-day]="selectedDay() !== 0">
            <table class="tt-table" [class.is-single-day]="selectedDay() !== 0">
              <thead>
                <tr>
                  <th class="period-th" [class.sticky-col-period]="selectedDay() === 0">Period</th>
                  <th class="time-th" [class.sticky-col-time]="selectedDay() === 0">Time</th>
                  @for (d of displayedDays(); track d) {
                    <th class="day-th" [class.today-th]="isToday(d)">
                      <div class="th-content">
                        <span>{{ dayNames[d] }}</span>
                        @if (isToday(d)) { <span class="today-tag">Today</span> }
                      </div>
                    </th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (slot of periodSlots(); track slot.periodNo) {
                  <tr>
                    <td class="period-td" [class.sticky-col-period]="selectedDay() === 0">
                      <div class="p-badge">
                        <span class="pno">{{ slot.periodNo }}</span>
                      </div>
                    </td>
                    <td class="time-td" [class.sticky-col-time]="selectedDay() === 0">
                      <div class="time-wrap">
                        <span class="time-start">{{ fmt(slot.startTime) }}</span>
                        <span class="time-sep">to</span>
                        <span class="time-end">{{ fmt(slot.endTime) }}</span>
                      </div>
                    </td>
                    @for (d of displayedDays(); track d) {
                      @let entry = getEntry(slot.periodNo, d);
                      @let meta = entry ? getSubjectMeta(entry.subjectName) : null;

                      @if (entry) {
                        <td class="entry-cell">
                          <div class="table-entry-card" [style.border-left-color]="meta?.color">
                            <div class="te-subject">
                              <span class="material-icons-round te-icon" [style.color]="meta?.color">{{ meta?.icon }}</span>
                              <span class="te-name">{{ entry.subjectName }}</span>
                            </div>
                            <div class="te-teacher">
                              <span class="material-icons-round te-t-icon">meeting_room</span>
                              <span>{{ entry.className }}{{ entry.section ? ' – ' + entry.section : '' }}</span>
                            </div>
                          </div>
                        </td>
                      } @else {
                        <td class="empty-cell">
                          <div class="table-free-tag">
                            <span class="free-dash">—</span>
                            <span class="free-text">Free</span>
                          </div>
                        </td>
                      }
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- Subject summary -->
      <div class="summary-section">
        <h3 class="summary-title">Subject Summary</h3>
        <div class="summary-grid">
          @for (item of subjectSummary(); track item.subjectName) {
            @let meta = getSubjectMeta(item.subjectName);
            <div class="summary-card card" [style.border-top-color]="meta.color">
              <div class="sc-head">
                <span class="material-icons-round sc-icon" [style.color]="meta.color">{{ meta.icon }}</span>
                <span class="sc-subject">{{ item.subjectName }}</span>
              </div>
              <div class="sc-classes">
                @for (cls of item.classes; track cls) {
                  <span class="cls-chip">{{ cls }}</span>
                }
              </div>
              <div class="sc-count">{{ item.periodsPerWeek }} period{{ item.periodsPerWeek !== 1 ? 's' : '' }}/week</div>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .stats-bar {
      display: flex;
      align-items: center;
      gap: 0;
      padding: 6px 14px;
      margin-bottom: 20px;
      overflow: hidden;
      border-radius: var(--r-xl);
      background: var(--surface);
      border: 1px solid var(--border);
    }
    .stat-pill {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 18px;
      flex: 1;
    }
    .stat-pill-icon {
      font-size: 24px;
      color: var(--accent);
      padding: 10px;
      border-radius: 12px;
      background: var(--accent-s);
    }
    .stat-text { display: flex; flex-direction: column; }
    .stat-pill-val { font-size: 20px; font-weight: 800; color: var(--t1); line-height: 1.1; }
    .stat-pill-lbl { font-size: 11px; font-weight: 600; color: var(--t4); margin-top: 2px; text-transform: uppercase; }
    .stat-divider { width: 1px; height: 36px; background: var(--border); flex-shrink: 0; }
    @media (max-width: 600px) {
      .stats-bar { flex-wrap: wrap; padding: 6px; }
      .stat-pill { padding: 10px 14px; min-width: 45%; }
      .stat-divider { display: none; }
    }

    .placeholder { text-align: center; padding: 64px 24px; }
    .ph-icon { font-size: 48px; margin-bottom: 12px; }
    .ph-title { font-size: 17px; font-weight: 700; color: var(--t1); margin-bottom: 6px; }
    .ph-sub { font-size: 13px; color: var(--t3); }

    /* Day tabs bar */
    .nav-control-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    .day-selector-scroll {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      padding-bottom: 2px;
      flex: 1;
    }
    .day-pills-container {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 99px;
      padding: 4px;
      box-shadow: var(--sh-xs);
    }
    .day-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border: none;
      background: transparent;
      color: var(--t3);
      font-size: 13px;
      font-weight: 600;
      border-radius: 99px;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .day-pill:hover {
      color: var(--t1);
      background: var(--surface-2);
    }
    .day-pill.active {
      background: var(--accent);
      color: #fff;
      box-shadow: 0 3px 10px rgba(var(--accent-rgb), 0.35);
    }
    .pill-icon { font-size: 16px; }
    .pill-day-short { display: none; }
    .tab-badge {
      background: rgba(255,255,255,0.25);
      font-size: 10.5px;
      padding: 1px 6px;
      border-radius: 10px;
    }
    .day-pill:not(.active) .tab-badge {
      background: var(--accent-s);
      color: var(--accent);
    }

    .view-mode-toggle {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--r-lg);
      padding: 3px;
      box-shadow: var(--sh-xs);
    }
    .mode-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 7px 12px;
      border: none;
      background: transparent;
      color: var(--t3);
      font-size: 12.5px;
      font-weight: 600;
      border-radius: var(--r);
      cursor: pointer;
      transition: all 0.15s;
    }
    .mode-btn .material-icons-round { font-size: 17px; }
    .mode-btn.active {
      background: var(--surface-3);
      color: var(--accent);
    }

    /* ═══ VIEW 1: MODERN TIMELINE SCHEDULE CARDS ═════ */
    .timeline-container {
      margin-bottom: 24px;
    }
    .timeline-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
      padding: 0 4px;
    }
    .th-day-name {
      font-size: 18px;
      font-weight: 800;
      color: var(--t1);
      letter-spacing: -0.3px;
    }
    .th-subtitle {
      font-size: 12px;
      color: var(--t3);
      font-weight: 500;
      margin-top: 2px;
      display: block;
    }
    .today-badge {
      background: #dcfce7;
      color: #166534;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 20px;
      border: 1px solid #bbf7d0;
    }

    .timeline-stream {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .timeline-card-row {
      display: flex;
      align-items: stretch;
      gap: 14px;
    }

    .t-node {
      width: 70px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      position: relative;
      padding-top: 4px;
    }
    .t-time-box {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      text-align: right;
    }
    .t-start {
      font-size: 13.5px;
      font-weight: 800;
      color: var(--t1);
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }
    .t-end {
      font-size: 11px;
      color: var(--t4);
      margin-top: 3px;
      font-weight: 500;
      font-variant-numeric: tabular-nums;
    }
    .t-line-track {
      position: absolute;
      right: -8px;
      top: 6px;
      bottom: -16px;
      width: 2px;
      background: var(--border);
      display: flex;
      justify-content: center;
    }
    .t-line-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--border-2);
      border: 2px solid var(--surface);
      margin-top: 0;
      position: absolute;
    }
    .t-line-dot.active-dot {
      background: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-g);
    }

    .t-content { flex: 1; min-width: 0; }
    .schedule-card {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 16px;
      border-radius: var(--r-xl);
      border: 1px solid var(--border);
      background: var(--surface);
      box-shadow: var(--sh-xs);
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .schedule-card:hover {
      box-shadow: var(--sh);
      transform: translateY(-1px);
    }
    .card-icon-wrap {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .card-icon-wrap .material-icons-round { font-size: 22px; }

    .card-body { flex: 1; min-width: 0; }
    .card-headline {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .card-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--t1);
      line-height: 1.25;
    }
    .period-pill {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 9px;
      border-radius: 20px;
      flex-shrink: 0;
    }
    .period-num-pill {
      background: var(--accent-s);
      color: var(--accent);
    }
    .card-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 5px;
      font-size: 12px;
      color: var(--t3);
    }
    .meta-item { display: inline-flex; align-items: center; gap: 4px; }
    .meta-icon { font-size: 15px; color: var(--t4); }
    .meta-dot { color: var(--border-2); }
    .card-desc { font-size: 12px; color: var(--t4); margin-top: 3px; }

    .subject-card { border-left: 4px solid var(--accent); }
    .free-card { background: var(--surface-2); border: 1px dashed var(--border-2); }
    .free-icon-bg { background: var(--surface-3); color: var(--t4); }
    .free-title { color: var(--t3); }
    .free-pill { background: var(--surface-3); color: var(--t4); }

    /* ═══ VIEW 2: REFINED MODERN GRID TABLE ═══════════ */
    .grid-card {
      padding: 0;
      overflow: hidden;
      margin-bottom: 24px;
      border-radius: var(--r-xl);
      background: var(--surface);
      border: 1px solid var(--border);
    }
    .scroll-hint {
      display: none;
      align-items: center;
      gap: 6px;
      padding: 9px 14px;
      background: var(--surface-2);
      border-bottom: 1px solid var(--border);
      font-size: 11.5px;
      font-weight: 600;
      color: var(--t3);
    }
    .hint-icon { font-size: 16px; color: var(--accent); }

    .table-container {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      position: relative;
    }
    .tt-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      min-width: 780px;
    }

    .table-container.is-single-day { overflow-x: hidden; }
    .tt-table.is-single-day {
      min-width: 0 !important;
      width: 100% !important;
      table-layout: fixed;
    }

    th {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      background: #f8fafc;
      color: var(--t3);
      border-bottom: 1.5px solid var(--border);
      white-space: nowrap;
    }
    [data-theme="dark"] th { background: var(--surface-2); color: var(--t3); }

    th.period-th { width: 70px; text-align: center; padding: 12px 6px; }
    th.time-th   { width: 125px; text-align: left; padding: 12px 14px; }
    th.day-th    { min-width: 150px; text-align: left; padding: 12px 14px; }
    .th-content { display: flex; align-items: center; gap: 6px; }
    .today-tag { font-size: 9.5px; padding: 1px 6px; border-radius: 10px; background: #10b981; color: #fff; font-weight: 700; }

    .tt-table.is-single-day th.period-th,
    .tt-table.is-single-day td.period-td { width: 64px !important; max-width: 64px; }
    .tt-table.is-single-day th.time-th,
    .tt-table.is-single-day td.time-td { width: 115px !important; max-width: 115px; }
    .tt-table.is-single-day th.day-th,
    .tt-table.is-single-day td.entry-cell,
    .tt-table.is-single-day td.empty-cell { width: auto !important; }

    .sticky-col-period { position: sticky; left: 0; z-index: 3; background: var(--surface); }
    .sticky-col-time { position: sticky; left: 70px; z-index: 3; background: var(--surface); box-shadow: 4px 0 8px rgba(0,0,0,0.04); }
    th.sticky-col-period, th.sticky-col-time { background: #f8fafc; z-index: 4; }
    [data-theme="dark"] th.sticky-col-period, [data-theme="dark"] th.sticky-col-time { background: var(--surface-2); }

    td { border-bottom: 1px solid var(--border); vertical-align: middle; background: var(--surface); }
    tr:last-child td { border-bottom: none; }

    .period-td { padding: 10px 6px; text-align: center; }
    .p-badge {
      width: 32px; height: 32px; border-radius: 50%;
      background: var(--accent-s); color: var(--accent);
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 14px; font-weight: 800;
    }

    .time-td { padding: 10px 14px; text-align: left; }
    .time-wrap { display: flex; flex-direction: column; gap: 1px; }
    .time-start { font-size: 13px; font-weight: 700; color: var(--t1); font-variant-numeric: tabular-nums; }
    .time-sep { font-size: 10px; color: var(--t4); text-transform: uppercase; font-weight: 600; }
    .time-end { font-size: 11.5px; color: var(--t3); font-variant-numeric: tabular-nums; }

    .entry-cell { padding: 10px 14px; text-align: left; }
    .table-entry-card {
      border-left: 3.5px solid var(--accent);
      padding: 4px 0 4px 10px;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .te-subject { display: flex; align-items: center; gap: 6px; }
    .te-icon { font-size: 16px; flex-shrink: 0; }
    .te-name { font-size: 13.5px; font-weight: 700; color: var(--t1); line-height: 1.25; }
    .te-teacher { display: flex; align-items: center; gap: 4px; font-size: 11.5px; color: var(--t3); }
    .te-t-icon { font-size: 14px; color: var(--t4); }

    .empty-cell { padding: 10px 14px; text-align: left; }
    .table-free-tag { display: inline-flex; align-items: center; gap: 5px; color: var(--t4); font-size: 12px; font-weight: 500; }
    .free-dash { color: var(--border-2); }

    /* Summary cards */
    .summary-section { margin-top: 24px; }
    .summary-title { font-size: 15px; font-weight: 800; color: var(--t1); margin-bottom: 12px; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; }
    .summary-card {
      padding: 16px;
      border-top: 3px solid var(--accent);
      border-radius: var(--r-xl);
    }
    .sc-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .sc-icon { font-size: 20px; }
    .sc-subject { font-size: 14.5px; font-weight: 700; color: var(--t1); }
    .sc-classes { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 8px; }
    .cls-chip { background: var(--surface-3); color: var(--t2); font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px; }
    .sc-count { font-size: 11.5px; color: var(--t3); font-weight: 500; }

    @media (max-width: 768px) {
      .nav-control-bar { gap: 10px; }
      .pill-day-full { display: none; }
      .pill-day-short { display: inline; }
      .day-pills-container { width: 100%; justify-content: space-between; }
      .day-pill { flex: 1; justify-content: center; padding: 7px 4px; font-size: 12px; }

      .scroll-hint { display: flex; }
      .mode-text { display: none; }
      .mode-btn { padding: 7px 10px; }

      .sticky-col-period { width: 55px; }
      .sticky-col-time { left: 55px; width: 105px; font-size: 11px; }
      th.period-th { width: 55px; }
      th.time-th { width: 105px; }
    }
  `]
})
export class TeacherTimetableComponent implements OnInit {
  private ttSvc       = inject(TimetableService);
  private authSvc     = inject(AuthService);
  private settingsSvc = inject(SettingsService);

  days      = signal<number[]>([1, 2, 3, 4, 5]);
  readonly dayNames = DAY_NAMES;

  allEntries = signal<TimetableEntryDto[]>([]);
  loading    = signal(false);
  selectedDay = signal<number>(0);
  viewMode   = signal<'timeline' | 'table'>('timeline');

  displayedDays = computed(() => {
    const day = this.selectedDay();
    if (day === 0) return this.days();
    return [day];
  });

  teacherName = () => this.authSvc.currentUser()?.fullName ?? '';

  ngOnInit() {
    this.settingsSvc.getWorkingDays().subscribe(wd => {
      const ordered = [1, 2, 3, 4, 5, 6, 7].filter(d => wd.has(d));
      this.days.set(ordered.length ? ordered : [1, 2, 3, 4, 5]);
    });

    if (typeof window !== 'undefined') {
      const today = new Date().getDay();
      const normalizedDay = today === 0 ? 7 : today;
      if (window.innerWidth <= 768) {
        this.selectedDay.set(normalizedDay);
        this.viewMode.set('timeline');
      } else {
        this.viewMode.set('table');
      }
    }

    this.load();
  }

  load() {
    const user = this.authSvc.currentUser();
    if (!user) return;
    this.loading.set(true);
    this.ttSvc.getForTeacher(user.userId).subscribe({
      next: (days: any[]) => {
        const entries = days.flatMap((d: any) => d.entries ?? [])
          .filter((e: any) => !e.isBreak && e.periodNo > 0);
        this.allEntries.set(entries);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  dayMap(): Map<number, TimetableEntryDto[]> {
    const m = new Map<number, TimetableEntryDto[]>();
    for (const e of this.allEntries()) {
      if (!m.has(e.dayOfWeek)) m.set(e.dayOfWeek, []);
      m.get(e.dayOfWeek)!.push(e);
    }
    return m;
  }

  periodSlots(): { periodNo: number; startTime: string; endTime: string }[] {
    const seen = new Map<number, { periodNo: number; startTime: string; endTime: string }>();
    for (const e of this.allEntries()) {
      if (!seen.has(e.periodNo)) seen.set(e.periodNo, { periodNo: e.periodNo, startTime: e.startTime, endTime: e.endTime });
    }
    return [...seen.values()].sort((a, b) => a.periodNo - b.periodNo);
  }

  getEntry(periodNo: number, dayOfWeek: number): TimetableEntryDto | undefined {
    return this.allEntries().find(e => e.periodNo === periodNo && e.dayOfWeek === dayOfWeek);
  }

  fmt(t: string): string { return t ? t.slice(0, 5) : ''; }

  calcDuration(start: string, end: string): number {
    if (!start || !end) return 40;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return (eh * 60 + em) - (sh * 60 + sm) || 40;
  }

  isToday(day: number): boolean {
    const today = new Date().getDay();
    const normalized = today === 0 ? 7 : today;
    return day === normalized;
  }

  getSubjectMeta(name: string): { icon: string; color: string; bg: string } {
    const n = (name || '').toLowerCase();
    if (n.includes('math')) return { icon: 'calculate', color: '#6366f1', bg: 'rgba(99,102,241,0.08)' };
    if (n.includes('sci') || n.includes('phys') || n.includes('chem') || n.includes('bio')) return { icon: 'science', color: '#0ea5e9', bg: 'rgba(14,165,233,0.08)' };
    if (n.includes('eng') || n.includes('urdu') || n.includes('lang') || n.includes('lit')) return { icon: 'auto_stories', color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)' };
    if (n.includes('comp') || n.includes('it') || n.includes('code') || n.includes('tech')) return { icon: 'terminal', color: '#06b6d4', bg: 'rgba(6,182,212,0.08)' };
    if (n.includes('hist') || n.includes('geo') || n.includes('soc') || n.includes('pak')) return { icon: 'public', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' };
    if (n.includes('art') || n.includes('draw')) return { icon: 'palette', color: '#ec4899', bg: 'rgba(236,72,153,0.08)' };
    if (n.includes('pe') || n.includes('sport') || n.includes('game')) return { icon: 'sports_soccer', color: '#10b981', bg: 'rgba(16,185,129,0.08)' };
    if (n.includes('isl') || n.includes('rel') || n.includes('quran')) return { icon: 'menu_book', color: '#14b8a6', bg: 'rgba(20,184,166,0.08)' };
    return { icon: 'menu_book', color: '#4f46e5', bg: 'rgba(79,70,229,0.08)' };
  }

  totalPeriods()   { return this.allEntries().length; }
  uniqueClasses()  { return new Set(this.allEntries().map(e => e.classId)).size; }
  uniqueSubjects() { return new Set(this.allEntries().map(e => e.subjectId)).size; }

  subjectSummary(): { subjectName: string; classes: string[]; periodsPerWeek: number }[] {
    const m = new Map<string, { classes: Set<string>; count: number }>();
    for (const e of this.allEntries()) {
      if (!m.has(e.subjectName)) m.set(e.subjectName, { classes: new Set(), count: 0 });
      const item = m.get(e.subjectName)!;
      item.classes.add(e.className + (e.section ? ` – ${e.section}` : ''));
      item.count++;
    }
    return [...m.entries()]
      .map(([subjectName, v]) => ({ subjectName, classes: [...v.classes], periodsPerWeek: v.count }))
      .sort((a, b) => b.periodsPerWeek - a.periodsPerWeek);
  }
}
