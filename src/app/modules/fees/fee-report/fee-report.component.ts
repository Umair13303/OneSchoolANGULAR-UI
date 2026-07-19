import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FeeService } from '../../../core/services/fee.service';
import { AcademicService } from '../../../core/services/academic.service';
import { FeeReportRowDto } from '../../../core/models/fee.model';
import { AcademicYear, ClassDto } from '../../../core/models/academic.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-fee-report',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  template: `
    <app-page-header title="Fee Report" subtitle="Outstanding and collection summary by class or school-wide">
      <button class="btn-secondary" (click)="print()">🖨️ Print</button>
    </app-page-header>

    <!-- Filters -->
    <div class="filter-bar card no-print">
      <div class="field">
        <label>Academic Year *</label>
        <select [(ngModel)]="yearId" (change)="onYearChange()">
          <option [ngValue]="null">Select year</option>
          @for (y of years(); track y.academicYearId) {
            <option [ngValue]="y.academicYearId">{{ y.yearLabel }}</option>
          }
        </select>
      </div>
      <div class="field">
        <label>Class (optional)</label>
        <select [(ngModel)]="classId" (change)="load()">
          <option [ngValue]="null">All Classes</option>
          @for (c of classes(); track c.classId) {
            <option [ngValue]="c.classId">{{ c.className }} {{ c.section }}</option>
          }
        </select>
      </div>
      <button class="btn-primary" (click)="load()" [disabled]="!yearId || loading()">
        @if (loading()) { Loading... } @else { Generate Report }
      </button>
    </div>

    @if (rows().length) {
      <!-- Summary Cards -->
      <div class="summary-strip">
        <div class="stat-card">
          <div class="stat-val">{{ rows().length }}</div>
          <div class="stat-lbl">Students</div>
        </div>
        <div class="stat-card blue">
          <div class="stat-val">{{ totalDue() | number:'1.0-0' }}</div>
          <div class="stat-lbl">Total Due</div>
        </div>
        <div class="stat-card green">
          <div class="stat-val">{{ totalPaid() | number:'1.0-0' }}</div>
          <div class="stat-lbl">Total Collected</div>
        </div>
        <div class="stat-card red">
          <div class="stat-val">{{ totalBalance() | number:'1.0-0' }}</div>
          <div class="stat-lbl">Outstanding Balance</div>
        </div>
        <div class="stat-card orange">
          <div class="stat-val">{{ collectionRate() }}%</div>
          <div class="stat-lbl">Collection Rate</div>
        </div>
      </div>

      <!-- Progress Bar -->
      <div class="card" style="margin-bottom:16px; padding:16px 20px">
        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
          <span style="font-size:13px; font-weight:600; color:#1a3c5e">Collection Progress</span>
          <span style="font-size:13px; color:#555">{{ collectionRate() }}% collected</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" [style.width]="collectionRate() + '%'"
               [class.low]="collectionRate() < 50" [class.mid]="collectionRate() >= 50 && collectionRate() < 80">
          </div>
        </div>
      </div>

      <!-- Report Table -->
      <div class="card">
        <table class="table" id="report-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Student</th>
              <th>Adm. No</th>
              <th>Class</th>
              <th style="text-align:right">Total Due</th>
              <th style="text-align:right">Discount</th>
              <th style="text-align:right">Paid</th>
              <th style="text-align:right">Balance</th>
              <th style="text-align:center">Status</th>
              <th style="text-align:center">Unpaid</th>
              <th style="text-align:center">Partial</th>
              <th style="text-align:center">Paid</th>
            </tr>
          </thead>
          <tbody>
            @for (row of rows(); track row.studentId; let i = $index) {
              <tr [class.has-balance]="row.balance > 0">
                <td>{{ i + 1 }}</td>
                <td><strong>{{ row.studentName }}</strong></td>
                <td>{{ row.admissionNo }}</td>
                <td>{{ row.className }}</td>
                <td style="text-align:right">{{ row.totalDue | number:'1.0-0' }}</td>
                <td style="text-align:right">{{ row.totalDiscount ? (row.totalDiscount | number:'1.0-0') : '—' }}</td>
                <td class="paid-col" style="text-align:right">{{ row.totalPaid | number:'1.0-0' }}</td>
                <td [class.balance-col]="row.balance > 0" style="text-align:right"><strong>{{ row.balance | number:'1.0-0' }}</strong></td>
                <td style="text-align:center"><span [class]="rowStatusClass(row)">{{ rowStatus(row) }}</span></td>
                <td style="text-align:center"><span class="pill red">{{ row.unpaidCount }}</span></td>
                <td style="text-align:center"><span class="pill orange">{{ row.partialCount }}</span></td>
                <td style="text-align:center"><span class="pill green">{{ row.paidCount }}</span></td>
              </tr>
            }
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="4"><strong>TOTAL ({{ rows().length }} students)</strong></td>
              <td style="text-align:right"><strong>{{ totalDue() | number:'1.0-0' }}</strong></td>
              <td style="text-align:right"><strong>{{ totalDiscount() | number:'1.0-0' }}</strong></td>
              <td style="text-align:right"><strong>{{ totalPaid() | number:'1.0-0' }}</strong></td>
              <td style="text-align:right"><strong>{{ totalBalance() | number:'1.0-0' }}</strong></td>
              <td style="text-align:center"><span [class]="'pill ' + (totalBalance() === 0 ? 'green' : totalPaid() > 0 ? 'orange' : 'red')">{{ totalBalance() === 0 ? 'Paid' : totalPaid() > 0 ? 'Partial' : 'Unpaid' }}</span></td>
              <td style="text-align:center"><strong>{{ unpaidStudents() }}</strong></td>
              <td style="text-align:center"><strong>{{ partialStudents() }}</strong></td>
              <td style="text-align:center"><strong>{{ paidStudents() }}</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>
    }

    @if (loadError()) {
      <div class="card" style="color:var(--red);padding:20px;text-align:center">{{ loadError() }}</div>
    }
    @if (!rows().length && !loading() && !loadError()) {
      <div class="card empty-state">
        <div style="font-size:40px; margin-bottom:12px">📊</div>
        <p>Select an academic year and click Generate Report.</p>
      </div>
    }
  `,
  styles: [`
    .filter-bar { display:flex; gap:12px; align-items:flex-end; flex-wrap:wrap; margin-bottom:16px; padding:16px 20px; }
    .field { display:flex; flex-direction:column; gap:5px; min-width:160px; }
    label { font-size:11px; font-weight:600; color:var(--t3); text-transform:uppercase; letter-spacing:.5px; }
    select { padding:9px 12px; border:1.5px solid var(--border); border-radius:7px; font-size:13.5px; font-family:inherit; background:var(--surface); color:var(--t1); }
    select:focus { outline:none; border-color:var(--accent); }

    .summary-strip { display:grid; grid-template-columns:repeat(5,1fr); gap:12px; margin-bottom:16px; }
    .stat-card { background:var(--surface); border-radius:10px; padding:14px 16px; box-shadow:var(--sh); border-left:4px solid var(--accent); }
    .stat-card.red    { border-left-color:var(--red); }
    .stat-card.orange { border-left-color:var(--amber); }
    .stat-card.green  { border-left-color:var(--green); }
    .stat-card.blue   { border-left-color:var(--accent); }
    .stat-val { font-size:18px; font-weight:700; color:var(--t1); }
    .stat-lbl { font-size:11px; color:var(--t4); margin-top:2px; }

    .progress-bar { height:10px; background:var(--border); border-radius:5px; overflow:hidden; }
    .progress-fill { height:100%; border-radius:5px; transition:width .5s; background:var(--green); }
    .progress-fill.low { background:var(--red); }
    .progress-fill.mid { background:var(--amber); }

    .has-balance { background:var(--red-s); }
    .balance-col { color:var(--red); }
    .paid-col    { color:var(--green); }
    .total-row   { background:var(--surface-2); font-weight:700; }
    .pill { padding:2px 8px; border-radius:10px; font-size:11.5px; font-weight:600; }
    .pill.red    { background:var(--red-s); color:var(--red); }
    .pill.orange { background:var(--amber-s); color:var(--amber); }
    .pill.green  { background:var(--green-s); color:var(--green); }

    .empty-state { text-align:center; padding:48px; color:var(--t4); font-size:13.5px; }

    @media print {
      .no-print { display:none !important; }
      .card { box-shadow:none; }
    }
  `]
})
export class FeeReportComponent implements OnInit {
  private feeSvc  = inject(FeeService);
  private acadSvc = inject(AcademicService);

  rows    = signal<FeeReportRowDto[]>([]);
  years   = signal<AcademicYear[]>([]);
  classes = signal<ClassDto[]>([]);
  loading = signal(false);
  loadError = signal('');

  yearId:  number | null = null;
  classId: number | null = null;

  totalDue      = computed(() => this.rows().reduce((s, r) => s + r.totalDue, 0));
  totalPaid     = computed(() => this.rows().reduce((s, r) => s + r.totalPaid, 0));
  totalDiscount = computed(() => this.rows().reduce((s, r) => s + r.totalDiscount, 0));
  totalBalance  = computed(() => this.rows().reduce((s, r) => s + r.balance, 0));
  paidStudents    = computed(() => this.rows().filter(r => r.balance === 0).length);
  partialStudents = computed(() => this.rows().filter(r => r.balance > 0 && r.totalPaid > 0).length);
  unpaidStudents  = computed(() => this.rows().filter(r => r.balance > 0 && r.totalPaid === 0).length);
  collectionRate  = computed(() => {
    const due = this.totalDue() - this.totalDiscount();
    return due > 0 ? Math.round((this.totalPaid() / due) * 100) : 0;
  });

  rowStatus(row: FeeReportRowDto) {
    if (row.balance === 0)                    return 'Paid';
    if (row.totalPaid > 0 && row.balance > 0) return 'Partial';
    return 'Unpaid';
  }

  rowStatusClass(row: FeeReportRowDto) {
    const s = this.rowStatus(row);
    return s === 'Paid' ? 'pill green' : s === 'Partial' ? 'pill orange' : 'pill red';
  }

  ngOnInit() {
    this.acadSvc.getYears().subscribe(y => this.years.set(y));
  }

  onYearChange() {
    this.classId = null;
    if (this.yearId) this.acadSvc.getClasses(this.yearId).subscribe(c => this.classes.set(c));
    else this.classes.set([]);
    this.rows.set([]);
  }

  load() {
    if (!this.yearId) return;
    this.loading.set(true);
    this.loadError.set('');
    this.feeSvc.getFeeReport(this.yearId, this.classId ?? undefined).subscribe({
      next: r => { this.rows.set(r); this.loading.set(false); },
      error: () => { this.loading.set(false); this.loadError.set('Failed to load report. Please try again.'); }
    });
  }

  print() { window.print(); }
}
