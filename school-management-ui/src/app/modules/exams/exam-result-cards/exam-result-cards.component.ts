import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExamService } from '../../../core/services/exam.service';
import { AcademicService } from '../../../core/services/academic.service';
import { ExamPaperDto, ExamResultDto } from '../../../core/models/exam.model';

@Component({
  selector: 'app-exam-result-cards',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <div class="ph-left">
        <div class="ph-icon"><span class="material-icons-round">emoji_events</span></div>
        <div>
          <h1>Result Cards</h1>
          <p>View class result summary and student performance</p>
        </div>
      </div>
    </div>

    <!-- Selector -->
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
          <select [(ngModel)]="selectedPaper" (ngModelChange)="loadResults()">
            <option value="">Select paper…</option>
            @for (p of filteredPapers(); track p.examPaperId) { <option [value]="p.examPaperId">{{ p.title }} ({{ p.examType }})</option> }
          </select>
        </div>
      </div>
    </div>

    @if (loading()) {
      <div class="loading-state"><span class="material-icons-round spin">refresh</span> Loading results…</div>
    } @else if (results().length > 0) {

      <!-- Summary Stats -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-icon total"><span class="material-icons-round">group</span></div>
          <div class="stat-body"><div class="stat-val">{{ results().length }}</div><div class="stat-label">Total Students</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon pass"><span class="material-icons-round">check_circle</span></div>
          <div class="stat-body"><div class="stat-val">{{ passCount() }}</div><div class="stat-label">Passed</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon fail"><span class="material-icons-round">cancel</span></div>
          <div class="stat-body"><div class="stat-val">{{ failCount() }}</div><div class="stat-label">Failed</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon avg"><span class="material-icons-round">percent</span></div>
          <div class="stat-body"><div class="stat-val">{{ avgPercentage() }}%</div><div class="stat-label">Class Average</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon absent"><span class="material-icons-round">person_off</span></div>
          <div class="stat-body"><div class="stat-val">{{ absentCount() }}</div><div class="stat-label">Absent</div></div>
        </div>
      </div>

      <!-- Result Table -->
      <div class="results-card">
        <div class="results-card-header">
          <span>Results — {{ activePaper()?.title }}</span>
          <button class="btn-sm btn-outline" (click)="recalcRanks()">
            <span class="material-icons-round">leaderboard</span> Recalculate Ranks
          </button>
        </div>
        <div class="results-table-wrap">
          <table class="results-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Roll No</th>
                <th>Student Name</th>
                <th>Marks</th>
                <th>%</th>
                <th>Grade</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              @for (r of results(); track r.studentId) {
                <tr [class.absent-row]="r.isAbsent">
                  <td class="rank-cell">
                    @if (r.classRank === 1) { <span class="rank-gold">🥇</span> }
                    @else if (r.classRank === 2) { <span class="rank-silver">🥈</span> }
                    @else if (r.classRank === 3) { <span class="rank-bronze">🥉</span> }
                    @else { {{ r.classRank ?? '—' }} }
                  </td>
                  <td class="roll-cell">{{ r.rollNumber }}</td>
                  <td>{{ r.studentName }}</td>
                  <td>
                    @if (r.isAbsent) { <span class="absent-tag">Absent</span> }
                    @else { {{ r.obtainedMarks }} / {{ r.totalMarks }} }
                  </td>
                  <td>{{ r.isAbsent ? '—' : (r.percentage | number:'1.1-1') + '%' }}</td>
                  <td>
                    @if (!r.isAbsent) {
                      <span class="grade-badge grade-{{ r.grade?.toLowerCase() }}">{{ r.grade }}</span>
                    } @else { — }
                  </td>
                  <td>
                    @if (r.isAbsent) { <span class="status-badge absent">Absent</span> }
                    @else if (r.isPass) { <span class="status-badge pass">Pass</span> }
                    @else { <span class="status-badge fail">Fail</span> }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    } @else if (selectedPaper) {
      <div class="empty-state">
        <span class="material-icons-round">emoji_events</span>
        <p>No results entered for this paper yet.</p>
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
    .fg { display:flex; gap:12px; }
    .fg.two .fi { flex:1; }
    .fi { display:flex; flex-direction:column; gap:5px; }
    label { font-size:11px; font-weight:700; color:var(--t3); text-transform:uppercase; letter-spacing:.4px; }
    select { padding:8px 11px; border:1.5px solid var(--border); border-radius:8px; font-size:13px; background:var(--surface); color:var(--t1); outline:none; width:100%; }
    select:focus { border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-g); }

    .loading-state, .empty-state { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:60px; color:var(--t4); gap:10px; }
    .empty-state .material-icons-round { font-size:48px; opacity:.3; }

    .stats-row { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:12px; margin-bottom:16px; }
    .stat-card { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:14px 16px; display:flex; align-items:center; gap:12px; }
    .stat-icon { width:38px; height:38px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .stat-icon .material-icons-round { font-size:20px; }
    .stat-icon.total  { background:var(--accent-s); } .stat-icon.total  .material-icons-round { color:var(--accent); }
    .stat-icon.pass   { background:var(--green-s);  } .stat-icon.pass   .material-icons-round { color:var(--green);  }
    .stat-icon.fail   { background:var(--red-s);    } .stat-icon.fail   .material-icons-round { color:var(--red);    }
    .stat-icon.avg    { background:#fef3c7;          } .stat-icon.avg    .material-icons-round { color:#d97706;       }
    .stat-icon.absent { background:var(--surface-2); } .stat-icon.absent .material-icons-round { color:var(--t3);    }
    .stat-val   { font-size:20px; font-weight:800; color:var(--t1); }
    .stat-label { font-size:11px; color:var(--t3); font-weight:600; }

    .results-card { background:var(--surface); border:1px solid var(--border); border-radius:12px; overflow:hidden; }
    .results-card-header { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; background:var(--surface-2); border-bottom:1px solid var(--border); font-size:13px; font-weight:600; color:var(--t2); }
    .btn-sm { display:flex; align-items:center; gap:4px; padding:5px 10px; border-radius:7px; font-size:12px; font-weight:600; border:none; cursor:pointer; }
    .btn-sm .material-icons-round { font-size:13px; }
    .btn-outline { background:var(--surface); color:var(--t2); border:1px solid var(--border) !important; }
    .btn-outline:hover { border-color:var(--accent) !important; color:var(--accent); }

    .results-table-wrap { overflow-x:auto; }
    .results-table { width:100%; border-collapse:collapse; font-size:13px; }
    .results-table th { padding:10px 14px; background:var(--surface-2); font-size:11px; font-weight:700; color:var(--t3); text-transform:uppercase; letter-spacing:.4px; text-align:left; border-bottom:1px solid var(--border); }
    .results-table td { padding:10px 14px; border-bottom:1px solid var(--border); color:var(--t1); vertical-align:middle; }
    .results-table tr:last-child td { border-bottom:none; }
    .results-table tr:hover td { background:var(--surface-2); }
    .absent-row td { opacity:.6; }

    .rank-cell { font-weight:700; font-size:15px; }
    .rank-gold, .rank-silver, .rank-bronze { font-size:18px; }
    .roll-cell { font-weight:700; color:var(--accent); }
    .absent-tag { font-size:11px; font-weight:700; color:var(--t3); background:var(--surface-2); padding:3px 8px; border-radius:99px; }

    .grade-badge { font-size:12px; font-weight:800; padding:3px 10px; border-radius:99px; }
    .grade-a\+ { background:#d1fae5; color:#065f46; }
    .grade-a  { background:#d1fae5; color:#065f46; }
    .grade-b  { background:#dbeafe; color:#1e40af; }
    .grade-c  { background:#fef3c7; color:#92400e; }
    .grade-d  { background:#ffedd5; color:#c2410c; }
    .grade-f  { background:var(--red-s); color:var(--red); }

    .status-badge { font-size:11px; font-weight:700; padding:3px 10px; border-radius:99px; }
    .status-badge.pass   { background:var(--green-s); color:var(--green); }
    .status-badge.fail   { background:var(--red-s);   color:var(--red);   }
    .status-badge.absent { background:var(--surface-2); color:var(--t3);  }

    @keyframes spin { to { transform:rotate(360deg); } }
    .spin { animation:spin .8s linear infinite; display:inline-block; }
  `]
})
export class ExamResultCardsComponent implements OnInit {
  private examSvc = inject(ExamService);
  private acSvc   = inject(AcademicService);

  classes       = signal<any[]>([]);
  papers        = signal<ExamPaperDto[]>([]);
  filteredPapers = signal<ExamPaperDto[]>([]);
  activePaper   = signal<ExamPaperDto | null>(null);
  results       = signal<ExamResultDto[]>([]);
  loading       = signal(false);

  selectedClass = '';
  selectedPaper = '';

  ngOnInit() {
    this.acSvc.getClasses().subscribe(c => this.classes.set(c));
    this.examSvc.getPapers().subscribe(p => this.papers.set(p));
  }

  onClassChange() {
    this.selectedPaper = '';
    this.activePaper.set(null);
    this.results.set([]);
    const id = +this.selectedClass;
    this.filteredPapers.set(this.papers().filter(p => !id || p.classId === id));
  }

  loadResults() {
    if (!this.selectedPaper) { this.results.set([]); return; }
    const paper = this.papers().find(p => p.examPaperId === +this.selectedPaper);
    this.activePaper.set(paper ?? null);
    this.loading.set(true);
    this.examSvc.getResultSummary(+this.selectedPaper).subscribe({
      next: r => { this.results.set(r); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  passCount()    { return this.results().filter(r => !r.isAbsent && r.isPass).length; }
  failCount()    { return this.results().filter(r => !r.isAbsent && !r.isPass).length; }
  absentCount()  { return this.results().filter(r => r.isAbsent).length; }
  avgPercentage() {
    const present = this.results().filter(r => !r.isAbsent);
    if (!present.length) return 0;
    return +(present.reduce((s, r) => s + r.percentage, 0) / present.length).toFixed(1);
  }

  recalcRanks() {
    if (!this.selectedPaper) return;
    this.examSvc.recalculateRanks(+this.selectedPaper).subscribe({ next: () => this.loadResults() });
  }
}
