import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FeeService } from '../../../core/services/fee.service';
import { AcademicService } from '../../../core/services/academic.service';
import { InstituteService } from '../../../core/services/institute.service';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';
import { StudentFeeDto } from '../../../core/models/fee.model';
import { AcademicYear, ClassDto } from '../../../core/models/academic.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

interface ChallanStudent {
  studentId: number;
  studentName: string;
  admissionNo: string;
  className: string;
  yearLabel: string;
  month: string;
  dueDate: string;
  fees: StudentFeeDto[];
  totalDue: number;
  totalDiscount: number;
  netPayable: number;
}

@Component({
  selector: 'app-challan-print',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  template: `
    <app-page-header title="Print Challan" subtitle="Search generated challans and print" />

    <!-- Filter bar -->
    <div class="card filter-card no-print">
      <div class="filter-row">
        <div class="field">
          <label>Academic Year *</label>
          <select [(ngModel)]="filterYearId" (change)="onYearChange()">
            <option [ngValue]="null">Select year</option>
            @for (y of years(); track y.academicYearId) {
              <option [ngValue]="y.academicYearId">{{ y.yearLabel }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label>Class</label>
          <select [(ngModel)]="filterClassId" (change)="onSearch()">
            <option [ngValue]="null">All classes</option>
            @for (c of classes(); track c.classId) {
              <option [ngValue]="c.classId">{{ c.className }} {{ c.section }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label>Month</label>
          <select [(ngModel)]="filterMonth" (change)="onSearch()">
            <option value="">All months</option>
            @for (m of months; track m) {
              <option [value]="m">{{ m }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label>Student Name / Admission No</label>
          <input type="text" [(ngModel)]="filterSearch" (input)="onSearch()" placeholder="Search..." />
        </div>
      </div>
      @if (loading()) {
        <div class="loading">Loading challans...</div>
      }
    </div>

    <!-- Results -->
    @if (students().length > 0) {
      <div class="result-bar no-print">
        <span class="count-chip">{{ filtered().length }} challan(s)</span>
        <button class="btn-primary" (click)="printAll()">🖨️ Print All ({{ filtered().length }})</button>
      </div>

      <div class="card result-card no-print">
        <table class="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Student Name</th>
              <th>Admission No</th>
              <th>Class</th>
              <th>Month</th>
              <th>Due Date</th>
              <th style="text-align:right">Total</th>
              <th style="text-align:right">Discount</th>
              <th style="text-align:right">Payable</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (s of filtered(); track s.studentId + s.dueDate; let i = $index) {
              <tr>
                <td class="idx">{{ i + 1 }}</td>
                <td><strong>{{ s.studentName }}</strong></td>
                <td class="mono">{{ s.admissionNo }}</td>
                <td>{{ s.className }}</td>
                <td>{{ s.month }}</td>
                <td>{{ s.dueDate }}</td>
                <td class="amt">{{ s.totalDue | number:'1.0-0' }}</td>
                <td class="amt disc">{{ s.totalDiscount > 0 ? (s.totalDiscount | number:'1.0-0') : '—' }}</td>
                <td class="amt payable"><strong>{{ s.netPayable | number:'1.0-0' }}</strong></td>
                <td><button class="btn-print-row" (click)="printOne(s)">🖨️ Print</button></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    @if (!loading() && filterYearId && students().length === 0) {
      <div class="empty">No challans found for the selected filters.</div>
    }
  `,
  styles: [`
    .filter-card { padding:20px; margin-bottom:12px; }
    .filter-row { display:flex; gap:14px; flex-wrap:wrap; }
    .filter-row .field { flex:1; min-width:160px; }
    .field { display:flex; flex-direction:column; gap:5px; }
    label { font-size:11px; font-weight:600; color:var(--t3); text-transform:uppercase; letter-spacing:.5px; }
    input, select { padding:9px 12px; border:1.5px solid var(--border); border-radius:7px;
      font-size:13.5px; font-family:inherit; background:var(--surface); color:var(--t1); }
    input:focus, select:focus { outline:none; border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-g); }
    .loading { margin-top:12px; font-size:13px; color:var(--t4); }
    .empty { text-align:center; padding:40px; color:var(--t4); font-size:14px; }

    .result-bar { display:flex; justify-content:space-between; align-items:center;
      margin-bottom:10px; }
    .count-chip { background:var(--accent-g); color:var(--accent); padding:3px 12px;
      border-radius:8px; font-weight:600; font-size:13px; }
    .result-card { overflow:hidden; }

    .idx  { width:36px; color:var(--t4); font-size:12px; }
    .mono { font-family:monospace; font-size:13px; }
    .amt  { text-align:right; font-family:monospace; font-size:13px; }
    .disc { color:#059669; }
    .payable { color:var(--t1); }
    .btn-print-row { padding:4px 10px; font-size:12px; border:1.5px solid var(--accent);
      background:var(--accent-g); color:var(--accent); border-radius:6px; cursor:pointer;
      font-family:inherit; font-weight:600; }
    .btn-print-row:hover { background:var(--accent); color:#fff; }

  `]
})
export class ChallanPrintComponent implements OnInit {
  private feeSvc  = inject(FeeService);
  private acadSvc = inject(AcademicService);
  private instSvc = inject(InstituteService);
  private authSvc = inject(AuthService);

  schoolName       = 'School Management System';
  logoUrl          = '';
  challanTemplate  = 'cash_memo';

  years   = signal<AcademicYear[]>([]);
  classes = signal<ClassDto[]>([]);
  loading = signal(false);
  students = signal<ChallanStudent[]>([]);

  filterYearId:  number | null = null;
  filterClassId: number | null = null;
  filterMonth = '';
  filterSearch = '';


  months = ['January','February','March','April','May','June',
            'July','August','September','October','November','December'];

  ngOnInit() {
    this.acadSvc.getYears().subscribe(y => this.years.set(y));

    const navStudents: ChallanStudent[] | null =
      history.state?.['students']?.length ? history.state['students'] : null;
    // instituteId: from nav state (passed by generate page) OR from JWT (institute admin)
    const navInstId: number | undefined = history.state?.['instituteId'];
    const jwtInstId = this.authSvc.currentUser()?.instituteId;
    const instId = navInstId ?? jwtInstId;

    this.instSvc.getMyInstitute(instId).subscribe({
      next: resp => {
        if (resp.status === 200 && resp.body) {
          this.schoolName      = resp.body.name;
          this.challanTemplate = resp.body.challanTemplate ?? 'cash_memo';
          this.logoUrl = resp.body.logoUrl
            ? environment.serverUrl + resp.body.logoUrl
            : '';
        }
        if (navStudents) this.openChallanTab(navStudents);
      },
      error: () => {
        if (navStudents) this.openChallanTab(navStudents);
      }
    });
  }

  onYearChange() {
    this.filterClassId = null;
    this.classes.set([]);
    this.students.set([]);
    if (this.filterYearId) {
      this.acadSvc.getClasses(this.filterYearId).subscribe(c => this.classes.set(c));
      this.loadFees();
    }
  }

  onSearch() { this.loadFees(); }

  loadFees() {
    if (!this.filterYearId) return;
    this.loading.set(true);
    this.feeSvc.getStudentFees({ classId: this.filterClassId ?? undefined, academicYearId: this.filterYearId })
      .subscribe(fees => {
        this.loading.set(false);
        this.students.set(this.groupFees(fees));
      });
  }

  private groupFees(fees: StudentFeeDto[]): ChallanStudent[] {
    // Key by studentId + billing month (fallback: due date) so each monthly
    // challan stays separate even when due dates coincide.
    const map = new Map<string, ChallanStudent>();
    for (const f of fees) {
      const key = `${f.studentId}__${f.feeMonth ?? f.dueDate}`;
      if (!map.has(key)) {
        const d = new Date(f.dueDate);
        const month = f.feeMonth
          ? this.months[f.feeMonth - 1]
          : isNaN(d.getTime()) ? '' : d.toLocaleString('en-US', { month: 'long' });
        map.set(key, {
          studentId: f.studentId, studentName: f.studentName,
          admissionNo: f.admissionNo, className: f.className,
          yearLabel: f.yearLabel, month, dueDate: f.dueDate,
          fees: [], totalDue: 0, totalDiscount: 0, netPayable: 0
        });
      }
      const g = map.get(key)!;
      g.fees.push(f);
      g.totalDue      += f.amountDue;
      g.totalDiscount += f.discount;
      g.netPayable    += f.balance;
    }
    return Array.from(map.values()).sort((a, b) => a.studentName.localeCompare(b.studentName) || a.dueDate.localeCompare(b.dueDate));
  }

  filtered(): ChallanStudent[] {
    const search = this.filterSearch.toLowerCase().trim();
    return this.students().filter(s => {
      if (this.filterMonth && s.month !== this.filterMonth) return false;
      if (search && !s.studentName.toLowerCase().includes(search) && !s.admissionNo.toLowerCase().includes(search)) return false;
      return true;
    });
  }

  printOne(s: ChallanStudent) { this.openChallanTab([s]); }
  printAll()                  { this.openChallanTab(this.filtered()); }

  private openChallanTab(list: ChallanStudent[]) {
    if (this.challanTemplate === 'bank_3copy') {
      this.openThreeColumnChallan(list);
      return;
    }
    if (this.challanTemplate === 'detailed') {
      this.openDetailedChallan(list);
      return;
    }
    this.openThreeStripChallan(list);
  }

  // ── Bank 3-Copy: 3 columns side by side on one A4 landscape page ────────
  private openThreeColumnChallan(list: ChallanStudent[]) {
    const win = window.open('', '_blank');
    if (!win) { alert('Allow popups for this site to print challans.'); return; }

    const initials = this.schoolName.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
    const logoHtml = this.logoUrl
      ? `<img src="${this.logoUrl}" class="logo" alt="logo"/>`
      : `<div class="logo-av">${initials}</div>`;

    const col = (s: ChallanStudent, label: string, labelColor: string, sigLabel: string) => `
      <div class="col">
        <div class="col-header" style="background:${labelColor}">
          <span class="copy-tag">${label}</span>
        </div>
        <div class="inst-block">
          ${logoHtml}
          <div class="inst-text">
            <div class="inst-name">${this.schoolName}</div>
            <div class="inst-sub">FEE CHALLAN</div>
          </div>
        </div>
        <div class="divider"></div>
        <div class="info-rows">
          <div class="info-row wide">
            <span class="lbl">Student</span>
            <span class="val bold">${s.studentName}</span>
          </div>
          <div class="info-row">
            <span class="lbl">Adm #</span>
            <span class="val">${s.admissionNo}</span>
          </div>
          <div class="info-row">
            <span class="lbl">Class</span>
            <span class="val">${s.className}</span>
          </div>
          <div class="info-row">
            <span class="lbl">Year</span>
            <span class="val">${s.yearLabel}</span>
          </div>
          <div class="info-row">
            <span class="lbl">Month</span>
            <span class="val accent">${s.month}</span>
          </div>
          <div class="info-row">
            <span class="lbl">Due Date</span>
            <span class="val red">${s.dueDate}</span>
          </div>
        </div>
        <div class="divider"></div>
        <table class="fee-tbl">
          <thead><tr><th>Fee Type</th><th class="r">Amt</th><th class="r">Disc</th><th class="r">Pay</th></tr></thead>
          <tbody>
            ${s.fees.map(f => `
              <tr>
                <td>${f.feeTypeName}</td>
                <td class="r">${f.amountDue.toLocaleString()}</td>
                <td class="r">${f.discount > 0 ? f.discount.toLocaleString() : '—'}</td>
                <td class="r">${f.balance.toLocaleString()}</td>
              </tr>`).join('')}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td><strong>TOTAL</strong></td>
              <td class="r"><strong>${s.totalDue.toLocaleString()}</strong></td>
              <td class="r">${s.totalDiscount > 0 ? s.totalDiscount.toLocaleString() : '—'}</td>
              <td class="r net">${s.netPayable.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
        <div class="amt-box">
          <div class="amt-lbl">NET PAYABLE</div>
          <div class="amt-val">${s.netPayable.toLocaleString()}</div>
          ${s.totalDiscount > 0 ? `<div class="amt-disc">Disc: ${s.totalDiscount.toLocaleString()}</div>` : ''}
        </div>
        <div class="sig-block">
          <div class="sig-line"></div>
          <div class="sig-lbl">${sigLabel}</div>
        </div>
      </div>`;

    const rows = list.map(s => `
      <div class="challan-row">
        ${col(s, 'SCHOOL COPY',  '#1e3a5f', 'Cashier Signature')}
        <div class="vcut">✂</div>
        ${col(s, 'STUDENT COPY', '#065f46', 'Cashier Signature')}
        <div class="vcut">✂</div>
        ${col(s, 'BANK COPY',    '#7c2d12', 'Bank Stamp & Signature')}
      </div>`).join('<div class="hcut">✂ &nbsp;- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -</div>');

    win.document.write(`<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"/>
<title>Fee Challan — Bank 3-Copy</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#f0f0f0;padding:16px;}

  /* toolbar */
  .toolbar{display:flex;justify-content:space-between;align-items:center;
    background:#1e3a5f;color:#fff;padding:12px 20px;border-radius:8px;
    margin-bottom:20px;position:sticky;top:0;z-index:99;box-shadow:0 4px 12px rgba(0,0,0,.25);}
  .toolbar h2{font-size:15px;font-weight:700;}
  .toolbar p{font-size:11px;color:rgba(255,255,255,.7);margin-top:2px;}
  .tbr{display:flex;gap:8px;}
  .btn-p{padding:8px 20px;background:#fff;color:#1e3a5f;border:none;border-radius:6px;
    font-size:13px;font-weight:700;cursor:pointer;}
  .btn-c{padding:8px 16px;background:rgba(255,255,255,.15);color:#fff;
    border:1.5px solid rgba(255,255,255,.35);border-radius:6px;font-size:13px;cursor:pointer;}

  /* challan row = one student */
  .challan-row{display:flex;align-items:stretch;background:#fff;
    border-radius:8px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.1);
    margin-bottom:6px;}

  /* vertical cut line between columns */
  .vcut{width:18px;display:flex;flex-direction:column;align-items:center;
    justify-content:flex-start;padding-top:8px;font-size:10px;color:#bbb;
    background:#f8f8f8;border-left:1px dashed #ccc;border-right:1px dashed #ccc;
    letter-spacing:2px;writing-mode:vertical-lr;}

  /* horizontal cut between students */
  .hcut{font-size:10px;color:#bbb;padding:2px 8px;
    border-top:1px dashed #ddd;border-bottom:1px dashed #ddd;
    background:#fafafa;white-space:nowrap;overflow:hidden;margin:4px 0;}

  /* each column */
  .col{flex:1;display:flex;flex-direction:column;padding:0;min-width:0;}

  .col-header{padding:5px 10px;text-align:center;}
  .copy-tag{font-size:9px;font-weight:800;text-transform:uppercase;
    letter-spacing:1.5px;color:#fff;}

  .inst-block{display:flex;align-items:center;gap:8px;padding:8px 10px 4px;}
  .logo{width:36px;height:36px;object-fit:contain;border-radius:5px;
    border:1px solid #e5e7eb;flex-shrink:0;}
  .logo-av{width:36px;height:36px;border-radius:5px;background:#1e3a5f;
    color:#fff;display:flex;align-items:center;justify-content:center;
    font-size:12px;font-weight:800;flex-shrink:0;}
  .inst-name{font-size:11px;font-weight:800;text-transform:uppercase;
    color:#111;line-height:1.2;}
  .inst-sub{font-size:8px;font-weight:700;letter-spacing:1.5px;color:#888;
    text-transform:uppercase;margin-top:1px;}

  .divider{height:1px;background:#eee;margin:4px 0;}

  .info-rows{padding:0 10px;display:flex;flex-direction:column;gap:3px;margin-bottom:4px;}
  .info-row{display:flex;justify-content:space-between;align-items:baseline;gap:4px;}
  .info-row.wide{flex-direction:column;gap:1px;}
  .lbl{font-size:8px;font-weight:700;text-transform:uppercase;
    letter-spacing:.5px;color:#999;white-space:nowrap;flex-shrink:0;}
  .val{font-size:11px;font-weight:600;color:#111;text-align:right;}
  .val.bold{font-size:12px;font-weight:800;color:#1e3a5f;text-align:left;}
  .val.accent{color:#065f46;}
  .val.red{color:#b91c1c;}

  .fee-tbl{width:100%;border-collapse:collapse;font-size:9px;margin:0 0 4px;}
  .fee-tbl th{background:#1e3a5f;color:#fff;padding:4px 6px;text-align:left;
    font-size:8px;font-weight:600;text-transform:uppercase;letter-spacing:.3px;}
  .fee-tbl th.r,.fee-tbl td.r{text-align:right;}
  .fee-tbl td{padding:3px 6px;border-bottom:1px solid #f0f0f0;color:#333;}
  .fee-tbl tbody tr:nth-child(even){background:#fafafa;}
  .total-row{background:#f0f4ff!important;border-top:1.5px solid #1e3a5f;}
  .total-row td{padding:4px 6px;}
  .net{color:#1e3a5f;font-weight:800;font-size:11px;}

  .amt-box{margin:4px 10px;text-align:center;border:2px solid #1e3a5f;
    border-radius:6px;padding:6px;}
  .amt-lbl{font-size:7px;font-weight:700;text-transform:uppercase;
    letter-spacing:1px;color:#888;}
  .amt-val{font-size:17px;font-weight:800;color:#1e3a5f;line-height:1.1;}
  .amt-disc{font-size:9px;color:#059669;margin-top:2px;}

  .sig-block{margin:6px 10px 10px;text-align:center;}
  .sig-line{border-bottom:1px solid #aaa;margin-bottom:3px;}
  .sig-lbl{font-size:8px;color:#999;}

  /* print */
  @media print{
    body{background:#fff!important;padding:0!important;}
    .toolbar{display:none!important;}
    .challan-row{box-shadow:none!important;border-radius:0!important;
      margin-bottom:0!important;page-break-after:always;break-after:page;}
    .challan-row:last-child{page-break-after:avoid;break-after:avoid;}
    .hcut{display:none;}
    @page{size:A4 landscape;margin:5mm;}
  }
</style>
</head><body>
<div class="toolbar">
  <div>
    <h2>Fee Challan — Bank 3-Copy</h2>
    <p>${list.length} student(s) &nbsp;·&nbsp; ${this.schoolName}</p>
  </div>
  <div class="tbr">
    <button class="btn-p" onclick="window.print()">🖨️ Print / Save PDF</button>
    <button class="btn-c" onclick="window.close()">✕ Close</button>
  </div>
</div>
${rows}
</body></html>`);
    win.document.close();
  }

  // ── Detailed: one full A4 invoice per student with payment status ───────
  private openDetailedChallan(list: ChallanStudent[]) {
    const win = window.open('', '_blank');
    if (!win) { alert('Allow popups for this site to print challans.'); return; }

    const initials = this.schoolName.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
    const logoHtml = this.logoUrl
      ? `<img src="${this.logoUrl}" class="logo" alt="logo"/>`
      : `<div class="logo-av">${initials}</div>`;

    const statusPill = (st: string) => {
      const c = st === 'Paid' ? '#059669' : st === 'Partial' ? '#d97706' : '#b91c1c';
      return `<span class="st-pill" style="color:${c};border-color:${c}">${st}</span>`;
    };

    const page = (s: ChallanStudent) => {
      const totalPaid = s.fees.reduce((t, f) => t + f.amountPaid, 0);
      return `
      <div class="page">
        <div class="head">
          ${logoHtml}
          <div class="head-mid">
            <div class="sn">${this.schoolName}</div>
            <div class="doc-title">FEE CHALLAN — DETAILED</div>
          </div>
          <div class="head-right">
            <div class="chip-lbl">Billing Month</div>
            <div class="chip-val">${s.month} · ${s.yearLabel}</div>
            <div class="chip-lbl" style="margin-top:6px">Due Date</div>
            <div class="chip-val red">${s.dueDate}</div>
          </div>
        </div>

        <div class="stu-grid">
          <div class="stu-item"><span class="lbl">Student Name</span><span class="val big">${s.studentName}</span></div>
          <div class="stu-item"><span class="lbl">Admission No</span><span class="val">${s.admissionNo}</span></div>
          <div class="stu-item"><span class="lbl">Class</span><span class="val">${s.className}</span></div>
          <div class="stu-item"><span class="lbl">Academic Year</span><span class="val">${s.yearLabel}</span></div>
        </div>

        <table class="tbl">
          <thead><tr>
            <th style="width:36px">#</th><th>Fee Description</th><th class="r">Amount</th>
            <th class="r">Discount</th><th class="r">Paid</th><th class="r">Balance</th><th style="width:70px">Status</th>
          </tr></thead>
          <tbody>
            ${s.fees.map((f, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${f.feeTypeName}</td>
                <td class="r">${f.amountDue.toLocaleString()}</td>
                <td class="r">${f.discount > 0 ? f.discount.toLocaleString() : '—'}</td>
                <td class="r">${f.amountPaid > 0 ? f.amountPaid.toLocaleString() : '—'}</td>
                <td class="r">${f.balance.toLocaleString()}</td>
                <td>${statusPill(f.status)}</td>
              </tr>`).join('')}
          </tbody>
          <tfoot>
            <tr class="tot">
              <td colspan="2"><strong>TOTAL</strong></td>
              <td class="r"><strong>${s.totalDue.toLocaleString()}</strong></td>
              <td class="r">${s.totalDiscount > 0 ? s.totalDiscount.toLocaleString() : '—'}</td>
              <td class="r">${totalPaid > 0 ? totalPaid.toLocaleString() : '—'}</td>
              <td class="r net">${s.netPayable.toLocaleString()}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        <div class="bottom">
          <div class="notes">
            <div class="notes-title">Payment Instructions</div>
            <ul>
              <li>Pay before the due date to avoid late payment surcharge.</li>
              <li>Payment can be made at the school fee counter or the designated bank branch.</li>
              <li>Keep the receipt safe — it is required for any fee-related claim.</li>
              <li>Cheques are subject to realisation; write the admission number on the back.</li>
            </ul>
          </div>
          <div class="pay-box">
            <div class="amt-lbl">NET PAYABLE</div>
            <div class="amt-val">PKR ${s.netPayable.toLocaleString()}</div>
            ${s.totalDiscount > 0 ? `<div class="amt-disc">Discount applied: ${s.totalDiscount.toLocaleString()}</div>` : ''}
            ${totalPaid > 0 ? `<div class="amt-paid">Already paid: ${totalPaid.toLocaleString()}</div>` : ''}
          </div>
        </div>

        <div class="sigs">
          <div class="sig"><div class="sig-line"></div><div class="sig-lbl">Accounts Officer</div></div>
          <div class="sig"><div class="sig-line"></div><div class="sig-lbl">Received By (Cashier / Bank)</div></div>
          <div class="sig"><div class="sig-line"></div><div class="sig-lbl">Parent / Guardian</div></div>
        </div>
        <div class="foot">This is a computer-generated challan · ${this.schoolName}</div>
      </div>`;
    };

    win.document.write(`<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"/>
<title>Fee Challan — Detailed</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#f0f0f0;padding:16px;}

  .toolbar{display:flex;justify-content:space-between;align-items:center;
    background:#1e3a5f;color:#fff;padding:12px 20px;border-radius:8px;
    margin-bottom:20px;position:sticky;top:0;z-index:99;box-shadow:0 4px 12px rgba(0,0,0,.25);}
  .toolbar h2{font-size:15px;font-weight:700;}
  .toolbar p{font-size:11px;color:rgba(255,255,255,.7);margin-top:2px;}
  .tbr{display:flex;gap:8px;}
  .btn-p{padding:8px 20px;background:#fff;color:#1e3a5f;border:none;border-radius:6px;
    font-size:13px;font-weight:700;cursor:pointer;}
  .btn-c{padding:8px 16px;background:rgba(255,255,255,.15);color:#fff;
    border:1.5px solid rgba(255,255,255,.35);border-radius:6px;font-size:13px;cursor:pointer;}

  .page{background:#fff;max-width:820px;margin:0 auto 24px;padding:28px 32px;
    border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,.12);}

  .head{display:flex;align-items:center;gap:14px;border-bottom:3px solid #1e3a5f;
    padding-bottom:14px;margin-bottom:16px;}
  .logo{width:56px;height:56px;object-fit:contain;border-radius:8px;border:1px solid #e5e7eb;}
  .logo-av{width:56px;height:56px;border-radius:8px;background:#1e3a5f;color:#fff;
    display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;}
  .head-mid{flex:1;}
  .sn{font-size:19px;font-weight:800;text-transform:uppercase;color:#111;letter-spacing:.5px;}
  .doc-title{font-size:10px;font-weight:700;letter-spacing:2.5px;color:#888;margin-top:3px;}
  .head-right{text-align:right;}
  .chip-lbl{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;}
  .chip-val{font-size:13px;font-weight:800;color:#1e3a5f;}
  .chip-val.red{color:#b91c1c;}

  .stu-grid{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:8px;margin-bottom:16px;}
  .stu-item{background:#f8f9fb;border-left:3px solid #1e3a5f;border-radius:5px;
    padding:7px 10px;display:flex;flex-direction:column;}
  .lbl{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#999;}
  .val{font-size:13px;font-weight:700;color:#111;}
  .val.big{font-size:15px;color:#1e3a5f;}

  .tbl{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px;}
  .tbl th{background:#1e3a5f;color:#fff;padding:7px 10px;text-align:left;
    font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;}
  .tbl th.r,.tbl td.r{text-align:right;}
  .tbl td{padding:7px 10px;border-bottom:1px solid #f0f0f0;color:#333;}
  .tbl tbody tr:nth-child(even){background:#fafafa;}
  .tot{background:#f0f4ff!important;border-top:2px solid #1e3a5f;}
  .net{color:#1e3a5f;font-weight:800;font-size:14px;}
  .st-pill{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;
    border:1.5px solid;border-radius:10px;padding:2px 8px;}

  .bottom{display:flex;gap:16px;margin-bottom:20px;}
  .notes{flex:1;background:#f8f9fb;border-radius:8px;padding:12px 16px;}
  .notes-title{font-size:10px;font-weight:800;text-transform:uppercase;
    letter-spacing:1px;color:#1e3a5f;margin-bottom:6px;}
  .notes ul{padding-left:16px;}
  .notes li{font-size:10.5px;color:#555;margin-bottom:3px;line-height:1.45;}
  .pay-box{width:220px;text-align:center;border:2.5px solid #1e3a5f;border-radius:10px;
    padding:16px 12px;align-self:flex-start;}
  .amt-lbl{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#888;}
  .amt-val{font-size:24px;font-weight:800;color:#1e3a5f;line-height:1.2;margin-top:2px;}
  .amt-disc{font-size:10px;color:#059669;margin-top:4px;}
  .amt-paid{font-size:10px;color:#d97706;margin-top:2px;}

  .sigs{display:flex;gap:24px;margin-top:28px;}
  .sig{flex:1;text-align:center;}
  .sig-line{border-bottom:1px solid #999;margin-bottom:4px;}
  .sig-lbl{font-size:9px;color:#888;}
  .foot{text-align:center;font-size:9px;color:#bbb;margin-top:16px;
    border-top:1px dashed #e5e7eb;padding-top:8px;}

  @media print{
    body{background:#fff!important;padding:0!important;}
    .toolbar{display:none!important;}
    .page{box-shadow:none!important;border-radius:0!important;margin:0!important;
      max-width:none!important;page-break-after:always;break-after:page;}
    .page:last-child{page-break-after:avoid;break-after:avoid;}
    @page{size:A4 portrait;margin:10mm;}
  }
</style>
</head><body>
<div class="toolbar">
  <div>
    <h2>Fee Challan — Detailed</h2>
    <p>${list.length} student(s) &nbsp;·&nbsp; ${this.schoolName}</p>
  </div>
  <div class="tbr">
    <button class="btn-p" onclick="window.print()">🖨️ Print / Save PDF</button>
    <button class="btn-c" onclick="window.close()">✕ Close</button>
  </div>
</div>
${list.map(page).join('')}
</body></html>`);
    win.document.close();
  }

  private openThreeStripChallan(list: ChallanStudent[]) {
    const win = window.open('', '_blank');
    if (!win) { alert('Allow popups for this site to print challans.'); return; }

    const initials = this.schoolName.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
    const logoHtml = this.logoUrl
      ? `<img src="${this.logoUrl}" class="inst-logo" alt="logo"/>`
      : `<div class="inst-avatar">${initials}</div>`;

    const strip = (s: ChallanStudent, label: string, color: string, sig: string) => `
      <div class="strip">
        <div class="strip-inner">
          <div class="strip-left">
            <div class="inst-header">
              ${logoHtml}
              <div class="inst-header-text">
                <span class="copy-label" style="background:${color}">${label}</span>
                <div class="school-name">${this.schoolName}</div>
                <div class="challan-heading">FEE CHALLAN</div>
              </div>
            </div>
            <div class="info-grid">
              <div class="info-item info-item--wide">
                <span class="info-lbl">Student Name</span>
                <span class="info-val info-val--name">${s.studentName}</span>
              </div>
              <div class="info-item">
                <span class="info-lbl">Admission No</span>
                <span class="info-val">${s.admissionNo}</span>
              </div>
              <div class="info-item">
                <span class="info-lbl">Class</span>
                <span class="info-val">${s.className}</span>
              </div>
              <div class="info-item">
                <span class="info-lbl">Academic Year</span>
                <span class="info-val">${s.yearLabel}</span>
              </div>
              <div class="info-item">
                <span class="info-lbl">Month</span>
                <span class="info-val info-val--highlight">${s.month}</span>
              </div>
              <div class="info-item">
                <span class="info-lbl">Due Date</span>
                <span class="info-val info-val--due">${s.dueDate}</span>
              </div>
            </div>
            <table class="fee-tbl">
              <colgroup><col/><col/><col/><col/></colgroup>
              <thead><tr><th>Fee Type</th><th>Amount</th><th>Discount</th><th>Payable</th></tr></thead>
              <tbody>
                ${s.fees.map(f => `
                  <tr>
                    <td>${f.feeTypeName}</td>
                    <td class="r">${f.amountDue.toLocaleString()}</td>
                    <td class="r">${f.discount > 0 ? f.discount.toLocaleString() : '—'}</td>
                    <td class="r">${f.balance.toLocaleString()}</td>
                  </tr>`).join('')}
              </tbody>
              <tfoot>
                <tr class="total-row">
                  <td><strong>TOTAL</strong></td>
                  <td class="r"><strong>${s.totalDue.toLocaleString()}</strong></td>
                  <td class="r">${s.totalDiscount > 0 ? '<strong>' + s.totalDiscount.toLocaleString() + '</strong>' : '—'}</td>
                  <td class="r net">${s.netPayable.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div class="strip-right">
            <div class="amt-box">
              <div class="amt-lbl">NET PAYABLE</div>
              <div class="amt-val">${s.netPayable.toLocaleString()}</div>
              ${s.totalDiscount > 0 ? `<div class="amt-disc">Discount: ${s.totalDiscount.toLocaleString()}</div>` : ''}
            </div>
            <div class="sig-block">
              <div class="sig-line"></div>
              <div class="sig-lbl">${sig}</div>
            </div>
          </div>
        </div>
      </div>`;

    const challans = list.map(s => `
      <div class="challan-page">
        ${strip(s, 'SCHOOL COPY',  '#1e3a5f', 'Cashier Signature')}
        <div class="cut">✂ &nbsp;- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -</div>
        ${strip(s, 'PARENTS COPY', '#065f46', 'Cashier Signature')}
        <div class="cut">✂ &nbsp;- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -</div>
        ${strip(s, 'BANK COPY',    '#7c2d12', 'Bank Stamp & Signature')}
      </div>`).join('');

    win.document.write(`<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"/>
<title>Fee Challan</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#f4f4f4;padding:20px;}

  /* ── Toolbar ── */
  .toolbar{display:flex;justify-content:space-between;align-items:center;
    background:#1e3a5f;color:#fff;padding:14px 24px;border-radius:10px;
    margin-bottom:24px;position:sticky;top:0;z-index:99;box-shadow:0 4px 12px rgba(0,0,0,.25);}
  .toolbar-info h2{font-size:16px;font-weight:700;letter-spacing:.3px;}
  .toolbar-info p{font-size:12px;color:rgba(255,255,255,.7);margin-top:2px;}
  .toolbar-btns{display:flex;gap:10px;}
  .btn-print{padding:9px 22px;background:#fff;color:#1e3a5f;border:none;
    border-radius:7px;font-size:13px;font-weight:700;cursor:pointer;}
  .btn-print:hover{background:#e0e7ff;}
  .btn-close{padding:9px 18px;background:rgba(255,255,255,.15);color:#fff;
    border:1.5px solid rgba(255,255,255,.4);border-radius:7px;font-size:13px;
    font-weight:600;cursor:pointer;}
  .btn-close:hover{background:rgba(255,255,255,.25);}

  /* ── Challan page ── */
  .challan-page{background:#fff;max-width:800px;margin:0 auto 32px;
    border-radius:10px;overflow:hidden;
    box-shadow:0 2px 16px rgba(0,0,0,.12);border:1px solid #ddd;}

  /* ── Strip ── */
  .strip{padding:14px 18px;}
  .strip-inner{display:flex;gap:16px;align-items:stretch;}
  .strip-left{flex:1;}
  .strip-right{width:160px;display:flex;flex-direction:column;
    justify-content:space-between;border-left:1.5px dashed #ccc;padding-left:16px;}

  /* Institute header: logo + name side by side */
  .inst-header{display:flex;align-items:center;gap:10px;margin-bottom:8px;}
  .inst-logo{width:48px;height:48px;object-fit:contain;border-radius:6px;
    border:1px solid #e5e7eb;flex-shrink:0;}
  .inst-avatar{width:48px;height:48px;border-radius:6px;background:#1e3a5f;
    color:#fff;display:flex;align-items:center;justify-content:center;
    font-size:16px;font-weight:800;letter-spacing:1px;flex-shrink:0;}
  .inst-header-text{display:flex;flex-direction:column;}

  .copy-label{font-size:9px;font-weight:800;text-transform:uppercase;
    letter-spacing:1.2px;color:#fff;padding:3px 10px;border-radius:3px;
    display:inline-block;margin-bottom:4px;}

  .school-name{font-size:14px;font-weight:800;text-transform:uppercase;
    letter-spacing:.5px;color:#111;line-height:1.2;}
  .challan-heading{font-size:10px;font-weight:700;letter-spacing:2px;
    color:#666;margin:2px 0 0;text-transform:uppercase;}

  /* Info grid – single column cards */
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px 10px;margin-bottom:10px;}
  .info-item{display:flex;flex-direction:column;background:#f8f9fb;
    border-left:3px solid #1e3a5f;border-radius:4px;padding:4px 8px;}
  .info-item--wide{grid-column:1/-1;}
  .info-lbl{font-size:9px;font-weight:700;text-transform:uppercase;
    letter-spacing:.8px;color:#888;margin-bottom:1px;}
  .info-val{font-size:12px;font-weight:600;color:#111;}
  .info-val--name{font-size:13px;font-weight:800;color:#1e3a5f;}
  .info-val--highlight{color:#065f46;font-weight:700;}
  .info-val--due{color:#b91c1c;font-weight:700;}

  /* Fee breakdown table */
  .fee-tbl{width:100%;border-collapse:collapse;font-size:11px;table-layout:fixed;}
  .fee-tbl colgroup col:nth-child(1){width:40%;}
  .fee-tbl colgroup col:nth-child(2){width:20%;}
  .fee-tbl colgroup col:nth-child(3){width:20%;}
  .fee-tbl colgroup col:nth-child(4){width:20%;}
  .fee-tbl thead tr{background:#1e3a5f;color:#fff;}
  .fee-tbl thead th{padding:5px 8px;text-align:left;font-weight:600;font-size:10px;
    letter-spacing:.3px;text-transform:uppercase;}
  .fee-tbl thead th:nth-child(2),.fee-tbl thead th:nth-child(3),.fee-tbl thead th:nth-child(4){text-align:right;}
  .fee-tbl td.r{text-align:right;}
  .fee-tbl tbody tr{border-bottom:1px solid #f0f0f0;}
  .fee-tbl tbody tr:nth-child(even){background:#fafafa;}
  .fee-tbl tbody td{padding:5px 8px;color:#333;}
  .fee-tbl tfoot .total-row{background:#f0f4ff;border-top:2px solid #1e3a5f;}
  .fee-tbl tfoot td{padding:6px 8px;}
  .fee-tbl .net{color:#1e3a5f;font-weight:800;font-size:13px;}

  /* Amount box */
  .amt-box{text-align:center;border:2px solid #1e3a5f;border-radius:8px;
    padding:12px 8px;margin-bottom:12px;}
  .amt-lbl{font-size:8px;font-weight:700;text-transform:uppercase;
    letter-spacing:1px;color:#888;margin-bottom:4px;}
  .amt-val{font-size:20px;font-weight:800;color:#1e3a5f;line-height:1;}
  .amt-disc{font-size:10px;color:#059669;margin-top:4px;}

  /* Signature */
  .sig-block{text-align:center;}
  .sig-line{border-bottom:1px solid #aaa;margin:8px 0 4px;}
  .sig-lbl{font-size:9px;color:#888;}

  /* Cut line */
  .cut{font-size:10px;color:#bbb;padding:1px 8px;
    border-top:1px dashed #ddd;border-bottom:1px dashed #ddd;
    line-height:18px;white-space:nowrap;overflow:hidden;background:#fafafa;
    letter-spacing:.5px;}

  /* Print */
  @media print{
    body{background:#fff!important;padding:0!important;}
    .toolbar{display:none!important;}
    .challan-page{box-shadow:none!important;border-radius:0!important;
      margin:0!important;border:none!important;
      page-break-after:always;break-after:page;}
    .challan-page:last-child{page-break-after:avoid;break-after:avoid;}

    /* Compact everything to fit 3 strips on one A4 page */
    .strip{padding:5px 10px;}
    .strip-right{width:130px;padding-left:10px;}
    .inst-header{gap:6px;margin-bottom:4px;}
    .inst-logo{width:36px;height:36px;}
    .inst-avatar{width:36px;height:36px;font-size:12px;}
    .copy-label{font-size:7px;padding:2px 7px;margin-bottom:2px;}
    .school-name{font-size:11px;}
    .challan-heading{font-size:8px;margin:1px 0 0;}

    .info-grid{gap:3px 6px;margin-bottom:6px;}
    .info-item{padding:2px 5px;}
    .info-lbl{font-size:7px;}
    .info-val{font-size:10px;}
    .info-val--name{font-size:11px;}

    .fee-tbl{font-size:9px;}
    .fee-tbl thead th{padding:3px 5px;font-size:8px;}
    .fee-tbl tbody td{padding:3px 5px;}
    .fee-tbl tfoot td{padding:3px 5px;}
    .fee-tbl .net{font-size:10px;}

    .amt-box{padding:6px 6px;margin-bottom:6px;}
    .amt-lbl{font-size:7px;}
    .amt-val{font-size:15px;}
    .amt-disc{font-size:8px;margin-top:2px;}

    .sig-line{margin:4px 0 2px;}
    .sig-lbl{font-size:7px;}

    .cut{line-height:12px;padding:0 6px;}

    @page{size:A4 portrait;margin:6mm;}
  }
</style>
</head><body>
<div class="toolbar">
  <div class="toolbar-info">
    <h2>Fee Challan</h2>
    <p>${list.length} student(s) &nbsp;·&nbsp; ${this.schoolName}</p>
  </div>
  <div class="toolbar-btns">
    <button class="btn-print" onclick="window.print()">🖨️ Print / Save PDF</button>
    <button class="btn-close" onclick="window.close()">✕ Close</button>
  </div>
</div>
${challans}
</body></html>`);
    win.document.close();
  }   // end openThreeStripChallan
}
