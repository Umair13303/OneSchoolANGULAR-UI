import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { InputNumber } from 'primeng/inputnumber';
import { Textarea } from 'primeng/textarea';
import { Dialog } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { Tooltip } from 'primeng/tooltip';
import { FeeService } from '../../../core/services/fee.service';
import { AcademicService } from '../../../core/services/academic.service';
import { StudentService } from '../../../core/services/student.service';
import { AuthService } from '../../../core/services/auth.service';
import { StudentOpeningBalanceDto } from '../../../core/models/fee.model';
import { AcademicYear, ClassDto } from '../../../core/models/academic.model';
import { StudentListDto } from '../../../core/models/student.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ConfirmDeleteComponent } from '../../../shared/components/confirm-delete/confirm-delete.component';
import { ConfirmDeleteService } from '../../../shared/components/confirm-delete/confirm-delete.service';

@Component({
  selector: 'app-opening-balance',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, PageHeaderComponent, ConfirmDeleteComponent,
    Button, Select, InputNumber, Textarea, Dialog, TableModule, Tooltip
  ],
  template: `
    <app-page-header title="Student Opening Balance" subtitle="Previous outstanding brought forward for a student and academic year" />

    <div class="card ob-filters">
      <div class="ob-field">
        <label>Academic Year</label>
        <p-select
          [options]="years()"
          optionLabel="yearLabel"
          optionValue="academicYearId"
          placeholder="All years"
          [showClear]="true"
          appendTo="body"
          [(ngModel)]="filterYearId"
          [ngModelOptions]="{ standalone: true }"
          (onChange)="onYearChange()" />
      </div>
      <div class="ob-field">
        <label>Class</label>
        <p-select
          [options]="classOptions()"
          optionLabel="label"
          optionValue="value"
          placeholder="All classes"
          [showClear]="true"
          appendTo="body"
          [(ngModel)]="filterClassId"
          [ngModelOptions]="{ standalone: true }"
          (onChange)="load()" />
      </div>
      @if (canEdit) {
        <p-button class="ob-add" label="Add Opening Balance" icon="pi pi-plus" (onClick)="openAdd()" />
      }
    </div>

    <div class="card table-card">
      <p-table [value]="rows()" dataKey="studentOpeningBalanceId" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '100%' }">
        <ng-template #header>
          <tr>
            <th>Student</th>
            <th>Class</th>
            <th>Year</th>
            <th class="text-right">Outstanding</th>
            <th>Remarks</th>
            @if (canEdit) { <th class="text-right">Actions</th> }
          </tr>
        </ng-template>
        <ng-template #body let-row>
          <tr>
            <td>
              <strong>{{ row.studentName }}</strong>
              <div class="sub">{{ row.admissionNo }}</div>
            </td>
            <td>{{ row.className || '—' }}</td>
            <td>{{ row.yearLabel }}</td>
            <td class="text-right"><strong>{{ row.amount | number:'1.0-0' }}</strong></td>
            <td>{{ row.remarks || '—' }}</td>
            @if (canEdit) {
              <td>
                <div class="flex items-center justify-end gap-1">
                  <p-button icon="pi pi-pencil" [text]="true" [rounded]="true" size="small" severity="secondary" ariaLabel="Edit" pTooltip="Edit" (onClick)="openEdit(row)" />
                  <p-button icon="pi pi-trash" [text]="true" [rounded]="true" size="small" severity="danger" ariaLabel="Delete" pTooltip="Delete" (onClick)="remove(row)" />
                </div>
              </td>
            }
          </tr>
        </ng-template>
        <ng-template #emptymessage>
          <tr><td [attr.colspan]="canEdit ? 6 : 5" class="empty">No opening balances yet.</td></tr>
        </ng-template>
      </p-table>
    </div>

    <p-dialog
      [header]="editingId() ? 'Edit Opening Balance' : 'Add Opening Balance'"
      [visible]="showModal()"
      (visibleChange)="showModal.set($event)"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
      [style]="{ width: '32rem' }"
      [breakpoints]="{ '640px': '96vw' }">
      <form [formGroup]="form" (ngSubmit)="save()" id="ob-form">
        @if (modalError()) { <div class="alert-err">{{ modalError() }}</div> }
        <div class="ob-grid">
          <div class="ob-field">
            <label>Academic Year <span class="req">*</span></label>
            <p-select [options]="years()" optionLabel="yearLabel" optionValue="academicYearId"
              placeholder="Select year" appendTo="body" formControlName="academicYearId" (onChange)="onFormYearChange()" />
          </div>
          <div class="ob-field">
            <label>Class</label>
            <p-select [options]="formClassOptions()" optionLabel="label" optionValue="value"
              placeholder="Select class" appendTo="body" formControlName="classId"
              [disabled]="!!editingId()" (onChange)="loadFormStudents()" />
          </div>
        </div>
        <div class="ob-field wide">
          <label>Student <span class="req">*</span></label>
          <p-select [options]="studentOptions()" optionLabel="label" optionValue="value"
            placeholder="Select student" appendTo="body" formControlName="studentId" [filter]="true"
            [disabled]="!!editingId()" />
        </div>
        <div class="ob-field wide">
          <label>Outstanding balance <span class="req">*</span></label>
          <p-inputNumber formControlName="amount" mode="decimal" [min]="1" [maxFractionDigits]="2" />
        </div>
        <div class="ob-field wide">
          <label>Remarks</label>
          <textarea pTextarea formControlName="remarks" rows="3" placeholder="Previous school dues, arrears..."></textarea>
        </div>
      </form>
      <ng-template #footer>
        <div class="flex justify-end gap-2">
          <p-button label="Cancel" severity="secondary" [outlined]="true" (onClick)="showModal.set(false)" />
          <p-button [label]="saving() ? 'Saving...' : 'Save'" icon="pi pi-check" [loading]="saving()" (onClick)="save()" />
        </div>
      </ng-template>
    </p-dialog>

    <app-confirm-delete />
  `,
  styles: [`
    .ob-filters {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 12px 16px;
      margin-bottom: 16px;
      padding: 16px 20px;
    }
    .ob-add { margin-left: auto; }
    .ob-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 12px; }
    .ob-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      width: 220px;
      max-width: 100%;
      flex: 0 0 220px;
      margin: 0;
    }
    .ob-grid .ob-field,
    .ob-field.wide { width: 100%; flex: none; margin-bottom: 12px; }
    .ob-field p-select,
    .ob-field p-inputnumber,
    .ob-field textarea { width: 100%; }
    .ob-field textarea { min-height: 76px; resize: vertical; }
    label { font-size: 11px; font-weight: 600; color: var(--t3); text-transform: uppercase; letter-spacing: .5px; }
    @media (max-width: 720px) {
      .ob-filters { flex-direction: column; align-items: stretch; }
      .ob-field, .ob-add { width: 100%; flex: 1 1 auto; margin-left: 0; }
      .ob-grid { grid-template-columns: 1fr; }
    }
    .sub { font-size: 11px; color: var(--t4); }
    .empty { text-align: center; padding: 28px; color: var(--t4); }
    .req { color: var(--red); }
    .alert-err { background: #fee2e2; color: #dc2626; border: 1px solid #dc2626; border-radius: 8px; padding: 10px 14px; font-size: 13px; margin-bottom: 10px; }
  `]
})
export class OpeningBalanceComponent implements OnInit {
  private feeSvc = inject(FeeService);
  private acadSvc = inject(AcademicService);
  private studentSvc = inject(StudentService);
  private authSvc = inject(AuthService);
  private confirmDelete = inject(ConfirmDeleteService);
  private fb = inject(FormBuilder);

  readonly canEdit = this.authSvc.hasRole('superadmin', 'admin');

  rows = signal<StudentOpeningBalanceDto[]>([]);
  years = signal<AcademicYear[]>([]);
  classes = signal<ClassDto[]>([]);
  formClasses = signal<ClassDto[]>([]);
  students = signal<StudentListDto[]>([]);
  showModal = signal(false);
  editingId = signal<number | null>(null);
  saving = signal(false);
  modalError = signal('');

  filterYearId: number | null = null;
  filterClassId: number | null = null;

  form = this.fb.group({
    academicYearId: [null as number | null, Validators.required],
    classId: [null as number | null],
    studentId: [null as number | null, Validators.required],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    remarks: ['']
  });

  classOptions = computed(() =>
    this.classes().map(c => ({ label: `${c.className} ${c.section ?? ''}`.trim(), value: c.classId })));
  formClassOptions = computed(() =>
    this.formClasses().map(c => ({ label: `${c.className} ${c.section ?? ''}`.trim(), value: c.classId })));
  studentOptions = computed(() =>
    this.students().map(s => ({ label: `${s.fullName} (${s.admissionNo})`, value: s.studentId })));

  ngOnInit() {
    this.acadSvc.getYears().subscribe(y => this.years.set(y));
    this.load();
  }

  onYearChange() {
    this.filterClassId = null;
    this.classes.set([]);
    if (this.filterYearId) this.acadSvc.getClasses(this.filterYearId).subscribe(c => this.classes.set(c));
    this.load();
  }

  load() {
    this.feeSvc.getOpeningBalances(this.filterYearId ?? undefined, this.filterClassId ?? undefined)
      .subscribe(rows => this.rows.set(rows));
  }

  openAdd() {
    this.editingId.set(null);
    this.students.set([]);
    this.formClasses.set([]);
    this.modalError.set('');
    this.form.reset({
      academicYearId: this.filterYearId,
      classId: this.filterClassId
    });
    this.form.get('studentId')?.enable();
    this.form.get('classId')?.enable();
    this.form.get('academicYearId')?.enable();
    if (this.filterYearId) this.onFormYearChange();
    this.showModal.set(true);
  }

  openEdit(row: StudentOpeningBalanceDto) {
    this.editingId.set(row.studentOpeningBalanceId);
    this.modalError.set('');
    this.students.set([{
      studentId: row.studentId,
      admissionNo: row.admissionNo,
      fullName: row.studentName,
      gender: null,
      dateOfBirth: null,
      phone: null,
      email: null,
      isActive: true,
      admissionDate: row.asOfDate,
      className: row.className,
      section: null,
      photoFileId: null
    }]);
    this.form.patchValue({
      academicYearId: row.academicYearId,
      studentId: row.studentId,
      amount: row.amount,
      remarks: row.remarks ?? ''
    });
    this.form.get('studentId')?.disable();
    this.form.get('classId')?.disable();
    this.form.get('academicYearId')?.disable();
    this.showModal.set(true);
  }

  onFormYearChange() {
    const yearId = this.form.getRawValue().academicYearId;
    this.form.patchValue({ classId: null, studentId: null });
    this.students.set([]);
    if (yearId) this.acadSvc.getClasses(yearId).subscribe(c => this.formClasses.set(c));
    else this.formClasses.set([]);
  }

  loadFormStudents() {
    const v = this.form.getRawValue();
    if (!v.academicYearId || !v.classId) { this.students.set([]); return; }
    this.studentSvc.getStudents(v.classId, v.academicYearId, undefined, 1, 0, true).subscribe(page => {
      this.students.set(page.items ?? []);
    });
  }

  save() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.modalError.set('');
    const id = this.editingId();
    const req = id
      ? this.feeSvc.updateOpeningBalance(id, {
          amount: v.amount!,
          amountPaid: 0,
          asOfDate: new Date().toISOString().slice(0, 10),
          remarks: v.remarks || undefined
        })
      : this.feeSvc.createOpeningBalance({
          studentId: v.studentId!,
          academicYearId: v.academicYearId!,
          amount: v.amount!,
          amountPaid: 0,
          remarks: v.remarks || undefined
        });
    req.subscribe({
      next: () => { this.saving.set(false); this.showModal.set(false); this.load(); },
      error: (e: any) => {
        this.saving.set(false);
        this.modalError.set(e?.error?.error ?? 'Could not save opening balance.');
      }
    });
  }

  remove(row: StudentOpeningBalanceDto) {
    this.confirmDelete.open(
      'Delete opening balance?',
      `Remove the opening balance for <strong>${row.studentName}</strong>.`,
      () => this.feeSvc.deleteOpeningBalance(row.studentOpeningBalanceId),
      () => this.load()
    );
  }
}
