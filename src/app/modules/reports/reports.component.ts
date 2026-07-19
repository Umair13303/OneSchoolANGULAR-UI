import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService } from '../../core/services/report.service';
import { AcademicService } from '../../core/services/academic.service';
import { ClassDto, AcademicYear } from '../../core/models/academic.model';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { DatePickerComponent } from '../../shared/components/date-picker/date-picker.component';

type Tab = 'daily' | 'monthly' | 'student' | 'enrollment' | 'homework' | 'workload';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, LoadingComponent, DatePickerComponent],
  template: `
    <app-page-header title="Reports & Analytics" subtitle="Generate and export school data reports" />

    <!-- Tab navigation -->
    <div class="tab-nav card">
      @for (t of tabs; track t.id) {
        <button [class.active]="activeTab() === t.id" (click)="switchTab(t.id)">
          <span class="tab-icon">{{ t.icon }}</span>
          <span class="tab-label">{{ t.label }}</span>
        </button>
      }
    </div>

    <!-- ═══════════════════════════════════════════════════════════════════════
         TAB 1 — Daily Attendance
         ═══════════════════════════════════════════════════════════════════════ -->
    @if (activeTab() === 'daily') {
      <div class="report-panel">
        <div class="query-card card">
          <h4>Parameters</h4>
          <div class="params-row">
            <div class="field">
              <label>Academic Year</label>
              <select [(ngModel)]="p.yearId" (change)="loadClasses()">
                <option [ngValue]="null">Select</option>
                @for (y of years(); track y.academicYearId) { <option [ngValue]="y.academicYearId">{{ y.yearLabel }}</option> }
              </select>
            </div>
            <div class="field">
              <label>Class *</label>
              <select [(ngModel)]="p.classId">
                <option [ngValue]="null">Select class</option>
                @for (c of classes(); track c.classId) { <option [ngValue]="c.classId">{{ c.className }} {{ c.section }}</option> }
              </select>
            </div>
            <div class="field">
              <label>Date *</label>
              <app-date-picker [(ngModel)]="p.date1" />
            </div>
            <button class="btn-run" (click)="runDaily()" [disabled]="loading()">
              {{ loading() ? '...' : '▶ Run' }}
            </button>
          </div>
        </div>

        @if (loading()) { <app-loading /> }
        @else if (data()) {
          <div class="stat-cards">
            <div class="stat-card"><div class="sc-num">{{ data().totalStudents }}</div><div class="sc-label">Total Students</div></div>
            <div class="stat-card green"><div class="sc-num">{{ data().present }}</div><div class="sc-label">Present</div></div>
            <div class="stat-card red"><div class="sc-num">{{ data().absent }}</div><div class="sc-label">Absent</div></div>
            <div class="stat-card orange"><div class="sc-num">{{ data().late }}</div><div class="sc-label">Late</div></div>
            <div class="stat-card grey"><div class="sc-num">{{ data().notMarked }}</div><div class="sc-label">Not Marked</div></div>
          </div>
          <div class="report-meta">
            {{ data().className }} {{ data().section }} &nbsp;|&nbsp; {{ data().date }}
            <div class="report-actions">
              <button class="btn-print" onclick="window.print()">🖨 Print</button>
              <button class="btn-pdf" (click)="downloadDailyPdf()" [disabled]="pdfLoading()">
                {{ pdfLoading() ? '...' : '⬇ PDF' }}
              </button>
            </div>
          </div>
          @for (period of data().periods; track period.periodId) {
            <div class="period-block card">
              <div class="period-header">{{ period.periodName }}</div>
              <table class="table">
                <thead><tr><th>#</th><th>Student</th><th>Admission No</th><th>Status</th><th>Remarks</th></tr></thead>
                <tbody>
                  @for (row of period.rows; track row.studentId; let i = $index) {
                    <tr>
                      <td class="row-num">{{ i + 1 }}</td>
                      <td>{{ row.studentName }}</td>
                      <td>{{ row.admissionNo }}</td>
                      <td><span class="status-pill" [class]="statusClass(row.status)">{{ row.status }}</span></td>
                      <td>{{ row.remarks ?? '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }
      </div>
    }

    <!-- ═══════════════════════════════════════════════════════════════════════
         TAB 2 — Monthly Attendance
         ═══════════════════════════════════════════════════════════════════════ -->
    @if (activeTab() === 'monthly') {
      <div class="report-panel">
        <div class="query-card card">
          <h4>Parameters</h4>
          <div class="params-row">
            <div class="field">
              <label>Academic Year</label>
              <select [(ngModel)]="p.yearId" (change)="loadClasses()">
                <option [ngValue]="null">Select</option>
                @for (y of years(); track y.academicYearId) { <option [ngValue]="y.academicYearId">{{ y.yearLabel }}</option> }
              </select>
            </div>
            <div class="field">
              <label>Class *</label>
              <select [(ngModel)]="p.classId">
                <option [ngValue]="null">Select class</option>
                @for (c of classes(); track c.classId) { <option [ngValue]="c.classId">{{ c.className }} {{ c.section }}</option> }
              </select>
            </div>
            <div class="field">
              <label>Month *</label>
              <select [(ngModel)]="p.month">
                @for (m of months; track m.v) { <option [ngValue]="m.v">{{ m.l }}</option> }
              </select>
            </div>
            <div class="field">
              <label>Year *</label>
              <input type="number" [(ngModel)]="p.year" style="width:90px" />
            </div>
            <button class="btn-run" (click)="runMonthly()" [disabled]="loading()">
              {{ loading() ? '...' : '▶ Run' }}
            </button>
          </div>
        </div>

        @if (loading()) { <app-loading /> }
        @else if (data()) {
          <div class="report-meta">
            {{ data().className }} {{ data().section }}
            &nbsp;|&nbsp; {{ monthName(data().month) }} {{ data().year }}
            &nbsp;|&nbsp; Working Days: <strong>{{ data().workingDays }}</strong>
            <div class="report-actions">
              <button class="btn-print" onclick="window.print()">🖨 Print</button>
              <button class="btn-pdf" (click)="downloadMonthlyPdf()" [disabled]="pdfLoading()">
                {{ pdfLoading() ? '...' : '⬇ PDF' }}
              </button>
            </div>
          </div>
          <!-- Attendance % warning threshold -->
          <div class="threshold-note">⚠ Students below 75% attendance are highlighted.</div>
          <div class="card">
            <table class="table">
              <thead>
                <tr>
                  <th>#</th><th>Student</th><th>Admission No</th>
                  <th class="center">Present</th><th class="center">Absent</th>
                  <th class="center">Late</th><th class="center">Attendance %</th>
                </tr>
              </thead>
              <tbody>
                @for (s of data().students; track s.studentId; let i = $index) {
                  <tr [class.low-attend]="s.attendancePercent < 75">
                    <td class="row-num">{{ i + 1 }}</td>
                    <td>{{ s.studentName }}</td>
                    <td>{{ s.admissionNo }}</td>
                    <td class="center green-text">{{ s.present }}</td>
                    <td class="center red-text">{{ s.absent }}</td>
                    <td class="center orange-text">{{ s.late }}</td>
                    <td class="center">
                      <div class="pct-wrap">
                        <div class="pct-bar" [style.width.%]="s.attendancePercent"
                             [class.low]="s.attendancePercent < 75"></div>
                        <span [class.low-pct]="s.attendancePercent < 75">{{ s.attendancePercent }}%</span>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    }

    <!-- ═══════════════════════════════════════════════════════════════════════
         TAB 3 — Student Attendance Report
         ═══════════════════════════════════════════════════════════════════════ -->
    @if (activeTab() === 'student') {
      <div class="report-panel">
        <div class="query-card card">
          <h4>Parameters</h4>
          <div class="params-row">
            <div class="field">
              <label>Student ID *</label>
              <input type="number" [(ngModel)]="p.studentId" placeholder="e.g. 5" style="width:110px" />
            </div>
            <div class="field">
              <label>From Date</label>
              <app-date-picker [(ngModel)]="p.from" />
            </div>
            <div class="field">
              <label>To Date</label>
              <app-date-picker [(ngModel)]="p.to" />
            </div>
            <button class="btn-run" (click)="runStudent()" [disabled]="loading()">
              {{ loading() ? '...' : '▶ Run' }}
            </button>
          </div>
        </div>

        @if (loading()) { <app-loading /> }
        @else if (data()) {
          <!-- Student profile header -->
          <div class="card student-header">
            <div class="stu-avatar">{{ initials(data().studentName) }}</div>
            <div class="stu-info">
              <h3>{{ data().studentName }}</h3>
              <p>{{ data().admissionNo }} &nbsp;|&nbsp; {{ data().className }} {{ data().section }}</p>
            </div>
            <div class="report-actions" style="margin-left:auto;align-self:center">
              <button class="btn-print" onclick="window.print()">🖨 Print</button>
              <button class="btn-pdf" (click)="downloadStudentPdf()" [disabled]="pdfLoading()">
                {{ pdfLoading() ? '...' : '⬇ PDF' }}
              </button>
            </div>
            <div class="stu-stats">
              <div class="stat-card green"><div class="sc-num">{{ data().present }}</div><div class="sc-label">Present</div></div>
              <div class="stat-card red"><div class="sc-num">{{ data().absent }}</div><div class="sc-label">Absent</div></div>
              <div class="stat-card orange"><div class="sc-num">{{ data().late }}</div><div class="sc-label">Late</div></div>
              <div class="stat-card" [class.red]="data().attendancePercent < 75">
                <div class="sc-num">{{ data().attendancePercent }}%</div>
                <div class="sc-label">Attendance</div>
              </div>
            </div>
          </div>

          <div class="card">
            <table class="table">
              <thead><tr><th>Date</th><th>Period</th><th>Status</th><th>Remarks</th></tr></thead>
              <tbody>
                @for (d of data().days; track $index) {
                  <tr>
                    <td>{{ d.date }}</td>
                    <td>{{ d.periodName }}</td>
                    <td><span class="status-pill" [class]="statusClass(d.status)">{{ d.status }}</span></td>
                    <td>{{ d.remarks ?? '—' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    }

    <!-- ═══════════════════════════════════════════════════════════════════════
         TAB 4 — Enrollment Report
         ═══════════════════════════════════════════════════════════════════════ -->
    @if (activeTab() === 'enrollment') {
      <div class="report-panel">
        <div class="query-card card">
          <h4>Parameters</h4>
          <div class="params-row">
            <div class="field">
              <label>Academic Year *</label>
              <select [(ngModel)]="p.yearId">
                <option [ngValue]="null">Select</option>
                @for (y of years(); track y.academicYearId) { <option [ngValue]="y.academicYearId">{{ y.yearLabel }}</option> }
              </select>
            </div>
            <button class="btn-run" (click)="runEnrollment()" [disabled]="loading()">
              {{ loading() ? '...' : '▶ Run' }}
            </button>
          </div>
        </div>

        @if (loading()) { <app-loading /> }
        @else if (data()) {
          <div class="stat-cards">
            <div class="stat-card"><div class="sc-num">{{ data().totalClasses }}</div><div class="sc-label">Classes</div></div>
            <div class="stat-card green"><div class="sc-num">{{ data().totalStudents }}</div><div class="sc-label">Total Students</div></div>
          </div>
          <div class="report-meta">
            {{ data().academicYearLabel }}
            <div class="report-actions">
              <button class="btn-print" onclick="window.print()">🖨 Print</button>
              <button class="btn-pdf" (click)="downloadEnrollmentPdf()" [disabled]="pdfLoading()">
                {{ pdfLoading() ? '...' : '⬇ PDF' }}
              </button>
            </div>
          </div>
          @for (cls of data().classes; track cls.classId) {
            <div class="class-block card">
              <div class="class-header">
                <strong>{{ cls.className }} {{ cls.section }}</strong>
                <div class="class-counts">
                  <span class="count-pill green">Active: {{ cls.active }}</span>
                  <span class="count-pill red">Withdrawn: {{ cls.withdrawn }}</span>
                  <span class="count-pill blue">Promoted: {{ cls.promoted }}</span>
                  <span class="count-pill grey">Total: {{ cls.totalStudents }}</span>
                </div>
              </div>
              <table class="table">
                <thead><tr><th>#</th><th>Student</th><th>Admission No</th><th>Gender</th><th>Admission Date</th><th>Status</th></tr></thead>
                <tbody>
                  @for (s of cls.students; track s.studentId; let i = $index) {
                    <tr>
                      <td class="row-num">{{ i + 1 }}</td>
                      <td>{{ s.studentName }}</td>
                      <td>{{ s.admissionNo }}</td>
                      <td>{{ s.gender ?? '—' }}</td>
                      <td>{{ s.admissionDate }}</td>
                      <td><span class="status-pill" [class]="s.status.toLowerCase()">{{ s.status }}</span></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }
      </div>
    }

    <!-- ═══════════════════════════════════════════════════════════════════════
         TAB 5 — Homework Report
         ═══════════════════════════════════════════════════════════════════════ -->
    @if (activeTab() === 'homework') {
      <div class="report-panel">
        <div class="query-card card">
          <h4>Parameters</h4>
          <div class="params-row">
            <div class="field">
              <label>Academic Year</label>
              <select [(ngModel)]="p.yearId" (change)="loadClasses()">
                <option [ngValue]="null">Select</option>
                @for (y of years(); track y.academicYearId) { <option [ngValue]="y.academicYearId">{{ y.yearLabel }}</option> }
              </select>
            </div>
            <div class="field">
              <label>Class *</label>
              <select [(ngModel)]="p.classId">
                <option [ngValue]="null">Select class</option>
                @for (c of classes(); track c.classId) { <option [ngValue]="c.classId">{{ c.className }} {{ c.section }}</option> }
              </select>
            </div>
            <div class="field"><label>From Date</label><app-date-picker [(ngModel)]="p.from" /></div>
            <div class="field"><label>To Date</label><app-date-picker [(ngModel)]="p.to" /></div>
            <button class="btn-run" (click)="runHomework()" [disabled]="loading()">
              {{ loading() ? '...' : '▶ Run' }}
            </button>
          </div>
        </div>

        @if (loading()) { <app-loading /> }
        @else if (data()) {
          <div class="stat-cards">
            <div class="stat-card"><div class="sc-num">{{ data().totalHomework }}</div><div class="sc-label">Assignments</div></div>
            <div class="stat-card blue"><div class="sc-num">{{ data().totalStudents }}</div><div class="sc-label">Students</div></div>
            <div class="stat-card green"><div class="sc-num">{{ avgSubmission() }}%</div><div class="sc-label">Avg Submission</div></div>
          </div>
          <div class="report-meta">
            {{ data().className }} {{ data().section }}
            <div class="report-actions">
              <button class="btn-print" onclick="window.print()">🖨 Print</button>
              <button class="btn-pdf" (click)="downloadHomeworkPdf()" [disabled]="pdfLoading()">
                {{ pdfLoading() ? '...' : '⬇ PDF' }}
              </button>
            </div>
          </div>
          <div class="card">
            <table class="table">
              <thead>
                <tr>
                  <th>#</th><th>Title</th><th>Subject</th><th>Teacher</th>
                  <th>Assigned</th><th>Due</th>
                  <th class="center">Submitted</th><th class="center">Reviewed</th>
                  <th class="center">Pending</th><th class="center">Rate</th>
                </tr>
              </thead>
              <tbody>
                @for (h of data().homework; track h.homeworkId; let i = $index) {
                  <tr>
                    <td class="row-num">{{ i + 1 }}</td>
                    <td><strong>{{ h.title }}</strong></td>
                    <td><span class="subject-chip">{{ h.subjectName }}</span></td>
                    <td>{{ h.teacherName }}</td>
                    <td>{{ h.assignedDate }}</td>
                    <td [class.red-text]="isPastDue(h.dueDate)">{{ h.dueDate }}</td>
                    <td class="center green-text"><strong>{{ h.submitted }}</strong></td>
                    <td class="center orange-text">{{ h.reviewed }}</td>
                    <td class="center grey-text">{{ h.pending }}</td>
                    <td class="center">
                      <div class="pct-wrap">
                        <div class="pct-bar" [style.width.%]="h.submissionPercent"
                             [class.low]="h.submissionPercent < 50"></div>
                        <span>{{ h.submissionPercent }}%</span>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    }

    <!-- ═══════════════════════════════════════════════════════════════════════
         TAB 6 — Teacher Workload
         ═══════════════════════════════════════════════════════════════════════ -->
    @if (activeTab() === 'workload') {
      <div class="report-panel">
        <div class="query-card card">
          <h4>Parameters</h4>
          <div class="params-row">
            <div class="field">
              <label>Academic Year *</label>
              <select [(ngModel)]="p.yearId">
                <option [ngValue]="null">Select</option>
                @for (y of years(); track y.academicYearId) { <option [ngValue]="y.academicYearId">{{ y.yearLabel }}</option> }
              </select>
            </div>
            <button class="btn-run" (click)="runWorkload()" [disabled]="loading()">
              {{ loading() ? '...' : '▶ Run' }}
            </button>
          </div>
        </div>

        @if (loading()) { <app-loading /> }
        @else if (data()) {
          <div class="stat-cards">
            <div class="stat-card"><div class="sc-num">{{ data().teachers.length }}</div><div class="sc-label">Teachers</div></div>
            <div class="stat-card blue">
              <div class="sc-num">{{ totalPeriods() }}</div>
              <div class="sc-label">Total Periods/Week</div>
            </div>
          </div>
          <div class="report-meta">
            {{ data().academicYearLabel }}
            <div class="report-actions">
              <button class="btn-print" onclick="window.print()">🖨 Print</button>
              <button class="btn-pdf" (click)="downloadWorkloadPdf()" [disabled]="pdfLoading()">
                {{ pdfLoading() ? '...' : '⬇ PDF' }}
              </button>
            </div>
          </div>
          <div class="card">
            <table class="table">
              <thead>
                <tr>
                  <th>#</th><th>Teacher</th><th>Email</th>
                  <th class="center">Periods / Week</th>
                  <th class="center">Homework Assigned</th>
                  <th>Classes Teaching</th>
                </tr>
              </thead>
              <tbody>
                @for (t of data().teachers; track t.teacherId; let i = $index) {
                  <tr>
                    <td class="row-num">{{ i + 1 }}</td>
                    <td><strong>{{ t.teacherName }}</strong></td>
                    <td class="grey-text">{{ t.email }}</td>
                    <td class="center">
                      <span class="period-badge">{{ t.timetablePeriodsPerWeek }}</span>
                    </td>
                    <td class="center">{{ t.homeworkAssigned }}</td>
                    <td>
                      <div class="class-tags">
                        @for (cls of t.classesTeaching; track cls) {
                          <span class="class-tag">{{ cls }}</span>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    /* Tab nav */
    .tab-nav {
      display:flex; flex-wrap:wrap; gap:2px; padding:8px;
      margin-bottom:24px;
    }
    .tab-nav button {
      display:flex; flex-direction:column; align-items:center; gap:4px;
      padding:10px 18px; border:1px solid var(--border); border-radius:8px;
      background:var(--surface-2); cursor:pointer; font-size:12px; color:var(--t3);
      transition:all .15s; min-width:100px; font-family:inherit;
    }
    .tab-nav button.active {
      background:var(--accent); color:#fff; border-color:var(--accent);
    }
    .tab-icon { font-size:20px; }
    .tab-label { font-weight:600; white-space:nowrap; }

    /* Query card */
    .report-panel { display:flex; flex-direction:column; gap:20px; }
    .query-card { padding:18px 20px; }
    .query-card h4 { color:var(--t2); font-size:13px; text-transform:uppercase; letter-spacing:.6px; margin-bottom:14px; }
    .params-row { display:flex; gap:12px; flex-wrap:wrap; align-items:flex-end; }
    .field { display:flex; flex-direction:column; gap:5px; }
    label { font-size:11px; font-weight:600; color:var(--t3); text-transform:uppercase; letter-spacing:.4px; }
    select, input[type=date], input[type=number] {
      padding:8px 12px; border:1.5px solid var(--border); border-radius:6px; font-size:13px;
      background:var(--surface); color:var(--t1); font-family:inherit;
    }
    .btn-run {
      padding:9px 22px; background:var(--accent); color:#fff; border:none;
      border-radius:7px; cursor:pointer; font-size:13.5px; font-weight:700;
      align-self:flex-end; transition:background .15s; font-family:inherit;
    }
    .btn-run:hover:not(:disabled) { background:var(--accent-h); }
    .btn-run:disabled { opacity:.5; cursor:not-allowed; }
    .report-actions { display:flex; gap:8px; align-items:center; }
    .btn-pdf {
      padding:6px 16px; background:#dc2626; color:#fff; border:none;
      border-radius:7px; cursor:pointer; font-size:12.5px; font-weight:700;
      transition:background .15s; font-family:inherit;
    }
    .btn-pdf:hover:not(:disabled) { background:#b91c1c; }
    .btn-pdf:disabled { opacity:.5; cursor:not-allowed; }

    /* Stat cards */
    .stat-cards { display:flex; gap:14px; flex-wrap:wrap; }
    .stat-card {
      background:var(--surface); border-radius:10px; padding:16px 24px;
      box-shadow:var(--sh); display:flex;
      flex-direction:column; align-items:center; gap:4px; min-width:100px;
    }
    .sc-num { font-size:30px; font-weight:800; color:var(--accent); line-height:1; }
    .sc-label { font-size:12px; color:var(--t4); }
    .stat-card.green { border-top:3px solid var(--green); }
    .stat-card.green .sc-num { color:var(--green); }
    .stat-card.red   { border-top:3px solid var(--red); }
    .stat-card.red .sc-num   { color:var(--red); }
    .stat-card.orange { border-top:3px solid var(--amber); }
    .stat-card.orange .sc-num { color:var(--amber); }
    .stat-card.grey  { border-top:3px solid var(--t4); }
    .stat-card.grey .sc-num  { color:var(--t4); }
    .stat-card.blue  { border-top:3px solid var(--accent); }
    .stat-card.blue .sc-num  { color:var(--accent); }

    /* Report meta row */
    .report-meta {
      display:flex; justify-content:space-between; align-items:center;
      color:var(--t3); font-size:13px; padding:10px 0;
    }
    .btn-print {
      padding:6px 14px; border:1px solid var(--border); border-radius:6px;
      background:var(--surface-2); cursor:pointer; font-size:12px; color:var(--t2); font-family:inherit;
    }

    /* Period block */
    .period-block { padding:0; overflow:hidden; margin:0; }
    .period-header { background:var(--accent); color:#fff; padding:10px 16px; font-weight:700; font-size:13.5px; }

    /* Status pills */
    .status-pill { padding:3px 10px; border-radius:12px; font-size:12px; font-weight:600; }
    .status-pill.present, .status-pill.active { background:var(--green-s); color:var(--green); }
    .status-pill.absent  { background:var(--red-s); color:var(--red); }
    .status-pill.late    { background:var(--amber-s); color:var(--amber); }
    .status-pill.not-marked { background:var(--surface-2); color:var(--t4); }
    .status-pill.withdrawn  { background:var(--red-s); color:var(--red); }
    .status-pill.promoted   { background:var(--accent-s); color:var(--accent); }

    /* Shared table helpers */
    .row-num { color:var(--t4); font-size:12px; width:32px; }
    .center { text-align:center; }
    .green-text  { color:var(--green); font-weight:600; }
    .red-text    { color:var(--red); font-weight:600; }
    .orange-text { color:var(--amber); font-weight:600; }
    .grey-text   { color:var(--t4); }

    /* Progress bar */
    .pct-wrap { display:flex; align-items:center; gap:8px; }
    .pct-bar { height:8px; background:var(--green); border-radius:4px; min-width:4px; max-width:80px; transition:width .3s; }
    .pct-bar.low { background:var(--red); }
    .low-pct { color:var(--red); font-weight:700; }

    /* Monthly */
    .threshold-note { font-size:12px; color:var(--amber); padding:6px 0; }
    .low-attend td { background:var(--red-s); }

    /* Student header */
    .student-header { display:flex; align-items:center; gap:20px; padding:20px 24px; flex-wrap:wrap; }
    .stu-avatar {
      width:60px; height:60px; border-radius:50%; background:var(--accent); color:#fff;
      display:flex; align-items:center; justify-content:center; font-size:20px; font-weight:700; flex-shrink:0;
    }
    .stu-info h3 { color:var(--t1); font-size:18px; }
    .stu-info p  { color:var(--t4); font-size:13px; margin-top:4px; }
    .stu-stats { display:flex; gap:12px; margin-left:auto; flex-wrap:wrap; }
    .stu-stats .stat-card { min-width:80px; padding:12px 16px; }
    .stu-stats .sc-num { font-size:22px; }

    /* Enrollment */
    .class-block { padding:0; overflow:hidden; }
    .class-header { display:flex; justify-content:space-between; align-items:center;
      padding:12px 16px; background:var(--surface-2); border-bottom:1px solid var(--border); }
    .class-counts { display:flex; gap:8px; flex-wrap:wrap; }
    .count-pill { padding:3px 10px; border-radius:10px; font-size:12px; font-weight:600; }
    .count-pill.green { background:var(--green-s); color:var(--green); }
    .count-pill.red   { background:var(--red-s); color:var(--red); }
    .count-pill.blue  { background:var(--accent-s); color:var(--accent); }
    .count-pill.grey  { background:var(--surface-2); color:var(--t4); }

    /* Homework */
    .subject-chip { padding:2px 8px; background:var(--accent-s); color:var(--accent); border-radius:8px; font-size:11px; font-weight:600; }

    /* Workload */
    .period-badge { padding:4px 12px; background:var(--accent-s); color:var(--accent); border-radius:10px; font-weight:700; font-size:13px; }
    .class-tags { display:flex; gap:6px; flex-wrap:wrap; }
    .class-tag { padding:2px 8px; background:var(--surface-2); border-radius:6px; font-size:12px; color:var(--t3); }

    /* Print */
    @media print {
      .tab-nav, .query-card, .btn-print { display:none !important; }
      .report-panel { gap:12px; }
      .stat-cards { break-inside:avoid; }
      .class-block, .period-block { break-inside:avoid; }
    }
  `]
})
export class ReportsComponent implements OnInit {
  private reportSvc   = inject(ReportService);
  private academicSvc = inject(AcademicService);

  activeTab  = signal<Tab>('daily');
  years      = signal<AcademicYear[]>([]);
  classes    = signal<ClassDto[]>([]);
  loading    = signal(false);
  pdfLoading = signal(false);
  data       = signal<any>(null);

  // Shared params object — cleared on tab switch
  p = this.freshParams();

  readonly tabs = [
    { id: 'daily' as Tab,      icon: '📅', label: 'Daily Attendance' },
    { id: 'monthly' as Tab,    icon: '📆', label: 'Monthly Attendance' },
    { id: 'student' as Tab,    icon: '👤', label: 'Student Report' },
    { id: 'enrollment' as Tab, icon: '👨‍🎓', label: 'Enrollment' },
    { id: 'homework' as Tab,   icon: '📝', label: 'Homework' },
    { id: 'workload' as Tab,   icon: '👨‍🏫', label: 'Teacher Workload' }
  ];

  readonly months = [
    {v:1,l:'January'},{v:2,l:'February'},{v:3,l:'March'},{v:4,l:'April'},
    {v:5,l:'May'},{v:6,l:'June'},{v:7,l:'July'},{v:8,l:'August'},
    {v:9,l:'September'},{v:10,l:'October'},{v:11,l:'November'},{v:12,l:'December'}
  ];

  ngOnInit() {
    this.academicSvc.getYears().subscribe(y => {
      this.years.set(y);
      // Pre-load classes for convenience
      this.academicSvc.getClasses().subscribe(c => this.classes.set(c));
    });
  }

  switchTab(t: Tab) {
    this.activeTab.set(t);
    this.data.set(null);
    this.p = this.freshParams();
  }

  loadClasses() {
    if (this.p.yearId) this.academicSvc.getClasses(this.p.yearId).subscribe(c => this.classes.set(c));
    else this.academicSvc.getClasses().subscribe(c => this.classes.set(c));
    this.p.classId = null;
  }

  // ── Runners ─────────────────────────────────────────────────────────────────
  runDaily() {
    if (!this.p.classId || !this.p.date1) return;
    this.run(() => this.reportSvc.attendanceDaily(this.p.classId!, this.p.date1));
  }

  runMonthly() {
    if (!this.p.classId) return;
    this.run(() => this.reportSvc.attendanceMonthly(this.p.classId!, this.p.month, this.p.year));
  }

  runStudent() {
    if (!this.p.studentId) return;
    this.run(() => this.reportSvc.studentAttendance(this.p.studentId!, this.p.from || undefined, this.p.to || undefined));
  }

  runEnrollment() {
    if (!this.p.yearId) return;
    this.run(() => this.reportSvc.enrollment(this.p.yearId!));
  }

  runHomework() {
    if (!this.p.classId) return;
    this.run(() => this.reportSvc.homeworkReport(this.p.classId!, this.p.from || undefined, this.p.to || undefined));
  }

  runWorkload() {
    if (!this.p.yearId) return;
    this.run(() => this.reportSvc.teacherWorkload(this.p.yearId!));
  }

  private run(fn: () => any) {
    this.loading.set(true); this.data.set(null);
    fn().subscribe({
      next: (d: any) => { this.data.set(d); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  // ── Computed helpers ─────────────────────────────────────────────────────────
  statusClass(s: string): string {
    const m: Record<string, string> = {
      present: 'present', absent: 'absent', late: 'late',
      'not marked': 'not-marked', active: 'active',
      withdrawn: 'withdrawn', promoted: 'promoted'
    };
    return m[s?.toLowerCase()] ?? '';
  }

  monthName(n: number): string {
    return this.months.find(m => m.v === n)?.l ?? String(n);
  }

  initials(name: string): string {
    return (name ?? '').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  isPastDue(d: string): boolean { return new Date(d) < new Date(new Date().toDateString()); }

  avgSubmission(): number {
    const hw = this.data()?.homework as any[] | undefined;
    if (!hw?.length) return 0;
    return Math.round(hw.reduce((s, h) => s + h.submissionPercent, 0) / hw.length);
  }

  totalPeriods(): number {
    const t = this.data()?.teachers as any[] | undefined;
    if (!t?.length) return 0;
    return t.reduce((s, t) => s + t.timetablePeriodsPerWeek, 0);
  }

  // ── PDF Downloads ────────────────────────────────────────────────────────────
  downloadDailyPdf() {
    if (!this.p.classId || !this.p.date1) return;
    this.pdf(() => this.reportSvc.downloadDailyPdf(this.p.classId!, this.p.date1),
      `attendance-daily-${this.p.date1}.pdf`);
  }

  downloadMonthlyPdf() {
    if (!this.p.classId) return;
    this.pdf(() => this.reportSvc.downloadMonthlyPdf(this.p.classId!, this.p.month, this.p.year),
      `attendance-monthly-${this.p.year}-${String(this.p.month).padStart(2,'0')}.pdf`);
  }

  downloadStudentPdf() {
    if (!this.p.studentId) return;
    this.pdf(() => this.reportSvc.downloadStudentPdf(this.p.studentId!, this.p.from || undefined, this.p.to || undefined),
      `student-attendance-${this.p.studentId}.pdf`);
  }

  downloadEnrollmentPdf() {
    if (!this.p.yearId) return;
    this.pdf(() => this.reportSvc.downloadEnrollmentPdf(this.p.yearId!),
      `enrollment-${this.p.yearId}.pdf`);
  }

  downloadHomeworkPdf() {
    if (!this.p.classId) return;
    this.pdf(() => this.reportSvc.downloadHomeworkPdf(this.p.classId!, this.p.from || undefined, this.p.to || undefined),
      `homework-class-${this.p.classId}.pdf`);
  }

  downloadWorkloadPdf() {
    if (!this.p.yearId) return;
    this.pdf(() => this.reportSvc.downloadWorkloadPdf(this.p.yearId!),
      `teacher-workload-${this.p.yearId}.pdf`);
  }

  private pdf(fn: () => any, filename: string) {
    this.pdfLoading.set(true);
    fn().subscribe({
      next: (blob: Blob) => { this.reportSvc.savePdf(blob, filename); this.pdfLoading.set(false); },
      error: () => this.pdfLoading.set(false)
    });
  }

  private freshParams() {
    return {
      yearId: null as number | null,
      classId: null as number | null,
      studentId: null as number | null,
      date1: new Date().toISOString().slice(0, 10),
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      from: '',
      to: ''
    };
  }
}
