import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { SubstitutionService, DaySlotDto } from '../../../core/services/substitution.service';
import { AcademicService } from '../../../core/services/academic.service';
import { UserService } from '../../../core/services/user.service';
import { SettingsService } from '../../../core/services/settings.service';
import { UserListDto } from '../../../core/models/user.model';
import { ClassDto } from '../../../core/models/academic.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';

const DAY_NAMES: Record<number, string> = { 1:'Monday', 2:'Tuesday', 3:'Wednesday', 4:'Thursday', 5:'Friday', 6:'Saturday', 7:'Sunday' };

@Component({
  selector: 'app-substitution',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, LoadingComponent, DatePickerComponent],
  template: `
    <app-page-header title="Teacher Substitutions"
      subtitle="Assign a substitute teacher for a specific date when the regular teacher is absent" />

    <!-- Top bar -->
    <div class="topbar card">
      <div class="tb-row">
        <div class="sel-wrap">
          <span class="sel-label">Date</span>
          <app-date-picker [(ngModel)]="selectedDate" (dateChange)="onDateChange()" />
        </div>
        <div class="sel-wrap">
          <span class="sel-label">Class (optional)</span>
          <select [(ngModel)]="selectedClass" (change)="load()">
            <option [ngValue]="null">All Classes</option>
            @for (c of classes(); track c.classId) {
              <option [ngValue]="c.classId">{{ c.className }}{{ c.section ? ' · ' + c.section : '' }}</option>
            }
          </select>
        </div>
      </div>
      @if (isOffDay()) {
        <div class="off-day-warn">
          <span class="material-icons-round">event_busy</span>
          Off day — no substitutions needed on this date
        </div>
      }
      @if (dayLabel()) {
        <div class="day-badge">{{ dayLabel() }}</div>
      }
    </div>

    @if (!selectedDate) {
      <div class="splash">
        <div class="splash-icon">📅</div>
        <div class="splash-title">Select a date to manage substitutions</div>
        <div class="splash-sub">Pick a date above to see that day's timetable slots.</div>
      </div>
    } @else if (loading()) {
      <app-loading />
    } @else if (slots().length === 0) {
      <div class="splash">
        <div class="splash-icon">🗓️</div>
        <div class="splash-title">No timetable slots found</div>
        <div class="splash-sub">No classes are scheduled for this day{{ selectedClass ? ' / class combination' : '' }}.</div>
      </div>
    } @else {
      <!-- Summary chips -->
      <div class="summary-bar">
        <div class="chip chip-total">
          <span class="chip-num">{{ slots().length }}</span>
          <span class="chip-lbl">Total Slots</span>
        </div>
        <div class="chip chip-sub">
          <span class="chip-num">{{ substitutedCount() }}</span>
          <span class="chip-lbl">Substituted</span>
        </div>
        <div class="chip chip-normal">
          <span class="chip-num">{{ slots().length - substitutedCount() }}</span>
          <span class="chip-lbl">Regular</span>
        </div>
      </div>

      <!-- Slots list -->
      <div class="slots-card card">
        @for (slot of slots(); track slot.timetableId) {
          <div class="slot-row" [class.slot-substituted]="slot.substitutionId">

            <!-- Period + time -->
            <div class="slot-period">
              <span class="period-num">{{ slot.periodNo }}</span>
              <span class="period-time">{{ slot.startTime }} – {{ slot.endTime }}</span>
            </div>

            <!-- Subject + class -->
            <div class="slot-info">
              <span class="slot-subject">{{ slot.subjectName }}</span>
              <span class="slot-class">{{ slot.className }}{{ slot.section ? ' · ' + slot.section : '' }}</span>
            </div>

            <!-- Teacher column -->
            <div class="slot-teacher">
              @if (slot.substitutionId) {
                <div class="teacher-original">
                  <span class="orig-label">Original</span>
                  <span class="orig-name strikethrough">{{ slot.originalTeacherName }}</span>
                </div>
                <div class="teacher-sub">
                  <span class="sub-label">Substitute</span>
                  <span class="sub-name">{{ slot.substituteTeacherName }}</span>
                </div>
                @if (slot.reason) {
                  <div class="reason-tag">{{ slot.reason }}</div>
                }
              } @else {
                <span class="teacher-name">{{ slot.originalTeacherName }}</span>
              }
            </div>

            <!-- Actions -->
            <div class="slot-actions">
              @if (editingSlot() === slot.timetableId) {
                <!-- Inline edit form -->
                <div class="edit-form" (click)="$event.stopPropagation()">
                  <div class="ef-row">
                    <label class="ef-label">Substitute Teacher</label>
                    <select class="ef-select" [(ngModel)]="editTeacherId">
                      <option [ngValue]="null">— select teacher —</option>
                      @for (t of otherTeachers(slot.originalTeacherId); track t.userId) {
                        <option [ngValue]="t.userId">{{ t.fullName }}</option>
                      }
                    </select>
                  </div>
                  <div class="ef-row">
                    <label class="ef-label">Reason (optional)</label>
                    <input class="ef-input" type="text" [(ngModel)]="editReason" placeholder="e.g. Sick leave" />
                  </div>
                  <div class="ef-actions">
                    <button class="ef-cancel" (click)="cancelEdit()">Cancel</button>
                    <button class="ef-save" [disabled]="!editTeacherId || saving()"
                      (click)="saveSubstitution(slot)">
                      {{ saving() ? 'Saving…' : slot.substitutionId ? 'Update' : 'Assign' }}
                    </button>
                  </div>
                </div>
              } @else {
                <div class="action-btns">
                  <button class="btn-assign" (click)="startEdit(slot)">
                    {{ slot.substitutionId ? '✏️ Edit' : '+ Assign Sub' }}
                  </button>
                  @if (slot.substitutionId) {
                    <button class="btn-revert" (click)="revertSubstitution(slot)" title="Revert to original teacher">✕</button>
                  }
                </div>
              }
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .topbar { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; padding:14px 18px; margin-bottom:16px; }
    .tb-row { display:flex; gap:16px; flex-wrap:wrap; align-items:flex-end; }
    .sel-wrap { display:flex; flex-direction:column; gap:3px; }
    .sel-label { font-size:10px; font-weight:700; color:var(--t3); text-transform:uppercase; letter-spacing:.5px; }
    .date-input, select { padding:8px 12px; border:1.5px solid var(--border); border-radius:8px; font-size:13px; background:var(--surface); color:var(--t1); min-width:160px; cursor:pointer; }
    .date-input:focus, select:focus { outline:none; border-color:var(--accent); }
    .day-badge { padding:6px 16px; background:var(--accent); color:#fff; border-radius:20px; font-size:12px; font-weight:700; }
    .off-day-warn {
      display:flex; align-items:center; gap:6px;
      margin-top:12px; padding:8px 12px;
      background:#fef2f2; border:1px solid #fecaca; border-radius:8px;
      font-size:12px; font-weight:600; color:#dc2626;
    }
    .off-day-warn .material-icons-round { font-size:16px; }

    .splash { text-align:center; padding:72px 24px; }
    .splash-icon { font-size:52px; margin-bottom:14px; }
    .splash-title { font-size:18px; font-weight:700; color:var(--t1); margin-bottom:6px; }
    .splash-sub { font-size:13px; color:var(--t3); }

    .summary-bar { display:flex; gap:10px; margin-bottom:16px; flex-wrap:wrap; }
    .chip { display:flex; flex-direction:column; align-items:center; padding:10px 20px; border-radius:10px; min-width:80px; }
    .chip-num { font-size:22px; font-weight:800; line-height:1; }
    .chip-lbl { font-size:10px; font-weight:600; margin-top:2px; text-transform:uppercase; letter-spacing:.4px; }
    .chip-total  { background:#e0e7ff; color:#3730a3; }
    .chip-sub    { background:#fef3c7; color:#92400e; }
    .chip-normal { background:#dcfce7; color:#166534; }

    .slots-card { padding:0; overflow:hidden; }
    .slot-row { display:grid; grid-template-columns:90px 1fr 200px auto; align-items:center; gap:16px; padding:14px 20px; border-bottom:1px solid var(--border); transition:background .12s; }
    .slot-row:last-child { border-bottom:none; }
    .slot-row:hover { background:#f8fafc; }
    .slot-substituted { background:#fffbeb !important; }
    .slot-substituted:hover { background:#fef9c3 !important; }

    .slot-period { display:flex; flex-direction:column; align-items:center; }
    .period-num { font-size:22px; font-weight:800; color:var(--accent); line-height:1; }
    .period-time { font-size:10px; color:var(--t4); margin-top:2px; white-space:nowrap; }

    .slot-info { display:flex; flex-direction:column; gap:2px; }
    .slot-subject { font-size:14px; font-weight:700; color:var(--t1); }
    .slot-class { font-size:12px; color:var(--t3); }

    .slot-teacher { display:flex; flex-direction:column; gap:2px; }
    .teacher-name { font-size:13px; font-weight:600; color:var(--t2); }
    .teacher-original { display:flex; flex-direction:column; gap:1px; }
    .teacher-sub { display:flex; flex-direction:column; gap:1px; margin-top:4px; }
    .orig-label, .sub-label { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.4px; color:var(--t4); }
    .orig-name { font-size:12px; color:var(--t3); }
    .strikethrough { text-decoration:line-through; }
    .sub-name { font-size:13px; font-weight:700; color:#d97706; }
    .reason-tag { display:inline-block; margin-top:4px; background:#fde68a; color:#92400e; font-size:10px; font-weight:600; padding:2px 8px; border-radius:10px; }

    .slot-actions { display:flex; justify-content:flex-end; }
    .action-btns { display:flex; gap:6px; align-items:center; }
    .btn-assign { padding:6px 14px; background:var(--accent); color:#fff; border:none; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer; white-space:nowrap; }
    .btn-assign:hover { background:#4f46e5; }
    .btn-revert { padding:6px 10px; background:#fee2e2; color:#dc2626; border:none; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer; }
    .btn-revert:hover { background:#fca5a5; }

    .edit-form { display:flex; flex-direction:column; gap:8px; min-width:260px; padding:10px; background:#fff; border:1.5px solid var(--accent); border-radius:10px; }
    .ef-row { display:flex; flex-direction:column; gap:3px; }
    .ef-label { font-size:10px; font-weight:700; color:var(--t3); text-transform:uppercase; letter-spacing:.4px; }
    .ef-select, .ef-input { padding:6px 10px; border:1.5px solid var(--border); border-radius:6px; font-size:12px; background:#fff; color:var(--t1); }
    .ef-select:focus, .ef-input:focus { outline:none; border-color:var(--accent); }
    .ef-actions { display:flex; gap:6px; }
    .ef-cancel { flex:1; padding:5px; background:transparent; border:1px solid var(--border); border-radius:6px; font-size:11px; font-weight:600; color:var(--t3); cursor:pointer; }
    .ef-save { flex:2; padding:5px; background:var(--accent); border:none; border-radius:6px; font-size:11px; font-weight:700; color:#fff; cursor:pointer; }
    .ef-save:disabled { opacity:.5; cursor:not-allowed; }
    .ef-save:hover:not(:disabled) { background:#4f46e5; }

    @media (max-width: 700px) {
      .slot-row { grid-template-columns:70px 1fr; grid-template-rows:auto auto; }
      .slot-teacher { grid-column:1/-1; }
      .slot-actions { grid-column:1/-1; justify-content:flex-start; }
    }
  `]
})
export class SubstitutionComponent implements OnInit {
  private subSvc      = inject(SubstitutionService);
  private academicSvc = inject(AcademicService);
  private userSvc     = inject(UserService);
  private settingsSvc = inject(SettingsService);

  classes     = signal<ClassDto[]>([]);
  allTeachers = signal<UserListDto[]>([]);
  slots       = signal<DaySlotDto[]>([]);
  loading     = signal(false);
  saving      = signal(false);
  isOffDay    = signal(false);

  private workingDays = new Set<number>();

  selectedDate:  string      = new Date().toISOString().slice(0, 10);
  selectedClass: number|null = null;
  editingSlot:   ReturnType<typeof signal<number|null>> = signal<number|null>(null);
  editTeacherId: number|null = null;
  editReason:    string      = '';

  substitutedCount = computed(() => this.slots().filter(s => s.substitutionId).length);

  dayLabel = computed(() => {
    if (!this.selectedDate) return '';
    const d = new Date(this.selectedDate + 'T00:00:00');
    const dow = d.getDay() === 0 ? 7 : d.getDay();
    const names: Record<number,string> = {1:'Monday',2:'Tuesday',3:'Wednesday',4:'Thursday',5:'Friday',6:'Saturday',7:'Sunday'};
    return `${names[dow]} · ${d.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}`;
  });

  ngOnInit() {
    forkJoin({
      classes:  this.academicSvc.getClasses(),
      teachers: this.userSvc.getAll(),
    }).subscribe(({ classes, teachers }) => {
      this.classes.set(classes);
      this.allTeachers.set(teachers.filter(u => u.roleName?.toLowerCase() === 'teacher' && u.isActive));
    });
    this.settingsSvc.getWorkingDays().subscribe(wd => {
      this.workingDays = wd;
      this.onDateChange();
    });
  }

  onDateChange() {
    this.cancelEdit();
    if (this.selectedDate) {
      const d = new Date(this.selectedDate + 'T00:00:00');
      this.isOffDay.set(!this.settingsSvc.isWorkingDate(d, this.workingDays));
    } else {
      this.isOffDay.set(false);
    }
    if (!this.isOffDay()) this.load();
    else this.slots.set([]);
  }

  load() {
    if (!this.selectedDate) return;
    this.loading.set(true);
    this.subSvc.getDaySlots(this.selectedDate, this.selectedClass ?? undefined).subscribe({
      next: slots => { this.slots.set(slots); this.loading.set(false); },
      error: ()   => this.loading.set(false),
    });
  }

  otherTeachers(originalTeacherId: number): UserListDto[] {
    return this.allTeachers().filter(t => t.userId !== originalTeacherId);
  }

  startEdit(slot: DaySlotDto) {
    this.editingSlot.set(slot.timetableId);
    this.editTeacherId = slot.substituteTeacherId ?? null;
    this.editReason    = slot.reason ?? '';
  }

  cancelEdit() {
    this.editingSlot.set(null);
    this.editTeacherId = null;
    this.editReason    = '';
  }

  saveSubstitution(slot: DaySlotDto) {
    if (!this.editTeacherId) return;
    this.saving.set(true);

    const teacherName = this.allTeachers().find(t => t.userId === this.editTeacherId)?.fullName ?? '';

    const onSuccess = (subId: number) => {
      this.slots.update(list => list.map(s =>
        s.timetableId === slot.timetableId
          ? { ...s, substitutionId: subId, substituteTeacherId: this.editTeacherId, substituteTeacherName: teacherName, reason: this.editReason }
          : s
      ));
      this.saving.set(false);
      this.cancelEdit();
    };

    if (slot.substitutionId) {
      this.subSvc.update(slot.substitutionId, { substituteTeacherId: this.editTeacherId!, reason: this.editReason }).subscribe({
        next: r  => onSuccess(r.substitutionId),
        error: e => { this.saving.set(false); alert(e?.error?.error ?? 'Failed to save.'); },
      });
    } else {
      this.subSvc.create({ timetableId: slot.timetableId, date: this.selectedDate, substituteTeacherId: this.editTeacherId!, reason: this.editReason }).subscribe({
        next: r  => onSuccess(r.substitutionId),
        error: e => { this.saving.set(false); alert(e?.error?.error ?? 'Failed to save.'); },
      });
    }
  }

  revertSubstitution(slot: DaySlotDto) {
    if (!slot.substitutionId || !confirm(`Remove substitution and revert to ${slot.originalTeacherName}?`)) return;
    this.subSvc.delete(slot.substitutionId).subscribe({
      next: () => this.slots.update(list => list.map(s =>
        s.timetableId === slot.timetableId
          ? { ...s, substitutionId: null, substituteTeacherId: null, substituteTeacherName: '', reason: '' }
          : s
      )),
      error: e => alert(e?.error?.error ?? 'Failed to revert.'),
    });
  }
}
