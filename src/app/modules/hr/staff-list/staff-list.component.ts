import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Password } from 'primeng/password';
import { Select } from 'primeng/select';
import { Tag } from 'primeng/tag';
import { Dialog } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { Tooltip } from 'primeng/tooltip';
import { StaffService } from '../../../core/services/staff.service';
import { StaffDto, DEPARTMENTS, STAFF_STATUSES } from '../../../core/models/staff.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { ConfirmDeleteComponent } from '../../../shared/components/confirm-delete/confirm-delete.component';
import { ConfirmDeleteService } from '../../../shared/components/confirm-delete/confirm-delete.service';

@Component({
  selector: 'app-staff-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, PageHeaderComponent, LoadingComponent, ConfirmDeleteComponent,
    Button, InputText, Password, Select, Tag, Dialog, TableModule, IconField, InputIcon, Tooltip
  ],
  template: `
    <app-page-header title="Non-Teaching Staff" subtitle="Manage all non-teaching staff records" />

    <!-- Toolbar -->
    <div class="card mb-4 flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
      <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2.5">
        <p-iconfield class="min-w-[200px] flex-1">
          <p-inputicon class="pi pi-search" />
          <input pInputText class="w-full" [(ngModel)]="search" (ngModelChange)="onFilter()" placeholder="Search by name, CNIC or phone…" />
        </p-iconfield>
        <p-select class="w-full sm:w-52" [options]="departments" placeholder="All Departments" [showClear]="true"
          [(ngModel)]="filterDept" (onChange)="onFilter()" />
        <p-select class="w-full sm:w-44" [options]="statuses" placeholder="All Statuses" [showClear]="true"
          [(ngModel)]="filterStatus" (onChange)="onFilter()" />
      </div>
      <p-button label="Add Staff" icon="pi pi-user-plus" (onClick)="router.navigate(['/hr/staff/new'])" />
    </div>

    @if (loading()) { <app-loading /> }
    @else if (staff().length === 0) {
      <div class="card flex flex-col items-center gap-2.5 p-[60px] text-[var(--t3)]">
        <span class="material-icons-round text-5xl">groups</span>
        <p>No staff records found.</p>
      </div>
    } @else {
      <div class="card overflow-hidden p-0">
        <p-table [value]="staff()" dataKey="staffId" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '60rem' }" [scrollable]="true">
          <ng-template #header>
            <tr>
              <th style="width:3rem">#</th>
              <th>Name</th>
              <th>Designation</th>
              <th>Department</th>
              <th>Phone</th>
              <th>Employment</th>
              <th>Joining Date</th>
              <th>Status</th>
              <th>Login</th>
              <th class="text-right">Actions</th>
            </tr>
          </ng-template>
          <ng-template #body let-s let-i="rowIndex">
            <tr>
              <td class="text-xs text-[var(--t4)]">{{ i + 1 }}</td>
              <td>
                <div class="flex items-center gap-2.5">
                  <div class="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-white">
                    {{ s.fullName.charAt(0).toUpperCase() }}
                  </div>
                  <div>
                    <div class="text-[13px] font-semibold text-[var(--t1)]">{{ s.fullName }}</div>
                    @if (s.cnic) { <div class="font-mono text-[11px] text-[var(--t4)]">{{ s.cnic }}</div> }
                  </div>
                </div>
              </td>
              <td>{{ s.designation }}</td>
              <td>{{ s.department || '—' }}</td>
              <td>{{ s.phone || '—' }}</td>
              <td><p-tag [value]="s.employmentType" severity="info" [rounded]="true" /></td>
              <td>{{ s.joiningDate || '—' }}</td>
              <td><p-tag [value]="s.status" [severity]="statusSeverity(s.status)" [rounded]="true" /></td>
              <td>
                @if (s.userId) {
                  <p-tag icon="pi pi-verified" value="Active" severity="success" [rounded]="true" [pTooltip]="s.userEmail || ''" />
                } @else {
                  <p-button label="Create" icon="pi pi-plus-circle" size="small" severity="secondary" [outlined]="true" [rounded]="true"
                    (onClick)="openLoginModal(s)" />
                }
              </td>
              <td>
                <div class="flex items-center justify-end gap-1 whitespace-nowrap">
                  <p-button icon="pi pi-pencil" [text]="true" [rounded]="true" size="small" severity="secondary"
                    ariaLabel="Edit" pTooltip="Edit" (onClick)="router.navigate(['/hr/staff', s.staffId, 'edit'])" />
                  <p-button icon="pi pi-trash" [text]="true" [rounded]="true" size="small" severity="danger"
                    ariaLabel="Delete" pTooltip="Delete" (onClick)="deleteStaff(s)" />
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>
    }

    <!-- Create Login Dialog -->
    <p-dialog
      [header]="'Create Login for ' + (loginModal()?.fullName ?? '')"
      [visible]="!!loginModal()"
      (visibleChange)="!$event && closeLoginModal()"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
      [style]="{ width: '24rem' }"
      [breakpoints]="{ '640px': '96vw' }">
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1.5">
          <label for="login-email" class="text-[11px] font-semibold uppercase tracking-wide text-[var(--t3)]">Email</label>
          <input pInputText id="login-email" type="email" class="w-full" [(ngModel)]="loginEmail" placeholder="staff@school.com" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label for="login-password" class="text-[11px] font-semibold uppercase tracking-wide text-[var(--t3)]">Password</label>
          <p-password inputId="login-password" [(ngModel)]="loginPassword" [feedback]="false" [toggleMask]="true"
            placeholder="Min 6 characters" styleClass="w-full" inputStyleClass="w-full" appendTo="body" />
        </div>
        @if (loginError()) { <p class="m-0 text-xs text-red-500">{{ loginError() }}</p> }
      </div>
      <ng-template #footer>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <p-button label="Cancel" severity="secondary" [outlined]="true" (onClick)="closeLoginModal()" />
          <p-button [label]="loginSaving() ? 'Creating…' : 'Create Login'" icon="pi pi-check" [loading]="loginSaving()"
            [disabled]="loginSaving()" (onClick)="createLogin()" />
        </div>
      </ng-template>
    </p-dialog>

    <app-confirm-delete />
  `
})
export class StaffListComponent implements OnInit {
  private staffSvc = inject(StaffService);
  private confirmDelete = inject(ConfirmDeleteService);
  router = inject(Router);

  readonly departments = DEPARTMENTS;
  readonly statuses    = STAFF_STATUSES;

  staff       = signal<StaffDto[]>([]);
  loading     = signal(false);
  search      = '';
  filterDept: string | null = null;
  filterStatus: string | null = null;

  loginModal    = signal<StaffDto | null>(null);
  loginEmail    = '';
  loginPassword = '';
  loginSaving   = signal(false);
  loginError    = signal('');

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.staffSvc.getAll(this.search || undefined, this.filterDept || undefined, this.filterStatus || undefined).subscribe({
      next: data => { this.staff.set(data); this.loading.set(false); },
      error: ()   => this.loading.set(false)
    });
  }

  onFilter() { this.load(); }

  statusSeverity(status: string): 'success' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'Active': return 'success';
      case 'OnLeave': return 'warn';
      case 'Terminated': return 'danger';
      default: return 'secondary';
    }
  }

  deleteStaff(s: StaffDto) {
    this.confirmDelete.open(
      'Delete Staff?',
      `Are you sure you want to delete <strong>${s.fullName}</strong>? This action cannot be undone.`,
      () => this.staffSvc.delete(s.staffId),
      () => this.staff.update(list => list.filter(x => x.staffId !== s.staffId))
    );
  }

  openLoginModal(s: StaffDto) {
    this.loginModal.set(s);
    this.loginEmail = '';
    this.loginPassword = '';
    this.loginError.set('');
  }

  closeLoginModal() { this.loginModal.set(null); }

  createLogin() {
    if (!this.loginEmail || !this.loginPassword) { this.loginError.set('Email and password are required.'); return; }
    const s = this.loginModal()!;
    this.loginSaving.set(true);
    this.loginError.set('');
    this.staffSvc.createLogin(s.staffId, { email: this.loginEmail, password: this.loginPassword }).subscribe({
      next: updated => {
        this.staff.update(list => list.map(x => x.staffId === updated.staffId ? updated : x));
        this.loginSaving.set(false);
        this.closeLoginModal();
      },
      error: (e: any) => { this.loginSaving.set(false); this.loginError.set(e?.error?.error ?? 'Failed to create login.'); }
    });
  }
}
