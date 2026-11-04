import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';
import { StudentService, StudentDocumentDto, GuardianPortalResult } from '../../../core/services/student.service';
import { InstituteService } from '../../../core/services/institute.service';
import { FileUploadService } from '../../../core/services/file-upload.service';
import { UserService } from '../../../core/services/user.service';
import { UserListDto } from '../../../core/models/user.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { PhotoUploadComponent } from '../../../shared/components/photo-upload/photo-upload.component';
import { StudentLeavingComponent } from '../student-leaving/student-leaving.component';
import { StudentTransferDialogComponent } from '../student-transfer-dialog/student-transfer-dialog.component';

@Component({
  selector: 'app-student-profile',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule,
    PageHeaderComponent, LoadingComponent, PhotoUploadComponent,
    StudentLeavingComponent, StudentTransferDialogComponent
  ],
  template: `
    <div class="os-page compact">
      <app-page-header [dense]="true" title="Student Profile" routeUrl="/students/list">
        @if (student(); as s) {
          <a [routerLink]="['/students/edit', s.studentId]" class="btn-secondary">
            <span class="material-icons-round">edit</span> Edit
          </a>
        }
      </app-page-header>

      @if (loading()) {
        <div class="os-stage"><div class="os-stage-body pad"><app-loading /></div></div>
      } @else if (student(); as s) {
        <div class="os-stage">
          <div class="profile-hero">
            <div class="hero-photo">
              @if (s.photoFileId) {
                <img [src]="photoSrc(s.photoFileId)" [alt]="fullName(s)" />
              } @else {
                <div class="hero-fallback">{{ (s.firstName || '?')[0] }}</div>
              }
            </div>
            <div class="hero-main">
              <div class="hero-top">
                <h2>{{ fullName(s) }}</h2>
                <span class="badge" [class.active]="s.isActive" [class.inactive]="!s.isActive">
                  {{ s.isActive ? 'Active' : 'Inactive' }}
                </span>
              </div>
              <div class="hero-meta">
                <span class="adm-pill">{{ s.admissionNo }}</span>
                <span>{{ classLabel(s) }}</span>
                <span>{{ s.currentAcademicYearLabel || '—' }}</span>
              </div>
              <div class="hero-actions">
                <button type="button" class="btn-secondary" (click)="printCard()">
                  <span class="material-icons-round">badge</span> ID Card
                </button>
                <button type="button" class="btn-secondary" (click)="downloadIdPdf()" [disabled]="pdfBusy()">
                  <span class="material-icons-round">picture_as_pdf</span> {{ pdfBusy() ? 'PDF…' : 'ID PDF' }}
                </button>
                @if (s.isActive) {
                  <button type="button" class="btn-secondary" (click)="openTransfer('Transfer')">
                    <span class="material-icons-round">swap_horiz</span> Transfer
                  </button>
                  <button type="button" class="btn-secondary" (click)="openTransfer('Promote')">
                    <span class="material-icons-round">trending_up</span> Promote
                  </button>
                  <button type="button" class="btn-secondary danger" (click)="showLeave.set(true)">
                    <span class="material-icons-round">exit_to_app</span> Leave
                  </button>
                } @else {
                  <button type="button" class="btn-primary" (click)="openTransfer('Readmit')">
                    <span class="material-icons-round">person_add</span> Re-admit
                  </button>
                }
                <a class="btn-secondary" [routerLink]="['/fees/student-fees']" [queryParams]="{ studentId: s.studentId }">
                  <span class="material-icons-round">payments</span> Fees
                </a>
                <a class="btn-secondary" [routerLink]="['/reports']" [queryParams]="{ studentId: s.studentId, tab: 'student' }">
                  <span class="material-icons-round">insights</span> Reports
                </a>
                <button type="button" class="btn-secondary danger" (click)="confirmSoftDelete()" [disabled]="deleteBusy()">
                  <span class="material-icons-round">delete</span> Delete
                </button>
              </div>
            </div>
          </div>

          <div class="os-stage-body pad profile-grid">
            <section class="panel">
              <h3>Personal</h3>
              <dl class="kv">
                <div><dt>Date of Birth</dt><dd>{{ fmt(s.dateOfBirth) }}</dd></div>
                <div><dt>Gender</dt><dd>{{ s.gender || '—' }}</dd></div>
                <div><dt>Blood Group</dt><dd>{{ s.bloodGroup || '—' }}</dd></div>
                <div><dt>Religion</dt><dd>{{ s.religion || '—' }}</dd></div>
                <div><dt>Nationality</dt><dd>{{ s.nationality || '—' }}</dd></div>
                <div><dt>Phone</dt><dd>{{ s.phone || '—' }}</dd></div>
                <div><dt>Email</dt><dd>{{ s.email || '—' }}</dd></div>
                <div class="full"><dt>Address</dt><dd>{{ s.address || '—' }}</dd></div>
                <div><dt>Admitted</dt><dd>{{ fmt(s.admissionDate) }}</dd></div>
                @if (!s.isActive) {
                  <div><dt>Left</dt><dd>{{ fmt(s.leavingDate) }}</dd></div>
                  <div class="full"><dt>Reason</dt><dd>{{ s.leavingReason || '—' }}</dd></div>
                }
              </dl>
            </section>

            <section class="panel">
              <h3>Guardians &amp; Portal</h3>
              @if (s.siblingOrder) {
                <p class="muted sib-note">Sibling order #{{ s.siblingOrder }}{{ s.siblingGroupKey ? ' · group ' + s.siblingGroupKey : '' }}</p>
              }
              @if (s.guardians?.length) {
                @for (g of s.guardians; track g.guardianId) {
                  <div class="guardian-block">
                    <dl class="kv">
                      <div class="full"><dt>Name</dt><dd>{{ g.fullName }}</dd></div>
                      <div><dt>Relation</dt><dd>{{ g.relation || '—' }}</dd></div>
                      <div><dt>Phone</dt><dd>{{ g.phone || '—' }}</dd></div>
                      <div><dt>CNIC</dt><dd>{{ g.cnic || '—' }}</dd></div>
                      <div><dt>Occupation</dt><dd>{{ g.occupation || '—' }}</dd></div>
                      <div class="full">
                        <dt>Parent Portal</dt>
                        <dd>
                          @if (g.userId) {
                            <span class="ok-chip">Linked (User #{{ g.userId }})</span>
                            <button type="button" class="linkish danger" (click)="unlinkPortal(g.guardianId)" [disabled]="portalBusy()">
                              Unlink
                            </button>
                          } @else {
                            <span class="muted">Not linked</span>
                          }
                        </dd>
                      </div>
                    </dl>
                    @if (!g.userId) {
                      <div class="portal-box">
                        <label class="fld">
                          <span>New login email (optional)</span>
                          <input
                            [ngModel]="portalEmails[g.guardianId] || ''"
                            (ngModelChange)="portalEmails[g.guardianId] = $event"
                            [name]="'portalEmail' + g.guardianId"
                            placeholder="parent@email.com" />
                        </label>
                        <button type="button" class="btn-primary" (click)="createPortal(g.guardianId)" [disabled]="portalBusy()">
                          {{ portalBusy() ? 'Working…' : 'Create Parent Login' }}
                        </button>
                        <label class="fld">
                          <span>Or link existing parent user</span>
                          <select
                            [ngModel]="linkUserIds[g.guardianId] ?? null"
                            (ngModelChange)="linkUserIds[g.guardianId] = $event"
                            [name]="'linkUser' + g.guardianId">
                            <option [ngValue]="null">Select parent account</option>
                            @for (u of parentUsers(); track u.userId) {
                              <option [ngValue]="u.userId">{{ u.fullName }} ({{ u.email }})</option>
                            }
                          </select>
                        </label>
                        <button type="button" class="btn-secondary" (click)="linkExistingPortal(g.guardianId)" [disabled]="portalBusy() || !linkUserIds[g.guardianId]">
                          Link selected user
                        </button>
                      </div>
                    }
                  </div>
                }
                @if (portalResult(); as pr) {
                  <div class="portal-result">
                    <p>Account ready for <strong>{{ pr.email }}</strong></p>
                    @if (pr.temporaryPassword) {
                      <p>Temp password: <code>{{ pr.temporaryPassword }}</code>
                        <button type="button" class="linkish" (click)="copyText(pr.temporaryPassword!)">Copy</button>
                      </p>
                    }
                    @if (pr.inviteMessage) {
                      <label class="fld">
                        <span>Invite message (WhatsApp / SMS)</span>
                        <textarea readonly rows="6">{{ pr.inviteMessage }}</textarea>
                      </label>
                      <button type="button" class="btn-secondary" (click)="copyText(pr.inviteMessage!)">Copy invite</button>
                    }
                  </div>
                }
                @if (portalError()) { <p class="err">{{ portalError() }}</p> }
              } @else {
                <p class="muted">No guardian on file. Edit the student to add one.</p>
              }
            </section>

            <section class="panel full-span">
              <h3>Documents</h3>
              <div class="docs-row">
                <div class="doc-slot">
                  <span class="doc-lbl">Photo</span>
                  <app-photo-upload
                    entityType="student-photo"
                    [entityId]="s.studentId"
                    [photoUrl]="s.photoFileId ? photoSrc(s.photoFileId) : null"
                    (uploaded)="onDocUploaded($event.fileId, 'student-photo')" />
                </div>
                <div class="doc-slot">
                  <span class="doc-lbl">Birth Certificate</span>
                  <label class="file-btn">
                    <span class="material-icons-round">upload_file</span>
                    {{ docLabel('birth-certificate') }}
                    <input type="file" accept="image/*,.pdf" (change)="onDocFile($event, 'birth-certificate')" [disabled]="docBusy()" />
                  </label>
                </div>
                <div class="doc-slot">
                  <span class="doc-lbl">Previous School Cert</span>
                  <label class="file-btn">
                    <span class="material-icons-round">upload_file</span>
                    {{ docLabel('prev-school-cert') }}
                    <input type="file" accept="image/*,.pdf" (change)="onDocFile($event, 'prev-school-cert')" [disabled]="docBusy()" />
                  </label>
                </div>
              </div>
              @if (docs().length) {
                <ul class="doc-list">
                  @for (d of docs(); track d.fileId) {
                    <li>
                      <span class="material-icons-round">description</span>
                      <span class="doc-type">{{ d.entityType }}</span>
                      <span class="doc-name">{{ d.originalName }}</span>
                      <a [href]="fileHref(d)" target="_blank" rel="noopener">Open</a>
                    </li>
                  }
                </ul>
              }
              @if (docError()) { <p class="err">{{ docError() }}</p> }
            </section>
          </div>
        </div>
      }
    </div>

    @if (showLeave() && student()) {
      <app-student-leaving
        [studentId]="student()!.studentId"
        [studentName]="fullName(student()!)"
        [admissionNo]="student()!.admissionNo"
        (closed)="onLeaveClosed($event)" />
    }
    @if (transferMode() && student(); as s) {
      <app-student-transfer-dialog
        [studentId]="s.studentId"
        [studentName]="fullName(s)"
        [admissionNo]="s.admissionNo"
        [isActive]="s.isActive"
        [initialMode]="transferMode()!"
        (closed)="onTransferClosed($event)" />
    }
  `,
  styles: [`
    .profile-hero {
      display: flex; gap: 18px; padding: 18px 20px; border-bottom: 1px solid var(--border);
      background: linear-gradient(135deg, var(--accent-s), var(--surface));
      align-items: stretch;
    }
    .hero-photo {
      width: 112px; height: 112px; border-radius: 18px; overflow: hidden; flex-shrink: 0;
      border: 2px solid rgba(255,255,255,.7); box-shadow: 0 6px 18px rgba(0,0,0,.12);
      background: var(--surface-2);
    }
    .hero-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .hero-fallback {
      width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
      background: var(--accent); color: #fff; font-size: 42px; font-weight: 800; text-transform: uppercase;
    }
    .hero-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px; }
    .hero-top { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .hero-top h2 { margin: 0; font-size: 20px; font-weight: 800; color: var(--t1); }
    .hero-meta { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; color: var(--t3); font-size: 13px; }
    .adm-pill {
      font-family: 'Courier New', monospace; font-size: 11.5px; font-weight: 700; color: var(--accent);
      background: var(--accent-s); border: 1px solid var(--accent-g); padding: 2px 9px; border-radius: 5px;
    }
    .hero-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
    .btn-secondary, .btn-primary {
      display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 12px;
      border-radius: 9px; font-size: 12.5px; font-weight: 700; text-decoration: none; cursor: pointer;
    }
    .btn-secondary {
      border: 1px solid var(--border); background: var(--surface); color: var(--t2);
    }
    .btn-secondary.danger:hover { color: #b91c1c; border-color: #fecaca; background: #fef2f2; }
    .btn-primary { border: none; background: var(--accent); color: #fff; }
    .btn-secondary .material-icons-round, .btn-primary .material-icons-round { font-size: 16px; }

    .profile-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 14px;
    }
    .panel {
      background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 14px 16px;
    }
    .panel h3 { margin: 0 0 12px; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: .5px; color: var(--t3); }
    .full-span { grid-column: 1 / -1; }
    .kv { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 14px; margin: 0; }
    .kv .full { grid-column: 1 / -1; }
    .kv dt { font-size: 11px; font-weight: 700; color: var(--t4); text-transform: uppercase; letter-spacing: .4px; }
    .kv dd { margin: 2px 0 0; font-size: 13.5px; font-weight: 600; color: var(--t1); }
    .muted { color: var(--t4); font-size: 13px; }
    .ok-chip {
      display: inline-block; padding: 2px 8px; border-radius: 99px; background: var(--green-s, #ecfdf5);
      color: var(--green, #059669); font-size: 12px; font-weight: 700;
    }
    .portal-box { margin-top: 12px; display: flex; flex-direction: column; gap: 10px; }
    .fld { display: flex; flex-direction: column; gap: 5px; font-size: 12px; font-weight: 600; color: var(--t3); }
    .fld input {
      height: 38px; border-radius: 10px; border: 1px solid var(--border); padding: 0 12px;
      background: var(--surface-2); color: var(--t1);
    }
    .portal-result {
      background: var(--accent-s); border: 1px solid var(--accent-g); border-radius: 10px; padding: 10px 12px;
      font-size: 13px; display: flex; flex-direction: column; gap: 8px; margin-top: 12px;
    }
    .portal-result code { font-weight: 800; }
    .portal-result textarea {
      width: 100%; font-family: inherit; font-size: 12px; line-height: 1.4;
      border: 1px solid var(--border); border-radius: 8px; padding: 8px; resize: vertical; background: var(--surface);
      color: var(--t1);
    }
    .guardian-block + .guardian-block { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border); }
    .sib-note { margin: 0 0 10px; font-size: 12px; }
    .linkish { border: none; background: none; color: var(--accent); font-weight: 700; cursor: pointer; margin-left: 8px; }
    .linkish.danger { color: #b91c1c; }
    .fld select {
      height: 38px; border-radius: 10px; border: 1px solid var(--border); padding: 0 12px;
      background: var(--surface-2); color: var(--t1);
    }
    .err { color: #ef4444; font-size: 12.5px; margin: 0; }

    .docs-row { display: flex; flex-wrap: wrap; gap: 18px; margin-bottom: 12px; }
    .doc-slot { display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
    .doc-lbl { font-size: 11px; font-weight: 700; color: var(--t4); text-transform: uppercase; }
    .file-btn {
      display: inline-flex; align-items: center; gap: 6px; height: 38px; padding: 0 12px;
      border-radius: 10px; border: 1px dashed var(--border); background: var(--surface-2);
      color: var(--t2); font-size: 12.5px; font-weight: 600; cursor: pointer;
    }
    .file-btn input { display: none; }
    .file-btn .material-icons-round { font-size: 18px; }
    .doc-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
    .doc-list li {
      display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 10px;
      background: var(--surface-2); border: 1px solid var(--border); font-size: 13px;
    }
    .doc-list .material-icons-round { font-size: 18px; color: var(--t4); }
    .doc-type { font-weight: 700; color: var(--t3); min-width: 140px; }
    .doc-name { flex: 1; color: var(--t1); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .doc-list a { color: var(--accent); font-weight: 700; text-decoration: none; }

    @media (max-width: 800px) {
      .profile-hero { flex-direction: column; align-items: flex-start; }
      .profile-grid, .kv { grid-template-columns: 1fr; }
    }
  `]
})
export class StudentProfileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private studentSvc = inject(StudentService);
  private instituteSvc = inject(InstituteService);
  private fileSvc = inject(FileUploadService);
  private userSvc = inject(UserService);

  loading = signal(true);
  student = signal<any | null>(null);
  docs = signal<StudentDocumentDto[]>([]);
  showLeave = signal(false);
  transferMode = signal<'Transfer' | 'Promote' | 'Readmit' | null>(null);

  portalEmails: Record<number, string> = {};
  linkUserIds: Record<number, number | null> = {};
  parentUsers = signal<UserListDto[]>([]);
  portalBusy = signal(false);
  portalError = signal('');
  portalResult = signal<GuardianPortalResult | null>(null);
  pdfBusy = signal(false);
  deleteBusy = signal(false);

  docBusy = signal(false);
  docError = signal('');

  private institute: any = null;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) { this.router.navigate(['/students/list']); return; }
    this.instituteSvc.getMyInstitute().subscribe({ next: i => this.institute = i, error: () => {} });
    this.userSvc.getAll().subscribe({
      next: users => this.parentUsers.set(users.filter(u => {
        const r = (u.roleName || '').toLowerCase();
        // Teachers/staff/principals can also be parents at the same school.
        return r === 'parent' || r === 'teacher' || r === 'staff' || r === 'principal';
      })),
      error: () => this.parentUsers.set([])
    });
    this.reload(id);
  }

  reload(id: number): void {
    this.loading.set(true);
    this.studentSvc.getById(id).subscribe({
      next: s => {
        this.student.set(s);
        this.loading.set(false);
        this.studentSvc.getDocuments(id).subscribe({ next: d => this.docs.set(d), error: () => this.docs.set([]) });
      },
      error: () => { this.loading.set(false); this.router.navigate(['/students/list']); }
    });
  }

  fullName(s: any): string { return `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim(); }
  classLabel(s: any): string {
    return [s.currentClassName, s.currentSection].filter(Boolean).join(' ') || '—';
  }
  photoSrc(fileId: number): string { return `${environment.fileServerUrl}/files/${fileId}`; }
  fmt(d: string | null | undefined): string {
    if (!d) return '—';
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  docLabel(type: string): string {
    const d = this.docs().find(x => x.entityType === type);
    return d ? d.originalName : 'Upload';
  }
  fileHref(d: StudentDocumentDto): string {
    if (d.fileUrl?.startsWith('http')) return d.fileUrl.replace(/\/api\/files\//, '/api/files/');
    return `${environment.fileServerUrl}/files/${d.fileId}`;
  }

  openTransfer(mode: 'Transfer' | 'Promote' | 'Readmit'): void {
    this.transferMode.set(mode);
  }
  onTransferClosed(ok: boolean): void {
    this.transferMode.set(null);
    if (ok && this.student()) this.reload(this.student()!.studentId);
  }
  onLeaveClosed(withdrawn: boolean): void {
    this.showLeave.set(false);
    if (withdrawn && this.student()) this.reload(this.student()!.studentId);
  }

  createPortal(guardianId: number): void {
    const s = this.student();
    if (!s || this.portalBusy()) return;
    this.portalBusy.set(true);
    this.portalError.set('');
    this.portalResult.set(null);
    this.studentSvc.linkGuardianPortal(s.studentId, guardianId, {
      email: (this.portalEmails[guardianId] || '').trim() || null
    }).subscribe({
      next: r => { this.portalBusy.set(false); this.portalResult.set(r); this.reload(s.studentId); },
      error: e => { this.portalBusy.set(false); this.portalError.set(e?.error?.error ?? 'Could not create portal login.'); }
    });
  }

  linkExistingPortal(guardianId: number): void {
    const s = this.student();
    const userId = this.linkUserIds[guardianId];
    if (!s || !userId || this.portalBusy()) return;
    this.portalBusy.set(true);
    this.portalError.set('');
    this.portalResult.set(null);
    this.studentSvc.linkGuardianPortal(s.studentId, guardianId, { userId }).subscribe({
      next: r => {
        this.portalBusy.set(false);
        this.portalResult.set(r);
        this.linkUserIds[guardianId] = null;
        this.reload(s.studentId);
      },
      error: e => { this.portalBusy.set(false); this.portalError.set(e?.error?.error ?? 'Could not link parent user.'); }
    });
  }

  unlinkPortal(guardianId: number): void {
    const s = this.student();
    if (!s || this.portalBusy()) return;
    if (!confirm('Unlink parent portal from this guardian? The user account stays — only the link is removed.')) return;
    this.portalBusy.set(true);
    this.portalError.set('');
    this.studentSvc.unlinkGuardianPortal(s.studentId, guardianId).subscribe({
      next: () => { this.portalBusy.set(false); this.portalResult.set(null); this.reload(s.studentId); },
      error: e => { this.portalBusy.set(false); this.portalError.set(e?.error?.error ?? 'Could not unlink.'); }
    });
  }

  copyText(text: string): void {
    navigator.clipboard?.writeText(text);
  }

  downloadIdPdf(): void {
    const s = this.student();
    if (!s || this.pdfBusy()) return;
    this.pdfBusy.set(true);
    this.studentSvc.downloadIdCardPdf(s.studentId).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `student-id-card-${s.admissionNo || s.studentId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        this.pdfBusy.set(false);
      },
      error: () => this.pdfBusy.set(false)
    });
  }

  confirmSoftDelete(): void {
    const s = this.student();
    if (!s || this.deleteBusy()) return;
    if (!confirm(`Delete ${this.fullName(s)}? They will be hidden from lists (can restore later).`)) return;
    this.deleteBusy.set(true);
    this.studentSvc.softDelete(s.studentId).subscribe({
      next: () => { this.deleteBusy.set(false); this.router.navigate(['/students/list']); },
      error: () => this.deleteBusy.set(false)
    });
  }

  onDocUploaded(fileId: number, entityType: string): void {
    const s = this.student();
    if (!s) return;
    this.studentSvc.tagDocument(s.studentId, fileId, entityType).subscribe({
      next: () => this.reload(s.studentId),
      error: e => this.docError.set(e?.error?.error ?? 'Could not attach document.')
    });
  }

  onDocFile(ev: Event, entityType: string): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    const s = this.student();
    if (!file || !s) return;
    this.docBusy.set(true);
    this.docError.set('');
    this.fileSvc.upload(file, entityType, { entityId: s.studentId, label: entityType }).subscribe({
      next: res => {
        this.studentSvc.tagDocument(s.studentId, res.fileId, entityType).subscribe({
          next: () => { this.docBusy.set(false); this.reload(s.studentId); },
          error: e => { this.docBusy.set(false); this.docError.set(e?.error?.error ?? 'Tag failed.'); }
        });
      },
      error: e => { this.docBusy.set(false); this.docError.set(e?.error?.error ?? 'Upload failed.'); }
    });
  }

  printCard(): void {
    const s = this.student();
    if (!s) return;
    // Reuse list print by navigating with query — open lightweight window via getById already loaded
    // Delegate to same pattern as list: open via temporary navigation not needed; call institute-aware print inline.
    import('../student-list/student-list.component').then(() => {
      // Keep print self-contained here to avoid circular deps — simple window
      this.openIdCard(s, this.institute);
    });
  }

  private openIdCard(r: any, inst: any): void {
    const schoolName = inst?.name ?? 'School';
    const logoUrl = inst?.logoUrl
      ? (inst.logoUrl.startsWith('http') ? inst.logoUrl : `${environment.serverUrl}${inst.logoUrl}`)
      : '';
    const fullName = `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim();
    const photoUrl = r.photoFileId ? `${environment.fileServerUrl}/files/${r.photoFileId}` : '';
    const className = [r.currentClassName, r.currentSection].filter(Boolean).join(' ') || '—';
    const g = r.guardians?.[0];
    const win = window.open('', '_blank');
    if (!win) { alert('Allow popups to print.'); return; }
    win.document.write(`<!DOCTYPE html><html><head><title>Student Card — ${fullName}</title>
<style>
body{font-family:Segoe UI,sans-serif;background:#e8eef7;padding:24px}
.toolbar{display:flex;justify-content:space-between;align-items:center;background:#1e3a5f;color:#fff;padding:12px 18px;border-radius:10px;margin-bottom:20px}
.btn{padding:8px 16px;border:none;border-radius:7px;font-weight:700;cursor:pointer}
.sheet{display:flex;gap:20px;flex-wrap:wrap;justify-content:center}
.card{width:85.6mm;height:54mm;border-radius:3mm;overflow:hidden;background:#fff;border:1px solid #cbd5e1;box-shadow:0 8px 24px rgba(0,0,0,.12)}
.front-head{display:flex;gap:8px;align-items:center;padding:6px 8px;background:linear-gradient(90deg,#1e3a5f,#2563eb);color:#fff;min-height:14mm}
.logo{width:9mm;height:9mm;object-fit:contain;background:#fff;border-radius:2mm}
.body{display:flex;gap:8px;padding:6px 8px}
.photo{width:22mm;height:26mm;object-fit:cover;border-radius:2mm;border:1.5px solid #93c5fd;background:#dbeafe}
.name{font-size:12px;font-weight:800}
.row{font-size:8px;margin-top:2px}.lbl{color:#64748b;font-weight:700;display:inline-block;min-width:16mm}
.back{background:linear-gradient(180deg,#1e3a5f 0 11mm,#fff 11mm)}
.back-h{color:#fff;padding:6px 9px;font-size:10px;font-weight:800}
.back-b{padding:6px 9px;font-size:8px}
@media print{.toolbar{display:none}body{background:#fff;padding:8mm}}
</style></head><body>
<div class="toolbar"><div><strong>Student Identity Card</strong><div style="font-size:11px;opacity:.8">${fullName}</div></div>
<button class="btn" style="background:#fff;color:#1e3a5f" onclick="print()">Print</button></div>
<div class="sheet">
<div class="card"><div class="front-head">${logoUrl ? `<img class="logo" src="${logoUrl}"/>` : ''}<div><div style="font-weight:800;font-size:11px">${schoolName}</div><div style="font-size:7px;opacity:.85">STUDENT IDENTITY CARD</div></div></div>
<div class="body">${photoUrl ? `<img class="photo" src="${photoUrl}"/>` : `<div class="photo"></div>`}
<div><div class="name">${fullName}</div>
<div class="row"><span class="lbl">Class</span>${className}</div>
<div class="row"><span class="lbl">Adm No</span>${r.admissionNo}</div>
<div class="row"><span class="lbl">DOB</span>${r.dateOfBirth ?? '—'}</div>
<div class="row"><span class="lbl">Gender</span>${r.gender ?? '—'}</div>
</div></div></div>
<div class="card back"><div class="back-h">Student Details</div>
<div class="back-b">
<div class="row"><span class="lbl">Blood</span>${r.bloodGroup ?? '—'}</div>
<div class="row"><span class="lbl">Phone</span>${r.phone ?? '—'}</div>
<div class="row"><span class="lbl">Address</span>${r.address ?? '—'}</div>
<div class="row"><span class="lbl">Guardian</span>${g?.fullName ?? '—'}</div>
<div class="row"><span class="lbl">G. Phone</span>${g?.phone ?? '—'}</div>
<p style="margin-top:8px;font-size:7px;color:#64748b">If found, return to ${schoolName}.</p>
</div></div>
</div></body></html>`);
    win.document.close();
  }
}
