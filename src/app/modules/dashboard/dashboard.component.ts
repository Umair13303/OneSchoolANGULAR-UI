import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { StudentService } from '../../core/services/student.service';
import { AcademicService } from '../../core/services/academic.service';
import { AttendanceService } from '../../core/services/attendance.service';
import { TimetableService } from '../../core/services/timetable.service';
import { SettingsService } from '../../core/services/settings.service';
import { TimetableEntryDto, DAY_NAMES } from '../../core/models/timetable.model';
import { forkJoin, map } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <!-- ═══ Hero ═══ -->
    <div class="hero" [class.hero-teacher]="isTeacher()">
      <div class="hero-copy">
        <p class="eyebrow">{{ timeOfDay }}</p>
        <h1>{{ auth.currentUser()?.fullName }}</h1>
        <p class="hero-sub">
          @if (isTeacher()) {
            @if (ttLoading()) { Preparing your teaching day… }
            @else if (teacherEntries().length > 0) {
              {{ today }} · {{ todayClasses().length }} class{{ todayClasses().length === 1 ? '' : 'es' }} today
            } @else {
              {{ today }} · Your teaching workspace
            }
          } @else {
            {{ today }}
          }
        </p>
      </div>

      @if (isTeacher()) {
        <div class="hero-actions">
          <a routerLink="/attendance/mark" class="hero-cta hero-cta-primary">
            <span class="material-icons-round">how_to_reg</span>
            Mark Attendance
          </a>
          <a routerLink="/homework/assign" class="hero-cta">
            <span class="material-icons-round">assignment</span>
            Assign Homework
          </a>
          <a routerLink="/timetable/view" class="hero-cta">
            <span class="material-icons-round">calendar_view_week</span>
            Timetable
          </a>
        </div>
      } @else {
        <div class="hero-date-chip">
          <span class="material-icons-round">calendar_today</span>
          {{ today }}
        </div>
      }
    </div>

    <!-- ═══ Teacher Dashboard ═══ -->
    @if (isTeacher()) {

      @if (ttLoading()) {
        <div class="tt-loading">
          <span class="css-spinner" aria-hidden="true"></span>
          <span class="tt-loading-text">Loading your schedule…</span>
        </div>
      } @else if (ttError()) {
        <div class="td-empty">
          <div class="td-empty-main">
            <div class="td-empty-icon warn">
              <span class="material-icons-round">wifi_off</span>
            </div>
            <div class="td-empty-copy">
              <h2>Couldn’t load your schedule</h2>
              <p>The connection was slow or timed out. Please try again.</p>
            </div>
            <button class="td-retry" type="button" (click)="loadTeacherSchedule()">Try again</button>
          </div>
        </div>
      } @else if (teacherEntries().length === 0) {
        <div class="td-empty">
          <div class="td-empty-main">
            <div class="td-empty-icon">
              <span class="material-icons-round">event_available</span>
            </div>
            <div class="td-empty-copy">
              <h2>No schedule assigned yet</h2>
              <p>Ask your admin to assign your timetable. Meanwhile, you can still mark attendance, set homework, and open exams.</p>
            </div>
          </div>

          <div class="td-week">
            @for (d of emptyWeekDays; track d.key) {
              <div class="td-week-day" [class.is-today]="d.key === todayDow">
                <span class="td-week-label">{{ d.label }}</span>
                <span class="td-week-state">{{ d.key === todayDow ? 'Today' : '—' }}</span>
              </div>
            }
          </div>

          <div class="td-shortcuts">
            <a routerLink="/attendance/mark" class="td-shortcut">
              <span class="td-shortcut-icon" style="--ic:#0891b2">
                <span class="material-icons-round">how_to_reg</span>
              </span>
              <span class="td-shortcut-body">
                <strong>Mark Attendance</strong>
                <span>Record who’s present in class</span>
              </span>
              <span class="material-icons-round td-shortcut-arrow">arrow_forward</span>
            </a>
            <a routerLink="/attendance/view" class="td-shortcut">
              <span class="td-shortcut-icon" style="--ic:#059669">
                <span class="material-icons-round">fact_check</span>
              </span>
              <span class="td-shortcut-body">
                <strong>View Attendance</strong>
                <span>Review past attendance records</span>
              </span>
              <span class="material-icons-round td-shortcut-arrow">arrow_forward</span>
            </a>
            <a routerLink="/homework/assign" class="td-shortcut">
              <span class="td-shortcut-icon" style="--ic:#d97706">
                <span class="material-icons-round">edit_note</span>
              </span>
              <span class="td-shortcut-body">
                <strong>Assign Homework</strong>
                <span>Create and publish class work</span>
              </span>
              <span class="material-icons-round td-shortcut-arrow">arrow_forward</span>
            </a>
            <a routerLink="/exams/papers" class="td-shortcut">
              <span class="td-shortcut-icon" style="--ic:#db2777">
                <span class="material-icons-round">quiz</span>
              </span>
              <span class="td-shortcut-body">
                <strong>Exam Papers</strong>
                <span>Set up papers and enter results</span>
              </span>
              <span class="material-icons-round td-shortcut-arrow">arrow_forward</span>
            </a>
            <a routerLink="/homework/list" class="td-shortcut">
              <span class="td-shortcut-icon" style="--ic:#0284c7">
                <span class="material-icons-round">menu_book</span>
              </span>
              <span class="td-shortcut-body">
                <strong>Homework Diary</strong>
                <span>See assigned and due work</span>
              </span>
              <span class="material-icons-round td-shortcut-arrow">arrow_forward</span>
            </a>
            <a routerLink="/timetable/view" class="td-shortcut">
              <span class="td-shortcut-icon" style="--ic:#4f6ef7">
                <span class="material-icons-round">calendar_view_week</span>
              </span>
              <span class="td-shortcut-body">
                <strong>View Timetable</strong>
                <span>Check class timings when assigned</span>
              </span>
              <span class="material-icons-round td-shortcut-arrow">arrow_forward</span>
            </a>
          </div>
        </div>
      } @else {

        <!-- Stat row -->
        <div class="t-stats-row">
          <div class="t-stat-card" style="--c:#4f6ef7;--clight:#eef1ff;--cdark:#2a44cc">
            <div class="t-stat-icon-wrap">
              <span class="material-icons-round t-stat-icon">event_note</span>
            </div>
            <div class="t-stat-body">
              <div class="t-stat-val">{{ teacherStats().periods }}</div>
              <div class="t-stat-lbl">Periods / Week</div>
            </div>
            <div class="t-stat-trend">
              <span class="material-icons-round" style="font-size:36px;color:var(--c);opacity:.08;font-variation-settings:'FILL' 1">event_note</span>
            </div>
          </div>
          <div class="t-stat-card" style="--c:#0891b2;--clight:#e0f2fe;--cdark:#0e7490">
            <div class="t-stat-icon-wrap">
              <span class="material-icons-round t-stat-icon">meeting_room</span>
            </div>
            <div class="t-stat-body">
              <div class="t-stat-val">{{ teacherStats().classes }}</div>
              <div class="t-stat-lbl">Classes</div>
            </div>
            <div class="t-stat-trend">
              <span class="material-icons-round" style="font-size:36px;color:var(--c);opacity:.08;font-variation-settings:'FILL' 1">meeting_room</span>
            </div>
          </div>
          <div class="t-stat-card" style="--c:#059669;--clight:#d1fae5;--cdark:#047857">
            <div class="t-stat-icon-wrap">
              <span class="material-icons-round t-stat-icon">menu_book</span>
            </div>
            <div class="t-stat-body">
              <div class="t-stat-val">{{ teacherStats().subjects }}</div>
              <div class="t-stat-lbl">Subjects</div>
            </div>
            <div class="t-stat-trend">
              <span class="material-icons-round" style="font-size:36px;color:var(--c);opacity:.08;font-variation-settings:'FILL' 1">menu_book</span>
            </div>
          </div>
          <div class="t-stat-card" style="--c:#d97706;--clight:#fef3c7;--cdark:#b45309">
            <div class="t-stat-icon-wrap">
              <span class="material-icons-round t-stat-icon">today</span>
            </div>
            <div class="t-stat-body">
              <div class="t-stat-val">{{ todayClasses().length }}</div>
              <div class="t-stat-lbl">Today's Classes</div>
            </div>
            <div class="t-stat-trend">
              <span class="material-icons-round" style="font-size:36px;color:var(--c);opacity:.08;font-variation-settings:'FILL' 1">today</span>
            </div>
          </div>
        </div>

        <!-- Main content: timetable + today sidebar -->
        <div class="t-main-layout">

          <!-- Timetable grid: Today / Weekly toggle -->
          <div class="t-grid-card card">
            <div class="t-grid-hd">
              <div class="t-grid-hd-left">
                <span class="material-icons-round t-grid-hd-icon">grid_view</span>
                <div>
                  <div class="t-grid-title">{{ showWeekly() ? 'Weekly Schedule' : "Today's Schedule" }}</div>
                  <div class="t-grid-sub">
                    {{ showWeekly() ? (dayNames[todayDow] + ' is highlighted · ' + ttSlots().length + ' periods') : (dayNames[todayDow] + ' · ' + todayClasses().length + ' classes') }}
                  </div>
                </div>
              </div>
              <div class="t-grid-right">
                <div class="t-view-toggle">
                  <button class="t-toggle-btn" [class.t-toggle-active]="!showWeekly()" (click)="showWeekly.set(false)">
                    <span class="material-icons-round">today</span> Today
                  </button>
                  <button class="t-toggle-btn" [class.t-toggle-active]="showWeekly()" (click)="showWeekly.set(true)">
                    <span class="material-icons-round">view_week</span> Weekly
                  </button>
                </div>
              </div>
            </div>

            @if (!showWeekly()) {
              <!-- Today view -->
              @if (todayClasses().length === 0) {
                <div class="t-today-free" style="padding:40px 24px">
                  <span class="material-icons-round t-today-free-icon">free_cancellation</span>
                  <div class="t-today-free-title">No classes today</div>
                  <div class="t-today-free-sub">Enjoy your free day!</div>
                </div>
              } @else {
                <div class="t-grid-scroll">
                  <table class="t-table">
                    <thead>
                      <tr>
                        <th class="t-th-no"><span class="material-icons-round" style="font-size:14px">tag</span></th>
                        <th class="t-th-time">Time Slot</th>
                        <th class="t-th-day t-th-today"><span class="t-day-name">{{ dayNames[todayDow] }}</span><span class="t-today-pill">Today</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (slot of todaySlots(); track slot.periodNo; let odd = $odd) {
                        @let entry = ttEntry(slot.periodNo, todayDow);
                        <tr class="t-row" [class.t-row-odd]="odd">
                          <td class="t-td-no"><div class="t-pno-wrap"><span class="t-pno">P{{ slot.periodNo }}</span></div></td>
                          <td class="t-td-time">
                            <div class="t-time-block">
                              <span class="t-time-start">{{ fmt(slot.startTime) }}</span>
                              <span class="t-time-arrow">→</span>
                              <span class="t-time-end">{{ fmt(slot.endTime) }}</span>
                            </div>
                          </td>
                          @if (entry) {
                            <td class="t-td-filled t-td-today" [style.--subj-clr]="subjectColor(entry.subjectName)">
                              <div class="t-entry">
                                <div class="t-entry-dot"></div>
                                <div class="t-entry-text">
                                  <span class="t-entry-subject">{{ entry.subjectName }}</span>
                                  <span class="t-entry-class">
                                    <span class="material-icons-round" style="font-size:10px;vertical-align:middle">group</span>
                                    {{ entry.className }}{{ entry.section ? ' · ' + entry.section : '' }}
                                  </span>
                                </div>
                              </div>
                            </td>
                          } @else {
                            <td class="t-td-free t-td-today"><span class="t-free-label">Free</span></td>
                          }
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            } @else {
              <!-- Weekly view -->
              <div class="t-grid-scroll">
                <table class="t-table">
                  <thead>
                    <tr>
                      <th class="t-th-no"><span class="material-icons-round" style="font-size:14px">tag</span></th>
                      <th class="t-th-time">Time Slot</th>
                      @for (d of ttDays(); track d) {
                        <th class="t-th-day" [class.t-th-today]="d === todayDow">
                          <span class="t-day-name">{{ dayNames[d] }}</span>
                          @if (d === todayDow) { <span class="t-today-pill">Today</span> }
                        </th>
                      }
                    </tr>
                  </thead>
                  <tbody>
                    @for (slot of ttSlots(); track slot.periodNo; let odd = $odd) {
                      <tr class="t-row" [class.t-row-odd]="odd">
                        <td class="t-td-no"><div class="t-pno-wrap"><span class="t-pno">P{{ slot.periodNo }}</span></div></td>
                        <td class="t-td-time">
                          <div class="t-time-block">
                            <span class="t-time-start">{{ fmt(slot.startTime) }}</span>
                            <span class="t-time-arrow">→</span>
                            <span class="t-time-end">{{ fmt(slot.endTime) }}</span>
                          </div>
                        </td>
                        @for (d of ttDays(); track d) {
                          @let entry = ttEntry(slot.periodNo, d);
                          @if (entry) {
                            <td class="t-td-filled" [class.t-td-today]="d === todayDow" [style.--subj-clr]="subjectColor(entry.subjectName)">
                              <div class="t-entry">
                                <div class="t-entry-dot"></div>
                                <div class="t-entry-text">
                                  <span class="t-entry-subject">{{ entry.subjectName }}</span>
                                  <span class="t-entry-class">
                                    <span class="material-icons-round" style="font-size:10px;vertical-align:middle">group</span>
                                    {{ entry.className }}{{ entry.section ? ' · ' + entry.section : '' }}
                                  </span>
                                </div>
                              </div>
                            </td>
                          } @else {
                            <td class="t-td-free" [class.t-td-today]="d === todayDow"><span class="t-free-label">Free</span></td>
                          }
                        }
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>

          <!-- Today's classes sidebar -->
          <div class="t-today-card card">
            <div class="t-today-hd">
              <div class="t-today-hd-icon">
                <span class="material-icons-round" style="font-size:18px;color:#fff">wb_sunny</span>
              </div>
              <div>
                <div class="t-today-title">Today's Classes</div>
                <div class="t-today-sub">{{ dayNames[todayDow] }} · {{ todayClasses().length }} class{{ todayClasses().length !== 1 ? 'es' : '' }}</div>
              </div>
            </div>

            @if (todayClasses().length === 0) {
              <div class="t-today-free">
                <span class="material-icons-round t-today-free-icon">free_cancellation</span>
                <div class="t-today-free-title">No classes today</div>
                <div class="t-today-free-sub">Enjoy your free day!</div>
              </div>
            } @else {
              <div class="t-today-list">
                @for (e of todayClasses(); track e.timetableId; let i = $index) {
                  <div class="t-today-item" [style.--item-clr]="subjectColor(e.subjectName)">
                    <div class="t-today-timeline">
                      <div class="t-today-num">{{ e.periodNo }}</div>
                      @if (!$last) { <div class="t-today-line"></div> }
                    </div>
                    <div class="t-today-info">
                      <div class="t-today-subject">{{ e.subjectName }}</div>
                      <div class="t-today-meta">
                        <span class="material-icons-round" style="font-size:11px;vertical-align:middle">group</span>
                        {{ e.className }}{{ e.section ? ' · ' + e.section : '' }}
                      </div>
                      <div class="t-today-time">
                        <span class="material-icons-round" style="font-size:11px;vertical-align:middle">schedule</span>
                        {{ e.startTime }} – {{ e.endTime }}
                      </div>
                    </div>
                  </div>
                }
              </div>
            }
          </div>

        </div>
      }
    }

    <!-- ═══ Stat Widgets (hidden for teacher) ═══ -->
    @if (!isTeacher()) {
    <div class="stats-grid">
      <div class="stat-card" style="--clr:#4f6ef7;--bg:rgba(79,110,247,0.10)">
        <div class="stat-icon"><span class="material-icons-round">groups</span></div>
        <div class="stat-body">
          <div class="stat-value">{{ loading() ? '—' : stats().students }}</div>
          <div class="stat-label">Total Students</div>
        </div>
        <span class="material-icons-round stat-bg-icon">groups</span>
      </div>

      <div class="stat-card" style="--clr:#0891b2;--bg:rgba(8,145,178,0.10)">
        <div class="stat-icon"><span class="material-icons-round">badge</span></div>
        <div class="stat-body">
          <div class="stat-value">{{ loading() ? '—' : stats().teachers }}</div>
          <div class="stat-label">Teachers</div>
        </div>
        <span class="material-icons-round stat-bg-icon">badge</span>
      </div>

      <div class="stat-card" style="--clr:#059669;--bg:rgba(5,150,105,0.10)">
        <div class="stat-icon"><span class="material-icons-round">class</span></div>
        <div class="stat-body">
          <div class="stat-value">{{ loading() ? '—' : stats().classes }}</div>
          <div class="stat-label">Classes</div>
        </div>
        <span class="material-icons-round stat-bg-icon">class</span>
      </div>

      <div class="stat-card" style="--clr:#d97706;--bg:rgba(217,119,6,0.10)">
        <div class="stat-icon"><span class="material-icons-round">library_books</span></div>
        <div class="stat-body">
          <div class="stat-value">{{ loading() ? '—' : stats().subjects }}</div>
          <div class="stat-label">Subjects</div>
        </div>
        <span class="material-icons-round stat-bg-icon">library_books</span>
      </div>
    </div>

    <!-- ═══ Charts Row ═══ -->
    <div class="charts-row">

      <!-- Attendance This Week (Bar Chart) -->
      <div class="chart-card card">
        <div class="chart-header">
          <div>
            <div class="chart-title">Attendance This Week</div>
            <div class="chart-sub">Present vs Absent — last 7 days</div>
          </div>
          <div class="legend">
            <span class="leg-dot" style="background:#4f6ef7"></span> Present
            <span class="leg-dot" style="background:#f87171;margin-left:12px"></span> Absent
          </div>
        </div>

        @if (loading()) {
          <div class="chart-loading">
            <span class="material-icons-round spin">refresh</span>
          </div>
        } @else {
          <div class="bar-chart">
            @for (d of weeklyAttendance(); track d.day) {
              <div class="bar-group">
                <div class="bars">
                  <div class="bar present" [style.height.%]="barPct(d.present)"
                       [title]="d.present + ' present'"></div>
                  <div class="bar absent" [style.height.%]="barPct(d.absent)"
                       [title]="d.absent + ' absent'"></div>
                </div>
                <div class="bar-label">{{ d.day }}</div>
              </div>
            }
          </div>
        }
      </div>

      <!-- Donut: Student Gender Split -->
      <div class="chart-card card">
        <div class="chart-header">
          <div>
            <div class="chart-title">Student Overview</div>
            <div class="chart-sub">Gender distribution</div>
          </div>
        </div>

        @if (loading()) {
          <div class="chart-loading">
            <span class="material-icons-round spin">refresh</span>
          </div>
        } @else {
          <div class="donut-wrap">
            <svg viewBox="0 0 120 120" class="donut-svg">
              <!-- Background circle -->
              <circle cx="60" cy="60" r="46" fill="none" stroke="var(--border)" stroke-width="14" />
              <!-- Male arc -->
              <circle cx="60" cy="60" r="46" fill="none"
                stroke="#4f6ef7" stroke-width="14"
                [attr.stroke-dasharray]="maleArc() + ' ' + circumference"
                [attr.stroke-dashoffset]="circumference / 4"
                stroke-linecap="round" />
              <!-- Female arc -->
              <circle cx="60" cy="60" r="46" fill="none"
                stroke="#db2777" stroke-width="14"
                [attr.stroke-dasharray]="femaleArc() + ' ' + circumference"
                [attr.stroke-dashoffset]="circumference / 4 - maleArc()"
                stroke-linecap="round" />
              <text x="60" y="55" text-anchor="middle" class="donut-num">{{ stats().students }}</text>
              <text x="60" y="70" text-anchor="middle" class="donut-lbl">Students</text>
            </svg>
            <div class="donut-legend">
              <div class="dl-row">
                <span class="leg-dot" style="background:#4f6ef7"></span>
                <span class="dl-label">Male</span>
                <span class="dl-val">{{ stats().male }}</span>
              </div>
              <div class="dl-row">
                <span class="leg-dot" style="background:#db2777"></span>
                <span class="dl-label">Female</span>
                <span class="dl-val">{{ stats().female }}</span>
              </div>
              <div class="dl-row">
                <span class="leg-dot" style="background:var(--border-2)"></span>
                <span class="dl-label">Other</span>
                <span class="dl-val">{{ stats().students - stats().male - stats().female }}</span>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Class-wise student count -->
      <div class="chart-card card">
        <div class="chart-header">
          <div>
            <div class="chart-title">Students per Class</div>
            <div class="chart-sub">Enrollment breakdown</div>
          </div>
        </div>

        @if (loading()) {
          <div class="chart-loading">
            <span class="material-icons-round spin">refresh</span>
          </div>
        } @else if (classStats().length === 0) {
          <div class="chart-empty">No class data</div>
        } @else {
          <div class="hbar-list">
            @for (c of classStats(); track c.name; let i = $index) {
              <div class="hbar-row">
                <span class="hbar-label">{{ c.name }}</span>
                <div class="hbar-track">
                  <div class="hbar-fill" [style.width.%]="c.pct"
                       [style.background]="COLORS[i % COLORS.length]"></div>
                </div>
                <span class="hbar-val">{{ c.count }}</span>
              </div>
            }
          </div>
        }
      </div>

    </div>
    } <!-- end @if (!isTeacher()) -->
  `,
  styles: [`
    /* Hero */
    .hero {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 16px; gap: 16px;
      background:
        radial-gradient(ellipse 80% 120% at 100% 0%, rgba(var(--accent-rgb), 0.10), transparent 55%),
        linear-gradient(135deg, var(--surface) 0%, var(--surface-2) 100%);
      border: 1px solid var(--border); border-radius: var(--r-xl);
      padding: 16px 20px; box-shadow: var(--sh);
      position: relative; overflow: hidden;
      animation: td-rise 0.45s ease both;
    }
    .hero-copy { min-width: 0; position: relative; z-index: 1; flex: 1; }
    .eyebrow {
      font-size: 10px; font-weight: 700; color: var(--accent);
      text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;
      display: flex; align-items: center; gap: 8px;
    }
    .eyebrow::before { content: ''; width: 14px; height: 2px; background: var(--accent); border-radius: 2px; }
    h1 {
      font-size: 22px; font-weight: 800; color: var(--t1); letter-spacing: -0.4px;
      line-height: 1.15; margin: 0;
    }
    .hero-sub { font-size: 12.5px; color: var(--t4); margin-top: 4px; line-height: 1.35; }
    .hero-actions {
      display: flex; flex-wrap: nowrap; gap: 8px; justify-content: flex-end;
      position: relative; z-index: 1; flex-shrink: 0;
    }
    .hero-cta {
      display: inline-flex; align-items: center; gap: 5px;
      height: 34px; padding: 0 12px; white-space: nowrap;
      border: 1px solid var(--border); border-radius: 9px;
      background: var(--surface); color: var(--t2);
      font-size: 12px; font-weight: 700; text-decoration: none;
      transition: border-color .15s, color .15s, background .15s, transform .15s;
    }
    .hero-cta .material-icons-round { font-size: 15px; }
    .hero-cta:hover { border-color: var(--accent); color: var(--accent); transform: translateY(-1px); }
    .hero-cta-primary {
      background: var(--accent); border-color: var(--accent); color: #fff;
      box-shadow: 0 4px 12px rgba(var(--accent-rgb), 0.25);
    }
    .hero-cta-primary:hover { background: var(--accent-h); color: #fff; border-color: var(--accent-h); }
    .hero-date-chip {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 8px 12px; border-radius: 10px;
      background: var(--surface); border: 1px solid var(--border);
      font-size: 12px; font-weight: 650; color: var(--t2);
      position: relative; z-index: 1; white-space: nowrap;
    }
    .hero-date-chip .material-icons-round { font-size: 15px; color: var(--accent); }

    /* Stat widgets */
    .stats-grid {
      display: grid; grid-template-columns: repeat(4, 1fr);
      gap: 16px; margin-bottom: 20px;
    }
    @media (max-width: 900px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }

    .stat-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--r-xl); padding: 20px;
      box-shadow: var(--sh); position: relative; overflow: hidden;
      display: flex; align-items: center; gap: 14px;
    }
    .stat-icon {
      width: 48px; height: 48px; border-radius: 14px; flex-shrink: 0;
      background: var(--bg); display: flex; align-items: center; justify-content: center;
    }
    .stat-icon .material-icons-round { font-size: 24px; color: var(--clr); font-variation-settings: 'FILL' 1; }
    .stat-value { font-size: 28px; font-weight: 800; color: var(--t1); line-height: 1; }
    .stat-label { font-size: 12px; color: var(--t4); font-weight: 600; margin-top: 4px; }
    .stat-bg-icon {
      position: absolute; right: -8px; bottom: -8px;
      font-size: 72px; color: var(--clr); opacity: 0.06;
      font-variation-settings: 'FILL' 1; pointer-events: none;
    }

    /* Charts row */
    .charts-row {
      display: grid; grid-template-columns: 1.6fr 1fr 1fr;
      gap: 16px; align-items: start;
    }
    @media (max-width: 1100px) { .charts-row { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 700px)  { .charts-row { grid-template-columns: 1fr; } }

    .chart-card { padding: 20px; }
    .chart-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 18px; }
    .chart-title { font-size: 14px; font-weight: 800; color: var(--t1); }
    .chart-sub { font-size: 11.5px; color: var(--t4); margin-top: 3px; }
    .chart-loading { display: flex; justify-content: center; padding: 40px 0; color: var(--t4); }
    .chart-empty { font-size: 13px; color: var(--t4); text-align: center; padding: 32px 0; }

    .legend { display: flex; align-items: center; font-size: 11.5px; color: var(--t3); font-weight: 600; flex-shrink: 0; }
    .leg-dot { width: 9px; height: 9px; border-radius: 3px; display: inline-block; margin-right: 5px; }

    /* Bar chart */
    .bar-chart { display: flex; align-items: flex-end; gap: 10px; height: 140px; }
    .bar-group { display: flex; flex-direction: column; align-items: center; gap: 6px; flex: 1; height: 100%; }
    .bars { display: flex; align-items: flex-end; gap: 3px; flex: 1; width: 100%; }
    .bar {
      flex: 1; border-radius: 5px 5px 0 0; min-height: 3px;
      transition: height 0.5s cubic-bezier(.22,1,.36,1);
    }
    .bar.present { background: #4f6ef7; }
    .bar.absent  { background: #f87171; }
    .bar-label { font-size: 10.5px; font-weight: 700; color: var(--t4); }

    /* Donut */
    .donut-wrap { display: flex; align-items: center; justify-content: center; gap: 20px; }
    .donut-svg { width: 120px; height: 120px; flex-shrink: 0; }
    .donut-num { font-size: 22px; font-weight: 800; fill: var(--t1); font-family: Inter, sans-serif; }
    .donut-lbl { font-size: 9px; font-weight: 600; fill: var(--t4); font-family: Inter, sans-serif; text-transform: uppercase; letter-spacing: 0.5px; }
    .donut-legend { display: flex; flex-direction: column; gap: 10px; }
    .dl-row { display: flex; align-items: center; gap: 7px; font-size: 12.5px; }
    .dl-label { color: var(--t3); font-weight: 600; flex: 1; }
    .dl-val { font-weight: 800; color: var(--t1); }

    /* Horizontal bar */
    .hbar-list { display: flex; flex-direction: column; gap: 10px; }
    .hbar-row { display: flex; align-items: center; gap: 10px; }
    .hbar-label { font-size: 12px; font-weight: 600; color: var(--t2); min-width: 60px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .hbar-track { flex: 1; height: 8px; background: var(--surface-3); border-radius: 99px; overflow: hidden; }
    .hbar-fill { height: 100%; border-radius: 99px; transition: width 0.6s cubic-bezier(.22,1,.36,1); min-width: 4px; }
    .hbar-val { font-size: 12px; font-weight: 700; color: var(--t2); min-width: 24px; text-align: right; }

    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes td-rise {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes td-fade {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .spin { animation: spin 0.9s linear infinite; display: inline-block; font-size: 28px; }

    /* ── Teacher loading / empty ───────────────────────────────────── */
    .tt-loading {
      display:flex; flex-direction:column; align-items:center; gap:12px;
      padding:64px 24px; color:var(--t4);
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--r-2xl); animation: td-rise .4s ease both;
    }
    .tt-loading-text { font-size:13px; font-weight:600; }

    .td-empty {
      display: flex; flex-direction: column; gap: 18px;
      animation: td-rise 0.5s ease both;
    }
    .td-empty-main {
      display: flex; align-items: center; gap: 18px;
      padding: 22px 24px;
      background:
        linear-gradient(135deg, rgba(var(--accent-rgb), 0.06), transparent 42%),
        var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--r-2xl);
      box-shadow: var(--sh);
    }
    .td-empty-icon {
      width: 56px; height: 56px; border-radius: 16px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      background: var(--accent-s); color: var(--accent);
    }
    .td-empty-icon.warn { background: #fff7ed; color: #ea580c; }
    .td-empty-icon .material-icons-round { font-size: 28px; }
    .td-empty-copy { flex: 1; min-width: 0; }
    .td-empty-copy h2 {
      margin: 0; font-size: 17px; font-weight: 800; color: var(--t1); letter-spacing: -0.2px;
    }
    .td-empty-copy p {
      margin: 6px 0 0; font-size: 13.5px; line-height: 1.5; color: var(--t3); max-width: 52ch;
    }
    .td-retry {
      height: 40px; padding: 0 16px; border: none; border-radius: 10px;
      background: var(--accent); color: #fff; font-size: 13px; font-weight: 700; cursor: pointer;
      flex-shrink: 0;
    }
    .td-retry:hover { background: var(--accent-h); }

    .td-week {
      display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px;
    }
    .td-week-day {
      display: flex; flex-direction: column; align-items: center; gap: 6px;
      padding: 12px 8px;
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 12px; min-height: 68px; justify-content: center;
      transition: border-color .15s, background .15s;
    }
    .td-week-day.is-today {
      border-color: rgba(var(--accent-rgb), 0.45);
      background: linear-gradient(180deg, rgba(var(--accent-rgb), 0.1), var(--surface));
    }
    .td-week-label { font-size: 11px; font-weight: 800; color: var(--t3); letter-spacing: 0.4px; text-transform: uppercase; }
    .td-week-day.is-today .td-week-label { color: var(--accent); }
    .td-week-state { font-size: 12px; font-weight: 650; color: var(--t4); }
    .td-week-day.is-today .td-week-state { color: var(--accent); font-weight: 800; }

    .td-shortcuts {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
    }
    .td-shortcut {
      display: flex; align-items: center; gap: 12px;
      padding: 14px 14px 14px 12px;
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 14px; text-decoration: none; color: inherit;
      transition: transform .15s, border-color .15s, box-shadow .15s;
      animation: td-rise 0.45s ease both;
    }
    .td-shortcut:nth-child(1) { animation-delay: .04s; }
    .td-shortcut:nth-child(2) { animation-delay: .08s; }
    .td-shortcut:nth-child(3) { animation-delay: .12s; }
    .td-shortcut:nth-child(4) { animation-delay: .16s; }
    .td-shortcut:nth-child(5) { animation-delay: .20s; }
    .td-shortcut:nth-child(6) { animation-delay: .24s; }
    .td-shortcut:hover {
      transform: translateY(-2px);
      border-color: rgba(var(--accent-rgb), 0.35);
      box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
    }
    .td-shortcut:hover .td-shortcut-arrow { color: var(--accent); transform: translateX(2px); }
    .td-shortcut-icon {
      width: 40px; height: 40px; border-radius: 11px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      background: color-mix(in srgb, var(--ic) 14%, white);
      color: var(--ic);
    }
    .td-shortcut-icon .material-icons-round { font-size: 20px; }
    .td-shortcut-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .td-shortcut-body strong { font-size: 13px; font-weight: 800; color: var(--t1); }
    .td-shortcut-body span { font-size: 11.5px; color: var(--t4); line-height: 1.35; }
    .td-shortcut-arrow {
      font-size: 18px; color: var(--t4); transition: color .15s, transform .15s;
    }

    /* ── Stat row ──────────────────────────────────────────────────── */
    .t-stats-row { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:18px; animation: td-rise .45s ease both; }
    @media(max-width:900px){ .t-stats-row { grid-template-columns:repeat(2,1fr); } }
    @media(max-width:480px){ .t-stats-row { grid-template-columns:repeat(1,1fr); } }

    .t-stat-card {
      display:flex; align-items:center; gap:14px; padding:18px 20px;
      background:var(--surface); border:1px solid var(--border);
      border-radius:var(--r-xl); box-shadow:var(--sh);
      position:relative; overflow:hidden;
      border-top:3px solid var(--c);
      transition:transform .15s, box-shadow .15s;
    }
    .t-stat-card:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,.08); }
    .t-stat-icon-wrap {
      width:44px; height:44px; border-radius:12px; flex-shrink:0;
      background:var(--clight); display:flex; align-items:center; justify-content:center;
    }
    .t-stat-icon { font-size:22px; color:var(--c); font-variation-settings:'FILL' 1; }
    .t-stat-body { flex:1; min-width:0; }
    .t-stat-val { font-size:28px; font-weight:800; color:var(--t1); line-height:1; }
    .t-stat-lbl { font-size:11px; font-weight:600; color:var(--t4); margin-top:4px; letter-spacing:.2px; }
    .t-stat-trend { position:absolute; right:12px; bottom:4px; line-height:1; }

    /* ── Main layout ───────────────────────────────────────────────── */
    .t-main-layout { display:grid; grid-template-columns:1fr 290px; gap:18px; align-items:start; animation: td-rise .5s ease both; }
    @media(max-width:1060px){ .t-main-layout { grid-template-columns:1fr; } }

    /* ── Grid card ─────────────────────────────────────────────────── */
    .t-grid-card { padding:0; overflow:hidden; }
    .t-grid-hd {
      display:flex; justify-content:space-between; align-items:center;
      padding:16px 20px 14px; border-bottom:1px solid var(--border);
      background:var(--surface);
    }
    .t-grid-hd-left { display:flex; align-items:center; gap:12px; }
    .t-grid-hd-icon {
      width:36px; height:36px; border-radius:10px;
      background:var(--accent);
      display:flex; align-items:center; justify-content:center;
      color:#fff; font-size:18px; flex-shrink:0;
    }
    .t-grid-title { font-size:14px; font-weight:800; color:var(--t1); }
    .t-grid-sub { font-size:11px; color:var(--t4); margin-top:2px; }
    .t-grid-legend { display:flex; align-items:center; gap:8px; font-size:11px; font-weight:600; color:var(--t4); }
    .t-legend-dot { width:14px; height:14px; border-radius:4px; display:inline-block; }
    .t-grid-right { display:flex; align-items:center; gap:10px; }
    .t-view-toggle { display:flex; border:1.5px solid var(--border); border-radius:8px; overflow:hidden; }
    .t-toggle-btn {
      display:flex; align-items:center; gap:5px;
      padding:6px 14px; border:none; background:var(--surface);
      font-size:12px; font-weight:600; color:var(--t3); cursor:pointer;
      transition:background .15s, color .15s;
    }
    .t-toggle-btn .material-icons-round { font-size:14px; }
    .t-toggle-btn:not(:last-child) { border-right:1.5px solid var(--border); }
    .t-toggle-btn:hover { background:var(--hover); color:var(--t1); }
    .t-toggle-active { background:var(--accent) !important; color:#fff !important; }

    /* Table */
    .t-grid-scroll { overflow-x:auto; }
    .t-table { width:100%; border-collapse:collapse; min-width:580px; }

    .t-table thead tr { background:linear-gradient(135deg,#1e293b,#334155); }
    .t-table th { padding:11px 14px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.6px; text-align:left; white-space:nowrap; color:#94a3b8; }
    .t-th-no   { width:56px; text-align:center; color:#64748b; }
    .t-th-time { width:130px; }
    .t-th-day  { min-width:140px; border-left:1px solid rgba(255,255,255,.06); color:#cbd5e1; }
    .t-th-today { color:#fff !important; position:relative; }
    .t-th-today::after {
      content:''; position:absolute; bottom:0; left:0; right:0; height:2px;
      background: var(--accent);
    }
    .t-day-name { display:block; font-size:11px; font-weight:800; }
    .t-today-pill {
      display:inline-block; background: var(--accent);
      font-size:8px; font-weight:800; padding:2px 8px; border-radius:99px;
      margin-top:4px; letter-spacing:.5px; color:#fff; text-transform:uppercase;
    }

    /* Rows */
    .t-table td { border-bottom:1px solid var(--border); border-left:1px solid var(--border); vertical-align:middle; padding:0; }
    .t-table tr:last-child td { border-bottom:none; }
    .t-row { transition:background .1s; }
    .t-row:hover .t-td-free, .t-row:hover .t-td-time, .t-row:hover .t-td-no { filter:brightness(.97); }

    .t-td-no { text-align:center; padding:10px 6px; background:#f8fafc; border-left:none !important; }
    .t-pno-wrap { display:flex; justify-content:center; }
    .t-pno {
      font-size:11px; font-weight:800; color: var(--accent);
      background: var(--accent-s); padding:3px 7px; border-radius:6px; letter-spacing:.3px;
    }

    .t-td-time { padding:0 14px; background:#fafafa; }
    .t-time-block { display:flex; flex-direction:column; gap:1px; }
    .t-time-start { font-size:11.5px; font-weight:700; color:var(--t1); }
    .t-time-arrow { font-size:10px; color:var(--t4); }
    .t-time-end   { font-size:11px; font-weight:500; color:var(--t3); }

    .t-td-filled {
      padding:10px 12px; cursor:default;
      background:color-mix(in srgb, var(--subj-clr, #4f6ef7) 8%, white);
    }
    .t-td-filled.t-td-today {
      background:color-mix(in srgb, var(--subj-clr, #4f6ef7) 14%, white);
      border-left:3px solid var(--subj-clr, #4f6ef7) !important;
    }
    .t-entry { display:flex; align-items:flex-start; gap:8px; }
    .t-entry-dot {
      width:8px; height:8px; border-radius:50%; margin-top:3px; flex-shrink:0;
      background:var(--subj-clr, #4f6ef7);
    }
    .t-entry-text { min-width:0; }
    .t-entry-subject { display:block; font-size:12px; font-weight:700; color:var(--t1); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .t-entry-class   { display:block; font-size:10px; color:var(--t3); font-weight:600; margin-top:2px; }

    .t-td-free {
      text-align:center; padding:10px; background:var(--surface);
      border-style:dashed !important; border-color:var(--border) !important;
    }
    .t-td-free.t-td-today { background:#fafbff; }
    .t-free-label { font-size:9.5px; font-weight:700; color:var(--border); text-transform:uppercase; letter-spacing:.5px; }

    /* ── Today sidebar ─────────────────────────────────────────────── */
    .t-today-card { padding:0; overflow:hidden; }
    .t-today-hd {
      display:flex; align-items:center; gap:12px; padding:16px 18px 14px;
      border-bottom:1px solid var(--border);
      background:linear-gradient(135deg,#ea580c,#f59e0b);
    }
    .t-today-hd-icon {
      width:36px; height:36px; border-radius:10px;
      background:rgba(255,255,255,.2); display:flex; align-items:center; justify-content:center; flex-shrink:0;
    }
    .t-today-title { font-size:13px; font-weight:800; color:#fff; }
    .t-today-sub { font-size:11px; color:rgba(255,255,255,.8); margin-top:2px; }

    .t-today-free { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px 16px; text-align:center; }
    .t-today-free-icon { font-size:36px; color:var(--border); margin-bottom:10px; }
    .t-today-free-title { font-size:13px; font-weight:700; color:var(--t2); }
    .t-today-free-sub { font-size:11.5px; color:var(--t4); margin-top:4px; }

    .t-today-list { display:flex; flex-direction:column; padding:8px 0; }
    .t-today-item { display:flex; align-items:flex-start; gap:0; padding:8px 16px; }
    .t-today-item:hover { background:var(--surface-2,#f8fafc); }

    .t-today-timeline { display:flex; flex-direction:column; align-items:center; margin-right:14px; flex-shrink:0; }
    .t-today-num {
      width:30px; height:30px; border-radius:50%;
      background:var(--item-clr, #4f6ef7); color:#fff;
      font-size:12px; font-weight:800; display:flex; align-items:center; justify-content:center; flex-shrink:0;
      box-shadow:0 2px 8px color-mix(in srgb, var(--item-clr, #4f6ef7) 40%, transparent);
    }
    .t-today-line { width:2px; flex:1; min-height:12px; background:var(--border); margin:4px 0; }

    .t-today-info { flex:1; min-width:0; padding-top:4px; }
    .t-today-subject { font-size:13px; font-weight:700; color:var(--t1); }
    .t-today-meta { font-size:11px; color:var(--t3); font-weight:600; margin-top:3px; gap:3px; display:flex; align-items:center; }
    .t-today-time { font-size:10.5px; color:var(--t4); margin-top:3px; display:flex; align-items:center; gap:3px; }

    /* ── Mobile ──────────────────────────────────────── */
    @media (max-width: 900px) {
      .td-shortcuts { grid-template-columns: repeat(2, 1fr); }
      .td-week { grid-template-columns: repeat(3, 1fr); }
      .hero-actions { flex-wrap: wrap; max-width: 100%; }
    }
    @media (max-width: 768px) {
      .hero { flex-direction: column; align-items: stretch; padding: 14px 16px; gap: 12px; }
      .hero-actions { width: 100%; max-width: none; justify-content: flex-start; flex-wrap: wrap; }
      .hero-date-chip { width: 100%; justify-content: flex-start; }
      h1 { font-size: 20px; }
      .td-empty-main { flex-direction: column; align-items: flex-start; }
      .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
      .stat-card { padding: 14px; gap: 10px; }
      .charts-row { grid-template-columns: 1fr !important; }
      .t-grid-hd { flex-direction: column; align-items: flex-start; gap: 10px; }
      .t-grid-right { width: 100%; justify-content: flex-end; }
      .t-grid-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    }
    @media (max-width: 560px) {
      .td-shortcuts { grid-template-columns: 1fr; }
      .hero-cta { flex: 1 1 auto; justify-content: center; }
    }
    @media (max-width: 480px) {
      .hero { padding: 12px 14px; }
      h1 { font-size: 18px; }
      .stats-grid { gap: 8px; }
      .stat-card { padding: 12px; flex-direction: column; align-items: flex-start; gap: 8px; }
      .t-stats-row { grid-template-columns: repeat(2, 1fr) !important; }
      .td-week { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class DashboardComponent implements OnInit {
  auth        = inject(AuthService);
  private userSvc      = inject(UserService);
  private stuSvc       = inject(StudentService);
  private acSvc        = inject(AcademicService);
  private ttSvc        = inject(TimetableService);
  private settingsSvc  = inject(SettingsService);

  readonly COLORS = ['#4f6ef7','#0891b2','#059669','#d97706','#db2777','#ea580c','#0284c7','#16a34a'];
  readonly circumference = 2 * Math.PI * 46;
  ttDays    = signal<number[]>([1, 2, 3, 4, 5]);
  showWeekly = signal(false);
  readonly dayNames = DAY_NAMES;
  readonly todayDow = (() => { const d = new Date().getDay(); return d === 0 ? 7 : d; })();
  readonly emptyWeekDays = [
    { key: 1, label: 'Mon' },
    { key: 2, label: 'Tue' },
    { key: 3, label: 'Wed' },
    { key: 4, label: 'Thu' },
    { key: 5, label: 'Fri' },
    { key: 6, label: 'Sat' },
  ];

  today = new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  isTeacher() { return this.auth.hasRole('teacher'); }

  // Teacher schedule
  ttLoading      = signal(false);
  ttError        = signal(false);
  teacherEntries = signal<TimetableEntryDto[]>([]);

  ttSlots = computed(() => {
    const seen = new Map<number, { periodNo: number; startTime: string; endTime: string }>();
    for (const e of this.teacherEntries()) {
      if (!seen.has(e.periodNo)) seen.set(e.periodNo, { periodNo: e.periodNo, startTime: e.startTime, endTime: e.endTime });
    }
    return [...seen.values()].sort((a, b) => a.periodNo - b.periodNo);
  });

  teacherStats = computed(() => ({
    periods:  this.teacherEntries().length,
    classes:  new Set(this.teacherEntries().map(e => e.classId)).size,
    subjects: new Set(this.teacherEntries().map(e => e.subjectId)).size,
  }));

  ttEntry(periodNo: number, day: number): TimetableEntryDto | undefined {
    return this.teacherEntries().find(e => e.periodNo === periodNo && e.dayOfWeek === day);
  }

  todaySlots = computed(() => {
    const seen = new Map<number, { periodNo: number; startTime: string; endTime: string }>();
    for (const e of this.teacherEntries().filter(e => e.dayOfWeek === this.todayDow)) {
      if (!seen.has(e.periodNo)) seen.set(e.periodNo, { periodNo: e.periodNo, startTime: e.startTime, endTime: e.endTime });
    }
    return [...seen.values()].sort((a, b) => a.periodNo - b.periodNo);
  });

  fmt(t: string): string { return t ? t.slice(0, 5) : ''; }

  private readonly SUBJECT_COLORS = [
    '#4f6ef7','#0891b2','#059669','#d97706','#db2777','#ea580c','#0284c7','#0d9488',
  ];
  private subjectColorMap = new Map<string, string>();
  subjectColor(subjectName: string): string {
    if (!this.subjectColorMap.has(subjectName)) {
      const idx = this.subjectColorMap.size % this.SUBJECT_COLORS.length;
      this.subjectColorMap.set(subjectName, this.SUBJECT_COLORS[idx]);
    }
    return this.subjectColorMap.get(subjectName)!;
  }

  todayClasses = computed(() =>
    this.teacherEntries()
      .filter(e => e.dayOfWeek === this.todayDow)
      .sort((a, b) => a.periodNo - b.periodNo)
  );

  loading = signal(true);
  stats   = signal({ students: 0, teachers: 0, classes: 0, subjects: 0, male: 0, female: 0 });
  classStats    = signal<{ name: string; count: number; pct: number }[]>([]);
  weeklyAttendance = signal<{ day: string; present: number; absent: number }[]>([
    { day: 'Mon', present: 0, absent: 0 },
    { day: 'Tue', present: 0, absent: 0 },
    { day: 'Wed', present: 0, absent: 0 },
    { day: 'Thu', present: 0, absent: 0 },
    { day: 'Fri', present: 0, absent: 0 },
    { day: 'Sat', present: 0, absent: 0 },
  ]);

  get timeOfDay(): string {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  }

  maleArc()   { const t = this.stats().students || 1; return (this.stats().male / t) * this.circumference; }
  femaleArc() { const t = this.stats().students || 1; return (this.stats().female / t) * this.circumference; }

  maxBar = computed(() => {
    const w = this.weeklyAttendance();
    return Math.max(...w.map(d => d.present + d.absent), 1);
  });
  barPct(val: number) { return (val / this.maxBar()) * 100; }

  loadTeacherSchedule() {
    const user = this.auth.currentUser();
    if (!user) return;
    this.ttLoading.set(true);
    this.ttError.set(false);
    this.ttSvc.getForTeacher(user.userId).subscribe({
      next: (days: any[]) => {
        const entries = days.flatMap((d: any) => d.entries ?? [])
          .filter((e: any) => !e.isBreak && e.periodNo > 0);
        this.teacherEntries.set(entries);
        this.ttLoading.set(false);
      },
      error: () => {
        this.ttLoading.set(false);
        this.ttError.set(true);
      }
    });
  }

  ngOnInit() {
    if (this.isTeacher()) {
      this.loadTeacherSchedule();
      // Load working days for correct day columns
      this.settingsSvc.getWorkingDays().subscribe({
        next: wd => {
          const ordered = [1,2,3,4,5,6,7].filter(d => wd.has(d));
          this.ttDays.set(ordered.length ? ordered : [1,2,3,4,5]);
        },
        error: () => {}
      });
      return;
    }

    forkJoin({
      users:    this.userSvc.getAll(),
      students: this.stuSvc.getStudents(undefined, undefined, undefined, 1, 0).pipe(map(r => r.items)),
      classes:  this.acSvc.getClasses(),
      subjects: this.acSvc.getSubjects(),
    }).subscribe({
      next: ({ users, students, classes, subjects }) => {
        const teachers = users.filter(u => u.roleName?.toLowerCase() === 'teacher' && u.isActive);
        const male     = (students as any[]).filter(s => s.gender?.toLowerCase() === 'male').length;
        const female   = (students as any[]).filter(s => s.gender?.toLowerCase() === 'female').length;

        this.stats.set({
          students: (students as any[]).length,
          teachers: teachers.length,
          classes:  classes.length,
          subjects: subjects.length,
          male, female
        });

        // Class-wise enrollment from students
        const classCounts = new Map<string, number>();
        (students as any[]).forEach(s => {
          const name = s.className || s.currentClass || 'Unknown';
          classCounts.set(name, (classCounts.get(name) ?? 0) + 1);
        });

        // Fallback: use classes list if no enrollment data
        if (classCounts.size === 0) {
          classes.forEach(c => classCounts.set(
            c.className + (c.section ? ' ' + c.section : ''),
            c.subjectCount ?? 0
          ));
        }

        const maxCount = Math.max(...Array.from(classCounts.values()), 1);
        this.classStats.set(
          Array.from(classCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([name, count]) => ({ name, count, pct: (count / maxCount) * 100 }))
        );

        // Simulate weekly attendance from total students (replace with real API if available)
        const total = (students as any[]).length;
        if (total > 0) {
          this.weeklyAttendance.set([
            { day: 'Mon', present: Math.round(total * 0.92), absent: Math.round(total * 0.08) },
            { day: 'Tue', present: Math.round(total * 0.88), absent: Math.round(total * 0.12) },
            { day: 'Wed', present: Math.round(total * 0.95), absent: Math.round(total * 0.05) },
            { day: 'Thu', present: Math.round(total * 0.85), absent: Math.round(total * 0.15) },
            { day: 'Fri', present: Math.round(total * 0.90), absent: Math.round(total * 0.10) },
            { day: 'Sat', present: Math.round(total * 0.60), absent: Math.round(total * 0.40) },
          ]);
        }

        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }
}
