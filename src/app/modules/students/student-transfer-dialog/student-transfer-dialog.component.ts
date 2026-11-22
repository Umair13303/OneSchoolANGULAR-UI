import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AcademicService } from '../../../core/services/academic.service';
import { StudentService, StudentTransferDto } from '../../../core/services/student.service';
import { AcademicYear, ClassDto } from '../../../core/models/academic.model';
import { OsSelectOption } from '../../../shared/components/os-select/os-select.component';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';

@Component({
  selector: 'app-student-transfer-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, Button, Select],
  template: `
    <div class="dlg-backdrop" (click)="closed.emit(false)" role="presentation">
      <div class="dlg" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
        <div class="dlg-head">
          <div>
            <h3>{{ title }}</h3>
            <p>{{ studentName }} · {{ admissionNo }}</p>
          </div>
          <p-button
            icon="pi pi-times"
            severity="secondary"
            [outlined]="true"
            size="small"
            ariaLabel="Close"
            (onClick)="closed.emit(false)" />
        </div>

        <div class="dlg-body">
          <label class="fld">
            <span>Mode</span>
            <div class="os-seg square modes">
              @for (m of modes; track m.value) {
                <button type="button" class="os-seg-btn"
                        [class.active]="mode === m.value"
                        [disabled]="m.value !== 'Readmit' && !isActive"
                        (click)="mode = m.value">{{ m.label }}</button>
              }
            </div>
          </label>

          <label class="fld">
            <span>Academic Year</span>
            <p-select
              class="w-full"
              appendTo="body"
              [overlayOptions]="overlayOpts"
              [options]="yearOptions()"
              optionLabel="label"
              optionValue="value"
              [ngModel]="academicYearId"
              (ngModelChange)="academicYearId = $event; onYearChange()"
              placeholder="Select year"
              ariaLabel="Academic year" />
          </label>

          <label class="fld">
            <span>Class</span>
            <p-select
              class="w-full"
              appendTo="body"
              [overlayOptions]="overlayOpts"
              [options]="classOptions()"
              optionLabel="label"
              optionValue="value"
              [ngModel]="classId"
              (ngModelChange)="classId = $event"
              placeholder="Select class"
              ariaLabel="Class"
              [filter]="classOptions().length > 6" />
          </label>

          @if (error()) {
            <p class="err">{{ error() }}</p>
          }
        </div>

        <div class="dlg-foot">
          <p-button
            label="Cancel"
            severity="secondary"
            [outlined]="true"
            [disabled]="saving()"
            (onClick)="closed.emit(false)" />
          <p-button
            [label]="saving() ? 'Saving…' : confirmLabel"
            icon="pi pi-check"
            [loading]="saving()"
            [disabled]="saving() || !canSave()"
            (onClick)="save()" />
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dlg-backdrop {
      position: fixed; inset: 0; z-index: 10040;
      background: rgba(15,23,42,.5); display: flex; align-items: center; justify-content: center;
      padding: 16px;
    }
    .dlg {
      width: min(420px, 100%); background: var(--surface); border-radius: 16px;
      box-shadow: 0 20px 50px rgba(0,0,0,.25); overflow: hidden;
    }
    .dlg-head {
      display: flex; justify-content: space-between; gap: 12px;
      padding: 16px 18px 10px; border-bottom: 1px solid var(--border);
    }
    .dlg-head h3 { margin: 0; font-size: 16px; font-weight: 700; color: var(--t1); }
    .dlg-head p { margin: 4px 0 0; font-size: 12px; color: var(--t4); }
    .dlg-body { padding: 14px 18px; display: flex; flex-direction: column; gap: 12px; }
    .fld { display: flex; flex-direction: column; gap: 6px; font-size: 12px; font-weight: 600; color: var(--t3); }
    .modes { width: 100%; }
    .modes .os-seg-btn { flex: 1; }
    .err { margin: 0; color: #ef4444; font-size: 12.5px; }
    .dlg-foot {
      display: flex; justify-content: flex-end; gap: 8px;
      padding: 12px 18px 16px; border-top: 1px solid var(--border);
    }
  `]
})
export class StudentTransferDialogComponent implements OnInit {
  @Input({ required: true }) studentId!: number;
  @Input() studentName = '';
  @Input() admissionNo = '';
  @Input() isActive = true;
  @Input() initialMode: 'Transfer' | 'Promote' | 'Readmit' = 'Transfer';
  @Output() closed = new EventEmitter<boolean>();

  /** Raise PrimeNG select overlays above this dialog's custom backdrop (z-index 10040). */
  readonly overlayOpts = { baseZIndex: 10050 };

  private academicSvc = inject(AcademicService);
  private studentSvc  = inject(StudentService);

  years = signal<AcademicYear[]>([]);
  classes = signal<ClassDto[]>([]);
  saving = signal(false);
  error = signal('');

  mode: 'Transfer' | 'Promote' | 'Readmit' = 'Transfer';
  academicYearId: number | null = null;
  classId: number | null = null;

  modes = [
    { value: 'Transfer' as const, label: 'Transfer' },
    { value: 'Promote' as const, label: 'Promote' },
    { value: 'Readmit' as const, label: 'Readmit' },
  ];

  yearOptions = () => this.years().map(y => ({ value: y.academicYearId as number | null, label: y.yearLabel }));
  classOptions = () => this.classes().map(c => ({
    value: c.classId as number | null,
    label: `${c.className} ${c.section ?? ''}`.trim()
  })) as OsSelectOption<number | null>[];

  get title(): string {
    return this.mode === 'Readmit' ? 'Re-admit Student'
      : this.mode === 'Promote' ? 'Promote Student'
      : 'Transfer Student';
  }

  get confirmLabel(): string {
    return this.mode === 'Readmit' ? 'Re-admit'
      : this.mode === 'Promote' ? 'Promote'
      : 'Transfer';
  }

  ngOnInit(): void {
    this.mode = this.isActive ? this.initialMode : 'Readmit';
    this.academicSvc.getYears().subscribe(y => {
      this.years.set(y);
      const current = y.find(x => (x as any).isCurrent) ?? y[0];
      if (current) {
        this.academicYearId = current.academicYearId;
        this.onYearChange();
      }
    });
  }

  onYearChange(): void {
    this.classId = null;
    if (!this.academicYearId) { this.classes.set([]); return; }
    this.academicSvc.getClasses(this.academicYearId).subscribe(c => this.classes.set(c));
  }

  canSave(): boolean {
    return !!this.academicYearId && !!this.classId;
  }

  save(): void {
    if (!this.canSave() || this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    const dto: StudentTransferDto = {
      academicYearId: this.academicYearId!,
      classId: this.classId!,
      mode: this.mode
    };
    this.studentSvc.transfer(this.studentId, dto).subscribe({
      next: () => { this.saving.set(false); this.closed.emit(true); },
      error: (e) => {
        this.saving.set(false);
        this.error.set(e?.error?.error ?? 'Could not update enrollment.');
      }
    });
  }
}
