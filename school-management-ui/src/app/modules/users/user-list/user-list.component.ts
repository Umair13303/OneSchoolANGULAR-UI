import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { UserListDto } from '../../../core/models/user.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { environment } from '../../../../environments/environment';

const ROLE_STYLE: Record<string, string> = {
  superadmin: 'color:#be123c;background:#fff1f4;border:1px solid #fecdd3',
  admin:      'color:#c2410c;background:#fff7ed;border:1px solid #fed7aa',
  principal:  'color:#0369a1;background:#e0f2fe;border:1px solid #bae6fd',
  teacher:    'color:#15803d;background:#dcfce7;border:1px solid #bbf7d0',
  parent:     'color:#6d28d9;background:#ede9fe;border:1px solid #ddd6fe',
  staff:      'color:#4b5563;background:#f3f4f6;border:1px solid #e5e7eb',
};

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, LoadingComponent, EmptyStateComponent],
  template: `
    <app-page-header title="Users" subtitle="Manage system users and roles">
      <button class="btn-primary" (click)="showModal.set(true)">
        <span class="material-icons-round" style="font-size:17px">person_add</span>
        Add User
      </button>
    </app-page-header>

    <div class="filter-bar">
      <div class="search-wrap">
        <span class="material-icons-round search-icon">search</span>
        <input class="search-input" placeholder="Search by name or email..." [(ngModel)]="search" />
      </div>
      <select class="filter-select" [(ngModel)]="roleFilter">
        <option value="">All Roles</option>
        @for (r of roles; track r) { <option [value]="r">{{ r | titlecase }}</option> }
      </select>
    </div>

    @if (loading()) {
      <div class="card"><app-loading /></div>
    } @else if (filtered().length === 0) {
      <div class="card">
        <app-empty-state icon="manage_accounts" title="No users found" message="Add a user or adjust filters." />
      </div>
    } @else {
      <div class="card">
        <div class="tbl-meta">
          <span class="tbl-count">{{ filtered().length }} users</span>
        </div>
        <table class="table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              @if (canSeePassword()) { <th>Password</th> }
              <th>Role</th>
              <th>Status</th>
              <th>Signature</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            @for (u of filtered(); track u.userId) {
              <tr>
                <td>
                  <div class="u-cell">
                    <div class="u-av">{{ initials(u.fullName) }}</div>
                    <span class="u-name">{{ u.fullName }}</span>
                  </div>
                </td>
                <td class="muted">{{ u.email }}</td>
                @if (canSeePassword()) {
                  <td>
                    <div class="pwd-cell">
                      <span class="pwd-text">{{ visiblePasswords.has(u.userId) ? (u.password || '—') : '••••••••' }}</span>
                      <button class="pwd-eye" (click)="togglePassword(u.userId)" title="{{ visiblePasswords.has(u.userId) ? 'Hide' : 'Show' }}">
                        <span class="material-icons-round">{{ visiblePasswords.has(u.userId) ? 'visibility_off' : 'visibility' }}</span>
                      </button>
                    </div>
                  </td>
                }
                <td>
                  <span class="role-tag" [style]="roleStyle(u.roleName)">{{ u.roleName | titlecase }}</span>
                </td>
                <td>
                  <span class="badge" [class.active]="u.isActive" [class.inactive]="!u.isActive">
                    {{ u.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td>
                  <div class="sig-cell">
                    @if (u.signatureUrl) {
                      <img class="sig-thumb" [src]="apiBase + u.signatureUrl" alt="signature" />
                    } @else {
                      <span class="no-sig">—</span>
                    }
                    <button class="sig-upload-btn" (click)="openSigUpload(u)" title="Upload Signature">
                      <span class="material-icons-round">upload</span>
                    </button>
                  </div>
                </td>
                <td class="muted">{{ u.createdAt | date:'mediumDate' }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    <!-- Add User Modal -->
    @if (showModal()) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-hd">
            <h3>Add User</h3>
            <button class="close-btn" (click)="closeModal()">
              <span class="material-icons-round">close</span>
            </button>
          </div>
          <div class="field"><label>Full Name *</label><input [(ngModel)]="newUser.fullName" placeholder="Full name" /></div>
          <div class="field"><label>Email *</label><input type="email" [(ngModel)]="newUser.email" placeholder="email@school.edu" /></div>
          <div class="field"><label>Password *</label><input type="password" [(ngModel)]="newUser.password" placeholder="Min. 6 characters" /></div>
          <div class="field">
            <label>Role *</label>
            <select [(ngModel)]="newUser.roleId">
              @for (r of roleOptions; track r.id) { <option [ngValue]="r.id">{{ r.label }}</option> }
            </select>
          </div>
          @if (modalError()) { <p class="error-msg">{{ modalError() }}</p> }
          <div class="modal-actions">
            <button class="btn-secondary" (click)="closeModal()">Cancel</button>
            <button class="btn-primary" (click)="save()" [disabled]="saving()">
              {{ saving() ? 'Saving...' : 'Create User' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Signature Upload Modal -->
    @if (sigUser()) {
      <div class="modal-overlay" (click)="closeSigModal()">
        <div class="modal" style="max-width:400px" (click)="$event.stopPropagation()">
          <div class="modal-hd">
            <h3>Upload Signature — {{ sigUser()!.fullName }}</h3>
            <button class="close-btn" (click)="closeSigModal()">
              <span class="material-icons-round">close</span>
            </button>
          </div>
          <p style="font-size:13px;color:var(--t3);margin:0 0 14px">Upload a clear signature image (PNG/JPG). It will appear on fee receipts.</p>
          @if (sigUser()!.signatureUrl) {
            <div style="text-align:center;margin-bottom:14px">
              <img [src]="apiBase + sigUser()!.signatureUrl" style="max-height:80px;border:1px solid var(--border);border-radius:6px;padding:6px;background:#fff" />
              <p style="font-size:11px;color:var(--t4);margin:4px 0 0">Current signature</p>
            </div>
          }
          <div class="field">
            <label>Select Image *</label>
            <input type="file" accept="image/*" (change)="onSigFileChange($event)" />
          </div>
          @if (sigPreview()) {
            <div style="text-align:center;margin-bottom:14px">
              <img [src]="sigPreview()!" style="max-height:80px;border:1px solid #d1fae5;border-radius:6px;padding:6px;background:#fff" />
              <p style="font-size:11px;color:var(--t4);margin:4px 0 0">Preview</p>
            </div>
          }
          @if (sigError()) { <p class="error-msg">{{ sigError() }}</p> }
          <div class="modal-actions">
            <button class="btn-secondary" (click)="closeSigModal()">Cancel</button>
            <button class="btn-primary" (click)="saveSig()" [disabled]="!sigFile || sigSaving()">
              {{ sigSaving() ? 'Uploading...' : 'Save Signature' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .tbl-meta { padding: 14px 18px 0; display: flex; justify-content: flex-end; }
    .tbl-count { font-size: 11px; font-weight: 600; color: var(--t4); text-transform: uppercase; letter-spacing: 0.6px; }
    .u-cell { display: flex; align-items: center; gap: 10px; }
    .u-av {
      width: 30px; height: 30px; border-radius: 8px;
      background: var(--accent);
      color: #fff; display: flex; align-items: center; justify-content: center;
      font-size: 10.5px; font-weight: 800; flex-shrink: 0;
    }
    .u-name { font-weight: 600; color: var(--t1); font-size: 13.5px; }
    .muted { color: var(--t4) !important; font-size: 13px; }
    .role-tag {
      display: inline-flex; align-items: center;
      padding: 3px 10px; border-radius: 99px;
      font-size: 11.5px; font-weight: 600;
    }
    .pwd-cell { display:flex; align-items:center; gap:6px; }
    .pwd-text { font-size:13px; color:var(--t2); font-family:monospace; letter-spacing:.5px; min-width:80px; }
    .pwd-eye { background:none; border:none; cursor:pointer; color:var(--t4); display:flex; align-items:center; padding:2px; border-radius:4px; }
    .pwd-eye:hover { color:var(--accent); background:var(--surface2,#f1f5f9); }
    .pwd-eye .material-icons-round { font-size:16px; }
    .sig-cell { display:flex; align-items:center; gap:6px; }
    .sig-thumb { height:32px; border:1px solid var(--border); border-radius:4px; background:#fff; padding:2px; }
    .no-sig { font-size:13px; color:var(--t4); }
    .sig-upload-btn {
      background:none; border:1px solid var(--border); border-radius:6px;
      cursor:pointer; color:var(--t3); padding:3px 6px;
      display:flex; align-items:center;
      .material-icons-round { font-size:15px; }
    }
    .sig-upload-btn:hover { color:var(--accent); border-color:var(--accent); }
    .modal-hd { display: flex; justify-content: space-between; align-items: center; }
    .close-btn {
      width: 30px; height: 30px; border-radius: 8px;
      border: 1px solid var(--border); background: transparent;
      color: var(--t3); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.15s;
      .material-icons-round { font-size: 17px; }
    }
    .close-btn:hover { background: var(--surface-2); color: var(--t1); }
  `]
})
export class UserListComponent implements OnInit {
  private svc     = inject(UserService);
  private authSvc = inject(AuthService);

  apiBase = environment.serverUrl;

  users           = signal<UserListDto[]>([]);
  loading         = signal(false);
  showModal       = signal(false);
  saving          = signal(false);
  modalError      = signal('');
  search          = '';
  roleFilter      = '';
  visiblePasswords = new Set<number>();

  // Signature upload state
  sigUser    = signal<UserListDto | null>(null);
  sigFile: File | null = null;
  sigPreview = signal<string | null>(null);
  sigSaving  = signal(false);
  sigError   = signal('');

  canSeePassword(): boolean {
    return this.authSvc.hasRole('superadmin', 'admin');
  }

  togglePassword(userId: number): void {
    if (this.visiblePasswords.has(userId)) this.visiblePasswords.delete(userId);
    else this.visiblePasswords.add(userId);
  }

  readonly roles = ['superadmin','admin','principal','teacher','parent','staff'];
  readonly roleOptions = [
    { id: 1, label: 'SuperAdmin' }, { id: 2, label: 'Admin' },
    { id: 3, label: 'Principal' },  { id: 4, label: 'Teacher' },
    { id: 5, label: 'Parent' },     { id: 6, label: 'Staff' }
  ];
  newUser = { fullName: '', email: '', password: '', roleId: 4 };

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getAll().subscribe({
      next: u => { this.users.set(u); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  filtered(): UserListDto[] {
    const q = this.search.toLowerCase();
    return this.users().filter(u =>
      (!q || u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) &&
      (!this.roleFilter || u.roleName === this.roleFilter)
    );
  }

  initials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  roleStyle(role: string): string {
    return ROLE_STYLE[role.toLowerCase()] ?? ROLE_STYLE['staff'];
  }

  closeModal() {
    this.showModal.set(false); this.modalError.set('');
    this.newUser = { fullName: '', email: '', password: '', roleId: 4 };
  }

  save() {
    if (!this.newUser.fullName || !this.newUser.email || !this.newUser.password) {
      this.modalError.set('All fields are required.'); return;
    }
    this.saving.set(true);
    this.svc.create(this.newUser).subscribe({
      next: () => { this.saving.set(false); this.closeModal(); this.load(); },
      error: (e: any) => { this.saving.set(false); this.modalError.set(e?.error?.error ?? 'Failed to save.'); }
    });
  }

  openSigUpload(u: UserListDto) {
    this.sigUser.set(u);
    this.sigFile = null;
    this.sigPreview.set(null);
    this.sigError.set('');
  }

  closeSigModal() {
    this.sigUser.set(null);
    this.sigFile = null;
    this.sigPreview.set(null);
  }

  onSigFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.sigFile = input.files[0];
    const reader = new FileReader();
    reader.onload = e => this.sigPreview.set(e.target?.result as string);
    reader.readAsDataURL(this.sigFile);
  }

  saveSig() {
    if (!this.sigFile || !this.sigUser()) return;
    this.sigSaving.set(true);
    this.svc.uploadSignature(this.sigUser()!.userId, this.sigFile).subscribe({
      next: res => {
        this.sigSaving.set(false);
        // Update the user in the list in-place
        this.users.update(list => list.map(u =>
          u.userId === this.sigUser()!.userId ? { ...u, signatureUrl: res.signatureUrl } : u
        ));
        this.closeSigModal();
      },
      error: (e: any) => { this.sigSaving.set(false); this.sigError.set(e?.error?.error ?? 'Upload failed.'); }
    });
  }
}
