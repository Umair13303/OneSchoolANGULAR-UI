import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AcademicService } from '../../../core/services/academic.service';
import { AcademicYear } from '../../../core/models/academic.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';

@Component({
  selector: 'app-academic-years',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, LoadingComponent, DatePickerComponent],
  template: `
    <app-page-header title="Academic Years" subtitle="Manage academic years">
      <button class="btn-primary" (click)="openAdd()">+ Add Year</button>
    </app-page-header>

    @if (loading()) { <app-loading /> }
    @else {
      <div class="card">
        <table class="table">
          <thead><tr><th>Label</th><th>Start Date</th><th>End Date</th><th>Status</th><th></th></tr></thead>
          <tbody>
            @for (y of years(); track y.academicYearId) {
              <tr>
                <td><strong>{{ y.yearLabel }}</strong></td>
                <td>{{ y.startDate | date:'dd-MMM-yyyy' }}</td>
                <td>{{ y.endDate | date:'dd-MMM-yyyy' }}</td>
                <td><span class="badge" [class.active]="y.isActive">{{ y.isActive ? 'Active' : 'Inactive' }}</span></td>
                <td class="actions-td">
                  <button class="btn-icon calendar-btn" title="Manage Calendar" (click)="goToCalendar(y)">
                    <span class="material-icons-round">event_note</span>
                    <span class="btn-icon-label">Calendar</span>
                  </button>
                  <button class="btn-icon" title="Edit" (click)="openEdit(y)">
                    <span class="material-icons-round">edit</span>
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    @if (showModal()) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3>{{ editingId() ? 'Edit Academic Year' : 'Add Academic Year' }}</h3>
          <div class="field"><label>Start Date *</label><app-date-picker [(ngModel)]="form.startDate" (dateChange)="onStartDateChange()" /></div>
          <div class="field"><label>End Date *</label><app-date-picker [(ngModel)]="form.endDate" [min]="form.startDate" /></div>
          <div class="field"><label>Label *</label><input [(ngModel)]="form.yearLabel" placeholder="e.g. 2025-26" /></div>
          <div class="toggle-row" (click)="form.isActive = !form.isActive">
            <div class="toggle-info">
              <span class="toggle-label">Active Year</span>
              <span class="toggle-sub">Mark this as the current academic year</span>
            </div>
            <div class="toggle-track" [class.on]="form.isActive">
              <div class="toggle-thumb"></div>
            </div>
          </div>
          @if (modalError()) { <p class="error-msg">{{ modalError() }}</p> }
          <div class="modal-actions">
            <button class="btn-secondary" (click)="closeModal()">Cancel</button>
            <button class="btn-primary" (click)="save()" [disabled]="saving()">{{ saving() ? 'Saving...' : 'Save' }}</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .badge{padding:3px 10px;border-radius:12px;font-size:12px;background:var(--red-s);color:var(--red)}
    .badge.active{background:var(--green-s);color:var(--green)}
    .actions-td{text-align:right;white-space:nowrap;padding-right:12px}
    .btn-icon{background:none;border:none;cursor:pointer;padding:5px;border-radius:6px;color:var(--t3);display:inline-flex;align-items:center;transition:background .15s,color .15s}
    .btn-icon:hover{background:var(--surface-2,#f1f5f9);color:var(--accent)}
    .btn-icon .material-icons-round{font-size:18px}
    .calendar-btn{gap:4px;padding:5px 10px;border:1px solid var(--border);color:var(--accent)}
    .calendar-btn:hover{background:#eef2ff;border-color:var(--accent)}
    .btn-icon-label{font-size:11px;font-weight:700}

    .toggle-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 14px;border:1px solid var(--border);border-radius:10px;cursor:pointer;user-select:none;transition:background .15s}
    .toggle-row:hover{background:var(--surface-2,#f8fafc)}
    .toggle-info{display:flex;flex-direction:column;gap:2px}
    .toggle-label{font-size:13px;font-weight:600;color:var(--t1)}
    .toggle-sub{font-size:11px;color:var(--t4)}
    .toggle-track{width:42px;height:24px;border-radius:99px;background:var(--border);position:relative;transition:background .2s;flex-shrink:0}
    .toggle-track.on{background:var(--accent)}
    .toggle-thumb{width:18px;height:18px;border-radius:50%;background:#fff;position:absolute;top:3px;left:3px;transition:transform .2s;box-shadow:0 1px 4px rgba(0,0,0,.2)}
    .toggle-track.on .toggle-thumb{transform:translateX(18px)}
  `]
})
export class AcademicYearsComponent implements OnInit {
  private svc    = inject(AcademicService);
  private router = inject(Router);
  years      = signal<AcademicYear[]>([]);
  loading    = signal(false);
  showModal  = signal(false);
  saving     = signal(false);
  modalError = signal('');
  editingId  = signal<number | null>(null);
  form = { yearLabel: '', startDate: '', endDate: '', isActive: true };

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getYears().subscribe({ next: y => { this.years.set(y); this.loading.set(false); }, error: () => this.loading.set(false) });
  }

  openAdd() {
    this.editingId.set(null);
    this.form = { ...this.defaultYearForm() };
    this.modalError.set('');
    this.showModal.set(true);
  }

  private defaultYearForm() {
    const now = new Date();
    const y = now.getFullYear();
    const short = String(y + 1).slice(-2);
    return {
      yearLabel: `${y}-${short}`,
      startDate: `${y}-04-01`,
      endDate:   `${y + 1}-03-31`,
      isActive:  true,
    };
  }

  openEdit(y: AcademicYear) {
    this.editingId.set(y.academicYearId);
    this.form = {
      yearLabel: y.yearLabel,
      startDate: y.startDate.substring(0, 10),
      endDate:   y.endDate.substring(0, 10),
      isActive:  y.isActive,
    };
    this.modalError.set('');
    this.showModal.set(true);
  }

  onStartDateChange() {
    if (!this.form.startDate) return;
    const y = new Date(this.form.startDate).getFullYear();
    this.form.endDate   = `${y + 1}-03-31`;
    this.form.yearLabel = `${y}-${String(y + 1).slice(-2)}`;
  }

  closeModal() { this.showModal.set(false); }

  goToCalendar(y: AcademicYear) {
    this.router.navigate(['/academics/years', y.academicYearId, 'calendar']);
  }

  save() {
    if (!this.form.yearLabel || !this.form.startDate || !this.form.endDate) { this.modalError.set('All fields are required.'); return; }
    this.saving.set(true);
    const id = this.editingId();
    const req = id ? this.svc.updateYear(id, this.form) : this.svc.createYear(this.form);
    req.subscribe({
      next: () => { this.saving.set(false); this.closeModal(); this.load(); },
      error: (e: any) => { this.saving.set(false); this.modalError.set(e?.error?.error ?? 'Failed to save.'); }
    });
  }
}
