import { Component, inject, OnInit, signal } from '@angular/core';
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
    <app-page-header title="Class Timetable" subtitle="Weekly schedule overview" />

    <div class="filters card">
      <div class="filter-group">
        <label>Class</label>
        <div class="sel-inner">
          <select [(ngModel)]="selectedClass" (change)="load()">
            <option [ngValue]="null">Select class…</option>
            @for (c of classes(); track c.classId) {
              <option [ngValue]="c.classId">{{ c.className }}{{ c.section ? ' – ' + c.section : '' }}</option>
            }
          </select>
          <span class="sel-arrow">⌄</span>
        </div>
      </div>
      @if (entries().length > 0) {
        <button class="btn-print" (click)="printTimetable()">🖨 Print</button>
      }
    </div>

    @if (loading()) { <app-loading /> }
    @else if (!selectedClass) {
      <app-empty-state message="Select a class to view its timetable." icon="🗓️" />
    } @else if (periodSlots().length === 0) {
      <app-empty-state message="No timetable entries for this class yet." icon="🗓️" />
    } @else {
      <div class="grid-card card" id="print-area">
        <table class="tt-table">
          <thead>
            <tr>
              <th class="period-th">Period</th>
              <th class="time-th">Time</th>
              @for (d of days(); track d) {
                <th class="day-th">{{ dayNames[d] }}</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (slot of periodSlots(); track slot.periodNo) {
              <tr [class.break-row]="slot.isBreak">
                <td class="period-td">
                  @if (!slot.isBreak) {
                    <span class="pno">{{ slot.periodNo }}</span>
                    <span class="plabel">Period</span>
                  } @else {
                    <span class="break-icon">☕</span>
                  }
                </td>
                <td class="time-td">
                  {{ slot.startTime }} – {{ slot.endTime }}
                  @if (slot.isBreak) { <span class="break-badge">Break</span> }
                </td>
                @for (d of days(); track d) {
                  @let entry = getEntry(slot.periodNo, d, slot.isBreak);
                  @if (slot.isBreak) {
                    <td class="break-slot"><span class="br-label">Break</span></td>
                  } @else if (entry) {
                    <td class="entry-cell">
                      <div class="entry-wrap">
                        <div class="e-subject">{{ entry.subjectName }}</div>
                        <div class="e-teacher">{{ entry.teacherName }}</div>
                      </div>
                    </td>
                  } @else {
                    <td class="free-cell"><span class="free-label">Free</span></td>
                  }
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: [`
    .filters { display:flex; gap:14px; flex-wrap:wrap; align-items:flex-end; padding:16px 20px; margin-bottom:16px; }
    .filter-group { display:flex; flex-direction:column; gap:5px; }
    .filter-group label { font-size:10.5px; font-weight:700; color:var(--t3); text-transform:uppercase; letter-spacing:.6px; }
    .sel-inner { position:relative; display:flex; align-items:center; }
    .sel-inner select {
      appearance:none; -webkit-appearance:none;
      padding:9px 36px 9px 13px;
      border:1.5px solid var(--border);
      border-radius:var(--r);
      font-size:13.5px; font-family:inherit;
      background:var(--surface); color:var(--t1);
      min-width:200px; cursor:pointer;
      transition:border-color .15s, box-shadow .15s;
      box-shadow:var(--sh-xs);
    }
    .sel-inner select:hover { border-color:var(--border-2); }
    .sel-inner select:focus { outline:none; border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-g); }
    .sel-arrow { pointer-events:none; position:absolute; right:11px; color:var(--t4); font-size:16px; line-height:1; transition:color .15s; }
    .sel-inner:focus-within .sel-arrow { color:var(--accent); }
    .btn-print { align-self:flex-end; padding:7px 16px; background:var(--accent); color:#fff; border:none; border-radius:6px; font-size:13px; font-weight:600; cursor:pointer; }
    .btn-print:hover { background:#4f46e5; }

    .grid-card { padding:0; overflow-x:auto; }
    .tt-table { width:100%; border-collapse:collapse; min-width:600px; }

    th { padding:10px 12px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.4px; text-align:left; background:var(--accent); color:#fff; white-space:nowrap; }
    th.period-th { width:80px; text-align:center; }
    th.time-th   { width:120px; }
    th.day-th    { min-width:140px; }

    td { border-bottom:1px solid var(--border); vertical-align:middle; }
    tr:last-child td { border-bottom:none; }

    .break-row { background:#fffbeb; }

    .period-td { padding:10px 8px; text-align:center; background:var(--surface2,#f8fafc); }
    .pno   { display:block; font-size:20px; font-weight:800; color:var(--accent); line-height:1; }
    .plabel { display:block; font-size:10px; color:var(--t4); }
    .break-icon { font-size:18px; }

    .time-td { padding:10px 12px; font-size:12px; color:var(--t2); white-space:nowrap; background:var(--surface2,#f8fafc); }
    .break-badge { display:inline-block; margin-left:6px; background:#fde68a; color:#92400e; font-size:10px; font-weight:700; padding:1px 7px; border-radius:8px; }

    .break-slot { padding:10px 12px; text-align:center; }
    .br-label { background:#fde68a; color:#92400e; font-size:11px; font-weight:600; padding:3px 12px; border-radius:10px; }

    .entry-cell { padding:8px 10px; background:#f0fdf4; }
    .entry-wrap { border-left:3px solid var(--accent); padding-left:8px; }
    .e-subject { font-size:13px; font-weight:700; color:var(--t1); }
    .e-teacher { font-size:11px; color:var(--t3); margin-top:2px; }

    .free-cell { padding:10px 12px; text-align:center; }
    .free-label { font-size:11px; color:var(--border); }

    @media print {
      .filters { display:none; }
      .grid-card { box-shadow:none; border:1px solid #e2e8f0; }
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

  ngOnInit() {
    this.ttSvc.getPeriods().subscribe(p => this.allPeriods.set(
      p.sort((a, b) => a.startTime.localeCompare(b.startTime))
    ));
    this.academicSvc.getClasses().subscribe(c => this.classes.set(c));
    // Load working days from active profile — same as timetable builder
    this.settingsSvc.getWorkingDays().subscribe(wd => {
      const ordered = [1, 2, 3, 4, 5, 6, 7].filter(d => wd.has(d));
      this.days.set(ordered.length ? ordered : [1, 2, 3, 4, 5]);
    });
  }

  load() {
    if (!this.selectedClass) { this.entries.set([]); return; }
    this.loading.set(true);
    this.ttSvc.getForClass(this.selectedClass).subscribe({
      next: e => { this.entries.set(e); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
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
