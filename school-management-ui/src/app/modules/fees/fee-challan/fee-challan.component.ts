import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { FeeService } from '../../../core/services/fee.service';
import { AcademicService } from '../../../core/services/academic.service';
import { AuthService } from '../../../core/services/auth.service';
import { StudentFeeDto, FeeStructureDto } from '../../../core/models/fee.model';
import { AcademicYear } from '../../../core/models/academic.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';

@Component({
  selector: 'app-fee-challan',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, DatePickerComponent],
  template: `
    <app-page-header title="Fee Challan" subtitle="Generate challans for a class then print 3-copy slips" />

    <!-- ── STEP 1: GENERATE (no-print) ── -->
    <div class="no-print">

      <!-- Step indicator -->
      <div class="steps">
        <div class="step" [class.active]="step === 1" [class.done]="step > 1">
          <span class="step-num">1</span> Select & Generate
        </div>
        <div class="step-arrow">›</div>
        <div class="step" [class.active]="step === 2">
          <span class="step-num">2</span> Preview & Print
        </div>
      </div>

      @if (step === 1) {
        <div class="card gen-card">
          <div class="gen-title">Generate Fee Challans</div>
          <div class="gen-subtitle">Select a Fee Structure — challans will be generated for all students in that class.</div>

          <div class="gen-form">
            <div class="gen-row">
              <div class="field">
                <label>Academic Year *</label>
                <select [(ngModel)]="genYearId" (change)="onGenYearChange()">
                  <option [ngValue]="null">Select year</option>
                  @for (y of years(); track y.academicYearId) {
                    <option [ngValue]="y.academicYearId">{{ y.yearLabel }}</option>
                  }
                </select>
              </div>
              <div class="field">
                <label>Fee Structure *</label>
                <select [(ngModel)]="selectedGroupKey" (change)="onStructureGroupChange()">
                  <option value="">Select fee structure</option>
                  @for (g of structureGroups(); track g.key) {
                    <option [value]="g.key">{{ g.title }}</option>
                  }
                </select>
              </div>
              <div class="field">
                <label>Month *</label>
                <select [(ngModel)]="genMonth" (change)="onMonthChange()">
                  <option [ngValue]="null">Select month</option>
                  @for (m of months; track m.value) {
                    <option [ngValue]="m.value">{{ m.label }}</option>
                  }
                </select>
              </div>
              <div class="field">
                <label>Due Date *</label>
                <app-date-picker [(ngModel)]="genDueDate" />
              </div>
            </div>

            <!-- Selected structure preview card -->
            @if (selectedGroup()) {
              <div class="struct-preview-card">
                <div class="struct-preview-header">
                  <div>
                    <div class="struct-preview-title">{{ selectedGroup()!.title }}</div>
                    <div class="struct-preview-sub">{{ selectedGroup()!.className }} &nbsp;·&nbsp; {{ selectedGroup()!.yearLabel }}</div>
                  </div>
                  <div class="struct-preview-total">PKR {{ selectedGroup()!.grandTotal | number:'1.0-0' }}</div>
                </div>
                <table class="preview-fee-table">
                  <tbody>
                    @for (fs of selectedGroup()!.items; track fs.feeStructureId) {
                      <tr>
                        <td>{{ fs.feeTypeName }}</td>
                        <td><span [class]="'cat-pill cat-' + (fs.feeCategory||'recurring').toLowerCase()">{{ fs.feeCategory }}</span></td>
                        <td class="amt">PKR {{ fs.amount | number:'1.0-0' }}</td>
                      </tr>
                    }
                  </tbody>
                  <tfoot>
                    <tr class="preview-total-row">
                      <td colspan="2">Total Fee Structure</td>
                      <td class="amt"><strong>PKR {{ selectedGroup()!.grandTotal | number:'1.0-0' }}</strong></td>
                    </tr>
                    @if (selectedGroup()!.admissionTotal > 0) {
                      <tr class="preview-sub-row">
                        <td colspan="2">Payable on Admission</td>
                        <td class="amt">PKR {{ selectedGroup()!.admissionTotal | number:'1.0-0' }}</td>
                      </tr>
                      <tr class="preview-sub-row">
                        <td colspan="2">Remaining</td>
                        <td class="amt">PKR {{ selectedGroup()!.grandTotal - selectedGroup()!.admissionTotal | number:'1.0-0' }}</td>
                      </tr>
                    }
                  </tfoot>
                </table>
              </div>
            }
          </div>

          @if (genError()) { <div class="alert error">{{ genError() }}</div> }

          <div class="gen-actions">
            <button class="btn-primary btn-lg" (click)="generate()"
              [disabled]="generating() || !selectedGroup() || !genMonth || !genDueDate">
              {{ generating() ? 'Generating...' : '⚡ Generate Challans for ' + (selectedGroup()?.className || '...') }}
            </button>
          </div>
        </div>
      }

      @if (step === 2) {
        <!-- Preview bar -->
        <div class="preview-bar">
          <div class="preview-info">
            <strong>{{ generatedClass }}</strong> · {{ generatedYear }} · {{ generatedMonth }}
            &nbsp;·&nbsp;
            @if (createdCount > 0) {
              <span class="count-chip">{{ createdCount }} new challan(s) generated</span>
            } @else {
              <span class="count-chip warn">No new challans — already generated for {{ generatedMonth }}</span>
            }
            @if (createdCount > 0 && skippedCount > 0) {
              <span class="count-chip warn">{{ skippedCount }} already existed</span>
            }
            &nbsp;·&nbsp; Due: <strong>{{ genDueDate }}</strong>
          </div>
          <div class="preview-actions">
            <button class="btn-secondary" (click)="step = 1">← Back</button>
            <button class="btn-primary" (click)="printChallan()">🖨️ Print All Challans</button>
          </div>
        </div>

        <!-- Preview table (one row per student, combined) -->
        <div class="card preview-table-card">
          <table class="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Student Name</th>
                <th>Admission No</th>
                <th style="text-align:right">Total</th>
                <th style="text-align:right">Discount</th>
                <th style="text-align:right">Payable</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (s of groupedFees(); track s.studentId; let i = $index) {
                <tr>
                  <td class="idx">{{ i + 1 }}</td>
                  <td><strong>{{ s.studentName }}</strong></td>
                  <td class="mono">{{ s.admissionNo }}</td>
                  <td class="amt">PKR {{ s.totalDue | number:'1.0-0' }}</td>
                  <td class="amt disc">{{ s.totalDiscount > 0 ? ('PKR ' + (s.totalDiscount | number:'1.0-0')) : '—' }}</td>
                  <td class="amt payable"><strong>PKR {{ s.netPayable | number:'1.0-0' }}</strong></td>
                  <td class="print-col">
                    <button class="btn-print-row" (click)="printStudent(s.studentId)">🖨️ Print</button>
                  </td>
                </tr>
              }
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td colspan="3"><strong>TOTAL ({{ groupedFees().length }} students)</strong></td>
                <td class="amt"><strong>PKR {{ totalDue() | number:'1.0-0' }}</strong></td>
                <td class="amt disc"><strong>PKR {{ totalDiscount() | number:'1.0-0' }}</strong></td>
                <td class="amt payable"><strong>PKR {{ totalBalance() | number:'1.0-0' }}</strong></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      }
    </div>

  `,
  styles: [`
    /* Steps */
    .steps { display:flex; align-items:center; gap:8px; margin:16px 0 12px; }
    .step { display:flex; align-items:center; gap:8px; padding:8px 16px; border-radius:8px;
      font-size:13px; font-weight:600; color:var(--t4); background:var(--surface);
      border:1.5px solid var(--border); transition:all .2s; }
    .step.active { color:var(--accent); border-color:var(--accent); background:var(--accent-g); }
    .step.done { color:var(--green); border-color:var(--green); background:var(--green-s); }
    .step-num { width:22px; height:22px; border-radius:50%; background:currentColor;
      color:#fff; display:flex; align-items:center; justify-content:center; font-size:11px; }
    .step.active .step-num { background:var(--accent); color:#fff; }
    .step.done .step-num { background:var(--green); color:#fff; }
    .step-arrow { font-size:20px; color:var(--t4); }

    /* Generate card */
    .gen-card { padding:24px; margin-top:0; }
    .gen-title { font-size:16px; font-weight:700; color:var(--t1); margin-bottom:4px; }
    .gen-subtitle { font-size:13px; color:var(--t4); margin-bottom:20px; }
    .gen-form { display:flex; flex-direction:column; gap:16px; }
    .gen-row { display:flex; gap:16px; flex-wrap:wrap; }
    .gen-row .field { flex:1; min-width:160px; }

    .field { display:flex; flex-direction:column; gap:5px; }
    label { font-size:11px; font-weight:600; color:var(--t3); text-transform:uppercase; letter-spacing:.5px; }
    input, select { padding:9px 12px; border:1.5px solid var(--border); border-radius:7px;
      font-size:13.5px; font-family:inherit; background:var(--surface); color:var(--t1); }
    input:focus, select:focus { outline:none; border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-g); }

    /* Structure selector */
    .struct-section { border:1.5px solid var(--border); border-radius:10px; overflow:hidden; }
    .struct-label { display:flex; justify-content:space-between; align-items:center;
      padding:10px 14px; background:var(--surface-2); font-size:12px; font-weight:600; color:var(--t3);
      text-transform:uppercase; letter-spacing:.5px; border-bottom:1px solid var(--border); }
    .btn-text { background:none; border:none; cursor:pointer; font-size:12px; color:var(--accent);
      font-family:inherit; padding:0; font-weight:600; }
    .struct-list { display:flex; flex-direction:column; }
    .struct-item { display:flex; align-items:center; gap:12px; padding:10px 14px; cursor:pointer;
      border-bottom:1px solid var(--border); transition:background .1s; }
    .struct-item:last-child { border-bottom:none; }
    .struct-item:hover { background:var(--surface-2); }
    .struct-item.selected { background:var(--accent-g); }
    .struct-item input[type=checkbox] { width:16px; height:16px; accent-color:var(--accent); cursor:pointer; flex-shrink:0; }
    .struct-info { display:flex; align-items:center; gap:8px; flex:1; }
    .struct-name { font-size:13.5px; font-weight:600; color:var(--t1); }
    .struct-amount { font-size:13px; font-weight:700; color:var(--t1); font-family:monospace; margin-left:auto; }
    .struct-total { padding:10px 14px; background:var(--surface-2); border-top:1px solid var(--border);
      font-size:13px; color:var(--t3); }

    .cat-pill { padding:2px 8px; border-radius:8px; font-size:10px; font-weight:600; }
    .cat-recurring          { background:#dbeafe; color:#1d4ed8; }
    .cat-onetime            { background:#d1fae5; color:#065f46; }
    .cat-ondemand           { background:#fef9c3; color:#854d0e; }
    .cat-refundabledeposit  { background:#fce7f3; color:#be185d; }

    .no-struct { padding:20px; text-align:center; color:var(--t4); font-style:italic; font-size:13px; }

    /* Structure preview card */
    .struct-preview-card { border:1.5px solid var(--accent); border-radius:10px; overflow:hidden; }
    .struct-preview-header { display:flex; justify-content:space-between; align-items:center;
      padding:12px 16px; background:var(--accent-g); border-bottom:1px solid var(--border); }
    .struct-preview-title { font-size:14px; font-weight:700; color:var(--t1); }
    .struct-preview-sub { font-size:12px; color:var(--t3); margin-top:2px; }
    .struct-preview-total { font-size:16px; font-weight:800; color:var(--accent); }
    .preview-fee-table { width:100%; border-collapse:collapse; font-size:13px; }
    .preview-fee-table tbody tr { border-bottom:1px solid var(--border); }
    .preview-fee-table td { padding:9px 16px; color:var(--t2); }
    .preview-fee-table td.amt { text-align:right; font-family:monospace; font-weight:600; color:var(--t1); }
    .preview-total-row td { padding:10px 16px; background:var(--surface-2); font-weight:700;
      color:var(--t1); border-top:2px solid var(--border); }
    .preview-total-row td.amt { color:var(--accent); font-size:14px; }
    .preview-sub-row td { padding:7px 16px; color:var(--t3); font-size:12px; background:var(--surface-2); }

    .alert.error { background:var(--red-s); color:var(--red); border:1px solid var(--red);
      padding:10px 14px; border-radius:6px; font-size:13px; margin-top:12px; }

    .gen-actions { display:flex; justify-content:flex-end; margin-top:20px; }
    .btn-lg { padding:11px 28px; font-size:14px; }

    /* Preview bar */
    .preview-bar { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap;
      gap:12px; padding:12px 16px; background:var(--surface); border:1px solid var(--border);
      border-radius:10px; margin-bottom:12px; }
    .preview-info { font-size:13px; color:var(--t3); }
    .preview-actions { display:flex; gap:8px; }
    .count-chip { background:var(--accent-g); color:var(--accent); padding:2px 10px;
      border-radius:8px; font-weight:600; font-size:12px; }
    .count-chip.warn { background:#fef3c7; color:#92400e; }
    .preview-table-card { overflow:hidden; }
    .total-row td { background:var(--surface-2); border-top:2px solid var(--border); font-size:13px; padding:8px 10px; }

    .status-badge { padding:2px 8px; border-radius:8px; font-size:11px; font-weight:600; }
    .status-unpaid  { background:#fee2e2; color:#991b1b; }
    .status-partial { background:#fef9c3; color:#854d0e; }
    .status-paid    { background:#d1fae5; color:#065f46; }
    .status-waived  { background:#f3f4f6; color:#374151; }

    .idx  { width:36px; color:var(--t4); font-size:12px; }
    .mono { font-family:monospace; font-size:13px; }
    .amt  { text-align:right; font-family:monospace; font-size:13px; }
    .disc { color:#059669; }
    .payable { color:var(--t1); }
    .print-col { width:80px; text-align:center; }
    .btn-print-row { padding:4px 10px; font-size:12px; border:1.5px solid var(--accent);
      background:var(--accent-g); color:var(--accent); border-radius:6px; cursor:pointer;
      font-family:inherit; font-weight:600; transition:background .15s; }
    .btn-print-row:hover { background:var(--accent); color:#fff; }


    /* Challan print styles */
    .challan-individual { page-break-after:always; }
    .challan-individual:last-child { page-break-after:avoid; }
    .challan-3part { display:flex; flex-direction:column; border:1.5px solid #333; }
    .challan-strip { padding:10px 14px; }
    .strip-inner { display:flex; gap:12px; align-items:stretch; }
    .strip-left { flex:1; }
    .strip-right { width:160px; display:flex; flex-direction:column; justify-content:space-between;
      border-left:1px dashed #aaa; padding-left:12px; }
    .part-label { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1px;
      color:#fff; padding:2px 8px; display:inline-block; margin-bottom:5px; border-radius:3px; }
    .school-lbl  { background:#1e3a5f; }
    .parents-lbl { background:#065f46; }
    .bank-lbl    { background:#7c2d12; }
    .challan-strip .school-name { font-size:13px; font-weight:800; text-transform:uppercase; letter-spacing:.5px; color:#111; }
    .challan-strip .challan-title { font-size:10px; font-weight:700; letter-spacing:1.5px; color:#555; margin:2px 0 6px; }
    .info-table { width:100%; border-collapse:collapse; font-size:11px; }
    .info-table td { padding:2px 4px; vertical-align:top; }
    .info-table td:first-child { color:#666; white-space:nowrap; padding-right:8px; width:90px; }
    .amount-box { text-align:center; border:1px solid #ccc; border-radius:4px; padding:8px 6px; margin-bottom:8px; }
    .amount-label { font-size:9px; color:#888; text-transform:uppercase; letter-spacing:.5px; }
    .amount-val { font-size:13px; font-weight:600; color:#333; margin:2px 0; }
    .amount-disc { font-size:10px; color:#059669; }
    .amount-net { font-size:16px; font-weight:800; color:#111; border-top:1.5px solid #333; margin-top:4px; padding-top:4px; }
    .amount-net-lbl { font-size:8px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#555; }
    .fee-breakdown-table { width:100%; border-collapse:collapse; font-size:10px; margin-top:6px; }
    .fee-breakdown-table th { background:#f3f4f6; padding:2px 4px; text-align:left; font-weight:700; color:#555; border-bottom:1px solid #ddd; }
    .fee-breakdown-table td { padding:2px 4px; border-bottom:1px solid #eee; color:#333; }
    .fee-breakdown-table td:nth-child(2), .fee-breakdown-table td:nth-child(3) { text-align:right; white-space:nowrap; }
    .fee-breakdown-table th:nth-child(2), .fee-breakdown-table th:nth-child(3) { text-align:right; }
    .sig-area { text-align:center; }
    .sig-line-small { width:100%; border-bottom:1px solid #999; margin-bottom:3px; margin-top:8px; }
    .sig-label { font-size:9px; color:#666; }
    .cut-line { font-size:10px; color:#aaa; letter-spacing:1px; padding:0 4px;
      border-top:1px dashed #ccc; border-bottom:1px dashed #ccc; line-height:16px; overflow:hidden; white-space:nowrap; }
  `]
})
export class FeeChallanComponent implements OnInit {
  private feeSvc  = inject(FeeService);
  private acadSvc = inject(AcademicService);
  private authSvc = inject(AuthService);
  private router  = inject(Router);

  step = 1;

  // Step 1 – generate
  genYearId:  number | null = null;
  genDueDate: string = '';
  genMonth:   number | null = null;
  generating  = signal(false);
  genError    = signal('');

  months = [
    { value: 1,  label: 'January'   },
    { value: 2,  label: 'February'  },
    { value: 3,  label: 'March'     },
    { value: 4,  label: 'April'     },
    { value: 5,  label: 'May'       },
    { value: 6,  label: 'June'      },
    { value: 7,  label: 'July'      },
    { value: 8,  label: 'August'    },
    { value: 9,  label: 'September' },
    { value: 10, label: 'October'   },
    { value: 11, label: 'November'  },
    { value: 12, label: 'December'  },
  ];

  years        = signal<AcademicYear[]>([]);
  allStructures = signal<FeeStructureDto[]>([]);

  selectedGroupKey = '';

  // Step 2 – preview & print
  fees           = signal<StudentFeeDto[]>([]);
  generatedClass = '';
  generatedYear  = '';
  generatedMonth = '';
  createdCount   = 0;
  skippedCount   = 0;

  ngOnInit() {
    this.acadSvc.getYears().subscribe(y => this.years.set(y));
  }

  onGenYearChange() {
    this.selectedGroupKey = '';
    this.allStructures.set([]);
    if (this.genYearId)
      this.feeSvc.getFeeStructures(this.genYearId).subscribe(s => this.allStructures.set(s.filter(x => x.isActive)));
  }

  onStructureGroupChange() { /* selectedGroup() reacts automatically */ }

  // Default the due date to the 10th of the selected billing month, resolved
  // to the right calendar year within the selected academic year.
  onMonthChange() {
    if (!this.genMonth) return;
    const year = this.years().find(y => y.academicYearId === this.genYearId);
    let calYear = new Date().getFullYear();
    if (year?.startDate) {
      const start = new Date(year.startDate);
      calYear = this.genMonth >= start.getMonth() + 1 ? start.getFullYear() : start.getFullYear() + 1;
    }
    this.genDueDate = `${calYear}-${String(this.genMonth).padStart(2, '0')}-10`;
  }

  structureGroups(): { key: string; title: string; className: string; yearLabel: string; classId: number; academicYearId: number; items: FeeStructureDto[]; grandTotal: number; admissionTotal: number }[] {
    const map = new Map<string, { key: string; title: string; className: string; yearLabel: string; classId: number; academicYearId: number; items: FeeStructureDto[] }>();
    for (const fs of this.allStructures()) {
      // Group by class + academicYear (all fee items for a class form one challan)
      const key = `${fs.classId}__${fs.academicYearId}`;
      if (!map.has(key)) {
        const title = fs.campusName
          ? `${fs.className} — ${fs.campusName} — ${fs.yearLabel}`
          : `${fs.className} — ${fs.yearLabel}`;
        map.set(key, { key, title, className: fs.className, yearLabel: fs.yearLabel, classId: fs.classId, academicYearId: fs.academicYearId, items: [] });
      }
      map.get(key)!.items.push(fs);
    }
    return Array.from(map.values()).map(g => ({
      ...g,
      grandTotal: g.items.reduce((s, f) => s + f.amount, 0),
      admissionTotal: g.items.filter(f => f.feeCategory === 'OneTime' || f.feeCategory === 'RefundableDeposit').reduce((s, f) => s + f.amount, 0),
    }));
  }

  selectedGroup() {
    return this.structureGroups().find(g => g.key === this.selectedGroupKey) ?? null;
  }

  generate() {
    const group = this.selectedGroup();
    if (!group || !this.genDueDate) return;
    this.generating.set(true);
    this.genError.set('');

    const dueDate = this.genDueDate;
    const month   = this.genMonth ?? undefined;
    const requests = group.items.map(fs =>
      this.feeSvc.bulkAssign({ feeStructureId: fs.feeStructureId, classId: group.classId, academicYearId: group.academicYearId, dueDate, month })
    );

    forkJoin(requests).subscribe({
      next: (results) => {
        const allFees = results.flatMap(r => r.fees);
        this.fees.set(allFees);
        this.createdCount = results.reduce((s, r) => s + (r.created ?? 0), 0);
        this.skippedCount = results.reduce((s, r) => s + (r.skipped ?? 0), 0);
        this.generatedClass = group.className;
        this.generatedYear  = group.yearLabel;
        this.generatedMonth = this.months.find(m => m.value === this.genMonth)?.label ?? '';
        this.generating.set(false);
        this.step = 2;
      },
      error: (e: any) => {
        this.generating.set(false);
        this.genError.set(e?.error?.error ?? 'Failed to generate challans. Some may already exist.');
      }
    });
  }

  groupedFees() {
    const map = new Map<number, { studentId: number; studentName: string; admissionNo: string; className: string; yearLabel: string; month: string; dueDate: string; fees: StudentFeeDto[]; totalDue: number; totalDiscount: number; netPayable: number }>();
    for (const f of this.fees()) {
      if (!map.has(f.studentId)) {
        map.set(f.studentId, { studentId: f.studentId, studentName: f.studentName, admissionNo: f.admissionNo, className: f.className, yearLabel: f.yearLabel, month: this.generatedMonth, dueDate: f.dueDate, fees: [], totalDue: 0, totalDiscount: 0, netPayable: 0 });
      }
      const g = map.get(f.studentId)!;
      g.fees.push(f);
      g.totalDue      += f.amountDue;
      g.totalDiscount += f.discount;
      g.netPayable    += f.balance;
    }
    return Array.from(map.values());
  }

  totalDue()      { return this.fees().reduce((s, f) => s + f.amountDue, 0); }
  totalDiscount() { return this.fees().reduce((s, f) => s + f.discount, 0); }
  totalBalance()  { return this.fees().reduce((s, f) => s + f.balance, 0); }

  previewStudent: null = null; // kept to avoid template errors — modal removed

  private instituteId() {
    // Institute admin has it in JWT; superadmin derives it from generated fee records
    return this.authSvc.currentUser()?.instituteId
      ?? this.fees().find(f => f.instituteId)?.instituteId;
  }

  printStudent(studentId: number) {
    const student = this.groupedFees().find(s => s.studentId === studentId);
    if (student) this.router.navigate(['/fees/challan-print'], { state: { students: [student], instituteId: this.instituteId() } });
  }

  closePreview() {}
  doPrint()      {}

  printChallan() {
    this.router.navigate(['/fees/challan-print'], { state: { students: this.groupedFees(), instituteId: this.instituteId() } });
  }

}
