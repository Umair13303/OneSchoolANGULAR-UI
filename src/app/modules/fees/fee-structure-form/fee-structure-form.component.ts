import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { FeeService } from '../../../core/services/fee.service';
import { AcademicService } from '../../../core/services/academic.service';
import { FeeTypeDto, FEE_CATEGORIES } from '../../../core/models/fee.model';
import { AcademicYear, ClassDto } from '../../../core/models/academic.model';

interface FeeRow   { feeTypeId: number | null; amount: number | null; }
interface RowError { feeTypeId?: boolean; amount?: boolean; }

@Component({
  selector: 'app-fee-structure-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Page Header -->
    <div class="pg-header">
      <button class="back-btn" (click)="cancel()" title="Back to Fee Structures">
        <span class="material-icons-round">arrow_back</span>
      </button>
      <div>
        <h1 class="pg-title">Create Fee Structure</h1>
        <p class="pg-sub">Define fee types and amounts for a class and academic year</p>
      </div>
    </div>

    <div class="layout">

      <!-- ── LEFT: Form ───────────────────────────────── -->
      <div class="form-col">

        <!-- Single card: all fields -->
        <div class="card">

          <!-- Section: Class Setup -->
          <div class="sec-head">
            <span class="material-icons-round">tune</span> Class Setup
          </div>

          <div class="row-2">
            <div class="field">
              <label>Academic Year <span class="req">*</span></label>
              <select [(ngModel)]="yearId" (change)="onYearChange()">
                <option [ngValue]="null">Select year…</option>
                @for (y of years(); track y.academicYearId) {
                  <option [ngValue]="y.academicYearId">{{ y.yearLabel }}</option>
                }
              </select>
            </div>
            <div class="field">
              <label>Class <span class="req">*</span></label>
              <select [(ngModel)]="classId" (change)="onClassChange()" [disabled]="!yearId">
                <option [ngValue]="null">{{ yearId ? 'Select class…' : 'Pick a year first' }}</option>
                @for (c of classes(); track c.classId) {
                  <option [ngValue]="c.classId">{{ c.className }}</option>
                }
              </select>
            </div>
          </div>

          <div class="field">
            <label>Structure Title <span class="req">*</span></label>
            <input [(ngModel)]="title" placeholder="e.g. Class 1 (2024-25)"
              [class.inp-err]="titleError" />
            @if (titleError) { <span class="err-msg">Title is required.</span> }
            @else { <span class="hint"><span class="material-icons-round" style="font-size:12px;vertical-align:-2px">info</span> Auto-filled when you select a class. Used for challan &amp; fee assignment.</span> }
          </div>

          <!-- Divider -->
          <div class="divider">
            <div class="sec-head">
              <span class="material-icons-round">format_list_bulleted</span> Fee Lines
              <span class="count-badge">{{ feeRows.length }} line{{ feeRows.length !== 1 ? 's' : '' }}</span>
            </div>
          </div>

          <!-- Column headers -->
          <div class="rows-head">
            <span>Fee Type</span>
            <span>Amount (PKR)</span>
            <span></span>
          </div>

          <!-- Rows -->
          @for (row of feeRows; track $index; let i = $index) {
            <div class="fee-row" [class.fee-row-err]="rowErrors[i]?.feeTypeId || rowErrors[i]?.amount">
              <div class="rt-wrap">
                <select [(ngModel)]="row.feeTypeId" (change)="onRowTypeChange(i)"
                  [class.inp-err]="rowErrors[i]?.feeTypeId">
                  <option [ngValue]="null">Select fee type…</option>
                  @for (ft of feeTypes(); track ft.feeTypeId) {
                    <option [ngValue]="ft.feeTypeId">{{ ft.name }}</option>
                  }
                </select>
                @if (rowCategory(i)) {
                  <span [class]="'cat-tag cat-' + rowCategory(i).toLowerCase()">
                    {{ feeCategoryLabel(rowCategory(i)) }}
                  </span>
                }
              </div>

              <div class="amt-wrap" [class.inp-err-wrap]="rowErrors[i]?.amount">
                <span class="curr">PKR</span>
                <input type="number" [(ngModel)]="row.amount"
                  placeholder="0" min="1"
                  (change)="rowErrors[i] && (rowErrors[i].amount = false)" />
              </div>

              <button class="btn-del" (click)="removeRow(i)"
                [disabled]="feeRows.length === 1" title="Remove">
                <span class="material-icons-round">delete_outline</span>
              </button>
            </div>
          }

          <button class="btn-add" (click)="addRow()">
            <span class="material-icons-round">add</span> Add Fee Type
          </button>
        </div>

        <!-- Error -->
        @if (error()) {
          <div class="alert-err">
            <span class="material-icons-round">error_outline</span> {{ error() }}
          </div>
        }

        <!-- Actions -->
        <div class="actions">
          <button class="btn-secondary" (click)="cancel()">Cancel</button>
          <button class="btn-primary" (click)="save()" [disabled]="saving()">
            @if (saving()) {
              <span class="material-icons-round spin">autorenew</span> Saving…
            } @else {
              <span class="material-icons-round">add_circle</span> Create Structure
            }
          </button>
        </div>
      </div>

      <!-- ── RIGHT: Sticky Summary ─────────────────────── -->
      <div class="summary-col">

        <div class="sum-card">
          <div class="sum-head">
            <span class="material-icons-round sum-icon">receipt_long</span>
            <div>
              <div class="sum-title">{{ title || 'Live Summary' }}</div>
              @if (classLabel()) {
                <div class="sum-sub">{{ classLabel() }}{{ yearLabel() ? ' · ' + yearLabel() : '' }}</div>
              }
            </div>
          </div>

          @if (summaryLines().length === 0) {
            <div class="sum-empty">
              <span class="material-icons-round">pending_actions</span>
              Select fee types and enter amounts to see a live breakdown.
            </div>
          } @else {
            <div class="sum-lines">
              @for (line of summaryLines(); track line.name) {
                <div class="sum-line">
                  <div class="sum-line-info">
                    <span class="sum-line-name">{{ line.name }}</span>
                    <span [class]="'cat-tag cat-' + line.category.toLowerCase()">
                      {{ feeCategoryLabel(line.category) }}
                    </span>
                  </div>
                  <span class="sum-line-amt">{{ line.amount | number:'1.0-0' }}</span>
                </div>
              }
            </div>
            <div class="sum-total">
              <span>Grand Total</span>
              <span>PKR {{ grandTotal() | number:'1.0-0' }}</span>
            </div>
            @if (admissionTotal() > 0) {
              <div class="sum-breakdown">
                <div class="bkdn-row">
                  <span>On Admission</span>
                  <span>PKR {{ admissionTotal() | number:'1.0-0' }}</span>
                </div>
                <div class="bkdn-row">
                  <span>Monthly</span>
                  <span>PKR {{ grandTotal() - admissionTotal() | number:'1.0-0' }}</span>
                </div>
              </div>
            }
          }
        </div>

        <div class="tips-card">
          <div class="tips-head"><span class="material-icons-round">lightbulb</span> Tips</div>
          <ul class="tips">
            <li><strong>Recurring</strong> — charged every month.</li>
            <li><strong>One-Time</strong> — charged once at admission.</li>
            <li><strong>Refundable Deposit</strong> — returned on leaving.</li>
            <li>You can edit amounts individually after saving.</li>
          </ul>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pg-header { display:flex; align-items:center; gap:14px; margin-bottom:16px; }
    .back-btn {
      width:38px; height:38px; border:1.5px solid var(--border); background:var(--surface);
      border-radius:9px; display:flex; align-items:center; justify-content:center;
      cursor:pointer; color:var(--t3); transition:all .15s; flex-shrink:0;
    }
    .back-btn:hover { background:var(--surface-2); color:var(--t1); }
    .back-btn .material-icons-round { font-size:20px; }
    .pg-title { font-size:20px; font-weight:800; color:var(--t1); margin:0; }
    .pg-sub   { font-size:13px; color:var(--t4); margin:2px 0 0; }

    .layout { display:grid; grid-template-columns:1fr 300px; gap:16px; align-items:start; }

    /* Single card */
    .card { background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:20px; }

    .sec-head {
      display:flex; align-items:center; gap:7px;
      font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.6px; color:var(--t3);
      margin-bottom:14px;
    }
    .sec-head .material-icons-round { font-size:15px; color:var(--accent); }
    .count-badge {
      margin-left:auto; font-size:11px; font-weight:600;
      background:var(--accent-s); color:var(--accent); padding:1px 9px; border-radius:20px;
    }

    /* Fields */
    .row-2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px; }
    .field { display:flex; flex-direction:column; gap:4px; }
    .field:not(:last-of-type) { margin-bottom:12px; }
    label  { font-size:10.5px; font-weight:700; color:var(--t3); text-transform:uppercase; letter-spacing:.5px; }
    .req   { color:var(--red); }
    input, select {
      padding:9px 11px; border:1.5px solid var(--border); border-radius:8px;
      font-size:13.5px; font-family:inherit; background:var(--surface); color:var(--t1);
      transition:border-color .15s, box-shadow .15s;
    }
    input:focus, select:focus { outline:none; border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-g); }
    select:disabled { opacity:.45; cursor:not-allowed; }
    .inp-err { border-color:var(--red) !important; }
    .hint { font-size:11px; color:var(--t4); display:flex; align-items:center; gap:3px; }
    .err-msg { font-size:11px; color:var(--red); }

    /* Divider between sections */
    .divider { border-top:1px solid var(--border); margin:16px -20px; padding:14px 20px 0; }

    /* Fee rows */
    .rows-head {
      display:grid; grid-template-columns:1fr 150px 38px; gap:8px;
      padding:0 2px 6px; border-bottom:1px solid var(--border); margin-bottom:0;
    }
    .rows-head span { font-size:10.5px; font-weight:700; color:var(--t4); text-transform:uppercase; letter-spacing:.5px; }

    .fee-row {
      display:grid; grid-template-columns:1fr 150px 38px;
      gap:8px; padding:8px 2px; border-bottom:1px solid var(--border);
      align-items:center;
    }
    .fee-row:last-of-type { border-bottom:none; }

    .rt-wrap { display:flex; flex-direction:column; gap:4px; }
    .rt-wrap select { width:100%; }

    .amt-wrap {
      display:flex; align-items:center;
      border:1.5px solid var(--border); border-radius:8px; overflow:hidden;
      background:var(--surface); transition:border-color .15s, box-shadow .15s;
    }
    .amt-wrap:focus-within { border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-g); }
    .inp-err-wrap { border-color:var(--red) !important; }
    .curr {
      padding:0 8px; font-size:11px; font-weight:700; color:var(--t4);
      background:var(--surface-2); border-right:1.5px solid var(--border);
      height:100%; display:flex; align-items:center; white-space:nowrap; flex-shrink:0;
    }
    .amt-wrap input {
      border:none; border-radius:0; padding:9px 8px; flex:1;
      text-align:right; box-shadow:none; min-width:0;
    }
    .amt-wrap input:focus { border:none; box-shadow:none; }

    .btn-del {
      width:36px; height:36px; border:1.5px solid var(--border); background:transparent;
      border-radius:7px; cursor:pointer; color:var(--t4);
      display:flex; align-items:center; justify-content:center; transition:all .15s;
    }
    .btn-del .material-icons-round { font-size:17px; }
    .btn-del:hover:not(:disabled) { border-color:var(--red); color:var(--red); background:rgba(239,68,68,.06); }
    .btn-del:disabled { opacity:.3; cursor:not-allowed; }

    .btn-add {
      display:flex; align-items:center; gap:6px;
      width:100%; margin-top:10px; padding:9px 14px;
      border:1.5px dashed var(--border); border-radius:8px;
      background:none; cursor:pointer; color:var(--accent);
      font-size:13px; font-family:inherit; font-weight:600; transition:all .15s;
    }
    .btn-add .material-icons-round { font-size:17px; }
    .btn-add:hover { background:var(--accent-g); border-color:var(--accent); }

    .cat-tag { padding:2px 7px; border-radius:20px; font-size:10.5px; font-weight:600; white-space:nowrap; width:fit-content; }
    .cat-recurring         { background:#dbeafe; color:#1d4ed8; }
    .cat-onetime           { background:#d1fae5; color:#065f46; }
    .cat-ondemand          { background:#fef9c3; color:#854d0e; }
    .cat-refundabledeposit { background:#fce7f3; color:#be185d; }

    .alert-err {
      display:flex; align-items:center; gap:8px; margin-top:10px;
      background:#fee2e2; color:#dc2626; border:1px solid #dc2626;
      border-radius:8px; padding:9px 14px; font-size:13px;
    }
    .alert-err .material-icons-round { font-size:17px; flex-shrink:0; }

    .actions { display:flex; justify-content:flex-end; gap:10px; margin-top:12px; }
    .btn-primary, .btn-secondary { display:inline-flex; align-items:center; gap:6px; }
    .btn-primary .material-icons-round,
    .btn-secondary .material-icons-round { font-size:17px; }
    @keyframes spin-anim { to { transform:rotate(360deg); } }
    .spin { animation:spin-anim .7s linear infinite; display:inline-block; }

    /* Summary */
    .summary-col { position:sticky; top:80px; display:flex; flex-direction:column; gap:12px; }
    .sum-card { background:var(--surface); border:1px solid var(--border); border-radius:14px; overflow:hidden; }
    .sum-head {
      display:flex; align-items:center; gap:12px;
      padding:14px 16px; background:var(--accent-s); border-bottom:1px solid var(--border);
    }
    .sum-icon  { font-size:22px; color:var(--accent); flex-shrink:0; }
    .sum-title { font-size:13.5px; font-weight:700; color:var(--t1); word-break:break-word; }
    .sum-sub   { font-size:11px; color:var(--t4); margin-top:2px; }

    .sum-empty {
      display:flex; flex-direction:column; align-items:center; gap:6px; text-align:center;
      padding:24px 16px; font-size:12px; color:var(--t4);
    }
    .sum-empty .material-icons-round { font-size:28px; color:var(--border); }

    .sum-lines { padding:2px 0; }
    .sum-line {
      display:flex; align-items:center; justify-content:space-between; gap:8px;
      padding:8px 14px;
    }
    .sum-line:not(:last-child) { border-bottom:1px solid var(--border); }
    .sum-line-info { display:flex; flex-direction:column; gap:3px; }
    .sum-line-name { font-size:12.5px; color:var(--t1); font-weight:500; }
    .sum-line-amt  { font-size:13px; font-weight:700; color:var(--t1); font-family:monospace; white-space:nowrap; }

    .sum-total {
      display:flex; justify-content:space-between; align-items:center;
      padding:11px 14px; background:var(--t1); color:#fff; font-size:13.5px; font-weight:700;
    }
    .sum-breakdown { border-top:1px dashed var(--border); }
    .bkdn-row {
      display:flex; justify-content:space-between; align-items:center;
      padding:6px 14px; font-size:11.5px; color:var(--t4); gap:8px;
    }
    .bkdn-row:not(:last-child) { border-bottom:1px dashed var(--border); }

    .tips-card { background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:14px; }
    .tips-head {
      display:flex; align-items:center; gap:6px; font-size:11.5px; font-weight:700;
      color:#d97706; margin-bottom:8px;
    }
    .tips-head .material-icons-round { font-size:15px; }
    .tips { margin:0; padding:0 0 0 14px; font-size:11.5px; color:var(--t3); line-height:1.8; }

    @media (max-width: 900px) {
      .layout { grid-template-columns:1fr; }
      .summary-col { position:static; }
      .tips-card { display:none; }
    }
    @media (max-width: 600px) {
      .row-2 { grid-template-columns:1fr; }
      .rows-head, .fee-row { grid-template-columns:1fr 110px 38px; }
    }
  `]
})
export class FeeStructureFormComponent implements OnInit {
  private feeSvc  = inject(FeeService);
  private acadSvc = inject(AcademicService);
  private router  = inject(Router);

  years    = signal<AcademicYear[]>([]);
  classes  = signal<ClassDto[]>([]);
  feeTypes = signal<FeeTypeDto[]>([]);

  yearId:  number | null = null;
  classId: number | null = null;
  title      = '';
  titleError = false;

  feeRows:   FeeRow[]   = [{ feeTypeId: null, amount: null }];
  rowErrors: RowError[] = [{}];

  saving = signal(false);
  error  = signal('');

  ngOnInit() {
    forkJoin({
      years:    this.acadSvc.getYears(),
      feeTypes: this.feeSvc.getFeeTypes()
    }).subscribe(r => {
      this.years.set(r.years);
      this.feeTypes.set(r.feeTypes.filter(f => f.isActive));
    });
  }

  onYearChange() {
    this.classId = null;
    this.title   = '';
    this.classes.set([]);
    if (this.yearId) this.acadSvc.getClasses(this.yearId).subscribe(c => this.classes.set(c));
  }

  onClassChange() {
    const cls  = this.classes().find(c => c.classId === this.classId);
    const year = this.years().find(y => y.academicYearId === this.yearId);
    if (cls && year) this.title = `${cls.className} (${year.yearLabel})`;
  }

  onRowTypeChange(i: number) {
    if (this.rowErrors[i]) this.rowErrors[i].feeTypeId = false;
  }

  addRow()          { this.feeRows.push({ feeTypeId: null, amount: null }); this.rowErrors.push({}); }
  removeRow(i: number) { this.feeRows.splice(i, 1); this.rowErrors.splice(i, 1); }

  rowCategory(i: number): string {
    return this.feeTypes().find(f => f.feeTypeId === this.feeRows[i]?.feeTypeId)?.feeCategory ?? '';
  }

  feeCategoryLabel(cat: string): string {
    return FEE_CATEGORIES.find(c => c.value === cat)?.label ?? cat;
  }

  classLabel(): string { return this.classes().find(c => c.classId === this.classId)?.className ?? ''; }
  yearLabel():  string { return this.years().find(y => y.academicYearId === this.yearId)?.yearLabel  ?? ''; }

  summaryLines() {
    return this.feeRows
      .filter(r => r.feeTypeId && r.amount && r.amount > 0)
      .map(r => ({
        name:     this.feeTypes().find(f => f.feeTypeId === r.feeTypeId)?.name ?? '',
        amount:   r.amount!,
        category: this.feeTypes().find(f => f.feeTypeId === r.feeTypeId)?.feeCategory ?? ''
      }));
  }

  grandTotal():     number { return this.summaryLines().reduce((s, l) => s + l.amount, 0); }
  admissionTotal(): number {
    return this.summaryLines()
      .filter(l => l.category === 'OneTime' || l.category === 'RefundableDeposit')
      .reduce((s, l) => s + l.amount, 0);
  }

  save() {
    this.error.set('');
    this.titleError = !this.title.trim();

    if (!this.yearId || !this.classId) { this.error.set('Please select Academic Year and Class.'); return; }
    if (this.titleError)                { this.error.set('Please enter a structure title.');        return; }

    let valid = true;
    this.rowErrors = this.feeRows.map(r => {
      const e: RowError = { feeTypeId: !r.feeTypeId, amount: !r.amount || r.amount < 1 };
      if (e.feeTypeId || e.amount) valid = false;
      return e;
    });
    if (!valid) { this.error.set('Please fill every row with a fee type and a valid amount.'); return; }

    this.saving.set(true);
    forkJoin(
      this.feeRows.map(r =>
        this.feeSvc.createFeeStructure({
          feeTypeId:     r.feeTypeId!,
          classId:       this.classId!,
          academicYearId: this.yearId!,
          amount:        r.amount!,
          dueDay:        this.title
        })
      )
    ).subscribe({
      next:  ()      => { this.saving.set(false); this.router.navigate(['/fees/structures']); },
      error: (e: any) => { this.saving.set(false); this.error.set(e?.error?.error ?? 'Save failed. Please try again.'); }
    });
  }

  cancel() { this.router.navigate(['/fees/structures']); }
}
