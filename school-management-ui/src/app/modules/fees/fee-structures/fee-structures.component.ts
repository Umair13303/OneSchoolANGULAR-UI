import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { FeeService } from '../../../core/services/fee.service';
import { AcademicService } from '../../../core/services/academic.service';
import { FeeStructureDto, FEE_CATEGORIES } from '../../../core/models/fee.model';
import { AcademicYear, ClassDto } from '../../../core/models/academic.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ConfirmDeleteComponent } from '../../../shared/components/confirm-delete/confirm-delete.component';
import { ConfirmDeleteService } from '../../../shared/components/confirm-delete/confirm-delete.service';

interface StructureGroup {
  key:            string;
  classId:        number;
  className:      string;
  yearLabel:      string;
  structureTitle: string;
  items:          FeeStructureDto[];
  grandTotal:     number;
  admissionTotal: number;
  monthlyTotal:   number;
}

@Component({
  selector: 'app-fee-structures',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PageHeaderComponent, ConfirmDeleteComponent],
  template: `
    <app-page-header title="Fee Structures" subtitle="Assign fee amounts to classes per academic year" />

    <!-- Toolbar -->
    <div class="toolbar">
      <div class="filters">
        <select [(ngModel)]="filterYearId" (change)="load()">
          <option [ngValue]="null">All Years</option>
          @for (y of years(); track y.academicYearId) {
            <option [ngValue]="y.academicYearId">{{ y.yearLabel }}</option>
          }
        </select>
        <select [(ngModel)]="filterClassId" (change)="load()">
          <option [ngValue]="null">All Classes</option>
          @for (c of classes(); track c.classId) {
            <option [ngValue]="c.classId">{{ c.className }}</option>
          }
        </select>
      </div>
      <button class="btn-primary" (click)="goCreate()">
        <span class="material-icons-round">add</span> Add Structure
      </button>
    </div>

    <!-- Table card -->
    <div class="card">
      @if (!grouped().length) {
        <div class="empty-state">
          <span class="material-icons-round">receipt_long</span>
          <p>No fee structures yet. Click <strong>Add Structure</strong> to create one.</p>
        </div>
      } @else {
        <table class="table">
          <thead>
            <tr>
              <th class="th-expand"></th>
              <th>Title</th>
              <th>Class</th>
              <th>Session</th>
              <th style="text-align:right">Total (PKR)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (g of grouped(); track g.key) {
              <!-- Summary row -->
              <tr class="summary-row" [class.expanded]="isExpanded(g.key)" (click)="toggleExpand(g.key)">
                <td class="td-chevron">
                  <span class="material-icons-round chevron" [class.open]="isExpanded(g.key)">
                    chevron_right
                  </span>
                </td>
                <td>
                  <strong class="struct-title">{{ g.structureTitle || g.className }}</strong>
                </td>
                <td class="td-class">{{ g.className }}</td>
                <td><span class="session-chip">{{ g.yearLabel }}</span></td>
                <td style="text-align:right">
                  <strong class="total-amt">{{ g.grandTotal | number:'1.0-0' }}</strong>
                </td>
                <td class="td-actions" (click)="$event.stopPropagation()">
                  <button class="icon-btn danger" (click)="deleteGroup(g)" title="Delete all lines">
                    <span class="material-icons-round">delete</span>
                  </button>
                </td>
              </tr>

              <!-- Expanded detail rows -->
              @if (isExpanded(g.key)) {
                <tr class="detail-header-row">
                  <td></td>
                  <td colspan="5">
                    <div class="detail-panel">
                      <!-- Fee lines -->
                      <div class="detail-lines">
                        @for (fs of g.items; track fs.feeStructureId) {
                          <div class="detail-line">
                            <div class="dl-name">
                              <div class="dl-name-row">
                                <span class="dl-fee-name">{{ fs.feeTypeName }}</span>
                                <span [class]="'cat-badge cat-' + (fs.feeCategory || 'recurring').toLowerCase()">
                                  {{ categoryLabel(fs.feeCategory || 'Recurring') }}
                                </span>
                              </div>
                            </div>
                            <div class="dl-status">
                              <span [class]="'badge ' + (fs.isActive ? 'badge-green' : 'badge-gray')">
                                {{ fs.isActive ? 'Active' : 'Inactive' }}
                              </span>
                            </div>
                            <div class="dl-amount">
                              <span class="dl-val">{{ fs.amount | number:'1.0-0' }}</span>
                            </div>
                            <div class="dl-btns">
                              <button class="icon-btn" (click)="openEdit(fs)" title="Edit">
                                <span class="material-icons-round">edit</span>
                              </button>
                              <button class="icon-btn danger" (click)="deleteLine(fs.feeStructureId)" title="Delete">
                                <span class="material-icons-round">delete</span>
                              </button>
                            </div>
                          </div>
                        }
                      </div>
                      <!-- Total footer -->
                      <div class="detail-footer">
                        <div class="df-breakdown">
                          @if (g.admissionTotal > 0) {
                            <span class="df-chip df-admission">Admission: PKR {{ g.admissionTotal | number:'1.0-0' }}</span>
                          }
                          @if (g.monthlyTotal > 0) {
                            <span class="df-chip df-monthly">Monthly: PKR {{ g.monthlyTotal | number:'1.0-0' }}</span>
                          }
                        </div>
                        <div class="df-total">
                          <span>Grand Total</span>
                          <strong>PKR {{ g.grandTotal | number:'1.0-0' }}</strong>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      }
    </div>

    <!-- Edit Modal -->
    @if (showModal()) {
      <div class="overlay" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-hd">
            <div class="modal-icon"><span class="material-icons-round">edit_note</span></div>
            <div><h3>Edit Fee Line</h3><p>Update amount or status.</p></div>
            <button class="close-btn" (click)="closeModal()"><span class="material-icons-round">close</span></button>
          </div>
          <form [formGroup]="editForm" (ngSubmit)="saveEdit()" class="modal-body">
            <div class="field" [class.invalid]="ef('amount')?.invalid && ef('amount')?.touched">
              <label>Amount (PKR) <span class="req">*</span></label>
              <input type="number" formControlName="amount" placeholder="e.g. 5000" min="1" />
              @if (ef('amount')?.invalid && ef('amount')?.touched) { <span class="err">Valid amount required.</span> }
            </div>
            <div class="field">
              <label>Status</label>
              <select formControlName="isActive">
                <option [ngValue]="true">Active</option>
                <option [ngValue]="false">Inactive</option>
              </select>
            </div>
            @if (modalError()) { <div class="alert-err">{{ modalError() }}</div> }
            <div class="modal-ft">
              <button type="button" class="btn-secondary" (click)="closeModal()">Cancel</button>
              <button type="submit" class="btn-primary" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save' }}</button>
            </div>
          </form>
        </div>
      </div>
    }

    <app-confirm-delete />
  `,
  styles: [`
    .toolbar { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:12px; }
    .filters { display:flex; gap:8px; flex-wrap:wrap; }
    .filters select { padding:8px 12px; border:1.5px solid var(--border); border-radius:8px; font-size:13px; font-family:inherit; background:var(--surface); color:var(--t1); }
    .filters select:focus { outline:none; border-color:var(--accent); }
    .btn-primary { display:inline-flex; align-items:center; gap:6px; }
    .btn-primary .material-icons-round { font-size:16px; }

    .card { background:var(--surface); border:1px solid var(--border); border-radius:14px; overflow:hidden; }

    .empty-state { display:flex; flex-direction:column; align-items:center; gap:10px; text-align:center; padding:48px 20px; color:var(--t4); }
    .empty-state .material-icons-round { font-size:40px; color:var(--border); }
    .empty-state p { font-size:13px; margin:0; }

    /* Summary table */
    .table { width:100%; border-collapse:collapse; }
    .table th { padding:10px 14px; text-align:left; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.4px; color:var(--t4); border-bottom:1px solid var(--border); background:var(--surface-2); }
    .table td { padding:12px 14px; font-size:13.5px; color:var(--t2); border-bottom:1px solid var(--border); vertical-align:middle; }

    .th-expand { width:36px; padding:10px 6px 10px 14px !important; }
    .td-chevron { width:36px; padding:12px 6px 12px 14px !important; }
    .chevron { font-size:18px; color:var(--t4); transition:transform .2s; display:block; }
    .chevron.open { transform:rotate(90deg); color:var(--accent); }

    .summary-row { cursor:pointer; transition:background .12s; }
    .summary-row:hover { background:var(--surface-2); }
    .summary-row.expanded { background:var(--accent-g,rgba(99,102,241,.05)); }
    .summary-row.expanded td { border-bottom:none; }

    .struct-title { font-size:14px; color:var(--t1); }
    .td-class { color:var(--t3); font-size:13px; }
    .session-chip { background:var(--surface-2); border:1px solid var(--border); border-radius:6px; padding:2px 8px; font-size:12px; color:var(--t3); font-weight:600; white-space:nowrap; }
.total-amt { font-size:14px; color:var(--t1); font-family:monospace; }
    .td-actions { display:flex; gap:2px; align-items:center; }

    /* Expanded detail panel */
    .detail-header-row td { padding:0 !important; border-bottom:1px solid var(--border); }
    .detail-panel { background:var(--surface-2); border-top:2px solid var(--accent); }

    /* Fee line rows */
    .detail-lines { padding:6px 0; }
    .detail-line {
      display:grid; grid-template-columns:1fr 100px 160px 80px;
      align-items:center; gap:16px;
      padding:11px 24px; border-bottom:1px solid var(--border);
      transition:background .12s;
    }
    .detail-line:last-child { border-bottom:none; }
    .detail-line:hover { background:rgba(0,0,0,.025); }

    .dl-name { display:flex; align-items:center; }
    .dl-name-row { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
    .dl-fee-name { font-size:13.5px; font-weight:600; color:var(--t1); }

    .dl-status { display:flex; align-items:center; }

    .dl-amount { display:flex; align-items:center; justify-content:flex-end; }
    .dl-val { font-size:15px; font-weight:700; color:var(--t1); font-family:monospace; }

    .dl-btns { display:flex; gap:2px; justify-content:flex-end; }

    /* Footer */
    .detail-footer {
      display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;
      padding:12px 24px; background:var(--surface); border-top:2px solid var(--border);
    }
    .df-breakdown { display:flex; gap:8px; flex-wrap:wrap; }
    .df-chip { font-size:12px; font-weight:600; padding:4px 12px; border-radius:8px; }
    .df-admission { background:#dbeafe; color:#1d4ed8; }
    .df-monthly   { background:#d1fae5; color:#065f46; }
    .df-total { display:flex; align-items:center; gap:12px; font-size:14px; color:var(--t2); }
    .df-total strong { font-size:16px; font-weight:800; color:var(--t1); font-family:monospace; }

    .cat-badge { padding:2px 8px; border-radius:20px; font-size:11px; font-weight:600; white-space:nowrap; }
    .cat-recurring         { background:#dbeafe; color:#1d4ed8; }
    .cat-onetime           { background:#d1fae5; color:#065f46; }
    .cat-ondemand          { background:#fef9c3; color:#854d0e; }
    .cat-refundabledeposit { background:#fce7f3; color:#be185d; }

    .badge { padding:2px 8px; border-radius:12px; font-size:11.5px; font-weight:600; }
    .badge-green { background:var(--green-s); color:var(--green); }
    .badge-gray  { background:var(--surface-2); color:var(--t4); }

    .icon-btn { border:none; background:transparent; cursor:pointer; padding:5px; color:var(--t3); display:flex; align-items:center; border-radius:6px; transition:all .15s; }
    .icon-btn:hover { color:var(--t1); background:rgba(0,0,0,.06); }
    .icon-btn .material-icons-round { font-size:17px; }
    .icon-btn.danger:hover { color:#ef4444; background:rgba(239,68,68,.08); }

    /* Modal */
    .overlay { position:fixed; inset:0; z-index:1000; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; padding:16px; }
    .modal { background:var(--surface); border-radius:14px; width:100%; max-width:380px; box-shadow:0 24px 48px rgba(0,0,0,.2); overflow:hidden; animation:pop .18s cubic-bezier(.34,1.4,.64,1); }
    @keyframes pop { from { transform:scale(.93); opacity:0 } to { transform:scale(1); opacity:1 } }
    .modal-hd { display:flex; align-items:center; gap:12px; padding:16px 18px; border-bottom:1px solid var(--border); background:var(--surface-2); }
    .modal-icon { width:36px; height:36px; border-radius:9px; background:var(--accent-s); color:var(--accent); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .modal-icon .material-icons-round { font-size:19px; }
    .modal-hd h3 { font-size:14.5px; font-weight:700; color:var(--t1); margin:0; }
    .modal-hd p  { font-size:11.5px; color:var(--t4); margin:2px 0 0; }
    .close-btn { margin-left:auto; border:none; background:transparent; cursor:pointer; color:var(--t4); padding:5px; border-radius:7px; display:flex; transition:all .15s; }
    .close-btn:hover { background:var(--surface); color:var(--t1); }
    .close-btn .material-icons-round { font-size:19px; }
    .modal-body { padding:18px; }
    .modal-ft { display:flex; justify-content:flex-end; gap:10px; padding-top:12px; border-top:1px solid var(--border); margin-top:4px; }

    .field { display:flex; flex-direction:column; gap:5px; margin-bottom:12px; }
    label { font-size:10.5px; font-weight:700; color:var(--t3); text-transform:uppercase; letter-spacing:.5px; }
    .req  { color:var(--red); }
    input, select { padding:9px 11px; border:1.5px solid var(--border); border-radius:8px; font-size:13.5px; font-family:inherit; background:var(--surface); color:var(--t1); transition:border-color .15s; }
    input:focus, select:focus { outline:none; border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-g); }
    .field.invalid input { border-color:var(--red); }
    .err { font-size:11px; color:var(--red); }
    .alert-err { background:#fee2e2; color:#dc2626; border:1px solid #dc2626; border-radius:8px; padding:9px 13px; font-size:13px; margin-bottom:10px; }
  `]
})
export class FeeStructuresComponent implements OnInit {
  private feeSvc        = inject(FeeService);
  private acadSvc       = inject(AcademicService);
  private confirmDelete = inject(ConfirmDeleteService);
  private router        = inject(Router);
  private fb            = inject(FormBuilder);

  feeStructures = signal<FeeStructureDto[]>([]);
  years         = signal<AcademicYear[]>([]);
  classes       = signal<ClassDto[]>([]);

  filterYearId:  number | null = null;
  filterClassId: number | null = null;

  expandedKeys = new Set<string>();

  showModal  = signal(false);
  editingId  = signal<number | null>(null);
  saving     = signal(false);
  modalError = signal('');

  editForm = this.fb.group({
    amount:   [null as number | null, [Validators.required, Validators.min(1)]],
    isActive: [true]
  });

  ef(n: string) { return this.editForm.get(n); }
  categoryLabel(cat: string) { return FEE_CATEGORIES.find(c => c.value === cat)?.label ?? cat; }

  isExpanded(key: string) { return this.expandedKeys.has(key); }
  toggleExpand(key: string) {
    if (this.expandedKeys.has(key)) this.expandedKeys.delete(key);
    else this.expandedKeys.add(key);
  }

  ngOnInit() {
    this.acadSvc.getYears().subscribe(y => this.years.set(y));
    this.acadSvc.getClasses().subscribe(c => this.classes.set(c));
    this.load();
  }

  load() {
    this.feeSvc.getFeeStructures(this.filterYearId ?? undefined, this.filterClassId ?? undefined)
      .subscribe(s => this.feeStructures.set(s));
  }

  grouped(): StructureGroup[] {
    const map = new Map<string, StructureGroup>();
    for (const fs of this.feeStructures()) {
      const key = `${fs.classId}-${fs.academicYearId}`;
      if (!map.has(key)) map.set(key, {
        key, classId: fs.classId, className: fs.className,
        yearLabel: fs.yearLabel, structureTitle: fs.dueDay || fs.className,
        items: [], grandTotal: 0, admissionTotal: 0, monthlyTotal: 0
      });
      const g = map.get(key)!;
      if (!g.structureTitle && fs.dueDay) g.structureTitle = fs.dueDay;
      g.items.push(fs);
      g.grandTotal += fs.amount;
      if (fs.feeCategory === 'OneTime' || fs.feeCategory === 'RefundableDeposit') g.admissionTotal += fs.amount;
      if (fs.feeCategory === 'Recurring') g.monthlyTotal += fs.amount;
    }
    return Array.from(map.values());
  }

  goCreate() { this.router.navigate(['/fees/structures/new']); }

  openEdit(fs: FeeStructureDto) {
    this.editingId.set(fs.feeStructureId);
    this.editForm.patchValue({ amount: fs.amount, isActive: fs.isActive });
    this.modalError.set(''); this.showModal.set(true);
  }

  saveEdit() {
    this.editForm.markAllAsTouched();
    if (this.editForm.invalid) return;
    this.saving.set(true); this.modalError.set('');
    const v = this.editForm.value;
    this.feeSvc.updateFeeStructure(this.editingId()!, { amount: v.amount, isActive: v.isActive }).subscribe({
      next:  ()      => { this.saving.set(false); this.closeModal(); this.load(); },
      error: (e:any) => { this.saving.set(false); this.modalError.set(e?.error?.error ?? 'Save failed.'); }
    });
  }

  deleteLine(id: number) {
    this.confirmDelete.open('Delete Fee Line?', 'This cannot be undone.',
      () => this.feeSvc.deleteFeeStructure(id), () => this.load());
  }

  deleteGroup(g: StructureGroup) {
    this.confirmDelete.open(
      `Delete "${g.structureTitle}"?`,
      `This will delete all ${g.items.length} fee line${g.items.length !== 1 ? 's' : ''} for ${g.className} (${g.yearLabel}).`,
      () => forkJoin(g.items.map(fs => this.feeSvc.deleteFeeStructure(fs.feeStructureId))),
      () => { this.expandedKeys.delete(g.key); this.load(); }
    );
  }

  closeModal() { this.showModal.set(false); }
}
