import { Component, inject, OnInit, signal } from '@angular/core';
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
          <span class="stat-pill-val">{{ totalPeriods() }}</span>
          <span class="stat-pill-lbl">Periods / Week</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-pill">
          <span class="material-icons-round stat-pill-icon">meeting_room</span>
          <span class="stat-pill-val">{{ uniqueClasses() }}</span>
          <span class="stat-pill-lbl">Classes</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-pill">
          <span class="material-icons-round stat-pill-icon">menu_book</span>
          <span class="stat-pill-val">{{ uniqueSubjects() }}</span>
          <span class="stat-pill-lbl">Subjects</span>
        </div>
      </div>
    }

    @if (loading()) { <app-loading /> }
    @else if (dayMap().size === 0) {
      <div class="placeholder">
        <div class="ph-icon">📋</div>
        <div class="ph-title">No timetable assigned yet</div>
        <div class="ph-sub">Contact the admin to have your schedule set up.</div>
      </div>
    } @else {

      <!-- Weekly grid: periods as rows, days as columns -->
      <div class="grid-card card">
        <table class="tt-table">
          <thead>
            <tr>
              <th class="period-th">Period</th>
              <th class="time-th">Time</th>
              @for (d of days(); track d) {
                <th class="day-th" [class.has-entries]="dayMap().has(d)">
                  {{ dayNames[d] }}
                  @if (dayMap().has(d)) {
                    <span class="day-count">{{ dayMap().get(d)!.length }} class{{ dayMap().get(d)!.length !== 1 ? 'es' : '' }}</span>
                  }
                </th>
              }
            </tr>
          </thead>
          <tbody>
            @for (slot of periodSlots(); track slot.periodNo) {
              <tr>
                <td class="period-td">
                  <span class="pno">{{ slot.periodNo }}</span>
                  <span class="plabel">Period {{ slot.periodNo }}</span>
                </td>
                <td class="time-td">{{ fmt(slot.startTime) }} – {{ fmt(slot.endTime) }}</td>
                @for (d of days(); track d) {
                  @let entry = getEntry(slot.periodNo, d);
                  @if (entry) {
                    <td class="entry-cell">
                      <div class="entry-card">
                        <div class="entry-subject">{{ entry.subjectName }}</div>
                        <div class="entry-class">{{ entry.className }}{{ entry.section ? ' – ' + entry.section : '' }}</div>
                        <div class="entry-time">{{ fmt(entry.startTime) }} – {{ fmt(entry.endTime) }}</div>
                      </div>
                    </td>
                  } @else {
                    <td class="empty-cell"><span class="empty-dash">—</span></td>
                  }
                }
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Subject summary -->
      <div class="summary-section">
        <h3 class="summary-title">Subject Summary</h3>
        <div class="summary-grid">
          @for (item of subjectSummary(); track item.subjectName) {
            <div class="summary-card card">
              <div class="sc-subject">{{ item.subjectName }}</div>
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
    .stats-bar { display:flex; align-items:center; gap:0; padding:0; margin-bottom:18px; overflow:hidden; }
    .stat-pill { display:flex; align-items:center; gap:10px; padding:14px 24px; flex:1; }
    .stat-pill-icon { font-size:20px; color:var(--accent); font-variation-settings:'FILL' 1; }
    .stat-pill-val { font-size:22px; font-weight:800; color:var(--t1); }
    .stat-pill-lbl { font-size:11px; font-weight:600; color:var(--t4); letter-spacing:.2px; }
    .stat-divider { width:1px; height:36px; background:var(--border); flex-shrink:0; }
    @media(max-width:600px){ .stats-bar { flex-wrap:wrap; } .stat-divider { display:none; } }

    .placeholder { text-align:center; padding:64px 24px; }
    .ph-icon { font-size:48px; margin-bottom:12px; }
    .ph-title { font-size:17px; font-weight:700; color:var(--t1); margin-bottom:6px; }
    .ph-sub { font-size:13px; color:var(--t3); }

    .grid-card { padding:0; overflow-x:auto; margin-bottom:20px; }
    .tt-table { width:100%; border-collapse:collapse; min-width:650px; }

    th { padding:10px 12px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.4px; text-align:left; background:var(--accent); color:#fff; white-space:nowrap; }
    th.period-th { width:80px; }
    th.time-th   { width:110px; }
    th.day-th    { min-width:150px; }
    th.day-th.has-entries { background:#4f46e5; }
    .day-count { display:block; font-size:9px; font-weight:400; opacity:.8; margin-top:1px; text-transform:none; letter-spacing:0; }

    td { border-bottom:1px solid var(--border); vertical-align:middle; }
    tr:last-child td { border-bottom:none; }

    .period-td { padding:10px 12px; background:var(--surface2,#f8fafc); text-align:center; }
    .pno { display:block; font-size:20px; font-weight:800; color:var(--accent); line-height:1; }
    .plabel { display:block; font-size:10px; color:var(--t4); margin-top:1px; }
    .time-td { padding:10px 12px; font-size:12px; color:var(--t2); white-space:nowrap; background:var(--surface2,#f8fafc); }

    .entry-cell { padding:8px 10px; background:#f0fdf4; }
    .entry-card { border-left:3px solid var(--accent); padding-left:8px; }
    .entry-subject { font-size:13px; font-weight:700; color:var(--t1); }
    .entry-class   { font-size:11px; color:var(--accent); font-weight:600; margin-top:2px; }
    .entry-time    { font-size:10px; color:var(--t4); margin-top:2px; }

    .empty-cell { padding:12px; text-align:center; background:var(--surface); }
    .empty-dash { color:var(--border); font-size:18px; }

    .summary-section { margin-top:4px; }
    .summary-title { font-size:14px; font-weight:700; color:var(--t1); margin-bottom:12px; }
    .summary-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:12px; }
    .summary-card { padding:14px 16px; }
    .sc-subject { font-size:14px; font-weight:700; color:var(--t1); margin-bottom:6px; }
    .sc-classes { display:flex; flex-wrap:wrap; gap:5px; margin-bottom:8px; }
    .cls-chip { background:var(--accent); color:#fff; font-size:10px; font-weight:600; padding:2px 8px; border-radius:10px; }
    .sc-count { font-size:11px; color:var(--t3); }
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

  teacherName = () => this.authSvc.currentUser()?.fullName ?? '';

  ngOnInit() {
    this.settingsSvc.getWorkingDays().subscribe(wd => {
      const ordered = [1, 2, 3, 4, 5, 6, 7].filter(d => wd.has(d));
      this.days.set(ordered.length ? ordered : [1, 2, 3, 4, 5]);
    });
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
