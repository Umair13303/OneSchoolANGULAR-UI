import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimetableService } from '../../../core/services/timetable.service';
import { AcademicService } from '../../../core/services/academic.service';
import { SettingsService } from '../../../core/services/settings.service';
import { MenuService } from '../../../core/services/menu.service';
import { AuthService } from '../../../core/services/auth.service';
import { TimetableEntryDto, PeriodDto, DAY_NAMES } from '../../../core/models/timetable.model';
import { ClassDto } from '../../../core/models/academic.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { OsSelectComponent, OsSelectOption } from '../../../shared/components/os-select/os-select.component';

@Component({
  selector: 'app-timetable-view',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, LoadingComponent, EmptyStateComponent, OsSelectComponent],
  template: `
    <div class="os-page tt-page">
      <app-page-header
        class="no-print"
        [dense]="true"
        [title]="pageTitle()"
        [routeUrl]="routeUrl">
        @if (entries().length > 0) {
          <button type="button" class="btn-secondary btn-sm" (click)="printTimetable()">
            <span class="material-icons-round" style="font-size:16px">print</span>
            Print
          </button>
        }
      </app-page-header>

      <div class="print-only print-sheet">
        <header class="print-header">
          <div class="print-school">{{ schoolName() }}</div>
          @if (campusName()) {
            <div class="print-campus">{{ campusName() }}</div>
          }
          <div class="print-doc-title">Class Timetable</div>
          <div class="print-class">{{ selectedClassName() }}</div>
        </header>
      </div>

      <div class="os-stage tt-stage">
        <div class="os-stage-bar no-print">
          <div class="os-toolbar-group">
            <div class="os-field inline">
              <label class="os-field-label" for="tt-class-select">Class</label>
              <app-os-select
                id="tt-class-select"
                icon="school"
                placeholder="Select class…"
                ariaLabel="Select class"
                [searchable]="classOptions().length > 6"
                [options]="classOptions()"
                [value]="selectedClass()"
                (valueChange)="onClassSelect($event)" />
            </div>

            @if (selectedClass() && entries().length > 0) {
              <span class="os-meta-chip" title="Scheduled teaching periods this week">
                {{ totalPeriodsCount() }} / wk
              </span>
            }
          </div>

          @if (selectedClass()) {
            <div class="os-toolbar-group end">
              <div class="os-seg" role="tablist" aria-label="Day filter">
                <button type="button" class="os-seg-btn"
                        [class.active]="selectedDay() === 0"
                        (click)="selectedDay.set(0)">
                  <span class="material-icons-round">calendar_view_week</span>
                  <span class="seg-full">Week</span>
                </button>
                @for (d of days(); track d) {
                  <button type="button" class="os-seg-btn"
                          [class.active]="selectedDay() === d"
                          (click)="selectedDay.set(d)">
                    <span class="seg-full">{{ dayNames[d].slice(0, 3) }}</span>
                    <span class="seg-short">{{ dayNames[d].slice(0, 1) }}</span>
                    @if (isToday(d)) {
                      <span class="today-dot" title="Today"></span>
                    }
                  </button>
                }
              </div>

              <div class="os-seg square" role="tablist" aria-label="View mode">
                <button type="button" class="os-seg-btn"
                        [class.active]="viewMode() === 'table'"
                        (click)="setViewMode('table')"
                        title="Table view">
                  <span class="material-icons-round">table_chart</span>
                  <span class="seg-full">Table</span>
                </button>
                <button type="button" class="os-seg-btn"
                        [class.active]="viewMode() === 'timeline'"
                        (click)="setViewMode('timeline')"
                        title="Timeline view">
                  <span class="material-icons-round">view_agenda</span>
                  <span class="seg-full">Timeline</span>
                </button>
              </div>
            </div>
          }
        </div>

        @if (loading()) {
          <div class="os-stage-body tt-loading"><app-loading /></div>
        } @else if (!selectedClass()) {
          <div class="os-stage-body skeleton-wrap">
            <div class="skeleton-grid" aria-hidden="true">
              <table class="tt-table">
                <thead>
                  <tr>
                    <th class="period-th">#</th>
                    <th class="time-th">Time</th>
                    @for (d of days(); track d) {
                      <th class="day-th">{{ dayNames[d].slice(0, 3) }}</th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (row of skeletonRows; track row) {
                    <tr>
                      <td class="period-td"><div class="sk-block sk-period"></div></td>
                      <td class="time-td"><div class="sk-block sk-time"></div></td>
                      @for (d of days(); track d) {
                        <td class="free-cell"><div class="sk-block sk-cell"></div></td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <div class="skeleton-overlay">
              <span class="material-icons-round skeleton-icon">calendar_month</span>
              <p class="skeleton-title">Select a class to load the schedule</p>
              <p class="skeleton-sub">Choose a class from the toolbar above</p>
            </div>
          </div>
        } @else if (periodSlots().length === 0) {
          <div class="os-stage-body pad">
            <app-empty-state
              title="No periods configured"
              message="No timetable periods configured for this class yet."
              icon="event_busy" />
          </div>
        } @else {

          @if (viewMode() === 'timeline' && selectedDay() !== 0) {
            <div class="os-stage-body timeline-list">
              @for (slot of periodSlots(); track slot.periodNo; let last = $last) {
                @let entry = getEntry(slot.periodNo, selectedDay(), slot.isBreak);
                @let meta = entry ? getSubjectMeta(entry.subjectName) : null;

                <div class="tl-row"
                     [class.is-break]="slot.isBreak"
                     [class.is-free]="!slot.isBreak && !entry"
                     [class.is-subject]="!!entry"
                     [class.is-last]="last">
                  <div class="tl-time">
                    <span class="tl-start">{{ fmt(slot.startTime) }}</span>
                    <span class="tl-end">{{ fmt(slot.endTime) }}</span>
                  </div>

                  @if (slot.isBreak) {
                    <div class="tl-main">
                      <span class="material-icons-round tl-ico break-ico">coffee</span>
                      <span class="tl-title">Break</span>
                      <span class="tl-sub">{{ calcDuration(slot.startTime, slot.endTime) }} min</span>
                    </div>
                    <span class="tl-tag break-tag">Interval</span>
                  } @else if (entry) {
                    <div class="tl-main">
                      <span class="material-icons-round tl-ico" [style.color]="meta?.color">{{ meta?.icon }}</span>
                      <span class="tl-title">{{ entry.subjectName }}</span>
                      <span class="tl-sub">{{ entry.teacherName }} · {{ calcDuration(slot.startTime, slot.endTime) }} min</span>
                    </div>
                    <span class="tl-tag">P{{ slot.periodNo }}</span>
                  } @else {
                    <div class="tl-main">
                      <span class="tl-title free-title">Free</span>
                    </div>
                    <span class="tl-tag free-tag">P{{ slot.periodNo }}</span>
                  }
                </div>
              }
            </div>
          }

          @if (viewMode() === 'table' || selectedDay() === 0) {
            <div class="os-stage-body grid-card" id="print-area">
              @if (selectedDay() === 0) {
                <div class="scroll-hint no-print">
                  <span class="material-icons-round hint-icon">swipe</span>
                  <span>Scroll horizontally to see all weekdays</span>
                </div>
              }

              <div class="table-container" [class.is-single-day]="selectedDay() !== 0">
                <table class="tt-table" [class.is-single-day]="selectedDay() !== 0">
                  <thead>
                    <tr>
                      <th class="period-th" [class.sticky-col-period]="selectedDay() === 0">#</th>
                      <th class="time-th" [class.sticky-col-time]="selectedDay() === 0">Time</th>
                      @for (d of displayedDays(); track d) {
                        <th class="day-th" [class.today-th]="isToday(d)">
                          <div class="th-content">
                            <span>{{ dayNames[d].slice(0, 3) }}</span>
                            @if (isToday(d)) { <span class="today-tag">Today</span> }
                          </div>
                        </th>
                      }
                    </tr>
                  </thead>
                  <tbody>
                    @for (slot of periodSlots(); track slot.periodNo) {
                      <tr [class.break-row]="slot.isBreak">
                        <td class="period-td" [class.sticky-col-period]="selectedDay() === 0">
                          @if (!slot.isBreak) {
                            <span class="p-badge">{{ slot.periodNo }}</span>
                          } @else {
                            <span class="break-period-icon material-icons-round" title="Break">coffee</span>
                          }
                        </td>

                        <td class="time-td" [class.sticky-col-time]="selectedDay() === 0">
                          <span class="time-inline">{{ fmt(slot.startTime) }}–{{ fmt(slot.endTime) }}</span>
                        </td>

                        @for (d of displayedDays(); track d) {
                          @let entry = getEntry(slot.periodNo, d, slot.isBreak);
                          @let meta = entry ? getSubjectMeta(entry.subjectName) : null;

                          @if (slot.isBreak) {
                            <td class="break-slot" [class.today-col]="isToday(d)">
                              <span class="break-chip">
                                <span class="material-icons-round">coffee</span>
                                Break
                              </span>
                            </td>
                          } @else if (entry) {
                            <td class="entry-cell" [class.today-col]="isToday(d)">
                              <div class="entry-block" [style.--subj]="meta?.color">
                                <div class="entry-subj">{{ entry.subjectName }}</div>
                                <div class="entry-teacher">{{ entry.teacherName }}</div>
                              </div>
                            </td>
                          } @else {
                            <td class="free-cell" [class.today-col]="isToday(d)">
                              <span class="free-mark" aria-hidden="true"></span>
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
      </div>

      <footer class="print-only print-footer">
        <span>Printed by: {{ printedBy() }}</span>
        <span>Print on: {{ printedOn() }}</span>
      </footer>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-width: 0;
    }

    .print-only { display: none; }

    .tt-page { gap: 10px; }
    .tt-loading { padding: 48px 16px; }

    .tt-stage {
      border-radius: 0 !important;
      box-shadow: 0 1px 0 rgba(15, 23, 42, 0.04), 0 2px 8px rgba(15, 23, 42, 0.04);
    }

    .os-field.inline app-os-select {
      width: 220px;
      min-width: 180px;
    }

    .seg-short { display: none; }
    .today-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #10b981;
      display: inline-block;
      box-shadow: 0 0 0 2px color-mix(in srgb, #10b981 22%, transparent);
    }
    .os-seg-btn.active .today-dot { background: #fff; box-shadow: none; }

    /* Skeleton */
    .skeleton-wrap { position: relative; min-height: 320px; }
    .skeleton-grid { opacity: 0.42; pointer-events: none; user-select: none; }
    .sk-block {
      border-radius: 8px;
      background: linear-gradient(90deg, var(--surface-3) 25%, var(--surface-2) 50%, var(--surface-3) 75%);
      background-size: 200% 100%;
      animation: sk-shimmer 1.4s ease-in-out infinite;
    }
    .sk-period { width: 24px; height: 20px; margin: 0 auto; }
    .sk-time { width: 72px; height: 16px; }
    .sk-cell { width: 100%; height: 28px; }
    @keyframes sk-shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    .skeleton-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 24px;
      text-align: center;
      background: linear-gradient(
        180deg,
        color-mix(in srgb, var(--surface) 35%, transparent),
        color-mix(in srgb, var(--surface) 92%, transparent) 55%,
        var(--surface)
      );
    }
    .skeleton-icon {
      font-size: 34px;
      color: var(--accent);
      width: 52px;
      height: 52px;
      border-radius: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--accent-s);
      margin-bottom: 4px;
    }
    .skeleton-title { margin: 0; font-size: 14.5px; font-weight: 700; color: var(--t1); letter-spacing: -0.2px; }
    .skeleton-sub { margin: 0; font-size: 12.5px; color: var(--t3); }

    /* Timeline */
    .timeline-list { padding: 6px 0; }
    .tl-row {
      display: grid;
      grid-template-columns: 70px minmax(0, 1fr) auto;
      align-items: center;
      gap: 8px;
      min-height: 40px;
      margin: 0 10px;
      padding: 6px 12px;
      border-radius: 0;
      border-bottom: none;
    }
    .tl-row + .tl-row { margin-top: 2px; }
    .tl-row.is-last { border-bottom: none; }
    .tl-row.is-break { background: linear-gradient(90deg, #fffbeb, #fff7ed); }
    .tl-row.is-free { background: var(--surface-2); min-height: 34px; }
    .tl-row.is-subject { background: color-mix(in srgb, var(--surface-2) 55%, transparent); }
    .tl-row.is-subject:hover { background: var(--surface-2); }
    .tl-time { display: flex; flex-direction: column; line-height: 1.1; font-variant-numeric: tabular-nums; }
    .tl-start { font-size: 12px; font-weight: 700; color: var(--t1); }
    .tl-end { font-size: 10.5px; color: var(--t4); font-weight: 500; }
    .tl-main { display: flex; align-items: center; gap: 6px; min-width: 0; flex-wrap: wrap; }
    .tl-ico { font-size: 16px; color: var(--accent); }
    .break-ico { color: #b45309; }
    .tl-title { font-size: 12.5px; font-weight: 700; color: var(--t1); white-space: nowrap; }
    .tl-title.free-title { color: var(--t4); font-weight: 600; }
    .tl-sub {
      font-size: 11.5px; color: var(--t3); white-space: nowrap;
      overflow: hidden; text-overflow: ellipsis;
    }
    .tl-tag {
      font-size: 10.5px; font-weight: 700; padding: 2px 8px; border-radius: 0;
      background: var(--accent-s); color: var(--accent); flex-shrink: 0;
    }
    .tl-tag.break-tag { background: #fde68a; color: #78350f; }
    .tl-tag.free-tag { background: transparent; color: var(--t4); border: 1px solid var(--border); }

    /* Table grid */
    .grid-card { padding: 0; }
    .scroll-hint {
      display: none;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      background: color-mix(in srgb, var(--accent-s) 45%, var(--surface-2));
      border-bottom: 1px solid var(--border);
      font-size: 11.5px;
      font-weight: 600;
      color: var(--t3);
    }
    .hint-icon { font-size: 16px; color: var(--accent); }
    .table-container { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .tt-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      min-width: 760px;
    }
    .table-container.is-single-day { overflow-x: hidden; }
    .tt-table.is-single-day {
      min-width: 0 !important;
      width: 100% !important;
      table-layout: fixed;
    }

    th {
      height: 40px;
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      background: #f1f5f9;
      color: #64748b;
      border-bottom: 1px solid #dbe3ee;
      border-right: 1px solid #e8eef5;
      white-space: nowrap;
    }
    th:last-child { border-right: none; }
    th.period-th { width: 48px; text-align: center; padding: 0 4px; }
    th.time-th { width: 96px; text-align: left; padding: 0 12px; }
    th.day-th { min-width: 118px; text-align: left; padding: 0 10px; }
    th.today-th {
      background: color-mix(in srgb, var(--accent) 9%, #f1f5f9);
      color: var(--accent-d, var(--accent));
    }
    .th-content { display: flex; align-items: center; gap: 6px; }
    .today-tag {
      font-size: 9px;
      padding: 2px 6px;
      border-radius: 0;
      background: #10b981;
      color: #fff;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .tt-table.is-single-day th.period-th,
    .tt-table.is-single-day td.period-td { width: 52px !important; max-width: 52px; }
    .tt-table.is-single-day th.time-th,
    .tt-table.is-single-day td.time-td { width: 104px !important; max-width: 104px; }
    .tt-table.is-single-day th.day-th,
    .tt-table.is-single-day td.entry-cell,
    .tt-table.is-single-day td.free-cell,
    .tt-table.is-single-day td.break-slot { width: auto !important; }

    .sticky-col-period {
      position: sticky; left: 0; z-index: 3; background: var(--surface);
    }
    .sticky-col-time {
      position: sticky; left: 48px; z-index: 3; background: var(--surface);
      box-shadow: 4px 0 12px rgba(15, 23, 42, 0.05);
    }
    th.sticky-col-period, th.sticky-col-time {
      background: #f1f5f9;
      z-index: 4;
    }
    th.today-th.sticky-col-period,
    th.today-th.sticky-col-time {
      background: color-mix(in srgb, var(--accent) 9%, #f1f5f9);
    }

    td {
      border-bottom: 1px solid #e8eef5;
      border-right: 1px solid #eef2f7;
      vertical-align: middle;
      background: var(--surface);
      height: 44px;
    }
    td:last-child { border-right: none; }
    tr:last-child td { border-bottom: none; }
    tr:not(.break-row):hover td { background: color-mix(in srgb, var(--accent) 3.5%, #fff); }
    .today-col { background: color-mix(in srgb, var(--accent) 3%, #fff); }

    .break-row td {
      background: #fffbeb;
      height: 34px;
    }
    .break-row .sticky-col-period,
    .break-row .sticky-col-time { background: #fffbeb; }

    .period-td { padding: 4px; text-align: center; }
    .p-badge {
      width: 26px; height: 26px; border-radius: 0;
      background: #f8fafc;
      color: #475569;
      border: 1px solid #e2e8f0;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 11.5px; font-weight: 700; font-variant-numeric: tabular-nums;
    }
    .break-period-icon {
      font-size: 16px; color: #b45309;
      width: 1em; height: 1em; overflow: hidden;
      display: inline-flex; align-items: center; justify-content: center;
    }

    .time-td { padding: 4px 12px; }
    .time-inline {
      font-size: 12px; font-weight: 600; color: #334155;
      font-variant-numeric: tabular-nums; white-space: nowrap;
      letter-spacing: -0.01em;
    }
    .break-row .time-inline { color: #92400e; }

    .entry-cell { padding: 5px 8px; }
    .entry-block {
      border-left: 3px solid var(--subj, var(--accent));
      border-radius: 0;
      padding: 5px 8px;
      min-width: 0;
      background: color-mix(in srgb, var(--subj, var(--accent)) 8%, #fff);
    }
    .entry-subj {
      font-size: 12.5px; font-weight: 700; color: var(--t1); line-height: 1.25;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .entry-teacher {
      font-size: 11px; color: var(--t3); line-height: 1.3; margin-top: 1px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }

    .break-slot { padding: 4px 8px; }
    .break-chip {
      display: inline-flex; align-items: center; gap: 4px;
      height: 22px; padding: 0 8px; border-radius: 0;
      background: #fde68a;
      color: #92400e; border: 1px solid #fcd34d;
      font-size: 11px; font-weight: 700;
    }
    .break-chip .material-icons-round {
      font-size: 14px; width: 14px; height: 14px; overflow: hidden; color: #b45309;
    }

    .free-cell { padding: 4px 8px; }
    .free-mark {
      display: block;
      width: 100%;
      max-width: 28px;
      height: 1px;
      border-radius: 0;
      background: #cbd5e1;
      opacity: 0.7;
    }

    @media (max-width: 900px) {
      .tt-page { gap: 8px; }
      .tt-toolbar { padding: 10px 12px; }
      .seg-full { display: none; }
      .seg-short { display: inline; }
      .scroll-hint { display: flex; }
      .sticky-col-time { left: 48px; }
    }

    @media (max-width: 640px) {
      .tt-page { gap: 8px; }
    }

    @media print {
      @page { size: A4 landscape; margin: 10mm; }
      :host { margin: 0 !important; }
      .no-print { display: none !important; }
      .print-only { display: block !important; }

      .tt-page { gap: 0; }
      .tt-stage {
        box-shadow: none !important;
        border: 1px solid #94a3b8 !important;
        border-radius: 0 !important;
        overflow: visible !important;
      }
      .tt-stage::before { display: none !important; }
      .grid-card { display: block !important; padding: 0 !important; }
      .timeline-list { display: none !important; }
      .sticky-col-period, .sticky-col-time { position: static !important; box-shadow: none !important; }

      .print-header {
        text-align: center;
        margin-bottom: 14px;
        padding-bottom: 10px;
        border-bottom: 2px solid #0f172a;
      }
      .print-school {
        font-size: 18pt;
        font-weight: 800;
        color: #0f172a;
        letter-spacing: -0.02em;
        line-height: 1.2;
      }
      .print-campus {
        margin-top: 2px;
        font-size: 11pt;
        font-weight: 600;
        color: #334155;
      }
      .print-doc-title {
        margin-top: 8px;
        font-size: 12pt;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #475569;
      }
      .print-class {
        margin-top: 2px;
        font-size: 11pt;
        font-weight: 600;
        color: #0f172a;
      }

      .print-footer {
        display: flex !important;
        justify-content: space-between;
        gap: 16px;
        margin-top: 14px;
        padding-top: 8px;
        border-top: 1px solid #94a3b8;
        font-size: 9pt;
        color: #334155;
      }

      .tt-table { min-width: 0 !important; width: 100% !important; }
      th, td { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .today-tag { display: none !important; }
      .break-chip .material-icons-round { display: none !important; }
    }
  `]
})
export class TimetableViewComponent implements OnInit {
  private ttSvc       = inject(TimetableService);
  private academicSvc = inject(AcademicService);
  private settingsSvc = inject(SettingsService);
  private menuSvc     = inject(MenuService);
  private authSvc     = inject(AuthService);

  private static readonly LAST_CLASS_KEY = 'tt_last_class_id';
  private static readonly ROUTE = '/timetable/view';

  readonly dayNames = DAY_NAMES;
  readonly skeletonRows = [1, 2, 3, 4, 5, 6];
  days       = signal<number[]>([1, 2, 3, 4, 5]);

  readonly routeUrl = TimetableViewComponent.ROUTE;

  /** Leaf menu title from DB (e.g. View Timetable); fallback until menu loads. */
  pageTitle = computed(() =>
    this.menuSvc.titleForRoute(this.routeUrl, 'View Timetable')
  );

  classes    = signal<ClassDto[]>([]);
  entries    = signal<TimetableEntryDto[]>([]);
  allPeriods = signal<PeriodDto[]>([]);
  loading    = signal(false);

  selectedClass = signal<number | null>(null);
  selectedDay = signal<number>(0);
  viewMode = signal<'timeline' | 'table'>('table');

  classOptions = computed<OsSelectOption<number>[]>(() =>
    this.classes().map(c => {
      const base = c.section ? `${c.className} – ${c.section}` : c.className;
      return {
        value: c.classId,
        label: c.campusName ? `${base} (${c.campusName})` : base
      };
    })
  );

  displayedDays = computed(() => {
    const day = this.selectedDay();
    if (day === 0) return this.days();
    return [day];
  });

  selectedClassName = computed(() => {
    const id = this.selectedClass();
    const c = this.classes().find(x => x.classId === id);
    return c ? `${c.className}${c.section ? ' – ' + c.section : ''}` : '';
  });

  schoolName = computed(() => {
    const id = this.selectedClass();
    const c = this.classes().find(x => x.classId === id);
    return (c?.instituteName || this.authSvc.currentUser()?.instituteName || 'School').trim();
  });

  campusName = computed(() => {
    const id = this.selectedClass();
    const c = this.classes().find(x => x.classId === id);
    return (c?.campusName || '').trim();
  });

  printedBy = computed(() => this.authSvc.currentUser()?.fullName?.trim() || 'User');
  printedOn = signal('');

  totalPeriodsCount = computed(() => {
    return this.entries().filter(e => !e.isBreak).length;
  });

  ngOnInit() {
    this.menuSvc.ensureLoaded().subscribe();
    this.loading.set(true);
    this.ttSvc.getPeriods().subscribe(p => this.allPeriods.set(
      p.sort((a, b) => a.startTime.localeCompare(b.startTime))
    ));
    this.academicSvc.getClasses().subscribe({
      next: c => {
        this.classes.set(c);
        this.autoSelectClass(c);
        if (!c.length) this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
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
        this.selectedDay.set(0);
        this.viewMode.set('table');
      }
    }
  }

  private autoSelectClass(classes: ClassDto[]) {
    if (!classes.length || this.selectedClass() != null) return;
    const saved = typeof localStorage !== 'undefined'
      ? Number(localStorage.getItem(TimetableViewComponent.LAST_CLASS_KEY))
      : NaN;
    const match = Number.isFinite(saved) ? classes.find(c => c.classId === saved) : null;
    this.selectedClass.set(match?.classId ?? classes[0].classId);
    this.load();
  }

  onClassSelect(classId: number | null) {
    this.selectedClass.set(classId);
    if (classId != null && typeof localStorage !== 'undefined') {
      localStorage.setItem(TimetableViewComponent.LAST_CLASS_KEY, String(classId));
    }
    this.load();
  }

  setViewMode(mode: 'timeline' | 'table') {
    this.viewMode.set(mode);
    if (mode === 'timeline' && this.selectedDay() === 0) {
      const today = new Date().getDay();
      const normalized = today === 0 ? 7 : today;
      this.selectedDay.set(this.days().includes(normalized) ? normalized : (this.days()[0] ?? 1));
    }
  }

  load() {
    const classId = this.selectedClass();
    if (!classId) { this.entries.set([]); return; }
    this.loading.set(true);
    this.ttSvc.getForClass(classId).subscribe({
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

  printTimetable() {
    const classId = this.selectedClass();
    if (!classId) return;

    const day = this.selectedDay();
    this.ttSvc.downloadPdf(classId, day > 0 ? day : undefined).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const safe = (this.selectedClassName() || 'Class').replace(/[\\/:*?"<>|]+/g, '-');
        const a = document.createElement('a');
        a.href = url;
        a.download = `Timetable-${safe}.pdf`;
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();

        // Open PDF for viewing/printing — content has no browser title/URL chrome
        const win = window.open(url, '_blank');
        if (!win) {
          // popup blocked — file download already started
        }
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: () => {
        // keep silent UI — download failure is rare; user can retry
      }
    });
  }
}
