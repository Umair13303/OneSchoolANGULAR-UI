import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StaffService } from '../../../core/services/staff.service';
import { StaffDto, DEPARTMENTS, STAFF_STATUSES } from '../../../core/models/staff.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { ConfirmDeleteComponent } from '../../../shared/components/confirm-delete/confirm-delete.component';
import { ConfirmDeleteService } from '../../../shared/components/confirm-delete/confirm-delete.service';

@Component({
  selector: 'app-staff-list',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, LoadingComponent, ConfirmDeleteComponent],
  template: `
    <app-page-header title="Non-Teaching Staff" subtitle="Manage all non-teaching staff records" />

    <!-- Toolbar -->
    <div class="toolbar card">
      <div class="filters">
        <div class="search-wrap">
          <span class="material-icons-round search-icon">search</span>
          <input class="search-input" [(ngModel)]="search" (ngModelChange)="onFilter()" placeholder="Search by name, CNIC or phone…" />
        </div>
        <select class="filter-select" [(ngModel)]="filterDept" (ngModelChange)="onFilter()">
          <option value="">All Departments</option>
          @for (d of departments; track d) { <option [value]="d">{{ d }}</option> }
        </select>
        <select class="filter-select" [(ngModel)]="filterStatus" (ngModelChange)="onFilter()">
          <option value="">All Statuses</option>
          @for (s of statuses; track s) { <option [value]="s">{{ s }}</option> }
        </select>
      </div>
      <button class="btn-primary" (click)="router.navigate(['/hr/staff/new'])">
        <span class="material-icons-round">person_add</span> Add Staff
      </button>
    </div>

    @if (loading()) { <app-loading /> }
    @else if (staff().length === 0) {
      <div class="empty-state card">
        <span class="material-icons-round">groups</span>
        <p>No staff records found.</p>
      </div>
    } @else {
      <div class="table-card card">
        <table class="staff-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Designation</th>
              <th>Department</th>
              <th>Phone</th>
              <th>Employment</th>
              <th>Joining Date</th>
              <th>Status</th>
              <th>Login</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (s of staff(); track s.staffId; let i = $index) {
              <tr>
                <td class="td-no">{{ i + 1 }}</td>
                <td class="td-name">
                  <div class="name-wrap">
                    <div class="avatar">{{ s.fullName.charAt(0).toUpperCase() }}</div>
                    <div>
                      <div class="name">{{ s.fullName }}</div>
                      @if (s.cnic) { <div class="cnic">{{ s.cnic }}</div> }
                    </div>
                  </div>
                </td>
                <td>{{ s.designation }}</td>
                <td>{{ s.department || '—' }}</td>
                <td>{{ s.phone || '—' }}</td>
                <td><span class="badge badge-emp">{{ s.employmentType }}</span></td>
                <td>{{ s.joiningDate || '—' }}</td>
                <td>
                  <span class="badge" [class.badge-active]="s.status==='Active'" [class.badge-leave]="s.status==='OnLeave'" [class.badge-term]="s.status==='Terminated'">
                    {{ s.status }}
                  </span>
                </td>
                <td>
                  @if (s.userId) {
                    <span class="login-chip has-login" title="{{ s.userEmail }}">
                      <span class="material-icons-round">verified_user</span> Active
                    </span>
                  } @else {
                    <button class="login-chip no-login" (click)="openLoginModal(s)">
                      <span class="material-icons-round">add_circle_outline</span> Create
                    </button>
                  }
                </td>
                <td class="td-actions">
                  <button class="icon-btn" (click)="router.navigate(['/hr/staff', s.staffId, 'edit'])" title="Edit">
                    <span class="material-icons-round">edit</span>
                  </button>
                  <button class="icon-btn danger" (click)="deleteStaff(s)" title="Delete">
                    <span class="material-icons-round">delete</span>
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    <!-- Create Login Modal -->
    @if (loginModal()) {
      <div class="modal-backdrop" (click)="closeLoginModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-title">Create Login for {{ loginModal()!.fullName }}</div>
          <div class="field">
            <label>Email</label>
            <input type="email" [(ngModel)]="loginEmail" placeholder="staff@school.com" />
          </div>
          <div class="field">
            <label>Password</label>
            <input type="password" [(ngModel)]="loginPassword" placeholder="Min 6 characters" />
          </div>
          @if (loginError()) { <p class="err">{{ loginError() }}</p> }
          <div class="modal-actions">
            <button class="btn-secondary" (click)="closeLoginModal()">Cancel</button>
            <button class="btn-primary" (click)="createLogin()" [disabled]="loginSaving()">
              {{ loginSaving() ? 'Creating…' : 'Create Login' }}
            </button>
          </div>
        </div>
      </div>
    }

    <app-confirm-delete />
  `,
  styles: [`
    .toolbar { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; padding:14px 18px; margin-bottom:16px; }
    .filters { display:flex; gap:10px; flex-wrap:wrap; align-items:center; flex:1; }
    .search-wrap { position:relative; display:flex; align-items:center; flex:1; min-width:200px; }
    .search-icon { position:absolute; left:10px; font-size:18px; color:var(--t4); pointer-events:none; }
    .search-input { width:100%; padding:8px 12px 8px 36px; border:1.5px solid var(--border); border-radius:8px; font-size:13px; background:var(--surface); color:var(--t1); outline:none; }
    .search-input:focus { border-color:var(--accent); }
    .filter-select { padding:8px 12px; border:1.5px solid var(--border); border-radius:8px; font-size:13px; background:var(--surface); color:var(--t1); cursor:pointer; outline:none; }
    .filter-select:focus { border-color:var(--accent); }

    .empty-state { display:flex; flex-direction:column; align-items:center; gap:10px; padding:60px; color:var(--t3); }
    .empty-state .material-icons-round { font-size:48px; }

    .table-card { padding:0; overflow-x:auto; }
    .staff-table { width:100%; border-collapse:collapse; min-width:800px; }
    th { padding:10px 14px; font-size:10.5px; font-weight:700; color:var(--t3); text-transform:uppercase; letter-spacing:.5px; text-align:left; background:var(--hover); border-bottom:1px solid var(--border); white-space:nowrap; }
    td { padding:11px 14px; border-bottom:1px solid var(--border); font-size:13px; color:var(--t2); vertical-align:middle; }
    tr:last-child td { border-bottom:none; }
    tr:hover td { background:var(--hover); }

    .td-no { width:40px; text-align:center; font-size:12px; color:var(--t4); }
    .td-name { min-width:180px; }
    .name-wrap { display:flex; align-items:center; gap:10px; }
    .avatar { width:34px; height:34px; border-radius:50%; background:var(--accent); color:#fff; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:700; flex-shrink:0; }
    .name { font-weight:600; color:var(--t1); font-size:13px; }
    .cnic { font-size:11px; color:var(--t4); font-family:monospace; margin-top:1px; }

    .badge { display:inline-block; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600; }
    .badge-emp    { background:#e0e7ff; color:#3730a3; }
    .badge-active { background:#dcfce7; color:#166534; }
    .badge-leave  { background:#fef3c7; color:#92400e; }
    .badge-term   { background:#fee2e2; color:#991b1b; }

    .login-chip { display:inline-flex; align-items:center; gap:4px; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600; border:none; cursor:pointer; }
    .has-login { background:#dcfce7; color:#166534; cursor:default; }
    .no-login  { background:#f1f5f9; color:var(--t3); }
    .no-login:hover { background:#e0e7ff; color:var(--accent); }
    .login-chip .material-icons-round { font-size:13px; }

    .td-actions { width:80px; text-align:right; }
    .icon-btn { border:none; background:transparent; cursor:pointer; padding:6px; color:var(--t3); border-radius:6px; }
    .icon-btn:hover { color:var(--t1); background:var(--hover); }
    .icon-btn.danger:hover { color:#ef4444; background:#fee2e2; }
    .icon-btn .material-icons-round { font-size:18px; }

    .modal-backdrop { position:fixed; inset:0; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; z-index:1000; }
    .modal { background:var(--surface); border-radius:12px; padding:28px; width:380px; max-width:92vw; display:flex; flex-direction:column; gap:16px; }
    .modal-title { font-size:15px; font-weight:700; color:var(--t1); }
    .field { display:flex; flex-direction:column; gap:5px; }
    label { font-size:11px; font-weight:600; color:var(--t3); text-transform:uppercase; letter-spacing:.5px; }
    input { padding:9px 12px; border:1.5px solid var(--border); border-radius:7px; font-size:13px; background:var(--surface); color:var(--t1); outline:none; }
    input:focus { border-color:var(--accent); }
    .modal-actions { display:flex; gap:10px; justify-content:flex-end; }
    .err { font-size:12px; color:#ef4444; margin:0; }
  `]
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
  filterDept  = '';
  filterStatus = '';

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
