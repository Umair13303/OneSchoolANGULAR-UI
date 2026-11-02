import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { StudentService } from '../../../core/services/student.service';
import { InstituteService } from '../../../core/services/institute.service';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-student-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <div class="toolbar">
        <div>
          <h2>Student Identity Card</h2>
          @if (student()) {
            <p>{{ fullName() }} — {{ student().admissionNo }}</p>
          }
        </div>
        <div class="tbr">
          <button class="btn-p" type="button" (click)="print()" [disabled]="!student()">Print / Save PDF</button>
          <button class="btn-c" type="button" (click)="close()">Close</button>
        </div>
      </div>

      @if (loading()) {
        <p class="status">Loading card…</p>
      } @else if (error()) {
        <p class="status">{{ error() }}</p>
      } @else {
        <div class="sheet">
          <div>
            <div class="face-label">Front</div>
            <div class="card front">
              <div class="front-head">
                <ng-container *ngTemplateOutlet="logo" />
                <div class="sch-meta">
                  <div class="sch-name">{{ brand().name }}</div>
                  <div class="sch-tag">Student Identity Card</div>
                </div>
              </div>
              <div class="front-body">
                @if (photoUrl() && !photoBroken()) {
                  <img class="stu-photo" [src]="photoUrl()" alt="" (error)="photoBroken.set(true)" />
                } @else {
                  <div class="stu-photo-av">{{ initial() }}</div>
                }
                <div class="stu-info">
                  <div class="stu-name">{{ fullName() }}</div>
                  <div class="row"><span class="lbl">Class</span><span class="val">{{ className() }}</span></div>
                  <div class="row"><span class="lbl">DOB</span><span class="val">{{ dob() }}</span></div>
                  <div class="row"><span class="lbl">Gender</span><span class="val">{{ student().gender || '—' }}</span></div>
                  <div class="row"><span class="lbl">Session</span><span class="val">{{ student().currentAcademicYearLabel || '—' }}</span></div>
                </div>
              </div>
              <div class="front-foot">
                <span class="adm-chip">{{ student().admissionNo || '—' }}</span>
                <span>Valid while enrolled</span>
              </div>
            </div>
          </div>

          <div>
            <div class="face-label">Back</div>
            <div class="card back">
              <div class="back-banner">
                <ng-container *ngTemplateOutlet="logo" />
                <div class="sch-meta">
                  <div class="sch-name">{{ brand().name }}</div>
                  <div class="sch-tag">Student Details</div>
                </div>
              </div>
              <div class="back-body">
                <div class="row"><span class="lbl">Blood Group</span><span class="val">{{ student().bloodGroup || '—' }}</span></div>
                <div class="row"><span class="lbl">Phone</span><span class="val">{{ student().phone || '—' }}</span></div>
                <div class="row"><span class="lbl">Address</span><span class="val">{{ student().address || '—' }}</span></div>
                <div class="row"><span class="lbl">{{ guardianRel() }}</span><span class="val">{{ guardianName() }}</span></div>
                <div class="row"><span class="lbl">Guardian Ph</span><span class="val">{{ guardianPhone() }}</span></div>
                <div class="row"><span class="lbl">Admitted</span><span class="val">{{ admitted() }}</span></div>
              </div>
              <div class="rules">
                <strong>If found,</strong> please return to {{ returnTo() }}.
                This card remains school property.
              </div>
            </div>
          </div>
        </div>
      }
    </div>

    <ng-template #logo>
      @if (logoUrl() && !logoBroken()) {
        <img class="sch-logo" [src]="logoUrl()" alt="" (error)="logoBroken.set(true)" />
      } @else {
        <div class="sch-logo-av">{{ schoolInitials() }}</div>
      }
    </ng-template>
  `,
  styles: [`
    :host { display: block; }
    .page { font-family: 'Segoe UI', system-ui, sans-serif; background: #e8eef7; min-height: 100vh; padding: 24px; color: #0f172a; }
    .toolbar { display: flex; justify-content: space-between; align-items: center; background: #1e3a5f; color: #fff; padding: 12px 18px; border-radius: 10px; margin: 0 auto 22px; max-width: 920px; }
    .toolbar h2 { margin: 0; font-size: 15px; font-weight: 700; }
    .toolbar p { margin: 2px 0 0; font-size: 11px; color: rgba(255,255,255,.72); }
    .tbr { display: flex; gap: 8px; }
    .btn-p { padding: 8px 18px; background: #fff; color: #1e3a5f; border: none; border-radius: 7px; font-size: 13px; font-weight: 700; cursor: pointer; }
    .btn-c { padding: 8px 14px; background: rgba(255,255,255,.14); color: #fff; border: 1.5px solid rgba(255,255,255,.35); border-radius: 7px; font-size: 13px; cursor: pointer; }
    .btn-p:disabled { opacity: .5; cursor: default; }
    .status { text-align: center; color: #475569; font-size: 14px; }
    .sheet { display: flex; flex-wrap: wrap; gap: 22px; justify-content: center; align-items: flex-start; }
    .face-label { font-size: 11px; font-weight: 700; letter-spacing: .8px; text-transform: uppercase; color: #64748b; margin-bottom: 8px; text-align: center; }
    .card {
      width: 85.6mm; height: 54mm; border-radius: 3.2mm; overflow: hidden; position: relative;
      background: #fff; box-shadow: 0 10px 28px rgba(15,23,42,.16); border: 1px solid #cbd5e1;
    }
    .front { display: flex; flex-direction: column; background: linear-gradient(160deg,#f8fbff 0%,#ffffff 48%,#eef4ff 100%); }
    .front-head, .back-banner {
      display: flex; align-items: center; gap: 2.2mm; padding: 2mm 2.6mm;
      height: 14mm; color: #fff;
    }
    .front-head { background: linear-gradient(90deg,#1e3a5f,#2563eb); }
    .sch-logo, .sch-logo-av { width: 9mm; height: 9mm; border-radius: 1.6mm; background: #fff; flex-shrink: 0; }
    .sch-logo { object-fit: contain; display: block; padding: 0.5mm; }
    .sch-logo-av { display: flex; align-items: center; justify-content: center; color: #1e3a5f; font-size: 11px; font-weight: 800; }
    .sch-meta { min-width: 0; flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 0.6mm; }
    .sch-name {
      font-size: 10px; font-weight: 800; line-height: 1.15; color: #fff;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .sch-tag { font-size: 7px; opacity: .88; letter-spacing: .5px; text-transform: uppercase; line-height: 1.1; }
    .front-body { display: flex; gap: 8px; padding: 6px 8px 5px; flex: 1; min-height: 0; }
    .stu-photo, .stu-photo-av {
      width: 22mm; height: 26mm; border-radius: 2mm; object-fit: cover; flex-shrink: 0;
      border: 1.5px solid #93c5fd; background: #dbeafe;
    }
    .stu-photo-av { display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 800; color: #1e3a5f; }
    .stu-info { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; gap: 2.5px; }
    .stu-name { font-size: 12px; font-weight: 800; color: #0f172a; line-height: 1.2; max-height: 2.4em; overflow: hidden; }
    .row { display: flex; gap: 5px; font-size: 8px; line-height: 1.25; }
    .lbl { color: #64748b; font-weight: 700; min-width: 18mm; text-transform: uppercase; letter-spacing: .3px; }
    .val { color: #0f172a; font-weight: 650; word-break: break-word; }
    .front-foot {
      margin-top: auto; padding: 3px 8px 4px; border-top: 1px solid #dbeafe;
      display: flex; justify-content: space-between; align-items: center;
      font-size: 7px; color: #475569; font-weight: 600;
    }
    .adm-chip {
      background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe;
      padding: 1px 6px; border-radius: 99px; font-family: ui-monospace, Consolas, monospace; font-weight: 700;
    }
    .back { display: flex; flex-direction: column; background: linear-gradient(180deg,#1e3a5f 0 14mm,#ffffff 14mm); }
    .back-body { padding: 6px 9px 5px; flex: 1; display: flex; flex-direction: column; gap: 3px; }
    .back .lbl { min-width: 22mm; }
    .rules {
      margin-top: auto; padding: 5px 9px 6px; background: #f8fafc; border-top: 1px solid #e2e8f0;
      font-size: 6.8px; color: #64748b; line-height: 1.35;
    }
    .rules strong { color: #1e3a5f; }
    @media print {
      .page { background: #fff; padding: 8mm; }
      .toolbar, .face-label { display: none; }
      .sheet { gap: 10mm; }
      .card { box-shadow: none; page-break-inside: avoid; }
    }
  `]
})
export class StudentCardComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private studentSvc = inject(StudentService);
  private instituteSvc = inject(InstituteService);
  private auth = inject(AuthService);

  loading = signal(true);
  error = signal('');
  student = signal<any>(null);
  brand = signal({ name: 'School', logoUrl: '', phone: '', email: '', address: '' });
  logoBroken = signal(false);
  photoBroken = signal(false);

  fullName = computed(() => `${this.student()?.firstName ?? ''} ${this.student()?.lastName ?? ''}`.trim() || '—');
  className = computed(() => [this.student()?.currentClassName, this.student()?.currentSection].filter(Boolean).join(' ') || '—');
  initial = computed(() => (this.student()?.firstName?.[0] ?? 'S').toUpperCase());
  schoolInitials = computed(() =>
    this.brand().name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'S'
  );
  logoUrl = computed(() => this.resolveLogo(this.brand().logoUrl));
  photoUrl = computed(() => this.student()?.photoFileId ? `${environment.fileServerUrl}/files/${this.student().photoFileId}` : '');
  guardian = computed(() => this.student()?.guardians?.[0] ?? null);
  guardianName = computed(() => this.guardian()?.fullName || '—');
  guardianPhone = computed(() => this.guardian()?.phone || '—');
  guardianRel = computed(() => this.guardian()?.relation || 'Guardian');
  dob = computed(() => this.fmt(this.student()?.dateOfBirth));
  admitted = computed(() => this.fmt(this.student()?.admissionDate));
  returnTo = computed(() => {
    const b = this.brand();
    return [b.name, b.address, b.phone, b.email].filter(Boolean).join(' · ');
  });

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error.set('Student not found.');
      this.loading.set(false);
      return;
    }
    this.studentSvc.getById(id).subscribe({
      next: (s: any) => {
        this.student.set(s);
        document.title = `Student Card — ${this.fullName()}`;
        this.instituteSvc.getMyInstitute().subscribe({
          next: inst => { this.brand.set(this.readBrand(inst)); this.loading.set(false); },
          error: () => { this.brand.set(this.readBrand(null)); this.loading.set(false); }
        });
      },
      error: () => {
        this.error.set('Could not load this student.');
        this.loading.set(false);
      }
    });
  }

  print() { window.print(); }

  close() { window.close(); }

  private readBrand(inst: any) {
    const body = inst?.body ?? inst;
    const user = this.auth.currentUser();
    return {
      name: String(body?.name || user?.instituteName || 'School'),
      logoUrl: String(body?.logoUrl || user?.logoUrl || ''),
      phone: String(body?.phone || ''),
      email: String(body?.email || ''),
      address: String(body?.address || ''),
    };
  }

  private resolveLogo(url: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
    return `${environment.serverUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  private fmt(d: string | null | undefined): string {
    if (!d) return '—';
    const dt = new Date(d);
    return isNaN(dt.getTime())
      ? d
      : dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
