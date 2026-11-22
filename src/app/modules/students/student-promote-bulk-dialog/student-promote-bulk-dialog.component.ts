import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AcademicService } from '../../../core/services/academic.service';
import { StudentService } from '../../../core/services/student.service';
import { AcademicYear, ClassDto } from '../../../core/models/academic.model';
import { OsSelectOption } from '../../../shared/components/os-select/os-select.component';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';

@Component({
  selector: 'app-student-promote-bulk-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, Button, Select],
  template: `
    <div class="dlg-backdrop" (click)="closed.emit(false)">
      <div class="dlg" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
        <div class="dlg-head">
          <div>
            <h3>Promote Class</h3>
            <p>Move all active students from one class into another</p>
          </div>
          <p-button icon="pi pi-times" severity="secondary" [outlined]="true" size="small"
            ariaLabel="Close" (onClick)="closed.emit(false)" />
        </div>
        <div class="dlg-body">
          <div class="grid2">
            <label class="fld"><span>From Year</span>
              <p-select class="w-full" appendTo="body" [overlayOptions]="overlayOpts"
                [options]="yearOptions()" optionLabel="label" optionValue="value"
                [ngModel]="sourceYearId" (ngModelChange)="sourceYearId=$event; loadSourceClasses()"
                placeholder="Year" ariaLabel="Source year" />
            </label>
            <label class="fld"><span>From Class</span>
              <p-select class="w-full" appendTo="body" [overlayOptions]="overlayOpts"
                [options]="sourceClassOptions()" optionLabel="label" optionValue="value"
                [ngModel]="sourceClassId" (ngModelChange)="sourceClassId=$event"
                placeholder="Class" ariaLabel="Source class" [filter]="sourceClasses().length > 6" />
            </label>
            <label class="fld"><span>To Year</span>
              <p-select class="w-full" appendTo="body" [overlayOptions]="overlayOpts"
                [options]="yearOptions()" optionLabel="label" optionValue="value"
                [ngModel]="targetYearId" (ngModelChange)="targetYearId=$event; loadTargetClasses()"
                placeholder="Year" ariaLabel="Target year" />
            </label>
            <label class="fld"><span>To Class</span>
              <p-select class="w-full" appendTo="body" [overlayOptions]="overlayOpts"
                [options]="targetClassOptions()" optionLabel="label" optionValue="value"
                [ngModel]="targetClassId" (ngModelChange)="targetClassId=$event"
                placeholder="Class" ariaLabel="Target class" [filter]="targetClasses().length > 6" />
            </label>
          </div>
          @if (result()) {
            <p class="ok">Promoted {{ result()!.promoted }} · Skipped {{ result()!.skipped }}</p>
          }
          @if (error()) { <p class="err">{{ error() }}</p> }
        </div>
        <div class="dlg-foot">
          <p-button label="Close" severity="secondary" [outlined]="true" [disabled]="saving()"
            (onClick)="closed.emit(!!result())" />
          <p-button [label]="saving() ? 'Promoting…' : 'Promote All'" icon="pi pi-arrow-up"
            [loading]="saving()" [disabled]="saving() || !canSave()" (onClick)="save()" />
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dlg-backdrop{position:fixed;inset:0;z-index:10040;background:rgba(15,23,42,.5);display:flex;align-items:center;justify-content:center;padding:16px;}
    .dlg{width:min(520px,100%);background:var(--surface);border-radius:16px;box-shadow:0 20px 50px rgba(0,0,0,.25);overflow:hidden;}
    .dlg-head{display:flex;justify-content:space-between;gap:12px;padding:16px 18px 10px;border-bottom:1px solid var(--border);}
    .dlg-head h3{margin:0;font-size:16px;font-weight:700;color:var(--t1);}
    .dlg-head p{margin:4px 0 0;font-size:12px;color:var(--t4);}
    .dlg-body{padding:14px 18px;display:flex;flex-direction:column;gap:12px;}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
    .fld{display:flex;flex-direction:column;gap:6px;font-size:12px;font-weight:600;color:var(--t3);}
    .err{margin:0;color:#ef4444;font-size:12.5px;}
    .ok{margin:0;color:var(--green,#059669);font-size:13px;font-weight:600;}
    .dlg-foot{display:flex;justify-content:flex-end;gap:8px;padding:12px 18px 16px;border-top:1px solid var(--border);}
    @media(max-width:560px){.grid2{grid-template-columns:1fr;}}
  `]
})
export class StudentPromoteBulkDialogComponent implements OnInit {
  @Input() presetSourceYearId: number | null = null;
  @Input() presetSourceClassId: number | null = null;
  @Output() closed = new EventEmitter<boolean>();

  /** Raise PrimeNG select overlays above this dialog's custom backdrop (z-index 10040). */
  readonly overlayOpts = { baseZIndex: 10050 };

  private academicSvc = inject(AcademicService);
  private studentSvc = inject(StudentService);

  years = signal<AcademicYear[]>([]);
  sourceClasses = signal<ClassDto[]>([]);
  targetClasses = signal<ClassDto[]>([]);
  saving = signal(false);
  error = signal('');
  result = signal<{ promoted: number; skipped: number } | null>(null);

  sourceYearId: number | null = null;
  sourceClassId: number | null = null;
  targetYearId: number | null = null;
  targetClassId: number | null = null;

  yearOptions = () => this.years().map(y => ({ value: y.academicYearId as number | null, label: y.yearLabel }));
  sourceClassOptions = (): OsSelectOption<number | null>[] =>
    this.sourceClasses().map(c => ({ value: c.classId as number | null, label: `${c.className} ${c.section ?? ''}`.trim() }));
  targetClassOptions = (): OsSelectOption<number | null>[] =>
    this.targetClasses().map(c => ({ value: c.classId as number | null, label: `${c.className} ${c.section ?? ''}`.trim() }));

  ngOnInit(): void {
    this.academicSvc.getYears().subscribe(y => {
      this.years.set(y);
      this.sourceYearId = this.presetSourceYearId ?? y.find(x => (x as any).isCurrent)?.academicYearId ?? y[0]?.academicYearId ?? null;
      this.targetYearId = this.sourceYearId;
      this.sourceClassId = this.presetSourceClassId;
      this.loadSourceClasses();
      this.loadTargetClasses();
    });
  }

  loadSourceClasses(): void {
    this.sourceClassId = this.presetSourceClassId && this.sourceYearId === this.presetSourceYearId
      ? this.presetSourceClassId : null;
    if (!this.sourceYearId) { this.sourceClasses.set([]); return; }
    this.academicSvc.getClasses(this.sourceYearId).subscribe(c => {
      this.sourceClasses.set(c);
      if (this.presetSourceClassId && c.some(x => x.classId === this.presetSourceClassId))
        this.sourceClassId = this.presetSourceClassId;
    });
  }

  loadTargetClasses(): void {
    this.targetClassId = null;
    if (!this.targetYearId) { this.targetClasses.set([]); return; }
    this.academicSvc.getClasses(this.targetYearId).subscribe(c => this.targetClasses.set(c));
  }

  canSave(): boolean {
    return !!this.sourceYearId && !!this.sourceClassId && !!this.targetYearId && !!this.targetClassId;
  }

  save(): void {
    if (!this.canSave() || this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    this.result.set(null);
    this.studentSvc.promoteBulk({
      sourceClassId: this.sourceClassId!,
      sourceAcademicYearId: this.sourceYearId!,
      targetClassId: this.targetClassId!,
      targetAcademicYearId: this.targetYearId!
    }).subscribe({
      next: r => { this.saving.set(false); this.result.set(r); },
      error: e => { this.saving.set(false); this.error.set(e?.error?.error ?? 'Bulk promote failed.'); }
    });
  }
}
