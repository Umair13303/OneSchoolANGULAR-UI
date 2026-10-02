import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { UserListDto } from '../../core/models/user.model';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { PhotoUploadComponent } from '../../shared/components/photo-upload/photo-upload.component';
import { DatePickerComponent } from '../../shared/components/date-picker/date-picker.component';
import { environment } from '../../../environments/environment';
import { FileUploadResponse } from '../../core/models/file-upload.model';

@Component({
  selector: 'app-my-profile',
  standalone: true,
  imports: [
    CommonModule, FormsModule, PageHeaderComponent, LoadingComponent,
    PhotoUploadComponent, DatePickerComponent
  ],
  template: `
    <div class="os-page compact">
      <app-page-header [dense]="true" title="My Profile">
        <span class="role-chip">{{ profile()?.roleName | titlecase }}</span>
      </app-page-header>

      @if (loading()) { <app-loading /> }
      @else if (profile(); as p) {
        @if (flash()) { <div class="os-success">{{ flash() }}</div> }

        <div class="profile-grid">
          <section class="os-panel photo-panel">
            <h3>Profile photo</h3>
            <p class="muted">Shown in the header after you save.</p>
            <app-photo-upload
              entityType="user-photo"
              [entityId]="p.userId"
              label="Profile photo"
              [photoUrl]="photoUrl()"
              [fallbackColor]="avatarColor()"
              [fallbackText]="initials()"
              (uploaded)="onPhotoUploaded($event)" />
            @if (photoError()) { <div class="os-error">{{ photoError() }}</div> }
          </section>

          <section class="os-panel">
            <h3>Personal information</h3>
            <div class="form-grid">
              <div class="os-field">
                <label class="os-field-label">Full name *</label>
                <input class="os-input" [(ngModel)]="fullName" />
              </div>
              <div class="os-field">
                <label class="os-field-label">Email *</label>
                <input class="os-input" type="email" [(ngModel)]="email" />
              </div>
              <div class="os-field">
                <label class="os-field-label">Phone</label>
                <input class="os-input" [(ngModel)]="phone" />
              </div>
              <div class="os-field">
                <label class="os-field-label">Gender</label>
                <select class="os-input" [(ngModel)]="gender">
                  <option value="">—</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div class="os-field">
                <label class="os-field-label">Date of birth</label>
                <app-date-picker [(ngModel)]="dateOfBirth" />
              </div>
              <div class="os-field">
                <label class="os-field-label">CNIC</label>
                <input class="os-input" [(ngModel)]="cnic" />
              </div>
              <div class="os-field full">
                <label class="os-field-label">Address</label>
                <textarea class="os-textarea" rows="2" [(ngModel)]="address"></textarea>
              </div>
              <div class="os-field">
                <label class="os-field-label">Qualification</label>
                <input class="os-input" [(ngModel)]="qualification" />
              </div>
              <div class="os-field">
                <label class="os-field-label">Specialization</label>
                <input class="os-input" [(ngModel)]="specialization" />
              </div>
            </div>
            @if (profileError()) { <div class="os-error">{{ profileError() }}</div> }
            <div class="actions">
              <button type="button" class="btn-primary" [disabled]="savingProfile()" (click)="saveProfile()">
                {{ savingProfile() ? 'Saving…' : 'Save profile' }}
              </button>
            </div>
          </section>

          <section class="os-panel">
            <h3>Change password</h3>
            <div class="form-grid">
              <div class="os-field">
                <label class="os-field-label">Current password</label>
                <input class="os-input" type="password" [(ngModel)]="currentPassword" autocomplete="current-password" />
              </div>
              <div class="os-field">
                <label class="os-field-label">New password</label>
                <input class="os-input" type="password" [(ngModel)]="newPassword" autocomplete="new-password" />
              </div>
              <div class="os-field">
                <label class="os-field-label">Confirm new password</label>
                <input class="os-input" type="password" [(ngModel)]="confirmPassword" autocomplete="new-password" />
              </div>
            </div>
            @if (pwdError()) { <div class="os-error">{{ pwdError() }}</div> }
            <div class="actions">
              <button type="button" class="btn-primary" [disabled]="savingPwd()" (click)="savePassword()">
                {{ savingPwd() ? 'Updating…' : 'Update password' }}
              </button>
            </div>
          </section>
        </div>
      }
    </div>
  `,
  styles: [`
    .role-chip {
      font-size: .75rem; font-weight: 700; color: #1d4ed8; background: #eff6ff;
      border: 1px solid #bfdbfe; border-radius: 999px; padding: .2rem .65rem;
    }
    .os-success {
      background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;
      border-radius: 8px; padding: .5rem .75rem; margin-bottom: .75rem; font-size: .85rem; font-weight: 600;
    }
    .os-error { color: #b91c1c; font-size: .85rem; margin: .5rem 0; }
    .muted { color: #64748b; font-size: .82rem; margin: 0 0 .75rem; }
    .profile-grid { display: grid; gap: .85rem; }
    .os-panel {
      background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1rem 1.1rem;
    }
    .os-panel h3 { margin: 0 0 .35rem; font-size: 1rem; }
    .photo-panel { display: grid; justify-items: start; }
    .form-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: .65rem .75rem; margin-top: .65rem;
    }
    .os-field.full { grid-column: 1 / -1; }
    .os-field-label { display: block; font-size: .75rem; font-weight: 600; color: #64748b; margin-bottom: .25rem; }
    .os-input, .os-textarea {
      box-sizing: border-box; width: 100%; border: 1px solid #e5e7eb; border-radius: 8px;
      font: inherit; font-size: 13px; font-weight: 600;
    }
    .os-input { height: 36px; padding: 0 10px; }
    .os-textarea { min-height: 64px; padding: .5rem .65rem; resize: vertical; }
    .actions { display: flex; justify-content: flex-end; margin-top: .85rem; }
    @media (max-width: 640px) {
      .form-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class MyProfileComponent implements OnInit {
  private users = inject(UserService);
  private auth = inject(AuthService);

  profile = signal<UserListDto | null>(null);
  loading = signal(true);
  savingProfile = signal(false);
  savingPwd = signal(false);
  flash = signal('');
  profileError = signal('');
  pwdError = signal('');
  photoError = signal('');

  fullName = '';
  email = '';
  phone = '';
  gender = '';
  address = '';
  dateOfBirth: string | null = null;
  cnic = '';
  qualification = '';
  specialization = '';

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';

  ngOnInit() { this.reload(); }

  photoUrl() {
    const id = this.profile()?.photoFileId ?? this.auth.currentUser()?.photoFileId;
    return id ? `${environment.fileServerUrl}/files/${id}` : null;
  }

  initials() {
    const name = this.profile()?.fullName || this.auth.currentUser()?.fullName || '';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  avatarColor() {
    const name = this.profile()?.fullName || '';
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    const colors = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#3b82f6'];
    return colors[Math.abs(hash) % colors.length];
  }

  reload() {
    this.loading.set(true);
    this.users.getMe().subscribe({
      next: p => {
        this.profile.set(p);
        this.fullName = p.fullName || '';
        this.email = p.email || '';
        this.phone = p.phone || '';
        this.gender = p.gender || '';
        this.address = p.address || '';
        this.dateOfBirth = p.dateOfBirth || null;
        this.cnic = p.cnic || '';
        this.qualification = p.qualification || '';
        this.specialization = p.specialization || '';
        this.auth.patchCurrentUser({
          fullName: p.fullName,
          email: p.email,
          photoFileId: p.photoFileId ?? null
        });
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  saveProfile() {
    this.profileError.set('');
    if (!this.fullName.trim() || !this.email.trim()) {
      this.profileError.set('Full name and email are required.');
      return;
    }
    this.savingProfile.set(true);
    this.users.updateMe({
      fullName: this.fullName.trim(),
      email: this.email.trim(),
      phone: this.phone.trim() || null,
      gender: this.gender || null,
      address: this.address.trim() || null,
      dateOfBirth: this.dateOfBirth || null,
      cnic: this.cnic.trim() || null,
      qualification: this.qualification.trim() || null,
      specialization: this.specialization.trim() || null
    }).subscribe({
      next: p => {
        this.savingProfile.set(false);
        this.profile.set(p);
        this.auth.patchCurrentUser({
          fullName: p.fullName,
          email: p.email,
          photoFileId: p.photoFileId ?? null
        });
        this.showFlash('Profile saved.');
      },
      error: err => {
        this.savingProfile.set(false);
        this.profileError.set(err?.error?.error || 'Could not save profile.');
      }
    });
  }

  savePassword() {
    this.pwdError.set('');
    if (!this.currentPassword || !this.newPassword) {
      this.pwdError.set('Enter current and new password.');
      return;
    }
    if (this.newPassword.length < 6) {
      this.pwdError.set('New password must be at least 6 characters.');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.pwdError.set('New password and confirmation do not match.');
      return;
    }
    this.savingPwd.set(true);
    this.users.changeMyPassword({
      currentPassword: this.currentPassword,
      newPassword: this.newPassword
    }).subscribe({
      next: () => {
        this.savingPwd.set(false);
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        this.showFlash('Password updated.');
      },
      error: err => {
        this.savingPwd.set(false);
        this.pwdError.set(err?.error?.error || 'Could not update password.');
      }
    });
  }

  onPhotoUploaded(res: FileUploadResponse) {
    this.photoError.set('');
    this.users.updateMyPhoto(res.fileId).subscribe({
      next: p => {
        this.profile.set(p);
        this.auth.patchCurrentUser({ photoFileId: p.photoFileId ?? null });
        this.showFlash('Profile photo updated.');
      },
      error: err => this.photoError.set(err?.error?.error || 'Could not save photo.')
    });
  }

  private showFlash(msg: string) {
    this.flash.set(msg);
    setTimeout(() => this.flash.set(''), 3000);
  }
}
