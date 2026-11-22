import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Tag } from 'primeng/tag';
import { Dialog } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { Tooltip } from 'primeng/tooltip';
import { AcademicService } from '../../../core/services/academic.service';
import { AcademicYear } from '../../../core/models/academic.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';

@Component({
  selector: 'app-academic-years',
  standalone: true,
  imports: [
    CommonModule, FormsModule, PageHeaderComponent, LoadingComponent, DatePickerComponent,
    Button, InputText, Tag, Dialog, TableModule, ToggleSwitch, Tooltip
  ],
  template: `
    <div class="os-page compact">
    <app-page-header title="Academic Years" [dense]="true" routeUrl="/academics/years">
      <p-button label="Add Year" icon="pi pi-plus" (onClick)="openAdd()" />
    </app-page-header>

    <div class="os-stage">
      <div class="os-stage-body">
        @if (loading()) {
          <div class="state-pad"><app-loading /></div>
        } @else {
          <p-table [value]="years()" dataKey="academicYearId" styleClass="p-datatable-sm os-data-table" [tableStyle]="{ 'min-width': '100%' }">
            <ng-template #header>
              <tr>
                <th class="col-label">Label</th>
                <th class="col-start">Start Date</th>
                <th class="col-end">End Date</th>
                <th class="col-status">Status</th>
                <th class="col-actions"></th>
              </tr>
            </ng-template>
            <ng-template #body let-y>
              <tr>
                <td class="col-label"><strong>{{ y.yearLabel }}</strong></td>
                <td class="col-start">{{ y.startDate | date:'dd-MMM-yyyy' }}</td>
                <td class="col-end">{{ y.endDate | date:'dd-MMM-yyyy' }}</td>
                <td class="col-status">
                  <p-tag [value]="y.isActive ? 'Active' : 'Inactive'" [severity]="y.isActive ? 'success' : 'danger'" [rounded]="true" />
                </td>
                <td class="col-actions">
                  <div class="flex items-center justify-end gap-1.5 whitespace-nowrap pr-1.5">
                    <p-button
                      label="Calendar"
                      icon="pi pi-calendar"
                      size="small"
                      severity="secondary"
                      [outlined]="true"
                      ariaLabel="Manage Calendar"
                      pTooltip="Manage Calendar"
                      (onClick)="goToCalendar(y)" />
                    <p-button
                      icon="pi pi-pencil"
                      size="small"
                      severity="secondary"
                      [text]="true"
                      [rounded]="true"
                      ariaLabel="Edit"
                      pTooltip="Edit"
                      (onClick)="openEdit(y)" />
                  </div>
                </td>
              </tr>
            </ng-template>
            <ng-template #emptymessage>
              <tr><td colspan="5" class="text-center py-6 text-[var(--t4)]">No academic years yet.</td></tr>
            </ng-template>
          </p-table>
        }
      </div>
    </div>
    </div>

    <p-dialog
      [header]="editingId() ? 'Edit Academic Year' : 'Add Academic Year'"
      [visible]="showModal()"
      (visibleChange)="showModal.set($event)"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
      [style]="{ width: '28rem' }"
      [breakpoints]="{ '640px': '96vw' }">

      <div class="flex flex-col gap-1.5 mb-3.5">
        <label class="lbl">Start Date *</label>
        <app-date-picker [(ngModel)]="form.startDate" (dateChange)="onStartDateChange()" />
      </div>
      <div class="flex flex-col gap-1.5 mb-3.5">
        <label class="lbl">End Date *</label>
        <app-date-picker [(ngModel)]="form.endDate" [min]="form.startDate" />
      </div>
      <div class="flex flex-col gap-1.5 mb-3.5">
        <label class="lbl" for="yr-label">Label *</label>
        <input pInputText id="yr-label" class="w-full" [(ngModel)]="form.yearLabel" placeholder="e.g. 2025-26" />
      </div>

      <div class="toggle-row flex items-center justify-between gap-4 px-3.5 py-3">
        <div class="flex flex-col gap-0.5">
          <span class="toggle-label">Active Year</span>
          <span class="toggle-sub">Mark this as the current academic year</span>
        </div>
        <p-toggleswitch [(ngModel)]="form.isActive" />
      </div>

      @if (modalError()) { <p class="error-msg">{{ modalError() }}</p> }

      <ng-template #footer>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <p-button label="Cancel" severity="secondary" [outlined]="true" (onClick)="closeModal()" />
          <p-button
            [label]="saving() ? 'Saving...' : 'Save'"
            icon="pi pi-check"
            [loading]="saving()"
            [disabled]="saving()"
            (onClick)="save()" />
        </div>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .state-pad { padding: 16px; }
    .col-actions { width: 150px; }
    .lbl { font-size: 12px; font-weight: 700; color: var(--t2); }

    .toggle-row { border: 1px solid var(--border); border-radius: 10px; }
    .toggle-label { font-size: 13px; font-weight: 600; color: var(--t1); }
    .toggle-sub { font-size: 11px; color: var(--t4); }
    .error-msg { color: #ef4444; font-size: 12.5px; margin: 12px 0 0; }

    @media (max-width: 640px) {
      .col-start, .col-end { display: none !important; }
      .col-actions { width: 100px; }
    }
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
