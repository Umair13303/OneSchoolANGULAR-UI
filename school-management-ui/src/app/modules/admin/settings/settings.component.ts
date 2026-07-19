import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../../core/services/settings.service';
import { ScheduleProfileDto, DayScheduleDto, SchoolSettingsDto } from '../../../core/models/settings.model';

interface PeriodRow { periodNo: number; periodName: string; startTime: string; endTime: string; isBreak: boolean; durationMinutes: number; sortOrder?: number; }
interface GeneratedDayPeriods { dayOfWeek: number; dayName: string; startTime: string; endTime: string; numberOfPeriods: number; hasBreak: boolean; breakAfterPeriod: number; breakDuration: number; periods: PeriodRow[]; }
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, LoadingComponent],
  template: `
<app-page-header title="School Settings" subtitle="Manage schedule profiles — create, edit and activate one at a time"></app-page-header>

@if (loading()) { <app-loading /> }
@else {

<!-- ═══════════════════════ PROFILES LIST ═══════════════════════════ -->
@if (!editingProfile() && !periodsProfile()) {

  <div class="toolbar">
    <button class="btn-primary" (click)="startCreate()">
      <span class="material-icons-round">add</span> New Profile
    </button>
  </div>

  @if (profiles().length === 0) {
    <div class="empty-state">
      <span class="material-icons-round">event_note</span>
      <p>No schedule profiles yet. Create one to get started.</p>
    </div>
  }

  @for (p of profiles(); track p.id) {
    <div class="profile-card" [class.profile-active]="p.isActive">
      <div class="profile-left">
        <div class="profile-name">
          @if (renamingId() === p.id) {
            <input class="rename-input" [(ngModel)]="renameValue" (keydown.enter)="confirmRename(p.id)" (keydown.escape)="cancelRename()" autofocus />
            <button class="icon-btn" (click)="confirmRename(p.id)" title="Save"><span class="material-icons-round">check</span></button>
            <button class="icon-btn" (click)="cancelRename()" title="Cancel"><span class="material-icons-round">close</span></button>
          } @else {
            <span class="pname">{{ p.name }}</span>
            <button class="icon-btn muted" (click)="startRename(p)" title="Rename"><span class="material-icons-round">edit</span></button>
          }
        </div>
        <div class="profile-meta">
          {{ countWorkingDays(p.days) }} working days
          &nbsp;·&nbsp;
          Created {{ p.createdAt | date:'MMM d, yyyy' }}
        </div>
        <!-- Days summary pills -->
        <div class="day-pills">
          @for (d of p.days; track d.dayOfWeek) {
            <span class="day-pill" [class.pill-on]="d.isWorkingDay" [title]="d.dayName">
              {{ d.dayName.slice(0,3) }}
            </span>
          }
        </div>
      </div>
      <div class="profile-right">
        @if (p.isActive) {
          <span class="active-badge"><span class="material-icons-round">check_circle</span> Active</span>
        } @else {
          <label class="status-toggle" (click)="toggleActive(p)">
            <span class="sw">
              <input type="checkbox" [checked]="false" (click)="$event.stopPropagation()" (change)="toggleActive(p)" />
              <span class="sw-track"><span class="sw-thumb"></span></span>
            </span>
            <span class="status-label">Inactive</span>
          </label>
        }
        <button class="btn-secondary" (click)="startEdit(p)">
          <span class="material-icons-round">tune</span> Edit
        </button>
        <button class="btn-secondary" (click)="startPeriods(p)">
          <span class="material-icons-round">view_timeline</span> Period Schedule
        </button>
        <button class="btn-secondary" (click)="printSchedule(p)">
          <span class="material-icons-round">picture_as_pdf</span> PDF View
        </button>
        <button class="icon-btn" (click)="copy(p)" title="Duplicate"><span class="material-icons-round">content_copy</span></button>
        @if (!p.isActive) {
          <button class="icon-btn danger" (click)="deleteProfile(p.id)" title="Delete"><span class="material-icons-round">delete</span></button>
        }
      </div>
    </div>
  }

  <!-- ═══════════════════ ADMISSION NUMBERS ═══════════════════════════ -->
  @if (schoolSettings) {
    <div class="card adm-card">
      <div class="adm-head">
        <span class="material-icons-round">pin</span>
        <div>
          <h3>Admission Numbers</h3>
          <p class="adm-sub">Format used to auto-generate admission numbers for new students. Campuses with their own settings can use a different prefix.</p>
        </div>
      </div>
      <div class="adm-grid">
        <label class="adm-field">Prefix
          <input [(ngModel)]="admPrefix" maxlength="10" placeholder="ADM" />
        </label>
        <label class="adm-field adm-check">
          <input type="checkbox" [(ngModel)]="admIncludeYear" /> Include year
        </label>
        <label class="adm-field">Sequence digits
          <select [(ngModel)]="admPadding">
            @for (n of [2,3,4,5,6]; track n) { <option [ngValue]="n">{{ n }}</option> }
          </select>
        </label>
        <div class="adm-preview">
          <span class="adm-preview-label">Next number will look like</span>
          <span class="adm-preview-value">{{ admPreview() }}</span>
        </div>
      </div>
      <div class="save-row">
        <button class="btn-primary" (click)="saveAdmissionSettings()" [disabled]="admSaving()">
          <span class="material-icons-round">save</span> {{ admSaving() ? 'Saving…' : 'Save' }}
        </button>
        @if (admSaveOk()) { <span class="saved-ok"><span class="material-icons-round">check_circle</span> Saved</span> }
        @if (admSaveError()) { <span class="error-msg">{{ admSaveError() }}</span> }
      </div>
    </div>
  }
}


<!-- ═══════════════════════ EDIT PROFILE ════════════════════════════ -->
@if (editingProfile(); as ep) { @if (!periodsProfile()) {
  <div class="edit-header">
    <button class="back-btn" (click)="cancelEdit()">
      <span class="material-icons-round">arrow_back</span> Back
    </button>
    @if (isNewProfile()) {
      <input class="profile-name-input" [(ngModel)]="newProfileName" placeholder="Enter schedule name…" autofocus />
    } @else {
      <div class="edit-title">
        <span class="material-icons-round">tune</span>
        <strong>{{ ep.name }}</strong>
        @if (ep.isActive) { <span class="active-badge sm"><span class="material-icons-round">check_circle</span> Active</span> }
      </div>
    }
  </div>

  <div class="card">
    <div class="tbl-wrap">
      <table class="sched-table">
        <thead>
          <tr>
            <th>Day</th>
            <th>Working?</th>
            <th>Start Time</th>
            <th>End Time</th>
            <th>Periods</th>
            <th>Break?</th>
            <th>Break After</th>
            <th>Break Duration</th>
          </tr>
        </thead>
        <tbody>
          @for (d of editDays(); track d.dayOfWeek) {
            <tr [class.row-off]="!d.isWorkingDay">
              <td class="day-cell">
                <span class="day-dot" [class.dot-on]="d.isWorkingDay"></span>
                {{ d.dayName }}
              </td>
              <td class="center-cell">
                <label class="sw">
                  <input type="checkbox" [(ngModel)]="d.isWorkingDay" />
                  <span class="sw-track"><span class="sw-thumb"></span></span>
                </label>
              </td>
              <td>
                <input type="time" class="tbl-input" [(ngModel)]="d.startTime" [disabled]="!d.isWorkingDay" />
              </td>
              <td>
                <input type="time" class="tbl-input" [(ngModel)]="d.endTime" [disabled]="!d.isWorkingDay" />
              </td>
              <td>
                <input type="number" class="tbl-input num-input" min="1" max="20"
                       [(ngModel)]="d.numberOfPeriods" [disabled]="!d.isWorkingDay" />
              </td>
              <td class="center-cell">
                <label class="sw">
                  <input type="checkbox" [(ngModel)]="d.hasBreak" [disabled]="!d.isWorkingDay" />
                  <span class="sw-track"><span class="sw-thumb"></span></span>
                </label>
              </td>
              <td>
                @if (d.hasBreak && d.isWorkingDay) {
                  <select class="tbl-input" [(ngModel)]="d.breakAfterPeriod">
                    @for (n of periodNumbers(d.numberOfPeriods); track n) {
                      <option [value]="n">Period {{ n }}</option>
                    }
                  </select>
                } @else { <span class="na">—</span> }
              </td>
              <td>
                @if (d.hasBreak && d.isWorkingDay) {
                  <div class="dur-cell">
                    <input type="number" class="tbl-input num-input" min="10" max="60" [(ngModel)]="d.breakDuration" />
                    <span class="unit">min</span>
                  </div>
                } @else { <span class="na">—</span> }
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <div class="save-row">
      @if (saveError()) { <p class="error-msg">{{ saveError() }}</p> }
      <button class="btn-secondary" (click)="cancelEdit()">Cancel</button>
      <button class="btn-primary" (click)="saveEdit()" [disabled]="saving()">
        {{ saving() ? 'Saving…' : 'Save Changes' }}
      </button>
      @if (saveOk()) { <span class="saved-ok">✓ Saved</span> }
    </div>
  </div>
} }

<!-- ═══════════════════════ PERIOD SCHEDULE VIEW ════════════════════ -->
@if (periodsProfile(); as pp) {

  <!-- Page header row -->
  <div class="edit-header">
    <button class="back-btn" (click)="periodsProfile.set(null)">
      <span class="material-icons-round">arrow_back</span> Back
    </button>
    <div class="edit-title">
      <span class="material-icons-round">view_timeline</span>
      <strong>{{ pp.name }}</strong>
      <span class="edit-title-sub">Period Schedule</span>
    </div>
  </div>

  <!-- One card per working day -->
  @for (day of generatedDays(); track day.dayOfWeek; let di = $index) {
    <div class="ps-card">

      <!-- Day header -->
      <div class="ps-day-header">
        <div class="ps-day-left">
          <span class="ps-day-dot"></span>
          <div>
            <div class="ps-day-name">{{ day.dayName }}</div>
            <div class="ps-day-meta">
              {{ day.startTime }} – {{ day.endTime }}
              &nbsp;·&nbsp; {{ day.numberOfPeriods }} periods
              @if (day.hasBreak) { &nbsp;·&nbsp; Break {{ day.breakDuration }} min after Period {{ day.breakAfterPeriod }} }
            </div>
          </div>
        </div>

        <!-- Copy to other days -->
        <div class="ps-day-right">
          @if (copySourceIndex() === di) {
            <div class="copy-picker">
              <span class="copy-label">Copy to:</span>
              @for (target of generatedDays(); track target.dayOfWeek; let ti = $index) {
                @if (ti !== di) {
                  <label class="copy-chk">
                    <input type="checkbox" [checked]="isCopyTarget(ti)" (change)="toggleCopyTarget(ti)" />
                    {{ target.dayName.slice(0,3) }}
                  </label>
                }
              }
              <button class="btn-primary btn-xs" (click)="applyCopy(di)" [disabled]="copyTargets().length === 0">Apply</button>
              <button class="icon-btn sm" (click)="cancelCopy()"><span class="material-icons-round">close</span></button>
            </div>
          } @else {
            <button class="btn-outline btn-xs" (click)="startCopy(di)">
              <span class="material-icons-round">content_copy</span> Copy to Days
            </button>
          }
        </div>
      </div>

      <!-- Period rows -->
      <div class="ps-body">
        @for (p of day.periods; track p.sortOrder; let pi = $index) {
          <div class="period-row" [class.period-break]="p.isBreak">
            <div class="period-num">
              @if (p.isBreak) {
                <span class="break-icon material-icons-round">pause_circle</span>
              } @else {
                <span class="period-badge">{{ p.periodNo }}</span>
              }
            </div>
            <div class="period-name-col">
              <span class="pname-text">{{ p.periodName }}</span>
              <span class="ptype-badge" [class.break-type]="p.isBreak">{{ p.isBreak ? 'Break' : 'Period' }}</span>
            </div>
            <div class="period-time-group">
              <div class="time-field">
                <label>Start</label>
                <input type="time" class="tbl-input time-input"
                       [(ngModel)]="p.startTime"
                       (change)="onPeriodStartChange(di, pi)" />
              </div>
              <span class="time-sep material-icons-round">arrow_forward</span>
              <div class="time-field">
                <label>End</label>
                <input type="time" class="tbl-input time-input"
                       [(ngModel)]="p.endTime"
                       (change)="onPeriodEndChange(di, pi)" />
              </div>
            </div>
            <div class="period-dur">{{ p.durationMinutes }} min</div>
          </div>
        }
      </div>

    </div>
  }

  <!-- Save bar -->
  <div class="card save-row">
    @if (periodSaveError()) { <p class="error-msg">{{ periodSaveError() }}</p> }
    <button class="btn-primary" (click)="savePeriods(pp.id)" [disabled]="periodSaving()">
      <span class="material-icons-round">save</span>
      {{ periodSaving() ? 'Saving…' : 'Save Period Schedule' }}
    </button>
    @if (periodSaveOk()) { <span class="saved-ok"><span class="material-icons-round">check_circle</span> Saved</span> }
  </div>
}

} <!-- end @else loading -->
  `,
  styles: [`
    /* ── Toolbar ───────────────────────────────────────────── */
    .toolbar { display:flex; justify-content:flex-end; margin-bottom:16px; }

    /* ── Profile card ──────────────────────────────────────── */
    .profile-card {
      background:var(--surface); border:1px solid var(--border); border-radius:12px;
      padding:18px 20px; margin-bottom:12px;
      display:flex; align-items:center; gap:16px; flex-wrap:wrap;
      transition:.15s;
    }
    .profile-card:hover { border-color:var(--primary-light, #a5b4fc); }
    .profile-active { border-color:var(--primary); border-width:2px; }

    .profile-left { flex:1; min-width:0; }
    .profile-right { display:flex; align-items:center; gap:8px; flex-wrap:wrap; flex-shrink:0; }

    .profile-name { display:flex; align-items:center; gap:6px; margin-bottom:4px; }
    .pname { font-size:15px; font-weight:600; color:var(--t1); }
    .profile-meta { font-size:12px; color:var(--t3); margin-bottom:8px; }

    .rename-input {
      padding:4px 8px; border:1px solid var(--primary); border-radius:6px;
      font-size:14px; font-weight:600; color:var(--t1); background:var(--surface);
      outline:none; min-width:200px;
    }

    /* ── Day pills ─────────────────────────────────────────── */
    .day-pills { display:flex; gap:4px; flex-wrap:wrap; }
    .day-pill {
      padding:2px 7px; border-radius:10px; font-size:11px; font-weight:500;
      background:var(--border); color:var(--t3);
    }
    .pill-on { background:rgba(var(--primary-rgb,99,102,241),.15); color:var(--primary); }

    /* ── Active badge ──────────────────────────────────────── */
    .active-badge {
      display:inline-flex; align-items:center; gap:4px;
      padding:6px 12px; border-radius:8px;
      background:rgba(34,197,94,.12); color:#16a34a;
      border:1.5px solid #22c55e;
      font-size:13px; font-weight:600;
    }
    .active-badge .material-icons-round { font-size:14px; }
    .active-badge.sm { font-size:11px; padding:2px 8px; }

    /* ── Buttons ───────────────────────────────────────────── */
    .status-toggle { display:flex; align-items:center; gap:8px; cursor:pointer; padding:6px 12px; border-radius:8px; border:1.5px solid #ef4444; background:rgba(239,68,68,.06); transition:.15s; }
    .status-toggle.is-active { border-color:#22c55e; background:rgba(34,197,94,.08); }
    .status-label { font-size:13px; font-weight:600; color:#ef4444; }
    .status-toggle.is-active .status-label { color:#16a34a; }
    .status-toggle .sw-track { background:#ef4444; }
    .status-toggle.is-active .sw-track { background:#22c55e; }

    .btn-outline {
      padding:6px 14px; border:1.5px solid var(--primary); border-radius:6px;
      background:transparent; color:var(--primary); font-size:13px; font-weight:500; cursor:pointer;
    }
    .btn-outline:hover { background:rgba(var(--primary-rgb,99,102,241),.06); }
    .icon-btn { border:none; background:transparent; cursor:pointer; padding:6px; color:var(--t3); display:flex; align-items:center; border-radius:6px; }
    .icon-btn:hover { color:var(--t1); background:var(--hover); }
    .icon-btn.muted .material-icons-round { font-size:16px; }
    .icon-btn.danger:hover { color:#ef4444; background:rgba(239,68,68,.08); }
    .icon-btn .material-icons-round { font-size:18px; }

    /* ── Empty state ───────────────────────────────────────── */
    .empty-state { display:flex; flex-direction:column; align-items:center; gap:10px; padding:60px 20px; color:var(--t3); }
    .empty-state .material-icons-round { font-size:48px; }

    /* ── Modal ─────────────────────────────────────────────── */
    .modal-backdrop { position:fixed; inset:0; background:rgba(0,0,0,.4); display:flex; align-items:center; justify-content:center; z-index:1000; }
    .modal { background:var(--surface); border-radius:12px; padding:28px; width:380px; max-width:90vw; }
    .modal-title { font-size:16px; font-weight:600; margin:0 0 20px; color:var(--t1); }
    .modal-actions { display:flex; gap:10px; justify-content:flex-end; margin-top:20px; }

    /* ── Edit header ───────────────────────────────────────── */
    .edit-header { display:flex; align-items:center; gap:16px; margin-bottom:16px; flex-wrap:wrap; }
    .back-btn { display:flex; align-items:center; gap:6px; border:none; background:transparent; cursor:pointer; color:var(--t2); font-size:13px; font-weight:500; padding:6px 0; }
    .back-btn:hover { color:var(--t1); }
    .back-btn .material-icons-round { font-size:18px; }
    .edit-title { display:flex; align-items:center; gap:8px; font-size:14px; color:var(--t1); }
    .edit-title .material-icons-round { font-size:18px; color:var(--primary); }
    .profile-name-input { padding:8px 12px; border:2px solid var(--primary); border-radius:8px; font-size:15px; font-weight:600; color:var(--t1); background:var(--surface); outline:none; min-width:260px; }

    /* ── Schedule table ────────────────────────────────────── */
    .card { background:var(--surface); border:1px solid var(--border); border-radius:12px; overflow:hidden; }
    .tbl-wrap { overflow-x:auto; }
    .sched-table { width:100%; border-collapse:collapse; min-width:700px; }
    .sched-table th { font-size:11px; font-weight:600; color:var(--t3); text-transform:uppercase; letter-spacing:.5px; padding:12px 14px; text-align:left; background:var(--hover); border-bottom:1px solid var(--border); }
    .sched-table td { padding:10px 14px; border-bottom:1px solid var(--border); vertical-align:middle; }
    .sched-table tbody tr:last-child td { border-bottom:none; }
    .sched-table tbody tr:hover { background:rgba(var(--primary-rgb,99,102,241),.02); }
    .row-off td { background:var(--hover); opacity:.55; }

    .day-cell { display:flex; align-items:center; gap:8px; font-size:13px; font-weight:600; color:var(--t1); white-space:nowrap; }
    .day-dot { width:8px; height:8px; border-radius:50%; background:var(--border); flex-shrink:0; }
    .dot-on { background:var(--primary); }
    .center-cell { text-align:center; }
    .na { color:var(--t3); font-size:13px; }

    /* ── Toggle switch ─────────────────────────────────────── */
    .sw { display:inline-flex; cursor:pointer; }
    .sw input { display:none; }
    .sw-track { position:relative; width:38px; height:22px; background:var(--border); border-radius:11px; transition:.2s; }
    .sw-thumb { position:absolute; top:3px; left:3px; width:16px; height:16px; background:#fff; border-radius:50%; transition:.2s; box-shadow:0 1px 3px rgba(0,0,0,.2); }
    .sw input:checked ~ .sw-track { background:#22c55e; }
    .sw input:checked ~ .sw-track .sw-thumb { transform:translateX(16px); }
    .sw-track { background:#ef4444; }

    /* ── Table inputs ──────────────────────────────────────── */
    .tbl-input { padding:7px 9px; border:1px solid var(--border); border-radius:6px; font-size:13px; background:var(--surface); color:var(--t1); outline:none; transition:.15s; width:100%; box-sizing:border-box; }
    .tbl-input:focus { border-color:var(--primary); }
    .tbl-input:disabled { opacity:.4; cursor:not-allowed; background:var(--hover); }
    .num-input { width:70px; text-align:center; }
    .time-input { width:100px; }
    .dur-cell { display:flex; align-items:center; gap:6px; }
    .unit { font-size:12px; color:var(--t3); white-space:nowrap; }

    /* ── Fields ────────────────────────────────────────────── */
    .field { display:flex; flex-direction:column; gap:4px; }
    label { font-size:12px; font-weight:500; color:var(--t2); }
    input[type=text], input[type=time], input[type=number], select {
      padding:9px 10px; border:1px solid var(--border); border-radius:6px;
      font-size:13px; background:var(--surface); color:var(--t1); outline:none; transition:.15s;
    }
    input:focus, select:focus { border-color:var(--primary); }

    .ms-auto { margin-left:auto; }
    .edit-title-sub { font-size:13px; font-weight:400; color:var(--t3); margin-left:4px; }

    /* ── Period schedule view ──────────────────────────────── */
    .ps-card {
      background:var(--surface); border:1px solid var(--border); border-radius:12px;
      margin-bottom:16px; overflow:hidden;
    }
    .ps-day-header {
      display:flex; align-items:center; justify-content:space-between; gap:16px;
      padding:16px 20px; background:var(--hover); border-bottom:1px solid var(--border);
      flex-wrap:wrap;
    }
    .ps-day-left { display:flex; align-items:center; gap:12px; }
    .ps-day-dot { width:10px; height:10px; border-radius:50%; background:var(--primary); flex-shrink:0; }
    .ps-day-name { font-size:15px; font-weight:700; color:var(--t1); }
    .ps-day-meta { font-size:12px; color:var(--t3); margin-top:2px; }
    .ps-day-right { display:flex; align-items:center; gap:8px; }

    /* copy picker */
    .copy-picker { display:flex; align-items:center; gap:8px; flex-wrap:wrap; background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:6px 12px; }
    .copy-label { font-size:11px; font-weight:600; color:var(--t3); text-transform:uppercase; letter-spacing:.4px; white-space:nowrap; }
    .copy-chk { display:flex; align-items:center; gap:4px; font-size:12px; font-weight:500; color:var(--t1); cursor:pointer; padding:2px 4px; border-radius:4px; }
    .copy-chk:hover { background:var(--hover); }
    .copy-chk input { accent-color:var(--primary); cursor:pointer; }
    .btn-xs { padding:4px 10px; font-size:12px; display:inline-flex; align-items:center; gap:4px; }
    .btn-xs .material-icons-round { font-size:14px; }
    .icon-btn.sm { padding:4px; }
    .icon-btn.sm .material-icons-round { font-size:16px; }

    /* period rows */
    .ps-body { padding:8px 0; }
    .period-row {
      display:flex; align-items:center; gap:16px; padding:10px 20px;
      border-bottom:1px solid var(--border); transition:.1s;
    }
    .period-row:last-child { border-bottom:none; }
    .period-row:hover { background:rgba(var(--primary-rgb,99,102,241),.02); }
    .period-break { background:rgba(217,119,6,.03); }
    .period-break:hover { background:rgba(217,119,6,.05); }

    .period-num { width:36px; display:flex; justify-content:center; flex-shrink:0; }
    .period-badge { width:28px; height:28px; border-radius:50%; background:rgba(var(--primary-rgb,99,102,241),.12); color:var(--primary); display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; }
    .break-icon { font-size:20px; color:#d97706; }

    .period-name-col { display:flex; align-items:center; gap:8px; min-width:140px; flex:1; }
    .pname-text { font-size:13px; font-weight:500; color:var(--t1); }
    .ptype-badge { padding:2px 8px; border-radius:10px; font-size:10px; font-weight:600; background:rgba(34,197,94,.12); color:#16a34a; }
    .break-type { background:rgba(217,119,6,.12); color:#d97706; }

    .period-time-group { display:flex; align-items:center; gap:8px; flex-shrink:0; }
    .time-field { display:flex; flex-direction:column; gap:3px; }
    .time-field label { font-size:10px; font-weight:600; color:var(--t3); text-transform:uppercase; letter-spacing:.4px; }
    .time-input { width:110px; padding:7px 9px; }
    .time-sep { font-size:16px; color:var(--t3); margin-top:14px; }

    .period-dur { font-size:12px; color:var(--t3); font-weight:500; min-width:50px; text-align:right; flex-shrink:0; }

    /* ── Save row ──────────────────────────────────────────── */
    /* Admission numbers card */
    .adm-card { margin-top:24px; }
    .adm-head { display:flex; gap:12px; padding:16px 20px 0; align-items:flex-start; }
    .adm-head .material-icons-round { color:var(--primary,#4f46e5); font-size:22px; margin-top:2px; }
    .adm-head h3 { margin:0 0 2px; font-size:15px; }
    .adm-sub { margin:0; font-size:12.5px; color:var(--text-muted,#6b7280); }
    .adm-grid { display:flex; gap:20px; align-items:flex-end; flex-wrap:wrap; padding:14px 20px 0; }
    .adm-field { display:flex; flex-direction:column; gap:6px; font-size:12.5px; font-weight:600; color:var(--text-muted,#6b7280); }
    .adm-field input[type=text], .adm-field input:not([type=checkbox]), .adm-field select {
      padding:8px 10px; border:1px solid var(--border,#e5e7eb); border-radius:8px; font-size:13.5px; width:130px; }
    .adm-check { flex-direction:row; align-items:center; gap:8px; padding-bottom:9px; }
    .adm-preview { display:flex; flex-direction:column; gap:4px; margin-left:auto; }
    .adm-preview-label { font-size:11.5px; color:var(--text-muted,#6b7280); }
    .adm-preview-value { font-family:monospace; font-size:16px; font-weight:700; color:var(--primary,#4f46e5); }
    .save-row { display:flex; align-items:center; gap:10px; padding:16px 20px; flex-wrap:wrap; }
    .saved-ok { display:inline-flex; align-items:center; gap:4px; color:#16a34a; font-size:13px; font-weight:600; }
    .saved-ok .material-icons-round { font-size:16px; }
    .error-msg { color:var(--red,#ef4444); font-size:13px; }
    .btn-primary .material-icons-round { font-size:16px; }
  `],
})
export class SettingsComponent implements OnInit {
  private svc = inject(SettingsService);

  loading  = signal(true);
  saving   = signal(false);
  saveOk   = signal(false);
  saveError = signal('');

  profiles       = signal<ScheduleProfileDto[]>([]);
  editingProfile = signal<ScheduleProfileDto | null>(null);
  editDays       = signal<DayScheduleDto[]>([]);

  isNewProfile   = signal(false);
  newProfileName = '';

  renamingId  = signal<number | null>(null);
  renameValue = '';

  periodsProfile  = signal<ScheduleProfileDto | null>(null);
  generatedDays   = signal<GeneratedDayPeriods[]>([]);
  periodSaving    = signal(false);
  periodSaveOk    = signal(false);
  periodSaveError = signal('');

  copySourceIndex = signal<number | null>(null);
  copyTargets     = signal<number[]>([]);

  // ── Admission number settings (round-trips the full settings DTO) ─────────
  schoolSettings: SchoolSettingsDto | null = null;
  admPrefix      = 'ADM';
  admIncludeYear = true;
  admPadding     = 4;
  admSaving    = signal(false);
  admSaveOk    = signal(false);
  admSaveError = signal('');

  ngOnInit() {
    this.svc.getProfiles().subscribe({
      next: data => { this.profiles.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.svc.get().subscribe({
      next: s => {
        this.schoolSettings = s;
        this.admPrefix      = s.admissionNoPrefix ?? 'ADM';
        this.admIncludeYear = s.admissionNoIncludeYear ?? true;
        this.admPadding     = s.admissionNoPadding ?? 4;
      },
      error: () => {},
    });
  }

  admPreview(): string {
    const prefix = (this.admPrefix || 'ADM').trim().toUpperCase();
    const seq = '1'.padStart(this.admPadding || 4, '0');
    return this.admIncludeYear
      ? `${prefix}-${new Date().getFullYear()}-${seq}`
      : `${prefix}-${seq}`;
  }

  saveAdmissionSettings() {
    if (!this.schoolSettings) return;
    this.admSaving.set(true); this.admSaveOk.set(false); this.admSaveError.set('');
    const dto: SchoolSettingsDto = {
      ...this.schoolSettings,
      admissionNoPrefix:      (this.admPrefix || 'ADM').trim().toUpperCase(),
      admissionNoIncludeYear: this.admIncludeYear,
      admissionNoPadding:     this.admPadding,
    };
    this.svc.save(dto).subscribe({
      next: saved => {
        this.schoolSettings = saved;
        this.admSaving.set(false); this.admSaveOk.set(true);
        setTimeout(() => this.admSaveOk.set(false), 2500);
      },
      error: err => {
        this.admSaving.set(false);
        this.admSaveError.set(err?.error?.error ?? 'Failed to save admission number settings.');
      },
    });
  }

  // ── Create ──────────────────────────────────────────────────────────────────
  startCreate() {
    this.newProfileName = '';
    this.isNewProfile.set(true);
    // Show empty table immediately with a blank temp profile
    const blank: ScheduleProfileDto = {
      id: 0, name: '', isActive: false, createdAt: new Date().toISOString(),
      days: [1,2,3,4,5,6,7].map(n => ({
        dayOfWeek: n, dayName: ['','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][n],
        isWorkingDay: n !== 7, startTime: '08:00', endTime: n === 5 ? '11:30' : '13:00',
        numberOfPeriods: n === 5 ? 4 : 6, hasBreak: false, breakAfterPeriod: 3, breakDuration: 10,
      })),
    };
    this.editingProfile.set(blank);
    this.editDays.set(blank.days.map(d => ({ ...d })));
  }

  // ── Copy ────────────────────────────────────────────────────────────────────
  copy(p: ScheduleProfileDto) {
    const name = `${p.name} (copy)`;
    this.svc.copyProfile(p.id, name).subscribe(np => {
      this.profiles.update(list => [...list, np]);
    });
  }

  // ── Rename ──────────────────────────────────────────────────────────────────
  startRename(p: ScheduleProfileDto) { this.renamingId.set(p.id); this.renameValue = p.name; }
  cancelRename() { this.renamingId.set(null); }
  confirmRename(id: number) {
    if (!this.renameValue.trim()) return;
    this.svc.renameProfile(id, this.renameValue.trim()).subscribe(updated => {
      this.profiles.update(list => list.map(p => p.id === id ? { ...p, name: updated.name } : p));
      this.renamingId.set(null);
    });
  }

  // ── Edit ────────────────────────────────────────────────────────────────────
  startEdit(p: ScheduleProfileDto) {
    this.editingProfile.set(p);
    this.editDays.set(p.days.map(d => ({ ...d })));
    this.saveOk.set(false);
    this.saveError.set('');
  }
  cancelEdit() { this.editingProfile.set(null); this.isNewProfile.set(false); }

  saveEdit() {
    const ep = this.editingProfile();
    if (!ep) return;
    this.saveError.set('');

    if (this.isNewProfile()) {
      const name = this.newProfileName.trim();
      if (!name) { this.saveError.set('Please enter a profile name.'); return; }
      this.saving.set(true);
      this.svc.createProfile(name).subscribe({
        next: created => {
          this.svc.saveProfileDays(created.id, this.editDays()).subscribe({
            next: updated => {
              this.profiles.update(list => [...list, updated]);
              this.editingProfile.set(updated);
              this.editDays.set(updated.days.map(d => ({ ...d })));
              this.isNewProfile.set(false);
              this.saving.set(false);
              this.saveOk.set(true);
              setTimeout(() => this.saveOk.set(false), 3000);
            },
            error: (e: any) => { this.saving.set(false); this.saveError.set(e?.error?.message ?? 'Failed to save.'); },
          });
        },
        error: (e: any) => { this.saving.set(false); this.saveError.set(e?.error?.message ?? 'Failed to create.'); },
      });
    } else {
      this.saving.set(true);
      this.svc.saveProfileDays(ep.id, this.editDays()).subscribe({
        next: updated => {
          this.profiles.update(list => list.map(p => p.id === updated.id ? updated : p));
          this.editingProfile.set(updated);
          this.editDays.set(updated.days.map(d => ({ ...d })));
          this.saving.set(false);
          this.saveOk.set(true);
          setTimeout(() => this.saveOk.set(false), 3000);
        },
        error: (e: any) => { this.saving.set(false); this.saveError.set(e?.error?.message ?? 'Failed to save.'); },
      });
    }
  }

  // ── Activate / Deactivate ───────────────────────────────────────────────────
  toggleActive(p: ScheduleProfileDto) {
    if (p.isActive) return; // can't deactivate the active one directly — must activate another
    this.svc.activateProfile(p.id).subscribe(() => {
      this.profiles.update(list => list.map(x => ({ ...x, isActive: x.id === p.id })));
    });
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  deleteProfile(id: number) {
    if (!confirm('Delete this profile?')) return;
    this.svc.deleteProfile(id).subscribe({
      next: () => this.profiles.update(list => list.filter(p => p.id !== id)),
      error: (e: any) => alert(e?.error?.error ?? 'Cannot delete.'),
    });
  }

  // ── Period Schedule ─────────────────────────────────────────────────────────
  startPeriods(p: ScheduleProfileDto) {
    this.periodsProfile.set(p);
    this.periodSaveOk.set(false);
    this.periodSaveError.set('');
    // load saved periods from DB; fall back to auto-generate if none saved
    this.svc.getProfilePeriods(p.id).subscribe(saved => {
      if (saved && saved.length > 0) {
        this.generatedDays.set(this.groupSavedPeriods(p, saved));
      } else {
        this.generatedDays.set(this.autoGenerateAllDays(p));
      }
    });
  }

  regenPeriods(p: ScheduleProfileDto) {
    this.generatedDays.set(this.autoGenerateAllDays(p));
  }

  savePeriods(profileId: number) {
    const allPeriods = this.generatedDays().flatMap(day =>
      day.periods.map((p, i) => ({
        dayOfWeek: day.dayOfWeek, dayName: day.dayName,
        periodNo: p.periodNo, periodName: p.periodName,
        startTime: p.startTime, endTime: p.endTime,
        durationMinutes: p.durationMinutes, isBreak: p.isBreak,
        sortOrder: i,
      }))
    );
    this.periodSaving.set(true);
    this.periodSaveError.set('');
    this.svc.saveProfilePeriods(profileId, allPeriods).subscribe({
      next: () => {
        this.periodSaving.set(false);
        this.periodSaveOk.set(true);
        setTimeout(() => this.periodSaveOk.set(false), 3000);
      },
      error: (e: any) => { this.periodSaving.set(false); this.periodSaveError.set(e?.error?.message ?? 'Failed to save.'); },
    });
  }

  // ── Copy to days ────────────────────────────────────────────────────────────
  startCopy(di: number) { this.copySourceIndex.set(di); this.copyTargets.set([]); }
  cancelCopy() { this.copySourceIndex.set(null); this.copyTargets.set([]); }
  isCopyTarget(ti: number): boolean { return this.copyTargets().includes(ti); }
  toggleCopyTarget(ti: number) {
    const targets = [...this.copyTargets()];
    const idx = targets.indexOf(ti);
    idx >= 0 ? targets.splice(idx, 1) : targets.push(ti);
    this.copyTargets.set(targets);
  }
  applyCopy(di: number) {
    const days = [...this.generatedDays()];
    const src  = days[di].periods;
    this.copyTargets().forEach(ti => {
      const targetDay = days[ti];
      // copy period structure but keep each period's original start time offset
      const offset = this.toMinutes(targetDay.startTime) - this.toMinutes(days[di].startTime);
      days[ti] = {
        ...targetDay,
        periods: src.map(p => ({
          ...p,
          startTime: this.fromMinutes(this.toMinutes(p.startTime) + offset),
          endTime:   this.fromMinutes(this.toMinutes(p.endTime)   + offset),
        })),
      };
    });
    this.generatedDays.set(days);
    this.cancelCopy();
  }

  private autoGenerateAllDays(p: ScheduleProfileDto): GeneratedDayPeriods[] {
    return p.days.filter(d => d.isWorkingDay).map(d => ({
      ...d, periods: this.generatePeriodsForDay(d),
    }));
  }

  private groupSavedPeriods(p: ScheduleProfileDto, saved: any[]): GeneratedDayPeriods[] {
    return p.days.filter(d => d.isWorkingDay).map(d => {
      const dayPeriods = saved
        .filter(s => s.dayOfWeek === d.dayOfWeek)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      return {
        ...d,
        periods: dayPeriods.length > 0 ? dayPeriods : this.generatePeriodsForDay(d),
      };
    });
  }

  onPeriodStartChange(di: number, pi: number) {
    const days = [...this.generatedDays()];
    const p = days[di].periods[pi];
    p.durationMinutes = this.timeDiff(p.startTime, p.endTime);
    this.generatedDays.set(days);
  }

  onPeriodEndChange(di: number, pi: number) {
    const days = [...this.generatedDays()];
    const periods = days[di].periods;
    const p = periods[pi];
    p.durationMinutes = this.timeDiff(p.startTime, p.endTime);
    // cascade: next period starts where this one ends
    for (let j = pi + 1; j < periods.length; j++) {
      const prev = periods[j - 1];
      periods[j].startTime = prev.endTime;
      periods[j].endTime = this.fromMinutes(this.toMinutes(periods[j].startTime) + periods[j].durationMinutes);
    }
    this.generatedDays.set(days);
  }

  private generatePeriodsForDay(d: DayScheduleDto): PeriodRow[] {
    const totalMins = this.timeDiff(d.startTime, d.endTime);
    const breakMins = d.hasBreak ? d.breakDuration : 0;
    const periodDur = d.numberOfPeriods > 0 ? Math.floor((totalMins - breakMins) / d.numberOfPeriods) : 40;
    const rows: PeriodRow[] = [];
    let cursor = this.toMinutes(d.startTime);
    let pNo = 1;
    for (let i = 0; i < d.numberOfPeriods; i++) {
      const start = this.fromMinutes(cursor);
      cursor += periodDur;
      rows.push({ periodNo: pNo++, periodName: `Period ${i + 1}`, startTime: start, endTime: this.fromMinutes(cursor), isBreak: false, durationMinutes: periodDur });
      if (d.hasBreak && (i + 1) === d.breakAfterPeriod) {
        const bStart = this.fromMinutes(cursor);
        cursor += breakMins;
        rows.push({ periodNo: 0, periodName: 'Break', startTime: bStart, endTime: this.fromMinutes(cursor), isBreak: true, durationMinutes: breakMins });
      }
    }
    return rows;
  }

  // ── PDF / Print ─────────────────────────────────────────────────────────────
  printSchedule(p: ScheduleProfileDto) {
    this.svc.getProfilePeriods(p.id).subscribe(saved => {
      const days = p.days.filter(d => d.isWorkingDay).map(d => {
        const periods = saved.filter(s => s.dayOfWeek === d.dayOfWeek).sort((a: any, b: any) => a.sortOrder - b.sortOrder);
        return { ...d, periods: periods.length ? periods : this.generatePeriodsForDay(d) };
      });
      this.openPrintWindow(p.name, days);
    });
  }

  private openPrintWindow(name: string, days: GeneratedDayPeriods[]) {
    const win = window.open('', '_blank', 'width=1100,height=750');
    if (!win) return;

    // Build a unified master period list (row index = slot index across all days)
    const maxSlots = Math.max(...days.map(d => d.periods.length));

    const dayHeaders = days.map(d => `
      <th class="day-col">
        <div class="day-name">${d.dayName}</div>
        <div class="day-meta">${d.startTime} – ${d.endTime}</div>
      </th>`).join('');

    const slotRows = Array.from({ length: maxSlots }, (_, i) => {
      const cells = days.map(d => {
        const p = d.periods[i];
        if (!p) return `<td class="empty-cell">—</td>`;
        return `<td class="${p.isBreak ? 'break-cell' : 'period-cell'}">
          <div class="cell-name">${p.periodName}</div>
          <div class="cell-time">${p.startTime} – ${p.endTime} &nbsp;·&nbsp; ${p.durationMinutes} min</div>
        </td>`;
      }).join('');
      return `<tr><td class="slot-no">${i + 1}</td>${cells}</tr>`;
    }).join('');

    // Summary row
    const summaryRow = days.map(d => {
      const periods = d.periods.filter(p => !p.isBreak).length;
      const breaks  = d.periods.filter(p => p.isBreak).length;
      return `<td class="summary-cell">${periods} periods &nbsp;·&nbsp; ${breaks} break${breaks !== 1 ? 's' : ''}</td>`;
    }).join('');

    win.document.write(`<!DOCTYPE html><html><head>
      <title>${name} — Weekly Schedule</title>
      <meta charset="utf-8"/>
      <style>
        @page { size:A4 landscape; margin:12mm 10mm; }
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Segoe UI',Arial,sans-serif; font-size:11px; color:#1e293b; background:#fff; padding:16px 18px; }
        .header { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; padding-bottom:8px; border-bottom:2px solid #6366f1; }
        .page-title { font-size:17px; font-weight:700; color:#1e293b; }
        .page-sub { font-size:10px; color:#64748b; margin-top:2px; }
        .header-right { text-align:right; font-size:10px; color:#94a3b8; line-height:1.5; }
        .print-btn { margin-bottom:12px; padding:6px 18px; background:#6366f1; color:#fff; border:none; border-radius:5px; font-size:12px; font-weight:600; cursor:pointer; }
        .print-btn:hover { background:#4f46e5; }
        table { width:100%; border-collapse:collapse; border:1px solid #e2e8f0; }
        th.slot-label, td.slot-no { width:28px; background:#f8fafc; font-size:9px; font-weight:700; color:#94a3b8; text-align:center; border-right:1px solid #e2e8f0; padding:4px 2px; }
        th.day-col { background:#6366f1; color:#fff; text-align:center; padding:7px 6px; border-right:1px solid rgba(255,255,255,.25); }
        th.day-col:last-child { border-right:none; }
        .day-name { font-size:11px; font-weight:700; letter-spacing:.2px; }
        .day-meta { font-size:9px; opacity:.8; margin-top:1px; }
        td { border-bottom:1px solid #f1f5f9; border-right:1px solid #f1f5f9; vertical-align:middle; padding:0; }
        td:last-child { border-right:none; }
        .period-cell { padding:5px 8px; background:#fff; }
        .break-cell   { padding:5px 8px; background:#fffbeb; }
        .cell-name { font-size:11px; font-weight:600; color:#1e293b; white-space:nowrap; }
        .break-cell .cell-name { color:#92400e; }
        .cell-time { font-size:9px; color:#94a3b8; margin-top:1px; }
        .break-cell .cell-time { color:#b45309; }
        .empty-cell { text-align:center; color:#e2e8f0; font-size:13px; padding:10px; }
        .summary-row td { background:#f8fafc; border-top:2px solid #e2e8f0; }
        .summary-cell { padding:5px 8px; font-size:9px; font-weight:600; color:#475569; text-align:center; }
        .footer { margin-top:10px; font-size:9px; color:#cbd5e1; text-align:center; }
        @media print {
          .no-print { display:none; }
          body { padding:0; }
          th.day-col, .break-cell { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
        }
      </style>
    </head><body>
      <button class="print-btn no-print" onclick="window.print()">🖨 Print / Save as PDF</button>
      <div class="header">
        <div>
          <div class="page-title">${name}</div>
          <div class="page-sub">Weekly School Schedule &nbsp;·&nbsp; ${days.length} working days</div>
        </div>
        <div class="header-right">
          ${new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })}<br>
          School Management System
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th class="slot-label">#</th>
            ${dayHeaders}
          </tr>
        </thead>
        <tbody>
          ${slotRows}
          <tr class="summary-row">
            <td class="slot-no"></td>
            ${summaryRow}
          </tr>
        </tbody>
      </table>
      <div class="footer">${name} &nbsp;·&nbsp; School Management System</div>
    </body></html>`);
    win.document.close();
  }

  countWorkingDays(days: DayScheduleDto[]): number {
    return days.filter(d => d.isWorkingDay).length;
  }

  periodNumbers(total: number): number[] {
    return Array.from({ length: Math.max(1, total - 1) }, (_, i) => i + 1);
  }

  private timeDiff(start: string, end: string): number {
    return Math.max(0, this.toMinutes(end) - this.toMinutes(start));
  }
  private toMinutes(t: string): number {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + (m || 0);
  }
  private fromMinutes(m: number): string {
    const h = Math.floor(m / 60) % 24;
    const min = m % 60;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  }
}
