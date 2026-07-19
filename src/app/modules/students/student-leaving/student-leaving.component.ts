import { Component, inject, OnInit, signal, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentService } from '../../../core/services/student.service';
import { InstituteService } from '../../../core/services/institute.service';
import { environment } from '../../../../environments/environment';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';

@Component({
  selector: 'app-student-leaving',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePickerComponent],
  template: `
    <div class="overlay" (click)="onOverlayClick($event)">
      <div class="dialog" (click)="$event.stopPropagation()">

        @if (!result()) {
          <!-- ── Step 1: Form ── -->
          <div class="dlg-header">
            <div class="dlg-icon warn"><span class="material-icons-round">exit_to_app</span></div>
            <div>
              <h3>Student Leaving</h3>
              <p class="dlg-sub">{{ studentName }} · {{ admissionNo }}</p>
            </div>
            <button class="dlg-close" (click)="cancel()"><span class="material-icons-round">close</span></button>
          </div>

          @if (loadingDues()) {
            <div class="dlg-body center"><span class="material-icons-round spin">refresh</span> Checking dues…</div>
          } @else {
            <div class="dlg-body">

              <!-- Dues alert -->
              @if (dues()?.hasDues) {
                <div class="dues-alert">
                  <div class="dues-alert-header">
                    <span class="material-icons-round">warning</span>
                    <strong>Outstanding Dues: Rs. {{ dues().totalDues | number:'1.0-0' }}</strong>
                  </div>
                  <table class="dues-table">
                    <thead><tr><th>Fee Type</th><th>Due Date</th><th>Balance</th></tr></thead>
                    <tbody>
                      @for (d of dues().dues; track d.studentFeeId) {
                        <tr>
                          <td>{{ d.feeTypeName }}</td>
                          <td>{{ d.dueDate }}</td>
                          <td class="amt">Rs. {{ d.balance | number:'1.0-0' }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                  <label class="force-wrap">
                    <input type="checkbox" [(ngModel)]="forceWithdraw" />
                    <span>I acknowledge the outstanding dues and proceed with withdrawal</span>
                  </label>
                </div>
              } @else {
                <div class="clear-badge">
                  <span class="material-icons-round">check_circle</span> No outstanding dues — cleared to leave
                </div>
              }

              <!-- Leaving fields -->
              <div class="field-row">
                <div class="field">
                  <label>Leaving Date <span class="req">*</span></label>
                  <app-date-picker [(ngModel)]="leavingDate" [max]="today"/>
                </div>
              </div>
              <div class="field">
                <label>Reason for Leaving <span class="req">*</span></label>
                <select [(ngModel)]="leavingReason">
                  <option value="">Select reason…</option>
                  <option>Transfer to another school</option>
                  <option>Family relocation</option>
                  <option>Financial reasons</option>
                  <option>Course completion</option>
                  <option>Disciplinary action</option>
                  <option>Medical reasons</option>
                  <option>Other</option>
                </select>
              </div>
              @if (leavingReason === 'Other') {
                <div class="field">
                  <label>Specify reason</label>
                  <input type="text" [(ngModel)]="customReason" placeholder="Enter reason…" />
                </div>
              }

              @if (errorMsg()) {
                <div class="err-msg"><span class="material-icons-round">error</span> {{ errorMsg() }}</div>
              }
            </div>

            <div class="dlg-footer">
              <button class="btn-sec" (click)="cancel()">Cancel</button>
              <button class="btn-danger" (click)="submit()" [disabled]="saving() || !canSubmit()">
                <span class="material-icons-round">{{ saving() ? 'refresh' : 'exit_to_app' }}</span>
                {{ saving() ? 'Processing…' : 'Confirm Leaving' }}
              </button>
            </div>
          }

        } @else {
          <!-- ── Step 2: Certificate ── -->
          <div class="dlg-header">
            <div class="dlg-icon success"><span class="material-icons-round">verified</span></div>
            <div>
              <h3>Student Withdrawn Successfully</h3>
              <p class="dlg-sub">School Leaving Certificate is ready</p>
            </div>
            <button class="dlg-close" (click)="cancel()"><span class="material-icons-round">close</span></button>
          </div>
          <div class="dlg-body">
            <div class="cert-preview">
              <div class="cert-row"><span class="cert-lbl">Student</span><span class="cert-val">{{ result().fullName }}</span></div>
              <div class="cert-row"><span class="cert-lbl">Admission No</span><span class="cert-val">{{ result().admissionNo }}</span></div>
              <div class="cert-row"><span class="cert-lbl">Class</span><span class="cert-val">{{ result().className ?? '—' }}</span></div>
              <div class="cert-row"><span class="cert-lbl">Admission Date</span><span class="cert-val">{{ result().admissionDate }}</span></div>
              <div class="cert-row"><span class="cert-lbl">Leaving Date</span><span class="cert-val">{{ result().leavingDate }}</span></div>
              <div class="cert-row"><span class="cert-lbl">Reason</span><span class="cert-val">{{ result().leavingReason }}</span></div>
            </div>
          </div>
          <div class="dlg-footer">
            <button class="btn-sec" (click)="done()">Close</button>
            <button class="btn-primary" (click)="printCertificate()">
              <span class="material-icons-round">print</span> Print Certificate
            </button>
          </div>
        }

      </div>
    </div>
  `,
  styles: [`
    .overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,.45); backdrop-filter: blur(3px);
      z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 16px;
    }
    .dialog {
      background: var(--surface); border-radius: 16px; box-shadow: var(--sh-xl);
      width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto;
      animation: dlg-in .2s cubic-bezier(.22,1,.36,1);
    }
    @keyframes dlg-in { from { opacity:0; transform:translateY(20px) scale(.97); } to { opacity:1; transform:none; } }

    .dlg-header {
      display: flex; align-items: center; gap: 14px;
      padding: 20px 20px 16px; border-bottom: 1px solid var(--border);
    }
    .dlg-icon {
      width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .dlg-icon.warn { background: #fef3c7; }
    .dlg-icon.warn .material-icons-round { color: #d97706; font-size: 22px; }
    .dlg-icon.success { background: var(--green-s); }
    .dlg-icon.success .material-icons-round { color: var(--green); font-size: 22px; }
    .dlg-header h3 { font-size: 15px; font-weight: 700; color: var(--t1); margin: 0; }
    .dlg-sub { font-size: 12px; color: var(--t4); margin-top: 2px; }
    .dlg-close {
      margin-left: auto; width: 30px; height: 30px; border-radius: 8px;
      border: none; background: none; cursor: pointer; color: var(--t4);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .dlg-close:hover { background: var(--surface-2); color: var(--t1); }
    .dlg-close .material-icons-round { font-size: 18px; }

    .dlg-body { padding: 20px; display: flex; flex-direction: column; gap: 14px; }
    .dlg-body.center { align-items: center; justify-content: center; min-height: 120px; color: var(--t4); gap: 8px; }

    .dues-alert {
      background: #fef9ec; border: 1.5px solid #fde68a; border-radius: 10px;
      padding: 12px 14px; display: flex; flex-direction: column; gap: 10px;
    }
    .dues-alert-header { display: flex; align-items: center; gap: 8px; color: #92400e; font-size: 13.5px; }
    .dues-alert-header .material-icons-round { font-size: 18px; color: #d97706; }
    .dues-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .dues-table th { text-align: left; font-size: 10px; font-weight: 700; color: #92400e; text-transform: uppercase; letter-spacing: .4px; padding: 4px 6px; border-bottom: 1px solid #fde68a; }
    .dues-table td { padding: 5px 6px; border-bottom: 1px solid #fef3c7; color: var(--t2); }
    .dues-table .amt { font-weight: 700; color: var(--red); text-align: right; }
    .force-wrap { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--t2); cursor: pointer; }
    .force-wrap input { width: 15px; height: 15px; cursor: pointer; }

    .clear-badge {
      display: flex; align-items: center; gap: 8px;
      background: var(--green-s); border: 1px solid var(--green-b);
      border-radius: 8px; padding: 10px 14px;
      font-size: 13px; font-weight: 600; color: var(--green);
    }
    .clear-badge .material-icons-round { font-size: 18px; }

    .field { display: flex; flex-direction: column; gap: 5px; }
    .field-row { display: flex; gap: 12px; }
    .field-row .field { flex: 1; }
    label { font-size: 11px; font-weight: 700; color: var(--t3); text-transform: uppercase; letter-spacing: .4px; }
    .req { color: var(--red); }
    input[type=date], input[type=text], select {
      padding: 9px 12px; border: 1.5px solid var(--border); border-radius: 8px;
      font-size: 13px; background: var(--surface); color: var(--t1); font-family: inherit;
    }
    input:focus, select:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-g); }

    .err-msg {
      display: flex; align-items: center; gap: 6px;
      background: var(--red-s); border: 1px solid var(--red-b); border-radius: 8px;
      padding: 10px 12px; font-size: 12.5px; color: var(--red);
    }
    .err-msg .material-icons-round { font-size: 16px; }

    .dlg-footer {
      display: flex; justify-content: flex-end; gap: 10px;
      padding: 14px 20px; border-top: 1px solid var(--border);
    }
    .btn-sec {
      padding: 9px 18px; border: 1.5px solid var(--border); border-radius: 8px;
      background: var(--surface-2); color: var(--t2); font-size: 13px; font-weight: 600;
      cursor: pointer; font-family: inherit;
    }
    .btn-danger {
      display: flex; align-items: center; gap: 6px;
      padding: 9px 18px; border: none; border-radius: 8px;
      background: var(--red); color: #fff; font-size: 13px; font-weight: 700;
      cursor: pointer; font-family: inherit; transition: background .15s;
    }
    .btn-danger:hover:not(:disabled) { background: #b91c1c; }
    .btn-danger:disabled { opacity: .5; cursor: not-allowed; }
    .btn-danger .material-icons-round { font-size: 16px; }
    .btn-primary {
      display: flex; align-items: center; gap: 6px;
      padding: 9px 18px; border: none; border-radius: 8px;
      background: var(--accent); color: #fff; font-size: 13px; font-weight: 700;
      cursor: pointer; font-family: inherit;
    }
    .btn-primary .material-icons-round { font-size: 16px; }

    .cert-preview { display: flex; flex-direction: column; gap: 0; border-radius: 10px; overflow: hidden; border: 1.5px solid var(--border); }
    .cert-row { display: flex; align-items: baseline; gap: 12px; padding: 10px 14px; border-bottom: 1px solid var(--border); }
    .cert-row:last-child { border-bottom: none; }
    .cert-lbl { font-size: 11px; font-weight: 700; color: var(--t4); text-transform: uppercase; letter-spacing: .4px; min-width: 110px; }
    .cert-val { font-size: 13.5px; font-weight: 600; color: var(--t1); }

    @keyframes spin { to { transform: rotate(360deg); } }
    .spin { animation: spin .8s linear infinite; display: inline-block; font-size: 20px; }
  `]
})
export class StudentLeavingComponent implements OnInit {
  @Input() studentId!: number;
  @Input() studentName!: string;
  @Input() admissionNo!: string;
  @Output() closed   = new EventEmitter<boolean>(); // true = withdrawn

  private studentSvc  = inject(StudentService);
  private instituteSvc = inject(InstituteService);

  dues         = signal<any>(null);
  loadingDues  = signal(true);
  saving       = signal(false);
  errorMsg     = signal('');
  result       = signal<any>(null);

  leavingDate   = new Date().toISOString().slice(0, 10);
  leavingReason = '';
  customReason  = '';
  forceWithdraw = false;
  today         = new Date().toISOString().slice(0, 10);

  schoolName = '';
  schoolLogo = '';

  ngOnInit() {
    this.studentSvc.getDues(this.studentId).subscribe({
      next: d => { this.dues.set(d); this.loadingDues.set(false); },
      error: () => this.loadingDues.set(false)
    });
    this.instituteSvc.getMyInstitute().subscribe({
      next: (inst: any) => {
        this.schoolName = inst?.name ?? '';
        this.schoolLogo = inst?.logoUrl
          ? (inst.logoUrl.startsWith('http') ? inst.logoUrl : `${environment.serverUrl}${inst.logoUrl}`)
          : '';
      }
    });
  }

  canSubmit() {
    if (!this.leavingDate || !this.leavingReason) return false;
    if (this.dues()?.hasDues && !this.forceWithdraw) return false;
    return true;
  }

  submit() {
    if (!this.canSubmit()) return;
    this.saving.set(true);
    this.errorMsg.set('');
    const reason = this.leavingReason === 'Other' ? (this.customReason || 'Other') : this.leavingReason;
    this.studentSvc.withdraw(this.studentId, {
      leavingDate:   this.leavingDate,
      leavingReason: reason,
      forceWithdraw: this.forceWithdraw
    }).subscribe({
      next: res => { this.saving.set(false); this.result.set(res); },
      error: err => {
        this.saving.set(false);
        this.errorMsg.set(err?.error?.error ?? 'Failed to process. Please try again.');
      }
    });
  }

  onOverlayClick(e: MouseEvent) { if (e.target === e.currentTarget) this.cancel(); }
  cancel() { this.closed.emit(false); }
  done()   { this.closed.emit(true); }

  printCertificate() {
    const r = this.result();
    if (!r) return;
    const win = window.open('', '_blank');
    if (!win) { alert('Allow popups to print.'); return; }

    const initials = (this.schoolName || 'S').split(' ').slice(0,2).map((w:string)=>w[0]).join('').toUpperCase();
    const logoHtml = this.schoolLogo
      ? `<img src="${this.schoolLogo}" class="logo" alt="logo"/>`
      : `<div class="logo-av">${initials}</div>`;

    const fmt = (d: string) => {
      if (!d) return '—';
      const dt = new Date(d);
      return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    win.document.write(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/>
<title>School Leaving Certificate — ${r.fullName}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Times New Roman',serif;background:#f4f4f4;padding:30px;}
  .toolbar{display:flex;justify-content:space-between;align-items:center;background:#1e3a5f;color:#fff;padding:12px 20px;border-radius:8px;margin-bottom:24px;font-family:'Segoe UI',sans-serif;}
  .toolbar h2{font-size:15px;font-weight:700;}.toolbar p{font-size:11px;color:rgba(255,255,255,.7);margin-top:2px;}
  .tbr{display:flex;gap:8px;}
  .btn-p{padding:8px 20px;background:#fff;color:#1e3a5f;border:none;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Segoe UI',sans-serif;}
  .btn-c{padding:8px 16px;background:rgba(255,255,255,.15);color:#fff;border:1.5px solid rgba(255,255,255,.35);border-radius:6px;font-size:13px;cursor:pointer;font-family:'Segoe UI',sans-serif;}
  .cert{background:#fff;max-width:700px;margin:0 auto;border:3px double #1e3a5f;padding:40px 50px;}
  .cert-header{text-align:center;border-bottom:2px solid #1e3a5f;padding-bottom:20px;margin-bottom:28px;}
  .logo{width:70px;height:70px;object-fit:contain;border-radius:8px;border:1px solid #e5e7eb;}
  .logo-av{width:70px;height:70px;border-radius:8px;background:#1e3a5f;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;}
  .school-name{font-size:22px;font-weight:700;color:#1e3a5f;letter-spacing:.5px;margin:10px 0 4px;font-family:'Segoe UI',sans-serif;}
  .cert-title{font-size:17px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#374151;margin-top:16px;font-family:'Segoe UI',sans-serif;}
  .cert-subtitle{font-size:12px;color:#6b7280;letter-spacing:1px;text-transform:uppercase;margin-top:4px;font-family:'Segoe UI',sans-serif;}
  .cert-body{font-size:14px;line-height:2;color:#374151;}
  .cert-body p{margin-bottom:6px;}
  .field-line{border-bottom:1px dotted #9ca3af;display:inline-block;min-width:180px;color:#1e3a5f;font-weight:600;}
  .cert-table{width:100%;border-collapse:collapse;margin:20px 0;font-size:13px;}
  .cert-table td{padding:8px 12px;border:1px solid #e5e7eb;}
  .cert-table td:first-child{font-weight:700;color:#374151;background:#f9fafb;width:35%;text-transform:uppercase;font-size:11px;letter-spacing:.5px;}
  .cert-table td:last-child{color:#111;}
  .cert-footer{margin-top:40px;display:flex;justify-content:space-between;align-items:flex-end;}
  .sig-block{text-align:center;}
  .sig-line{width:160px;border-bottom:1.5px solid #374151;margin-bottom:6px;}
  .sig-lbl{font-size:11px;color:#6b7280;letter-spacing:.5px;text-transform:uppercase;font-family:'Segoe UI',sans-serif;}
  .cert-note{font-size:11px;color:#9ca3af;text-align:center;margin-top:28px;border-top:1px solid #f3f4f6;padding-top:12px;font-family:'Segoe UI',sans-serif;}
  @media print{body{background:#fff!important;padding:0!important;}.toolbar{display:none!important;}.cert{border:3px double #1e3a5f;max-width:100%;}@page{size:A4 portrait;margin:15mm;}}
</style></head><body>
<div class="toolbar">
  <div><h2>School Leaving Certificate</h2><p>${r.fullName} — ${r.admissionNo}</p></div>
  <div class="tbr">
    <button class="btn-p" onclick="window.print()">🖨️ Print / Save PDF</button>
    <button class="btn-c" onclick="window.close()">✕ Close</button>
  </div>
</div>
<div class="cert">
  <div class="cert-header">
    ${logoHtml}
    <div class="school-name">${this.schoolName || 'School Name'}</div>
    <div class="cert-title">School Leaving Certificate</div>
    <div class="cert-subtitle">This is to certify that</div>
  </div>

  <div class="cert-body">
    <p>This is to certify that <span class="field-line">&nbsp;${r.fullName}&nbsp;</span>
    ${r.gender === 'Male' ? 'son' : r.gender === 'Female' ? 'daughter' : 'ward'} of
    <span class="field-line">&nbsp;${r.guardianName ?? '—'}&nbsp;</span>
    was a bonafide student of this institution.</p>
  </div>

  <table class="cert-table">
    <tr><td>Admission No.</td><td>${r.admissionNo}</td></tr>
    <tr><td>Date of Birth</td><td>${fmt(r.dateOfBirth)}</td></tr>
    <tr><td>Class / Year</td><td>${r.className ?? '—'} &nbsp;|&nbsp; ${r.yearLabel ?? '—'}</td></tr>
    <tr><td>Admission Date</td><td>${fmt(r.admissionDate)}</td></tr>
    <tr><td>Leaving Date</td><td>${fmt(r.leavingDate)}</td></tr>
    <tr><td>Reason for Leaving</td><td>${r.leavingReason}</td></tr>
    <tr><td>Guardian</td><td>${r.guardianName ?? '—'} &nbsp; ${r.guardianPhone ? '· ' + r.guardianPhone : ''}</td></tr>
    <tr><td>Fee Clearance</td><td>${r.totalDuesCleared > 0 ? `<span style="color:#b91c1c;font-weight:700;">Dues Pending: Rs. ${Number(r.totalDuesCleared).toLocaleString()}</span>` : '<span style="color:#059669;font-weight:700;">All dues cleared ✓</span>'}</td></tr>
  </table>

  <div class="cert-footer">
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-lbl">Class Teacher</div>
    </div>
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-lbl">Principal</div>
    </div>
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-lbl">School Stamp</div>
    </div>
  </div>

  <div class="cert-note">
    Issued on: ${new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })}
    &nbsp;·&nbsp; This certificate is issued without any corrections or alterations.
  </div>
</div>
</body></html>`);
    win.document.close();
  }
}
