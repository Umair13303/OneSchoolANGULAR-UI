import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AcademicService } from '../../../core/services/academic.service';
import { StudentService, StudentTransferDto } from '../../../core/services/student.service';
import { AcademicYear, ClassDto } from '../../../core/models/academic.model';
import { OsSelectComponent, OsSelectOption } from '../../../shared/components/os-select/os-select.component';

@Component({
  selector: 'app-student-transfer-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, OsSelectComponent],
  template: `
    <div class="dlg-backdrop" (click)="closed.emit(false)" role="presentation">
      <div class="dlg" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
        <div class="dlg-head">
          <div>
            <h3>{{ title }}</h3>
            <p>{{ studentName }} · {{ admissionNo }}</p>
          </div>
          <button type="button" class="icon-x" (click)="closed.emit(false)">
            <span class="material-icons-round">close</span>
          </button>
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
            <app-os-select
              [options]="yearOptions()"
              [value]="academicYearId"
              (valueChange)="academicYearId = $event; onYearChange()"
              placeholder="Select year"
              icon="event"
              ariaLabel="Academic year" />
          </label>

          <label class="fld">
            <span>Class</span>
            <app-os-select
              [options]="classOptions()"
              [value]="classId"
              (valueChange)="classId = $event"
              placeholder="Select class"
              icon="class"
              ariaLabel="Class"
              [searchable]="classOptions().length > 6" />
          </label>

          @if (error()) {
            <p class="err">{{ error() }}</p>
          }
        </div>

        <div class="dlg-foot">
          <button type="button" class="btn-ghost" (click)="closed.emit(false)" [disabled]="saving()">Cancel</button>
          <button type="button" class="btn-primary" (click)="save()" [disabled]="saving() || !canSave()">
            {{ saving() ? 'Saving…' : confirmLabel }}
          </button>
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
    .icon-x {
      width: 34px; height: 34px; border-radius: 10px; border: 1px solid var(--border);
      background: var(--surface-2); color: var(--t2); cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center;
    }
    .dlg-body { padding: 14px 18px; display: flex; flex-direction: column; gap: 12px; }
    .fld { display: flex; flex-direction: column; gap: 6px; font-size: 12px; font-weight: 600; color: var(--t3); }
    .modes { width: 100%; }
    .modes .os-seg-btn { flex: 1; }
    .err { margin: 0; color: #ef4444; font-size: 12.5px; }
    .dlg-foot {
      display: flex; justify-content: flex-end; gap: 8px;
      padding: 12px 18px 16px; border-top: 1px solid var(--border);
    }
    .btn-ghost {
      height: 38px; padding: 0 14px; border-radius: 10px; border: 1px solid var(--border);
      background: transparent; color: var(--t2); font-weight: 600; cursor: pointer;
    }
    .btn-primary {
      height: 38px; padding: 0 16px; border-radius: 10px; border: none;
      background: var(--accent); color: #fff; font-weight: 700; cursor: pointer;
    }
    .btn-primary:disabled, .btn-ghost:disabled { opacity: .55; cursor: not-allowed; }
  `]
})
export class StudentTransferDialogComponent implements OnInit {
  @Input({ required: true }) studentId!: number;
  @Input() studentName = '';
  @Input() admissionNo = '';
  @Input() isActive = true;
  @Input() initialMode: 'Transfer' | 'Promote' | 'Readmit' = 'Transfer';
  @Output() closed = new EventEmitter<boolean>();

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
