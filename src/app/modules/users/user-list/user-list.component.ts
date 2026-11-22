import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputText } from 'primeng/inputtext';
import { Password } from 'primeng/password';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Tooltip } from 'primeng/tooltip';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { UserListDto } from '../../../core/models/user.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { environment } from '../../../../environments/environment';

type RoleSeverity = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';

const ROLE_SEVERITY: Record<string, RoleSeverity> = {
  superadmin: 'danger',
  admin:      'warn',
  principal:  'info',
  teacher:    'success',
  parent:     'contrast',
  staff:      'secondary',
};

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, PageHeaderComponent, LoadingComponent, EmptyStateComponent,
    Button, Dialog, IconField, InputIcon, InputText, Password, Select, TableModule, Tag, Tooltip
  ],
  template: `
    <app-page-header title="Users" subtitle="Manage user accounts, roles and signatures" routeUrl="/users">
      <p-button label="Add User" icon="pi pi-user-plus" (onClick)="showModal.set(true)" />
    </app-page-header>

    <!-- Toolbar -->
    <div class="card mb-4 flex flex-wrap items-center gap-2.5 px-4 py-3.5">
      <p-iconfield class="min-w-[200px] flex-1">
        <p-inputicon class="pi pi-search" />
        <input pInputText class="w-full" placeholder="Search by name or email..." [(ngModel)]="search" />
      </p-iconfield>
      <p-select class="w-full sm:w-48" [options]="roleFilterOptions()" optionLabel="label" optionValue="value"
        placeholder="All Roles" [showClear]="true" [(ngModel)]="roleFilter" />
    </div>

    @if (loading()) {
      <div class="card"><app-loading /></div>
    } @else if (filtered().length === 0) {
      <div class="card">
        <app-empty-state icon="manage_accounts" title="No users found" message="Add a user or adjust filters." />
      </div>
    } @else {
      <div class="card overflow-hidden p-0">
        <p-table [value]="filtered()" dataKey="userId" styleClass="p-datatable-sm"
          [tableStyle]="{ 'min-width': '52rem' }" [scrollable]="true">
          <ng-template #header>
            <tr>
              <th>User</th>
              <th>Email</th>
              @if (canSeePassword()) { <th>Password</th> }
              <th>Role</th>
              <th>Status</th>
              <th>Signature</th>
              <th>Joined</th>
            </tr>
          </ng-template>
          <ng-template #body let-u>
            <tr>
              <td>
                <div class="flex items-center gap-2.5">
                  <div class="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] text-[10.5px] font-extrabold text-white">
                    {{ initials(u.fullName) }}
                  </div>
                  <span class="text-[13.5px] font-semibold text-[var(--t1)]">{{ u.fullName }}</span>
                </div>
              </td>
              <td class="text-[13px] text-[var(--t4)]">{{ u.email }}</td>
              @if (canSeePassword()) {
                <td>
                  <div class="flex items-center gap-1.5">
                    <span class="min-w-[80px] font-mono text-[13px] tracking-wide text-[var(--t2)]">{{ visiblePasswords.has(u.userId) ? (u.password || '—') : '••••••••' }}</span>
                    <p-button [icon]="visiblePasswords.has(u.userId) ? 'pi pi-eye-slash' : 'pi pi-eye'" [text]="true" [rounded]="true"
                      size="small" severity="secondary" [ariaLabel]="visiblePasswords.has(u.userId) ? 'Hide' : 'Show'"
                      (onClick)="togglePassword(u.userId)" />
                  </div>
                </td>
              }
              <td><p-tag [value]="u.roleName | titlecase" [severity]="roleSeverity(u.roleName)" [rounded]="true" /></td>
              <td><p-tag [value]="u.isActive ? 'Active' : 'Inactive'" [severity]="u.isActive ? 'success' : 'secondary'" [rounded]="true" /></td>
              <td>
                <div class="flex items-center gap-1.5">
                  @if (u.signatureUrl) {
                    <img class="h-8 rounded border border-[var(--border)] bg-white p-0.5" [src]="apiBase + u.signatureUrl" alt="signature" />
                  } @else {
                    <span class="text-[13px] text-[var(--t4)]">—</span>
                  }
                  <p-button icon="pi pi-upload" size="small" severity="secondary" [outlined]="true"
                    ariaLabel="Upload Signature" pTooltip="Upload Signature" (onClick)="openSigUpload(u)" />
                </div>
              </td>
              <td class="text-[13px] text-[var(--t4)]">{{ u.createdAt | date:'mediumDate' }}</td>
            </tr>
          </ng-template>
          <ng-template #footer>
            <tr>
              <td [attr.colspan]="canSeePassword() ? 7 : 6" class="text-[11px] font-semibold uppercase tracking-wider text-[var(--t4)]">
                {{ filtered().length }} users
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>
    }

    <!-- Add User Dialog -->
    <p-dialog
      header="Add User"
      [visible]="showModal()"
      (visibleChange)="!$event && closeModal()"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
      [style]="{ width: '28rem' }"
      [breakpoints]="{ '640px': '96vw' }">
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1.5">
          <label for="nu-name" class="text-[11px] font-semibold uppercase tracking-wide text-[var(--t3)]">Full Name *</label>
          <input pInputText id="nu-name" class="w-full" [(ngModel)]="newUser.fullName" placeholder="Full name" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label for="nu-email" class="text-[11px] font-semibold uppercase tracking-wide text-[var(--t3)]">Email *</label>
          <input pInputText id="nu-email" type="email" class="w-full" [(ngModel)]="newUser.email" placeholder="email@school.edu" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label for="nu-pass" class="text-[11px] font-semibold uppercase tracking-wide text-[var(--t3)]">Password *</label>
          <p-password inputId="nu-pass" [(ngModel)]="newUser.password" [feedback]="false" [toggleMask]="true"
            placeholder="Min. 6 characters" styleClass="w-full" inputStyleClass="w-full" appendTo="body" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-[11px] font-semibold uppercase tracking-wide text-[var(--t3)]">Role *</label>
          <p-select class="w-full" [options]="roleOptions" optionLabel="label" optionValue="id"
            [(ngModel)]="newUser.roleId" appendTo="body" [overlayOptions]="{ baseZIndex: 1100 }" />
        </div>
        @if (modalError()) { <p class="m-0 text-xs text-red-500">{{ modalError() }}</p> }
      </div>
      <ng-template #footer>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <p-button label="Cancel" severity="secondary" [outlined]="true" (onClick)="closeModal()" />
          <p-button [label]="saving() ? 'Saving...' : 'Create User'" icon="pi pi-check" [loading]="saving()"
            [disabled]="saving()" (onClick)="save()" />
        </div>
      </ng-template>
    </p-dialog>

    <!-- Signature Upload Dialog -->
    <p-dialog
      [header]="'Upload Signature — ' + (sigUser()?.fullName ?? '')"
      [visible]="!!sigUser()"
      (visibleChange)="!$event && closeSigModal()"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
      [style]="{ width: '26rem' }"
      [breakpoints]="{ '640px': '96vw' }">
      <div class="flex flex-col gap-3.5">
        <p class="m-0 text-[13px] text-[var(--t3)]">Upload a clear signature image (PNG/JPG). It will appear on fee receipts.</p>
        @if (sigUser()?.signatureUrl) {
          <div class="text-center">
            <img class="inline-block max-h-20 rounded-md border border-[var(--border)] bg-white p-1.5" [src]="apiBase + sigUser()!.signatureUrl" alt="Current signature" />
            <p class="mx-0 mb-0 mt-1 text-[11px] text-[var(--t4)]">Current signature</p>
          </div>
        }
        <div class="flex flex-col gap-1.5">
          <label for="sig-file" class="text-[11px] font-semibold uppercase tracking-wide text-[var(--t3)]">Select Image *</label>
          <input id="sig-file" type="file" accept="image/*" class="text-[13px]" (change)="onSigFileChange($event)" />
        </div>
        @if (sigPreview()) {
          <div class="text-center">
            <img class="inline-block max-h-20 rounded-md border border-emerald-100 bg-white p-1.5" [src]="sigPreview()!" alt="Preview" />
            <p class="mx-0 mb-0 mt-1 text-[11px] text-[var(--t4)]">Preview</p>
          </div>
        }
        @if (sigError()) { <p class="m-0 text-xs text-red-500">{{ sigError() }}</p> }
      </div>
      <ng-template #footer>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <p-button label="Cancel" severity="secondary" [outlined]="true" (onClick)="closeSigModal()" />
          <p-button [label]="sigSaving() ? 'Uploading...' : 'Save Signature'" icon="pi pi-check" [loading]="sigSaving()"
            [disabled]="!sigFile || sigSaving()" (onClick)="saveSig()" />
        </div>
      </ng-template>
    </p-dialog>
  `
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
  roleFilter: string | null = '';

  // Options for the role filter p-select; derived from the existing `roles` list.
  roleFilterOptions = computed<{ value: string; label: string }[]>(() => [
    ...this.roles.map(r => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) }))
  ]);
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

  roleSeverity(role: string): RoleSeverity {
    return ROLE_SEVERITY[role.toLowerCase()] ?? 'secondary';
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
