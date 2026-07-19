import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DevCompanyService } from '../../../core/services/dev-company.service';
import { AuthService } from '../../../core/services/auth.service';
import { DevCompany } from '../../../core/models/dev-company.model';

@Component({
  selector: 'app-dev-company',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Developer Company</h1>
          <p class="page-sub">Manage Dev_Solutions branding shown in the superadmin panel</p>
        </div>
      </div>

      @if (loading()) {
        <div class="loading-wrap">
          <span class="material-icons-round spin">refresh</span> Loading…
        </div>
      } @else {
        <div class="card-grid">

          <!-- Left: form -->
          <div class="card form-card">
            <div class="card-head">
              <span class="material-icons-round card-icon">business</span>
              <h2 class="card-title">Company Information</h2>
            </div>

            <div class="form-grid">
              <div class="field full">
                <label>Company Name <span class="req">*</span></label>
                <input [(ngModel)]="form.name" placeholder="Dev_Solutions" />
              </div>

              <div class="field full">
                <label>Tagline</label>
                <input [(ngModel)]="form.tagline" placeholder="Empowering Schools with Smart Technology" />
              </div>

              <div class="field full">
                <label>Logo URL</label>
                <input [(ngModel)]="form.logoUrl" placeholder="https://…/logo.png" />
                <p class="hint">Paste a direct image URL. Shown in the sidebar brand area.</p>
              </div>

              <div class="field full">
                <label>Copyright Text</label>
                <input [(ngModel)]="form.copyrightText" placeholder="© 2026 Dev_Solutions. All rights reserved." />
              </div>

              <div class="field full">
                <label>Email</label>
                <input [(ngModel)]="form.email" type="email" placeholder="info@devsolutions.com" />
              </div>

              <div class="field">
                <label>Phone</label>
                <input [(ngModel)]="form.phone" placeholder="+92 300 0000000" />
              </div>

              <div class="field">
                <label>Website</label>
                <input [(ngModel)]="form.website" placeholder="https://devsolutions.com" />
              </div>

              <div class="field full">
                <label>Address</label>
                <input [(ngModel)]="form.address" placeholder="123 Tech Street, Karachi" />
              </div>
            </div>

            <div class="card-foot">
              @if (successMsg()) {
                <span class="success-msg">
                  <span class="material-icons-round">check_circle</span> {{ successMsg() }}
                </span>
              }
              @if (errorMsg()) {
                <span class="error-msg">
                  <span class="material-icons-round">error</span> {{ errorMsg() }}
                </span>
              }
              <button class="btn-save" (click)="save()" [disabled]="saving()">
                @if (saving()) { <span class="material-icons-round spin">refresh</span> Saving… }
                @else { <span class="material-icons-round">save</span> Save Changes }
              </button>
            </div>
          </div>

          <!-- Right: live preview -->
          <div class="card preview-card">
            <div class="card-head">
              <span class="material-icons-round card-icon">preview</span>
              <h2 class="card-title">Sidebar Preview</h2>
            </div>

            <div class="preview-sidebar">
              <div class="preview-brand">
                <div class="preview-mark">
                  @if (form.logoUrl) {
                    <img [src]="form.logoUrl" alt="logo" class="preview-logo" />
                  } @else {
                    <span class="material-icons-round">bolt</span>
                  }
                </div>
                <div class="preview-copy">
                  <span class="preview-name">{{ form.name || 'Dev_Solutions' }}</span>
                  <span class="preview-tag">{{ form.tagline || 'School Management' }}</span>
                </div>
              </div>

              <div class="preview-divider"></div>

              <div class="preview-nav-item active">
                <span class="material-icons-round">dashboard</span>
                <span>Dashboard</span>
              </div>
              <div class="preview-nav-item">
                <span class="material-icons-round">domain</span>
                <span>Institutes</span>
              </div>
              <div class="preview-nav-item">
                <span class="material-icons-round">manage_history</span>
                <span>Activity Logs</span>
              </div>
              <div class="preview-nav-item">
                <span class="material-icons-round">business</span>
                <span>Company Settings</span>
              </div>

              <div class="preview-copyright">
                {{ form.copyrightText || ('© ' + year + ' ' + (form.name || 'Dev_Solutions')) }}
              </div>
            </div>
          </div>

        </div>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 1100px; margin: 0 auto; }
    .page-header { margin-bottom: 24px; }
    .page-title { font-size: 22px; font-weight: 800; color: var(--t1); margin: 0 0 4px; }
    .page-sub { font-size: 13px; color: var(--t4); margin: 0; }

    .loading-wrap { display: flex; align-items: center; gap: 8px; color: var(--t4); padding: 40px 0; font-size: 13px; }

    .card-grid { display: grid; grid-template-columns: 1fr 360px; gap: 24px; }
    @media (max-width: 900px) { .card-grid { grid-template-columns: 1fr; } }

    .card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; }
    .card-head { display: flex; align-items: center; gap: 10px; padding: 18px 22px; border-bottom: 1px solid var(--border); background: var(--surface-2); }
    .card-icon { font-size: 20px; color: var(--accent); font-variation-settings: 'FILL' 1; }
    .card-title { font-size: 14px; font-weight: 700; color: var(--t1); margin: 0; }

    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 22px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field.full { grid-column: 1 / -1; }
    label { font-size: 12px; font-weight: 600; color: var(--t3); }
    .req { color: var(--red); }
    input {
      padding: 9px 12px; border: 1px solid var(--border); border-radius: 9px;
      background: var(--surface); color: var(--t1); font-size: 13px; font-family: inherit;
      transition: border-color 0.15s;
      &:focus { outline: none; border-color: var(--accent); }
    }
    .hint { font-size: 11px; color: var(--t4); margin: 2px 0 0; }

    .card-foot {
      display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
      padding: 16px 22px; border-top: 1px solid var(--border); background: var(--surface-2);
    }
    .btn-save {
      display: flex; align-items: center; gap: 8px;
      padding: 9px 20px; background: var(--accent); color: #fff;
      border: none; border-radius: 10px; font-size: 13px; font-weight: 700;
      cursor: pointer; font-family: inherit; transition: opacity 0.15s; margin-left: auto;
      .material-icons-round { font-size: 17px; }
      &:hover:not(:disabled) { opacity: 0.88; }
      &:disabled { opacity: 0.6; cursor: not-allowed; }
    }
    .success-msg { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--green); font-weight: 600; .material-icons-round { font-size: 16px; } }
    .error-msg   { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--red); font-weight: 600; .material-icons-round { font-size: 16px; } }

    /* Preview */
    .preview-card { }
    .preview-sidebar { padding: 16px; display: flex; flex-direction: column; gap: 4px; }
    .preview-brand { display: flex; align-items: center; gap: 10px; padding: 10px 8px 14px; }
    .preview-mark {
      width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
      background: linear-gradient(135deg, var(--accent), var(--accent-h));
      display: flex; align-items: center; justify-content: center;
      .material-icons-round { font-size: 20px; color: #fff; }
    }
    .preview-logo { width: 28px; height: 28px; object-fit: contain; border-radius: 6px; }
    .preview-name { font-size: 14px; font-weight: 800; color: var(--t1); display: block; line-height: 1.2; }
    .preview-tag  { font-size: 9px; color: var(--t4); text-transform: uppercase; letter-spacing: 0.8px; display: block; margin-top: 2px; font-weight: 600; }
    .preview-divider { height: 1px; background: var(--border); margin: 4px 0 8px; }
    .preview-nav-item {
      display: flex; align-items: center; gap: 10px; padding: 8px 10px;
      border-radius: 9px; font-size: 13px; color: var(--t3); font-weight: 500;
      .material-icons-round { font-size: 18px; color: var(--t4); }
      &.active { background: var(--accent-s); color: var(--accent); font-weight: 600; .material-icons-round { color: var(--accent); } }
    }
    .preview-copyright { font-size: 10px; color: var(--t5); text-align: center; margin-top: 16px; padding: 8px 0 4px; border-top: 1px solid var(--border); }

    @keyframes spin { to { transform: rotate(360deg); } }
    .spin { animation: spin 0.8s linear infinite; display: inline-block; }
  `]
})
export class DevCompanyComponent implements OnInit {
  private svc  = inject(DevCompanyService);
  private auth = inject(AuthService);

  loading    = signal(true);
  saving     = signal(false);
  successMsg = signal('');
  errorMsg   = signal('');

  year = new Date().getFullYear();

  form: DevCompany = {
    id: 1, name: 'Dev Solutions', tagline: '', logoUrl: '/branding/dev-solutions-logo.png',
    copyrightText: '', address: '', phone: '', email: '', website: ''
  };

  ngOnInit() {
    this.svc.get().subscribe({
      next: d => { this.form = { ...d }; this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  save() {
    if (!this.form.name.trim()) return;
    this.saving.set(true);
    this.successMsg.set('');
    this.errorMsg.set('');

    this.svc.update(this.form).subscribe({
      next: updated => {
        this.form = { ...updated };
        this.saving.set(false);
        this.successMsg.set('Saved successfully!');
        // Update the navbar live for the current superadmin session
        this.auth.updateCurrentUserBranding({
          instituteName: updated.name,
          tagline: updated.tagline,
          logoUrl: updated.logoUrl,
          copyrightText: updated.copyrightText
        });
        setTimeout(() => this.successMsg.set(''), 3000);
      },
      error: () => {
        this.saving.set(false);
        this.errorMsg.set('Failed to save. Please try again.');
      }
    });
  }
}
