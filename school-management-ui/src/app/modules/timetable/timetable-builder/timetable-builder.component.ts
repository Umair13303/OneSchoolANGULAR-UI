import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { TimetableService } from '../../../core/services/timetable.service';
import { AcademicService } from '../../../core/services/academic.service';
import { SettingsService } from '../../../core/services/settings.service';
import { UserService } from '../../../core/services/user.service';
import { TimetableEntryDto, PeriodDto, DAY_NAMES } from '../../../core/models/timetable.model';
import { ClassDto, ClassSubjectDto } from '../../../core/models/academic.model';
import { UserListDto } from '../../../core/models/user.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';

const DEFAULT_DAYS = [1, 2, 3, 4, 5];

interface CellKey { periodId: number; day: number; }

interface CellState {
  timetableId: number | null;
  subjectId:   number | null;
  teacherId:   number | null;
  subjectName: string;
  teacherName: string;
}

@Component({
  selector: 'app-timetable-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, LoadingComponent],
  template: `
    <app-page-header title="Timetable"
      [subtitle]="activeProfileName() ? 'Schedule: ' + activeProfileName() + ' · Assign subjects & teachers to each period' : 'Assign subjects & teachers to each period'" />

    <!-- ── Top bar ── -->
    <div class="topbar card">
      <div class="tb-selects">
        <div class="sel-wrap">
          <span class="sel-label">Class</span>
          <div class="sel-inner">
            <select [(ngModel)]="selectedClass" (change)="onClassChange()">
              <option [ngValue]="null">Select class…</option>
              @for (c of classes(); track c.classId) {
                <option [ngValue]="c.classId">{{ c.className }}{{ c.section ? ' · ' + c.section : '' }}</option>
              }
            </select>
            <span class="sel-arrow">⌄</span>
          </div>
        </div>
      </div>

      @if (selectedClass) {
        <div class="tb-stats">
          <div class="stat-chip filled-chip">
            <span class="stat-num">{{ filledCount() }}</span>
            <span class="stat-lbl">Assigned</span>
          </div>
          <div class="stat-chip empty-chip">
            <span class="stat-num">{{ emptyCount() }}</span>
            <span class="stat-lbl">Empty</span>
          </div>
          <div class="stat-chip pct-chip">
            <span class="stat-num">{{ pct() }}%</span>
            <span class="stat-lbl">Complete</span>
          </div>
          @if (hasMondaySchedule()) {
            <button class="copy-day-btn" [disabled]="copying()" (click)="copyMondayToAllDays()">
              {{ copying() ? 'Copying…' : '⚡ Copy Mon → All Days' }}
            </button>
          }
        </div>
      }
    </div>

    @if (loadingGrid()) { <app-loading /> }
    @else if (!selectedClass) {
      <div class="splash">
        <div class="splash-icon">🗓️</div>
        <div class="splash-title">Select a class to build its timetable</div>
        <div class="splash-sub">Pick an academic year and class above.</div>
      </div>
    } @else if (classSubjects().length === 0) {
      <div class="splash">
        <div class="splash-icon">📚</div>
        <div class="splash-title">No subjects assigned to this class</div>
        <div class="splash-sub">Go to Academics → Classes to assign subjects first.</div>
      </div>
    } @else if (periods().length === 0) {
      <div class="splash">
        <div class="splash-icon">⏰</div>
        <div class="splash-title">No periods configured</div>
        <div class="splash-sub">Go to Settings → Schedule to set up periods.</div>
      </div>
    } @else {

      <!-- ── Grid ── -->
      <div class="grid-card card">
        <div class="grid-scroll">
          <table class="tt">
            <thead>
              <tr>
                <th class="th-period">Period</th>
                <th class="th-time">Time</th>
                @for (d of days(); track d) {
                  <th class="th-day">{{ dayNames[d] }}</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (p of periods(); track p.periodId) {
                <tr [class.row-break]="p.isBreak">

                  <!-- Period label -->
                  <td class="td-period">
                    @if (!p.isBreak) {
                      <span class="p-num">{{ p.periodNo }}</span>
                      <span class="p-lbl">Period</span>
                    } @else {
                      <span class="p-break-icon">☕</span>
                    }
                  </td>

                  <!-- Time -->
                  <td class="td-time">
                    <span class="t-range">{{ p.startTime }} – {{ p.endTime }}</span>
                    <span class="t-dur">{{ durationMin(p) }} min</span>
                  </td>

                  <!-- Day cells -->
                  @for (d of days(); track d) {
                    @if (p.isBreak) {
                      @if (dayHasPeriod(p.periodId, d)) {
                        <td class="td-break"><div class="break-pill">Break</div></td>
                      } @else {
                        <td class="td-na"><div class="na-dash">—</div></td>
                      }
                    } @else {
                      @if (!dayHasPeriod(p.periodId, d)) {
                        <td class="td-na"><div class="na-dash">—</div></td>
                      } @else {
                        @let cell = getCell(p.periodId, d);
                        @let isActive = isEditing(p.periodId, d);

                        <td class="td-slot"
                            [class.td-filled]="cell.timetableId"
                            [class.td-editing]="isActive"
                            (click)="openEdit(p.periodId, d, $event)">

                          @if (!isActive) {
                            <!-- Read view -->
                            @if (cell.timetableId) {
                              <div class="slot-assigned">
                                <span class="slot-subject">{{ cell.subjectName }}</span>
                                <span class="slot-teacher">{{ cell.teacherName }}</span>
                                <button class="slot-remove" (click)="deleteCell(cell, $event)" title="Remove">✕</button>
                              </div>
                            } @else {
                              <div class="slot-empty">
                                <span class="plus-icon">＋</span>
                                <span class="add-label">Assign</span>
                              </div>
                            }
                          } @else {
                            <!-- Edit panel (inline) -->
                            <div class="edit-panel" (click)="$event.stopPropagation()">
                              <div class="ep-row">
                                <label class="ep-label">Subject</label>
                                <select class="ep-select" [(ngModel)]="editSubjectId" (change)="onEditSubjectChange()">
                                  <option [ngValue]="null">— choose —</option>
                                  @for (s of classSubjects(); track s.id) {
                                    <option [ngValue]="s.subjectId">{{ s.subjectName }}</option>
                                  }
                                </select>
                              </div>
                              @if (editSubjectId) {
                                <div class="ep-row">
                                  <label class="ep-label">
                                    Teacher
                                    @if (assignedTeacher()) {
                                      <span class="ep-assigned-hint">· {{ assignedTeacher()!.fullName }} assigned</span>
                                    }
                                  </label>
                                  <select class="ep-select" [(ngModel)]="editTeacherId">
                                    <option [ngValue]="null">— choose teacher —</option>
                                    @if (assignedTeacher()) {
                                      <option [ngValue]="assignedTeacher()!.userId">⭐ {{ assignedTeacher()!.fullName }} (assigned)</option>
                                    }
                                    @for (t of otherTeachers(); track t.userId) {
                                      <option [ngValue]="t.userId">{{ t.fullName }}</option>
                                    }
                                  </select>
                                </div>
                              }
                              <div class="ep-actions">
                                <button class="ep-cancel" (click)="closeEdit()">Cancel</button>
                                <button class="ep-save"
                                  [disabled]="!editSubjectId || !editTeacherId || saving()"
                                  (click)="commitEdit(p.periodId, d)">
                                  {{ saving() ? 'Saving…' : cell.timetableId ? 'Update' : 'Assign' }}
                                </button>
                              </div>
                            </div>
                          }
                        </td>
                      }
                    }
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    }
  `,
  styles: [`
    /* ── Top bar ── */
    .topbar { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; padding:16px 20px; margin-bottom:16px; }
    .tb-selects { display:flex; gap:14px; flex-wrap:wrap; align-items:flex-end; }
    .sel-wrap { display:flex; flex-direction:column; gap:5px; }
    .sel-label { font-size:10.5px; font-weight:700; color:var(--t3); text-transform:uppercase; letter-spacing:.6px; }
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
    .sel-inner select:disabled { opacity:.5; cursor:not-allowed; }
    .sel-arrow {
      pointer-events:none; position:absolute; right:11px;
      color:var(--t4); font-size:16px; line-height:1;
      transition:color .15s;
    }
    .sel-inner:focus-within .sel-arrow { color:var(--accent); }

    /* Stats chips */
    .tb-stats { display:flex; gap:10px; }
    .stat-chip { display:flex; flex-direction:column; align-items:center; padding:8px 16px; border-radius:10px; min-width:64px; }
    .stat-num { font-size:20px; font-weight:800; line-height:1; }
    .stat-lbl { font-size:10px; font-weight:600; margin-top:2px; text-transform:uppercase; letter-spacing:.4px; }
    .filled-chip { background:#dcfce7; color:#166534; }
    .empty-chip  { background:#f1f5f9; color:#64748b; }
    .pct-chip    { background:#ede9fe; color:#5b21b6; }

    /* Copy button */
    .copy-day-btn { padding:8px 16px; background:var(--accent); color:#fff; border:none; border-radius:10px; font-size:12px; font-weight:700; cursor:pointer; white-space:nowrap; transition:background .15s; }
    .copy-day-btn:hover:not(:disabled) { background:#4f46e5; }
    .copy-day-btn:disabled { opacity:.55; cursor:not-allowed; }

    /* Splash */
    .splash { text-align:center; padding:72px 24px; }
    .splash-icon { font-size:52px; margin-bottom:14px; }
    .splash-title { font-size:18px; font-weight:700; color:var(--t1); margin-bottom:6px; }
    .splash-sub { font-size:13px; color:var(--t3); }

    /* Grid */
    .grid-card { padding:0; overflow:hidden; }
    .grid-scroll { overflow-x:auto; }
    .tt { width:100%; border-collapse:collapse; min-width:720px; }

    /* Header */
    th { padding:11px 14px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; text-align:left; white-space:nowrap; }
    .th-period { background:#1e293b; color:#fff; width:80px; text-align:center; }
    .th-time   { background:#1e293b; color:#fff; width:108px; }
    .th-day    { background:var(--accent); color:#fff; min-width:170px; border-left:1px solid rgba(255,255,255,.15); }

    /* Rows */
    td { border-bottom:1px solid var(--border); border-left:1px solid var(--border); vertical-align:top; padding:0; }
    tr:last-child td { border-bottom:none; }
    .row-break td { background:#fffbeb; }

    /* Period cell */
    .td-period { background:#f8fafc; text-align:center; padding:14px 8px; vertical-align:middle; border-left:none; border-right:1px solid var(--border); }
    .p-num { display:block; font-size:22px; font-weight:800; color:var(--accent); line-height:1; }
    .p-lbl { display:block; font-size:10px; color:var(--t4); font-weight:600; letter-spacing:.3px; margin-top:1px; }
    .p-break-icon { font-size:20px; }

    /* Time cell */
    .td-time { background:#f8fafc; padding:12px 14px; vertical-align:middle; border-right:1px solid var(--border); }
    .t-range { display:block; font-size:12px; font-weight:600; color:var(--t2); white-space:nowrap; }
    .t-dur   { display:block; font-size:10px; color:var(--t4); margin-top:2px; }

    /* Break cell */
    .td-break { text-align:center; padding:14px; vertical-align:middle; }
    .break-pill { display:inline-block; background:#fde68a; color:#92400e; font-size:11px; font-weight:700; padding:3px 14px; border-radius:20px; letter-spacing:.3px; }

    /* Slot cell */
    .td-slot { padding:10px 12px; cursor:pointer; transition:background .12s; vertical-align:middle; position:relative; }
    .td-slot:hover { background:#f0f4ff; }
    .td-slot.td-filled { background:#f0fdf4; }
    .td-slot.td-editing { background:#fff; cursor:default; padding:10px; }
    .td-slot.td-filled:hover { background:#dcfce7; }

    /* Assigned state */
    .slot-assigned { display:flex; align-items:flex-start; gap:6px; }
    .slot-subject { flex:1; font-size:13px; font-weight:700; color:var(--t1); line-height:1.3; }
    .slot-teacher { display:block; font-size:11px; color:var(--t3); margin-top:3px; }
    .slot-assigned { flex-direction:column; }
    .slot-assigned > .slot-subject { display:block; }
    .slot-remove { position:absolute; top:7px; right:7px; background:none; border:none; color:#cbd5e1; font-size:13px; cursor:pointer; padding:2px 4px; border-radius:4px; line-height:1; }
    .slot-remove:hover { background:#fee2e2; color:#ef4444; }

    /* Empty state */
    .slot-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:10px 0; opacity:.35; transition:opacity .12s; }
    .td-slot:hover .slot-empty { opacity:.7; }
    .plus-icon { font-size:20px; color:var(--accent); line-height:1; }
    .add-label { font-size:10px; font-weight:700; color:var(--accent); margin-top:2px; letter-spacing:.3px; text-transform:uppercase; }

    /* N/A cell — period doesn't exist for this day */
    .td-na { background:#f8fafc; text-align:center; vertical-align:middle; padding:14px; cursor:default; }
    .na-dash { color:#cbd5e1; font-size:18px; font-weight:300; user-select:none; }

    /* Edit panel */
    .edit-panel { display:flex; flex-direction:column; gap:8px; }
    .ep-row { display:flex; flex-direction:column; gap:3px; }
    .ep-label { font-size:10px; font-weight:700; color:var(--t3); text-transform:uppercase; letter-spacing:.4px; display:flex; align-items:center; gap:4px; flex-wrap:wrap; }
    .ep-assigned-hint { font-size:9px; font-weight:600; color:var(--accent); text-transform:none; letter-spacing:0; }
    .ep-select { appearance:none; -webkit-appearance:none; width:100%; padding:6px 28px 6px 8px; border:1.5px solid var(--accent); border-radius:6px; font-size:12px; background:var(--surface); color:var(--t1); cursor:pointer; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2394a3b8' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 8px center; }
    .ep-select:focus { outline:none; box-shadow:0 0 0 2px var(--accent-g); }
    .ep-actions { display:flex; gap:6px; margin-top:2px; }
    .ep-cancel { flex:1; padding:5px; background:transparent; border:1px solid var(--border); border-radius:6px; font-size:11px; font-weight:600; color:var(--t3); cursor:pointer; }
    .ep-cancel:hover { background:var(--surface2,#f8fafc); }
    .ep-save { flex:2; padding:5px; background:var(--accent); border:none; border-radius:6px; font-size:11px; font-weight:700; color:#fff; cursor:pointer; }
    .ep-save:hover:not(:disabled) { background:#4f46e5; }
    .ep-save:disabled { opacity:.5; cursor:not-allowed; }
  `]
})
export class TimetableBuilderComponent implements OnInit {
  private ttSvc       = inject(TimetableService);
  private academicSvc = inject(AcademicService);
  private settingsSvc = inject(SettingsService);
  private userSvc     = inject(UserService);

  days      = signal<number[]>(DEFAULT_DAYS);
  readonly dayNames = DAY_NAMES;

  classes           = signal<ClassDto[]>([]);
  periods           = signal<PeriodDto[]>([]);
  classSubjects     = signal<ClassSubjectDto[]>([]);
  entries           = signal<TimetableEntryDto[]>([]);
  allTeachers       = signal<UserListDto[]>([]);
  activeProfileName   = signal<string>('');
  // Map of day → set of periodIds that exist for that day
  periodsPerDay       = signal<Record<number, Set<number>>>({});
  loadingGrid         = signal(false);
  saving            = signal(false);
  copying           = signal(false);

  selectedClass:   number | null = null;
  activeYearId:    number | null = null;

  // Active edit
  editKey:       CellKey | null = null;
  editSubjectId: number | null = null;
  editTeacherId: number | null = null;

  // Teacher assigned to this subject in class-subjects (the "concerned" teacher)
  assignedTeacher = computed(() => {
    if (!this.editSubjectId) return null;
    const cs = this.classSubjects().find(s => s.subjectId === this.editSubjectId && s.teacherId && s.teacherId !== 0);
    if (!cs) return null;
    return this.allTeachers().find(t => t.userId === cs.teacherId) ?? null;
  });

  // True when at least one Monday slot is filled
  hasMondaySchedule = computed(() => {
    this.entries();
    return this.periods().filter(p => !p.isBreak).some(p => this.cells.get(this.key(p.periodId, 1))?.timetableId);
  });

  // All other teachers (excluding the assigned one to avoid duplicates)
  otherTeachers = computed(() => {
    const assigned = this.assignedTeacher();
    return this.allTeachers().filter(t => t.userId !== assigned?.userId);
  });

  // Cell map
  private cells = new Map<string, CellState>();

  // Total assignable slots = only periods that exist for each day
  private assignableSlots = computed(() => {
    this.periodsPerDay(); // reactive dependency
    const nonBreak = this.periods().filter(p => !p.isBreak);
    return this.days().reduce((sum, d) => sum + nonBreak.filter(p => this.dayHasPeriod(p.periodId, d)).length, 0);
  });

  filledCount = computed(() => {
    this.entries();
    const nonBreak = this.periods().filter(p => !p.isBreak);
    let count = 0;
    for (const d of this.days()) {
      for (const p of nonBreak) {
        if (!this.dayHasPeriod(p.periodId, d)) continue;
        const cell = this.cells.get(this.key(p.periodId, d));
        if (cell?.timetableId) count++;
      }
    }
    return count;
  });
  emptyCount = computed(() => {
    this.entries();
    return this.assignableSlots() - this.filledCount();
  });
  pct = computed(() => {
    const total = this.assignableSlots();
    return total ? Math.round(this.filledCount() / total * 100) : 0;
  });

  ngOnInit() {
    // Load classes, teachers and active year in parallel
    forkJoin({
      classes:  this.academicSvc.getClasses(),
      teachers: this.userSvc.getAll(),
      years:    this.academicSvc.getYears(),
    }).subscribe(({ classes, teachers, years }) => {
      this.classes.set(classes);
      this.allTeachers.set(teachers.filter(u => u.roleName?.toLowerCase() === 'teacher' && u.isActive));
      const active = years.find(y => y.isActive) ?? years[0];
      if (active) this.activeYearId = active.academicYearId;
    });

    // Load working days from active profile and update day columns
    this.settingsSvc.getWorkingDays().subscribe(wd => {
      const ordered = [1,2,3,4,5,6,7].filter(d => wd.has(d));
      this.days.set(ordered.length ? ordered : DEFAULT_DAYS);
    });

    // Sync Periods table from the active profile first (ensures periodId FK rows
    // exactly match the profile's periods with correct isBreak flags), then load
    // the synced periods directly from DB — no client-side merging needed.
    this.settingsSvc.getProfiles().pipe(
      switchMap(profiles => {
        const active = profiles.find(p => p.isActive) ?? profiles[0];
        if (active) this.activeProfileName.set(active.name);
        return this.settingsSvc.syncPeriodsFromActiveProfile();
      }),
      switchMap(() => this.ttSvc.getPeriods())
    ).subscribe(periods => this.periods.set(periods));

    this.settingsSvc.getActivePeriodsPerDay().subscribe(map => {
      const result: Record<number, Set<number>> = {};
      for (const [day, slots] of Object.entries(map)) {
        result[+day] = new Set((slots as any[]).filter(s => s.periodId).map((s: any) => s.periodId as number));
      }
      this.periodsPerDay.set(result);
    });
  }

  onClassChange() {
    this.cells.clear(); this.entries.set([]); this.classSubjects.set([]); this.closeEdit();
    if (!this.selectedClass) return;
    this.academicSvc.getClassSubjects(this.selectedClass).subscribe(s =>
      this.classSubjects.set(s.filter(x => x.isActive))
    );
    this.loadGrid();
  }

  private loadGrid() {
    if (!this.selectedClass) return;
    this.loadingGrid.set(true);
    this.ttSvc.getForClass(this.selectedClass).subscribe({
      next: entries => {
        this.entries.set(entries);
        this.cells.clear();
        for (const e of entries) {
          this.cells.set(this.key(e.periodId, e.dayOfWeek), {
            timetableId: e.timetableId, subjectId: e.subjectId, teacherId: e.teacherId,
            subjectName: e.subjectName, teacherName: e.teacherName
          });
        }
        this.loadingGrid.set(false);
      },
      error: () => this.loadingGrid.set(false)
    });
  }

  getCell(periodId: number, day: number): CellState {
    const k = this.key(periodId, day);
    if (!this.cells.has(k))
      this.cells.set(k, { timetableId: null, subjectId: null, teacherId: null, subjectName: '', teacherName: '' });
    return this.cells.get(k)!;
  }

  isEditing(periodId: number, day: number) {
    return this.editKey?.periodId === periodId && this.editKey?.day === day;
  }

  openEdit(periodId: number, day: number, event: Event) {
    event.stopPropagation();
    const cell = this.getCell(periodId, day);
    this.editKey = { periodId, day };
    this.editSubjectId = cell.subjectId;
    this.editTeacherId = cell.teacherId;
  }

  onEditSubjectChange() {
    // Auto-select the teacher assigned to this subject; user can override
    const assigned = this.assignedTeacher();
    this.editTeacherId = assigned ? assigned.userId : null;
  }

  closeEdit() { this.editKey = null; this.editSubjectId = null; this.editTeacherId = null; }

  commitEdit(periodId: number, day: number) {
    if (!this.editSubjectId || !this.editTeacherId) return;
    const cell = this.getCell(periodId, day);
    this.saving.set(true);

    const dto = {
      classId: this.selectedClass!, subjectId: this.editSubjectId,
      teacherId: this.editTeacherId, periodId, dayOfWeek: day,
      academicYearId: this.activeYearId
    };

    const subjectName = this.classSubjects().find(s => s.subjectId === this.editSubjectId)?.subjectName ?? '';
    const teacherName = this.allTeachers().find(t => t.userId === this.editTeacherId)?.fullName ?? '';

    const finish = (id: number) => {
      cell.timetableId = id; cell.subjectId = this.editSubjectId;
      cell.teacherId = this.editTeacherId; cell.subjectName = subjectName; cell.teacherName = teacherName;
      this.saving.set(false); this.closeEdit();
      this.entries.update(e => [...e.filter(x => x.timetableId !== id)]);
    };

    if (cell.timetableId) {
      this.ttSvc.update(cell.timetableId, dto).subscribe({
        next: () => finish(cell.timetableId!),
        error: (e) => { this.saving.set(false); alert(e?.error?.error ?? 'Failed to save.'); }
      });
    } else {
      this.ttSvc.create(dto).subscribe({
        next: (created) => { this.entries.update(e => [...e, created]); finish(created.timetableId); },
        error: (e) => { this.saving.set(false); alert(e?.error?.error ?? 'Failed to save.'); }
      });
    }
  }

  deleteCell(cell: CellState, event: Event) {
    event.stopPropagation();
    if (!cell.timetableId || !confirm('Remove this assignment?')) return;
    const id = cell.timetableId;
    this.ttSvc.delete(id).subscribe({
      next: () => {
        cell.timetableId = null; cell.subjectId = null; cell.teacherId = null;
        cell.subjectName = ''; cell.teacherName = '';
        this.entries.update(e => e.filter(x => x.timetableId !== id));
      },
      error: (e) => alert(e?.error?.error ?? 'Failed to delete.')
    });
  }

  copyMondayToAllDays() {
    const nonBreakPeriods = this.periods().filter(p => !p.isBreak);
    const otherDays = this.days().filter(d => d !== 1);

    // Build list of saves needed
    const ppd = this.periodsPerDay();
    const tasks: { periodId: number; day: number; subjectId: number; teacherId: number }[] = [];
    for (const p of nonBreakPeriods) {
      const src = this.cells.get(this.key(p.periodId, 1));
      if (!src?.timetableId || !src.subjectId || !src.teacherId) continue;
      for (const d of otherDays) {
        // Skip if this period doesn't exist on the target day
        const daySet = ppd[d];
        if (!daySet || !daySet.has(p.periodId)) continue;
        tasks.push({ periodId: p.periodId, day: d, subjectId: src.subjectId, teacherId: src.teacherId });
      }
    }

    if (!tasks.length) return;
    this.copying.set(true);
    this.closeEdit();

    let done = 0;
    const finish = () => { if (++done === tasks.length) { this.copying.set(false); this.loadGrid(); } };

    for (const t of tasks) {
      const cell = this.getCell(t.periodId, t.day);
      const subjectName = this.classSubjects().find(s => s.subjectId === t.subjectId)?.subjectName ?? '';
      const teacherName = this.allTeachers().find(u => u.userId === t.teacherId)?.fullName ?? '';
      const dto = { classId: this.selectedClass!, subjectId: t.subjectId, teacherId: t.teacherId,
                    periodId: t.periodId, dayOfWeek: t.day, academicYearId: this.activeYearId };

      if (cell.timetableId) {
        this.ttSvc.update(cell.timetableId, dto).subscribe({ next: finish, error: finish });
      } else {
        this.ttSvc.create(dto).subscribe({
          next: (created) => {
            cell.timetableId = created.timetableId; cell.subjectId = t.subjectId;
            cell.teacherId = t.teacherId; cell.subjectName = subjectName; cell.teacherName = teacherName;
            finish();
          },
          error: finish
        });
      }
    }
  }

  durationMin(p: PeriodDto): number {
    const [sh, sm] = p.startTime.split(':').map(Number);
    const [eh, em] = p.endTime.split(':').map(Number);
    return (eh * 60 + em) - (sh * 60 + sm);
  }

  dayHasPeriod(periodId: number, day: number): boolean {
    const ppd = this.periodsPerDay();
    if (!ppd[day]) return true; // map not loaded yet — show all
    return ppd[day].has(periodId);
  }

  private key(periodId: number, day: number) { return `${periodId}_${day}`; }
}
