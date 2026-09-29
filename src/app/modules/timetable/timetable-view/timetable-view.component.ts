import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimetableService } from '../../../core/services/timetable.service';
import { AcademicService } from '../../../core/services/academic.service';
import { SettingsService } from '../../../core/services/settings.service';
import { TimetableEntryDto, PeriodDto, DAY_NAMES } from '../../../core/models/timetable.model';
import { ClassDto } from '../../../core/models/academic.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-timetable-view',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, LoadingComponent, EmptyStateComponent],
  template: `
    <app-page-header title="Class Timetable" subtitle="Interactive schedule & weekly overview" />

    <!-- ── Filter & Class Switcher Card ── -->
    <div class="filter-card card">
      <div class="filter-main">
        <div class="class-picker">
          <span class="picker-label">Select Class</span>
          <div class="sel-box">
            <span class="material-icons-round sel-icon">school</span>
            <select [(ngModel)]="selectedClass" (change)="load()">
              <option [ngValue]="null">Select class…</option>
              @for (c of classes(); track c.classId) {
                <option [ngValue]="c.classId">{{ c.className }}{{ c.section ? ' – ' + c.section : '' }}</option>
              }
            </select>
            <span class="material-icons-round sel-arrow">expand_more</span>
          </div>
        </div>

        @if (selectedClass && entries().length > 0) {
          <div class="quick-stats">
            <span class="qs-badge class-badge">
              <span class="material-icons-round">class</span>
              {{ selectedClassName() }}
            </span>
            <span class="qs-badge count-badge">
              <span class="material-icons-round">event_note</span>
              {{ totalPeriodsCount() }} Periods/Wk
            </span>
          </div>
        }
      </div>

      <div class="filter-actions">
        @if (entries().length > 0) {
          <button class="action-btn print-btn" (click)="printTimetable()" title="Print Timetable">
            <span class="material-icons-round">print</span>
            <span>Print</span>
          </button>
        }
      </div>
    </div>

    @if (loading()) {
      <app-loading />
    } @else if (!selectedClass) {
      <app-empty-state message="Select a class above to view its timetable." icon="🗓️" />
    } @else if (periodSlots().length === 0) {
      <app-empty-state message="No timetable periods configured for this class yet." icon="🗓️" />
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
                @if (isToday(d)) {
                  <span class="today-dot" title="Today"></span>
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
              <span class="th-subtitle">{{ activeDayStats().classes }} Subjects · {{ activeDayStats().breaks }} Break · {{ activeDayStats().free }} Free</span>
            </div>
            @if (isToday(selectedDay())) {
              <span class="today-badge">Today's Schedule</span>
            }
          </div>

          <div class="timeline-stream">
            @for (slot of periodSlots(); track slot.periodNo) {
              @let entry = getEntry(slot.periodNo, selectedDay(), slot.isBreak);
              @let meta = entry ? getSubjectMeta(entry.subjectName) : null;

              <div class="timeline-card-row" [class.is-break-row]="slot.isBreak">
                <!-- Left: Time column -->
                <div class="t-node">
                  <div class="t-time-box">
                    <span class="t-start">{{ fmt(slot.startTime) }}</span>
                    <span class="t-end">{{ fmt(slot.endTime) }}</span>
                  </div>
                  <div class="t-line-track">
                    <div class="t-line-dot" [class.break-dot]="slot.isBreak" [class.active-dot]="entry"></div>
                  </div>
                </div>

                <!-- Right: Content card -->
                <div class="t-content">
                  @if (slot.isBreak) {
                    <!-- Break Card -->
                    <div class="card schedule-card break-card">
                      <div class="card-icon-wrap break-icon-bg">
                        <span class="material-icons-round">local_cafe</span>
                      </div>
                      <div class="card-body">
                        <div class="card-headline">
                          <span class="card-title break-title">Recess / Break Time</span>
                          <span class="period-pill break-pill">Interval</span>
                        </div>
                        <p class="card-desc">Scheduled recess for students and faculty</p>
                      </div>
                    </div>
                  } @else if (entry) {
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
                          <span class="meta-item teacher-meta">
                            <span class="material-icons-round meta-icon">account_circle</span>
                            {{ entry.teacherName }}
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
                        <p class="card-desc">Self-study / Library / Open slot</p>
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
        <div class="grid-card card" id="print-area">
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
                  <tr [class.break-row]="slot.isBreak">
                    <!-- Col 1: Period (Centered) -->
                    <td class="period-td" [class.sticky-col-period]="selectedDay() === 0">
                      @if (!slot.isBreak) {
                        <div class="p-badge">
                          <span class="pno">{{ slot.periodNo }}</span>
                        </div>
                      } @else {
                        <span class="break-icon">☕</span>
                      }
                    </td>

                    <!-- Col 2: Time (Left-aligned) -->
                    <td class="time-td" [class.sticky-col-time]="selectedDay() === 0">
                      <div class="time-wrap">
                        <span class="time-start">{{ fmt(slot.startTime) }}</span>
                        <span class="time-sep">to</span>
                        <span class="time-end">{{ fmt(slot.endTime) }}</span>
                      </div>
                    </td>

                    <!-- Col 3+: Days -->
                    @for (d of displayedDays(); track d) {
                      @let entry = getEntry(slot.periodNo, d, slot.isBreak);
                      @let meta = entry ? getSubjectMeta(entry.subjectName) : null;

                      @if (slot.isBreak) {
                        <td class="break-slot">
                          <div class="table-break-banner">
                            <span class="material-icons-round tb-icon">local_cafe</span>
                            <span>Break</span>
                          </div>
                        </td>
                      } @else if (entry) {
                        <td class="entry-cell">
                          <div class="table-entry-card" [style.border-left-color]="meta?.color">
                            <div class="te-subject">
                              <span class="material-icons-round te-icon" [style.color]="meta?.color">{{ meta?.icon }}</span>
                              <span class="te-name">{{ entry.subjectName }}</span>
                            </div>
                            <div class="te-teacher">
                              <span class="material-icons-round te-t-icon">person</span>
                              <span>{{ entry.teacherName }}</span>
                            </div>
                          </div>
                        </td>
                      } @else {
                        <td class="free-cell">
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
    }
  `,
  styles: [`
    /* ═══ FILTER & HEADER CARD ════════════════════════ */
    .filter-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 16px 20px;
      margin-bottom: 20px;
      flex-wrap: wrap;
      border-radius: var(--r-xl);
      background: var(--surface);
      border: 1px solid var(--border);
      box-shadow: var(--sh-sm, 0 1px 3px rgba(0,0,0,0.05));
    }
    .filter-main {
      display: flex;
      align-items: center;
      gap: 18px;
      flex-wrap: wrap;
      flex: 1;
    }
    .class-picker {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 220px;
      flex: 1;
      max-width: 340px;
    }
    .picker-label {
      font-size: 11px;
      font-weight: 700;
      color: var(--t3);
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }
    .sel-box {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
    }
    .sel-icon {
      position: absolute;
      left: 12px;
      font-size: 18px;
      color: var(--accent);
      pointer-events: none;
    }
    .sel-box select {
      appearance: none;
      -webkit-appearance: none;
      width: 100%;
      padding: 10px 38px 10px 38px;
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
    .sel-box select:hover {
      border-color: var(--border-2);
      background: var(--surface);
    }
    .sel-box select:focus {
      outline: none;
      border-color: var(--accent);
      background: var(--surface);
      box-shadow: 0 0 0 3.5px var(--accent-g);
    }
    .sel-arrow {
      position: absolute;
      right: 12px;
      font-size: 20px;
      color: var(--t4);
      pointer-events: none;
    }

    .quick-stats {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .qs-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    .qs-badge .material-icons-round { font-size: 15px; }
    .class-badge { background: var(--accent-s); color: var(--accent); }
    .count-badge { background: var(--surface-2); color: var(--t2); border: 1px solid var(--border); }

    .filter-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .action-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 9px 16px;
      border: 1px solid var(--border);
      background: var(--surface-2);
      color: var(--t2);
      border-radius: var(--r-lg);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }
    .action-btn .material-icons-round { font-size: 17px; }
    .action-btn:hover {
      background: var(--accent-s);
      color: var(--accent);
      border-color: var(--accent);
      transform: translateY(-1px);
    }

    /* ═══ NAVIGATION CONTROLS & DAY PILLS ════════════ */
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
      position: relative;
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
    .today-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10b981;
      display: inline-block;
    }
    .day-pill.active .today-dot { background: #fff; }

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

    /* Left timeline indicator */
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
    .t-line-dot.break-dot {
      background: #f59e0b;
      box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2);
    }

    /* Right content card */
    .t-content {
      flex: 1;
      min-width: 0;
    }
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

    .card-body {
      flex: 1;
      min-width: 0;
    }
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
    .meta-item {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .meta-icon { font-size: 15px; color: var(--t4); }
    .meta-dot { color: var(--border-2); }
    .card-desc {
      font-size: 12px;
      color: var(--t4);
      margin-top: 3px;
    }

    /* Subject card specific */
    .subject-card {
      border-left: 4px solid var(--accent);
    }

    /* Break card specific */
    .break-card {
      background: #fffdf5;
      border-left: 4px solid #f59e0b;
      border-color: #fef3c7;
    }
    .break-icon-bg {
      background: #fef3c7;
      color: #b45309;
    }
    .break-title { color: #92400e; }
    .break-pill { background: #fde68a; color: #78350f; }

    /* Free card specific */
    .free-card {
      background: var(--surface-2);
      border: 1px dashed var(--border-2);
    }
    .free-icon-bg {
      background: var(--surface-3);
      color: var(--t4);
    }
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

    /* Single Day Mode: 100% width, no horizontal scroll */
    .table-container.is-single-day {
      overflow-x: hidden;
    }
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
    [data-theme="dark"] th {
      background: var(--surface-2);
      color: var(--t3);
    }

    th.period-th {
      width: 70px;
      text-align: center;
      padding: 12px 6px;
    }
    th.time-th {
      width: 125px;
      text-align: left;
      padding: 12px 14px;
    }
    th.day-th {
      min-width: 150px;
      text-align: left;
      padding: 12px 14px;
    }
    .th-content {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .today-tag {
      font-size: 9.5px;
      padding: 1px 6px;
      border-radius: 10px;
      background: #10b981;
      color: #fff;
      font-weight: 700;
    }

    /* Single day column widths */
    .tt-table.is-single-day th.period-th,
    .tt-table.is-single-day td.period-td {
      width: 64px !important;
      max-width: 64px;
    }
    .tt-table.is-single-day th.time-th,
    .tt-table.is-single-day td.time-td {
      width: 115px !important;
      max-width: 115px;
    }
    .tt-table.is-single-day th.day-th,
    .tt-table.is-single-day td.entry-cell,
    .tt-table.is-single-day td.free-cell,
    .tt-table.is-single-day td.break-slot {
      width: auto !important;
    }

    /* Sticky columns in full-week view */
    .sticky-col-period {
      position: sticky;
      left: 0;
      z-index: 3;
      background: var(--surface);
    }
    .sticky-col-time {
      position: sticky;
      left: 70px;
      z-index: 3;
      background: var(--surface);
      box-shadow: 4px 0 8px rgba(0, 0, 0, 0.04);
    }
    th.sticky-col-period, th.sticky-col-time {
      background: #f8fafc;
      z-index: 4;
    }
    [data-theme="dark"] th.sticky-col-period,
    [data-theme="dark"] th.sticky-col-time {
      background: var(--surface-2);
    }

    td {
      border-bottom: 1px solid var(--border);
      vertical-align: middle;
      background: var(--surface);
    }
    tr:last-child td { border-bottom: none; }

    .break-row td { background: #fffdf7; }
    .break-row .sticky-col-period,
    .break-row .sticky-col-time { background: #fffdf7; }

    /* Period column styling */
    .period-td {
      padding: 10px 6px;
      text-align: center;
    }
    .p-badge {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--accent-s);
      color: var(--accent);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 800;
    }
    .break-icon { font-size: 18px; }

    /* Time column styling */
    .time-td {
      padding: 10px 14px;
      text-align: left;
    }
    .time-wrap {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .time-start {
      font-size: 13px;
      font-weight: 700;
      color: var(--t1);
      font-variant-numeric: tabular-nums;
    }
    .time-sep {
      font-size: 10px;
      color: var(--t4);
      text-transform: uppercase;
      font-weight: 600;
    }
    .time-end {
      font-size: 11.5px;
      color: var(--t3);
      font-variant-numeric: tabular-nums;
    }

    /* Table entries styling */
    .entry-cell {
      padding: 10px 14px;
      text-align: left;
    }
    .table-entry-card {
      border-left: 3.5px solid var(--accent);
      padding: 4px 0 4px 10px;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .te-subject {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .te-icon { font-size: 16px; flex-shrink: 0; }
    .te-name {
      font-size: 13.5px;
      font-weight: 700;
      color: var(--t1);
      line-height: 1.25;
    }
    .te-teacher {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11.5px;
      color: var(--t3);
    }
    .te-t-icon { font-size: 14px; color: var(--t4); }

    /* Break banner in table */
    .break-slot {
      padding: 10px 14px;
      text-align: left;
    }
    .table-break-banner {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border-radius: 8px;
      background: #fef3c7;
      color: #92400e;
      font-size: 11.5px;
      font-weight: 700;
    }
    .tb-icon { font-size: 15px; }

    /* Free period in table */
    .free-cell {
      padding: 10px 14px;
      text-align: left;
    }
    .table-free-tag {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      color: var(--t4);
      font-size: 12px;
      font-weight: 500;
    }
    .free-dash { color: var(--border-2); }

    /* ═══ RESPONSIVE QUERIES ══════════════════════════ */
    @media (max-width: 768px) {
      .filter-card {
        padding: 14px;
        gap: 12px;
      }
      .class-picker {
        max-width: 100%;
      }
      .filter-actions {
        width: 100%;
      }
      .action-btn {
        width: 100%;
        justify-content: center;
        padding: 11px;
      }

      .nav-control-bar {
        gap: 10px;
      }
      .pill-day-full { display: none; }
      .pill-day-short { display: inline; }
      .day-pills-container {
        width: 100%;
        justify-content: space-between;
      }
      .day-pill {
        flex: 1;
        justify-content: center;
        padding: 7px 4px;
        font-size: 12px;
      }

      .scroll-hint { display: flex; }
      .mode-text { display: none; }
      .mode-btn { padding: 7px 10px; }

      .sticky-col-period { width: 55px; }
      .sticky-col-time { left: 55px; width: 105px; font-size: 11px; }
      th.period-th { width: 55px; }
      th.time-th { width: 105px; }
    }

    @media print {
      .filter-card, .nav-control-bar, .scroll-hint { display: none !important; }
      .grid-card { display: block !important; box-shadow: none; border: 1px solid #e2e8f0; }
      .timeline-container { display: none !important; }
      .sticky-col-period, .sticky-col-time { position: static !important; box-shadow: none !important; }
    }
  `]
})
export class TimetableViewComponent implements OnInit {
  private ttSvc       = inject(TimetableService);
  private academicSvc = inject(AcademicService);
  private settingsSvc = inject(SettingsService);

  readonly dayNames = DAY_NAMES;
  days       = signal<number[]>([1, 2, 3, 4, 5]);

  classes    = signal<ClassDto[]>([]);
  entries    = signal<TimetableEntryDto[]>([]);
  allPeriods = signal<PeriodDto[]>([]);
  loading    = signal(false);

  selectedClass: number | null = null;
  selectedDay = signal<number>(0);
  viewMode = signal<'timeline' | 'table'>('timeline');

  // When a specific day is chosen, table displays only that day! Full week displays all days.
  displayedDays = computed(() => {
    const day = this.selectedDay();
    if (day === 0) return this.days();
    return [day];
  });

  selectedClassName = computed(() => {
    const c = this.classes().find(x => x.classId === this.selectedClass);
    return c ? `${c.className}${c.section ? ' – ' + c.section : ''}` : '';
  });

  totalPeriodsCount = computed(() => {
    return this.entries().filter(e => !e.isBreak).length;
  });

  activeDayStats = computed(() => {
    const day = this.selectedDay();
    const dayEntries = this.entries().filter(e => e.dayOfWeek === day);
    const breaks = this.periodSlots().filter(p => p.isBreak).length;
    const classes = dayEntries.filter(e => !e.isBreak).length;
    const free = Math.max(0, this.periodSlots().filter(p => !p.isBreak).length - classes);
    return { classes, breaks, free };
  });

  ngOnInit() {
    this.ttSvc.getPeriods().subscribe(p => this.allPeriods.set(
      p.sort((a, b) => a.startTime.localeCompare(b.startTime))
    ));
    this.academicSvc.getClasses().subscribe(c => this.classes.set(c));
    // Load working days from active profile
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
  }

  load() {
    if (!this.selectedClass) { this.entries.set([]); return; }
    this.loading.set(true);
    this.ttSvc.getForClass(this.selectedClass).subscribe({
      next: e => { this.entries.set(e); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
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

  // Build period rows from allPeriods (includes breaks); fall back to entry periodNos
  periodSlots(): { periodNo: number; startTime: string; endTime: string; isBreak: boolean }[] {
    if (this.allPeriods().length > 0) {
      return [...this.allPeriods()]
        .sort((a, b) => a.startTime.localeCompare(b.startTime))
        .map(p => ({
          periodNo:  p.periodNo,
          startTime: p.startTime,
          endTime:   p.endTime,
          isBreak:   p.isBreak
        }));
    }
    // fallback: derive from entries
    const seen = new Map<number, { periodNo: number; startTime: string; endTime: string; isBreak: boolean }>();
    for (const e of this.entries()) {
      if (!seen.has(e.periodNo))
        seen.set(e.periodNo, { periodNo: e.periodNo, startTime: e.startTime, endTime: e.endTime, isBreak: false });
    }
    return [...seen.values()].sort((a, b) => a.periodNo - b.periodNo);
  }

  getEntry(periodNo: number, dayOfWeek: number, isBreak: boolean): TimetableEntryDto | undefined {
    if (isBreak) return undefined;
    return this.entries().find(e => e.periodNo === periodNo && e.dayOfWeek === dayOfWeek);
  }

  printTimetable() { window.print(); }
}
