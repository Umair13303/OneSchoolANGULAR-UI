import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExamService } from '../../../core/services/exam.service';
import { AcademicService } from '../../../core/services/academic.service';
import { ExamPaperDto, ExamResultDto } from '../../../core/models/exam.model';

interface ResultRow {
  studentId:    number;
  studentName:  string;
  rollNumber:   string;
  obtainedMarks: number;
  isAbsent:     boolean;
  remarks:      string;
  existingResult?: ExamResultDto;
}

@Component({
  selector: 'app-exam-results-entry',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <div class="ph-left">
        <div class="ph-icon"><span class="material-icons-round">grading</span></div>
        <div>
          <h1>Enter Results</h1>
          <p>Enter marks for exam papers</p>
        </div>
      </div>
    </div>

    <!-- Paper selector -->
    <div class="selector-card">
      <div class="fg two">
        <div class="fi">
          <label>Select Class</label>
          <select [(ngModel)]="selectedClass" (ngModelChange)="onClassChange()">
            <option value="">Select class…</option>
            @for (c of classes(); track c.classId) { <option [value]="c.classId">{{ c.className }}</option> }
          </select>
        </div>
        <div class="fi">
          <label>Select Exam Paper</label>
          <select [(ngModel)]="selectedPaper" (ngModelChange)="onPaperChange()">
            <option value="">Select paper…</option>
            @for (p of filteredPapers(); track p.examPaperId) { <option [value]="p.examPaperId">{{ p.title }} ({{ p.examType }})</option> }
          </select>
        </div>
      </div>
      @if (activePaper()) {
        <div class="paper-summary">
          <div class="ps-item"><span class="material-icons-round">school</span>{{ activePaper()!.className }}</div>
          <div class="ps-item"><span class="material-icons-round">auto_stories</span>{{ activePaper()!.subjectName }}</div>
          <div class="ps-item"><span class="material-icons-round">star</span>Total: {{ activePaper()!.totalMarks }}</div>
          <div class="ps-item"><span class="material-icons-round">check_circle</span>Pass: {{ activePaper()!.passMarks }}</div>
        </div>
      }
    </div>

    @if (loadingRows()) {
      <div class="loading-state"><span class="material-icons-round spin">refresh</span> Loading students…</div>
    } @else if (rows().length > 0) {
      <div class="results-card">
        <div class="results-card-header">
          <span>{{ rows().length }} Students</span>
          <div class="quick-actions">
            <button class="btn-sm btn-outline" (click)="markAllPresent()">
              <span class="material-icons-round">check_circle</span> All Present
            </button>
          </div>
        </div>
        <div class="results-table-wrap">
          <table class="results-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Roll No</th>
                <th>Student Name</th>
                <th>Absent</th>
                <th>Marks Obtained / {{ activePaper()?.totalMarks }}</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              @for (row of rows(); track row.studentId; let i = $index) {
                <tr [class.absent-row]="row.isAbsent">
                  <td>{{ i + 1 }}</td>
                  <td class="roll-cell">{{ row.rollNumber }}</td>
                  <td>{{ row.studentName }}</td>
                  <td>
                    <label class="checkbox-label">
                      <input type="checkbox" [(ngModel)]="row.isAbsent" (ngModelChange)="onAbsentChange(row)" />
                      <span>Absent</span>
                    </label>
                  </td>
                  <td>
                    <input type="number" class="marks-input" [(ngModel)]="row.obtainedMarks"
                           [disabled]="row.isAbsent"
                           [min]="0" [max]="activePaper()?.totalMarks ?? 9999"
                           [class.over-max]="row.obtainedMarks > (activePaper()?.totalMarks ?? 999)"
                           placeholder="0" />
                  </td>
                  <td>
                    <input class="remarks-input" [(ngModel)]="row.remarks" placeholder="Optional…" [disabled]="row.isAbsent" />
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        @if (saveError()) { <div class="alert-error"><span class="material-icons-round">error_outline</span> {{ saveError() }}</div> }
        <div class="results-footer">
          <span class="footer-note">{{ presentCount() }} present, {{ absentCount() }} absent</span>
          <button class="btn-primary" (click)="submitResults()" [disabled]="saving()">
            @if (saving()) { <span class="material-icons-round spin">refresh</span> Saving… }
            @else { <span class="material-icons-round">save</span> Save Results }
          </button>
        </div>
      </div>
    } @else if (selectedPaper) {
      <div class="empty-state">
        <span class="material-icons-round">group</span>
        <p>No students found for this class.</p>
      </div>
    }
  `,
  styles: [`
    .page-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; }
    .ph-left { display:flex; align-items:center; gap:12px; }
    .ph-icon { width:44px; height:44px; border-radius:12px; background:var(--accent-s); display:flex; align-items:center; justify-content:center; }
    .ph-icon .material-icons-round { color:var(--accent); font-size:22px; }
    .ph-left h1 { font-size:18px; font-weight:700; color:var(--t1); margin:0 0 2px; }
    .ph-left p  { font-size:12px; color:var(--t3); margin:0; }

    .selector-card { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:18px 20px; margin-bottom:16px; }
    .fg { display:flex; gap:12px; margin-bottom:12px; }
    .fg:last-child { margin-bottom:0; }
    .fg.two .fi { flex:1; }
    .fi { display:flex; flex-direction:column; gap:5px; }
    label { font-size:11px; font-weight:700; color:var(--t3); text-transform:uppercase; letter-spacing:.4px; }
    select { padding:8px 11px; border:1.5px solid var(--border); border-radius:8px; font-size:13px; font-family:inherit; background:var(--surface); color:var(--t1); outline:none; width:100%; }
    select:focus { border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-g); }

    .paper-summary { display:flex; flex-wrap:wrap; gap:12px; padding:10px 14px; background:var(--accent-s); border-radius:8px; border:1px solid var(--accent-g); margin-top:8px; }
    .ps-item { display:flex; align-items:center; gap:5px; font-size:12.5px; font-weight:600; color:var(--accent); }
    .ps-item .material-icons-round { font-size:14px; }

    .loading-state, .empty-state { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:60px; color:var(--t4); gap:10px; }
    .empty-state .material-icons-round { font-size:48px; opacity:.3; }

    .results-card { background:var(--surface); border:1px solid var(--border); border-radius:12px; overflow:hidden; }
    .results-card-header { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; background:var(--surface-2); border-bottom:1px solid var(--border); font-size:13px; font-weight:600; color:var(--t2); }
    .quick-actions { display:flex; gap:8px; }
    .btn-sm { display:flex; align-items:center; gap:4px; padding:5px 10px; border-radius:7px; font-size:12px; font-weight:600; border:none; cursor:pointer; }
    .btn-sm .material-icons-round { font-size:13px; }
    .btn-outline { background:var(--surface); color:var(--t2); border:1px solid var(--border) !important; }
    .btn-outline:hover { border-color:var(--accent) !important; color:var(--accent); }

    .results-table-wrap { overflow-x:auto; }
    .results-table { width:100%; border-collapse:collapse; font-size:13px; }
    .results-table th { padding:10px 14px; background:var(--surface-2); font-size:11px; font-weight:700; color:var(--t3); text-transform:uppercase; letter-spacing:.4px; text-align:left; border-bottom:1px solid var(--border); }
    .results-table td { padding:8px 14px; border-bottom:1px solid var(--border); vertical-align:middle; color:var(--t1); }
    .results-table tr:last-child td { border-bottom:none; }
    .absent-row td { opacity:.5; }
    .roll-cell { font-weight:700; color:var(--accent); }

    .checkbox-label { display:flex; align-items:center; gap:6px; cursor:pointer; font-size:12px; font-weight:600; color:var(--t3); text-transform:none; letter-spacing:0; }
    .checkbox-label input { accent-color:var(--accent); width:14px; height:14px; }

    .marks-input { width:90px; padding:6px 10px; border:1.5px solid var(--border); border-radius:7px; font-size:13px; font-family:inherit; background:var(--surface); color:var(--t1); outline:none; text-align:center; }
    .marks-input:focus { border-color:var(--accent); }
    .marks-input.over-max { border-color:#ef4444; background:#fff1f2; }
    .marks-input:disabled { opacity:.4; }
    .remarks-input { width:140px; padding:6px 10px; border:1.5px solid var(--border); border-radius:7px; font-size:12px; font-family:inherit; background:var(--surface); color:var(--t1); outline:none; }
    .remarks-input:disabled { opacity:.4; }

    .alert-error { display:flex; align-items:center; gap:8px; padding:10px 16px; background:var(--red-s); border-top:1px solid var(--red-b); font-size:12.5px; color:var(--red); }
    .alert-error .material-icons-round { font-size:16px; }
    .results-footer { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-top:1px solid var(--border); background:var(--surface-2); }
    .footer-note { font-size:12.5px; color:var(--t3); font-weight:600; }
    @keyframes spin { to { transform:rotate(360deg); } }
    .spin { animation:spin .8s linear infinite; display:inline-block; }
  `]
})
export class ExamResultsEntryComponent implements OnInit {
  private examSvc = inject(ExamService);
  private acSvc   = inject(AcademicService);

  classes       = signal<any[]>([]);
  papers        = signal<ExamPaperDto[]>([]);
  filteredPapers = signal<ExamPaperDto[]>([]);
  activePaper   = signal<ExamPaperDto | null>(null);
  rows          = signal<ResultRow[]>([]);
  loadingRows   = signal(false);
  saving        = signal(false);
  saveError     = signal('');

  selectedClass = '';
  selectedPaper = '';

  ngOnInit() {
    this.acSvc.getClasses().subscribe(c => this.classes.set(c));
    this.examSvc.getPapers().subscribe(p => this.papers.set(p));
  }

  onClassChange() {
    this.selectedPaper = '';
    this.activePaper.set(null);
    this.rows.set([]);
    const id = +this.selectedClass;
    this.filteredPapers.set(this.papers().filter(p => !id || p.classId === id));
  }

  onPaperChange() {
    if (!this.selectedPaper) { this.activePaper.set(null); this.rows.set([]); return; }
    const paper = this.papers().find(p => p.examPaperId === +this.selectedPaper);
    this.activePaper.set(paper ?? null);
    if (!paper) return;
    this.loadingRows.set(true);
    this.examSvc.getResultSummary(paper.examPaperId).subscribe({
      next: results => {
        const rows: ResultRow[] = results.map(r => ({
          studentId:     r.studentId,
          studentName:   r.studentName,
          rollNumber:    r.rollNumber,
          obtainedMarks: r.obtainedMarks,
          isAbsent:      r.isAbsent,
          remarks:       r.remarks ?? '',
          existingResult: r
        }));
        this.rows.set(rows);
        this.loadingRows.set(false);
      },
      error: () => this.loadingRows.set(false)
    });
  }

  onAbsentChange(row: ResultRow) { if (row.isAbsent) { row.obtainedMarks = 0; row.remarks = ''; } }
  markAllPresent() { this.rows.update(rows => rows.map(r => ({ ...r, isAbsent: false }))); }
  presentCount() { return this.rows().filter(r => !r.isAbsent).length; }
  absentCount()  { return this.rows().filter(r =>  r.isAbsent).length; }

  submitResults() {
    const paper = this.activePaper();
    if (!paper) return;
    const invalid = this.rows().find(r => !r.isAbsent && (r.obtainedMarks < 0 || r.obtainedMarks > paper.totalMarks));
    if (invalid) { this.saveError.set(`Marks for "${invalid.studentName}" exceed total marks (${paper.totalMarks}).`); return; }
    this.saving.set(true);
    this.saveError.set('');
    const dto = {
      examPaperId: paper.examPaperId,
      results: this.rows().map(r => ({ studentId: r.studentId, obtainedMarks: r.obtainedMarks, isAbsent: r.isAbsent, remarks: r.remarks || undefined }))
    };
    this.examSvc.enterBulkResults(dto).subscribe({
      next: () => { this.saving.set(false); alert('Results saved successfully!'); },
      error: (e: any) => { this.saving.set(false); this.saveError.set(e?.error?.error ?? 'Failed to save results.'); }
    });
  }
}
