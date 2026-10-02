import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CurriculumService } from '../../../core/services/curriculum.service';
import { AssessmentService } from '../../../core/services/assessment.service';
import { MenuService } from '../../../core/services/menu.service';
import {
  CourseTopicDto,
  TeachingLogDto,
  TopicProgressStatus
} from '../../../core/models/curriculum.model';
import {
  AssessmentResultLookupDto,
  ClassAssessmentDto,
  ClassRosterStudentDto,
  StudentTopicPerformanceDto
} from '../../../core/models/assessment.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';
import { OsSelectComponent, OsSelectOption } from '../../../shared/components/os-select/os-select.component';
import { RichContentViewComponent } from '../../../shared/rich-content/rich-content-view.component';
import {
  activityTypeLabel,
  materialTypeLabel,
  progressLabel,
  teachingHistoryLine
} from '../curriculum-ui.util';
import { environment } from '../../../../environments/environment';

type Tab = 'content' | 'materials' | 'activities' | 'history';
type Panel = null | 'teaching' | 'homework' | 'quiz' | 'quizResults' | 'sabaq';
type HistoryTab = 'teaching' | 'assessments' | 'sabaq';

interface RosterResultRow {
  studentId: number;
  studentName: string;
  admissionNo: string;
  obtainedMarks: number | null;
  status: string | null;
  remarks: string;
}

interface SabaqRow {
  studentId: number;
  studentName: string;
  admissionNo: string;
  resultStatus: string;
  remarks: string;
}

@Component({
  selector: 'app-topic-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule, PageHeaderComponent, LoadingComponent,
    DatePickerComponent, OsSelectComponent, RichContentViewComponent
  ],
  template: `
    <div class="os-page compact">
      <app-page-header [dense]="true" [title]="pageTitle()">
        <button type="button" class="btn-secondary" (click)="goBack()">Back</button>
      </app-page-header>

      @if (loading()) { <app-loading /> }
      @else if (topic(); as t) {
        <div class="status-line">
          <span class="status-label">Status:</span>
          <span class="prog">{{ progressLabel(t.progressStatus) }}</span>
          @if (t.progressStatus === 'Completed' && t.completedByTeacherName) {
            <span class="muted">· completed by {{ t.completedByTeacherName }}
              @if (t.completedAt) { on {{ t.completedAt | date:'mediumDate' }} }</span>
          }
        </div>

        <div class="cta-bar">
          <button type="button" class="btn-primary" (click)="openTeaching()" [disabled]="busy()">
            Continue Teaching
          </button>
          <button type="button" class="btn-secondary" (click)="openQuiz()" [disabled]="busy()">
            Record Quiz / Class Test
          </button>
          <button type="button" class="btn-secondary" (click)="openSabaq()" [disabled]="busy()">
            Record Oral Assessment
          </button>
          @if (t.progressStatus !== 'Completed') {
            <button type="button" class="btn-secondary" (click)="markCompleted()" [disabled]="busy()">
              Mark Completed
            </button>
          }
          <button type="button" class="btn-secondary" (click)="openHomework()">Add Homework</button>
        </div>

        <div class="tabs" role="tablist">
          <button type="button" class="tab" [class.active]="tab() === 'content'" (click)="tab.set('content')">Content</button>
          <button type="button" class="tab" [class.active]="tab() === 'materials'" (click)="tab.set('materials')">
            Materials @if (t.materials.length) { <span class="count">{{ t.materials.length }}</span> }
          </button>
          <button type="button" class="tab" [class.active]="tab() === 'activities'" (click)="tab.set('activities')">
            Activities @if (t.activities.length) { <span class="count">{{ t.activities.length }}</span> }
          </button>
          <button type="button" class="tab" [class.active]="tab() === 'history'" (click)="tab.set('history')">
            History
          </button>
        </div>

        @if (error()) { <div class="os-error">{{ error() }}</div> }

        @if (tab() === 'content') {
          <div class="lesson">
            <app-rich-content-view [html]="t.description" emptyText="No lesson content for this topic yet." />
          </div>
        }

        @if (tab() === 'materials') {
          <div class="panel-block">
            @if (!t.materials.length) {
              <div class="empty">No materials attached.</div>
            } @else {
              @for (m of t.materials; track m.courseMaterialId) {
                <div class="mat-row">
                  <span class="chip">{{ matLabel(m.materialType) }}</span>
                  <span class="grow">{{ m.title }}</span>
                  @if (m.fileStoreId) {
                    <a [href]="fileUrl(m.fileStoreId)" target="_blank" rel="noopener">Open</a>
                  } @else if (m.url) {
                    <a [href]="m.url" target="_blank" rel="noopener">Open</a>
                  }
                </div>
              }
            }
          </div>
        }

        @if (tab() === 'activities') {
          <div class="panel-block">
            @if (!t.activities.length) {
              <div class="empty">No activities for this topic.</div>
            } @else {
              @for (a of t.activities; track a.courseTopicActivityId) {
                <div class="act-card">
                  <div class="act-top">
                    <span class="chip act">{{ actLabel(a.activityType) }}</span>
                    <strong>{{ a.title }}</strong>
                  </div>
                  @if (a.instructionText) { <div class="instr">{{ a.instructionText }}</div> }
                  <div class="act-media">
                    @if (a.referenceImageFileId) {
                      <img [src]="fileUrl(a.referenceImageFileId)" [alt]="a.referenceImageName || 'Reference'" />
                    }
                    @if (a.exampleImageFileId) {
                      <img [src]="fileUrl(a.exampleImageFileId)" [alt]="a.exampleImageName || 'Example'" />
                    }
                    @if (a.worksheetFileId) {
                      <a [href]="fileUrl(a.worksheetFileId)" target="_blank" rel="noopener">
                        {{ a.worksheetFileName || 'Worksheet' }}
                      </a>
                    }
                  </div>
                </div>
              }
            }
          </div>
        }

        @if (tab() === 'history') {
          <div class="hist-tabs">
            <button type="button" [class.active]="historyTab() === 'teaching'" (click)="historyTab.set('teaching')">Teaching</button>
            <button type="button" [class.active]="historyTab() === 'assessments'" (click)="historyTab.set('assessments')">
              Class Assessments ({{ assessments().length }})
            </button>
            <button type="button" [class.active]="historyTab() === 'sabaq'" (click)="historyTab.set('sabaq')">
              Oral Assessments ({{ performances().length }})
            </button>
          </div>

          @if (historyTab() === 'teaching') {
            <div class="panel-block compact-list">
              @if (!historyLogs().length) {
                <div class="empty">No teaching recorded yet.</div>
              } @else {
                @for (l of historyLogs(); track l.courseTeachingLogId) {
                  <div class="history-line">{{ historyLine(l) }}</div>
                }
              }
            </div>
          }

          @if (historyTab() === 'assessments') {
            <div class="panel-block compact-list">
              @if (!assessments().length) {
                <div class="empty">No class assessments yet.</div>
              } @else {
                @for (a of assessments(); track a.classAssessmentId) {
                  <div class="hist-row">
                    <div class="hist-main">
                      <strong>{{ a.assessmentDate | date:'mediumDate' }}</strong>
                      <span class="chip">{{ assessmentTypeLabel(a.assessmentType) }}</span>
                      <span>{{ a.title }}</span>
                    </div>
                    <div class="muted">{{ a.teacherName }} · {{ a.resultCount }} results
                      <button type="button" class="link-quiet" (click)="openQuizResults(a.classAssessmentId)">Enter results</button>
                    </div>
                  </div>
                }
              }
            </div>
          }

          @if (historyTab() === 'sabaq') {
            <div class="panel-block compact-list">
              @if (!performances().length) {
                <div class="empty">No oral assessments recorded yet.</div>
              } @else {
                @for (p of performances(); track p.studentTopicPerformanceId) {
                  <div class="hist-row">
                    <div class="hist-main">
                      <strong>{{ p.studentName }}</strong>
                      <span>{{ p.performanceDate | date:'mediumDate' }}</span>
                      <span class="chip">{{ resultLabel(p.resultStatus, p.resultStatusLabelEn) }}</span>
                    </div>
                    <div class="muted">{{ p.teacherName }}@if (p.remarks) { · {{ p.remarks }} }</div>
                  </div>
                }
              }
            </div>
          }
        }
      }
    </div>

    @if (panel() === 'teaching') {
      <div class="sheet-backdrop" (click)="panel.set(null)">
        <div class="sheet" (click)="$event.stopPropagation()">
          <h3>Continue Teaching</h3>
          <p class="muted sheet-sub">Adds a classroom record for this date. Does not mark the topic completed.</p>
          <div class="os-field">
            <label class="os-field-label">Date</label>
            <app-date-picker [(ngModel)]="teachingDate" />
          </div>
          <div class="os-field">
            <label class="os-field-label">Type</label>
            <app-os-select [options]="typeOptions" [value]="teachingType" (valueChange)="onTeachingType($event)" />
          </div>
          <div class="os-field">
            <label class="os-field-label">Remarks</label>
            <textarea class="os-textarea" rows="2" [(ngModel)]="remarks" placeholder="What was taught today?"></textarea>
          </div>
          <div class="os-field">
            <label class="os-field-label">Extra notes</label>
            <textarea class="os-textarea" rows="2" [(ngModel)]="extraNotes"></textarea>
          </div>
          @if (teachError()) { <div class="os-error">{{ teachError() }}</div> }
          <div class="sheet-actions">
            <button type="button" class="btn-secondary" (click)="panel.set(null)">Cancel</button>
            <button type="button" class="btn-primary" [disabled]="busy()" (click)="saveTeaching(false)">Save</button>
            <button type="button" class="btn-secondary" [disabled]="busy()" (click)="saveTeaching(true)">Save + Homework</button>
          </div>
        </div>
      </div>
    }

    @if (panel() === 'homework') {
      <div class="sheet-backdrop" (click)="panel.set(null)">
        <div class="sheet" (click)="$event.stopPropagation()">
          <h3>Add Homework</h3>
          <p class="muted sheet-sub">Linked to this topic. A teaching record is created if needed.</p>
          <div class="os-field">
            <label class="os-field-label">Title *</label>
            <input class="os-input" [(ngModel)]="hwTitle" />
          </div>
          <div class="os-field">
            <label class="os-field-label">Description</label>
            <textarea class="os-textarea" rows="2" [(ngModel)]="hwDesc"></textarea>
          </div>
          <div class="form-row">
            <div class="os-field">
              <label class="os-field-label">Assigned</label>
              <app-date-picker [(ngModel)]="hwAssigned" />
            </div>
            <div class="os-field">
              <label class="os-field-label">Due</label>
              <app-date-picker [(ngModel)]="hwDue" />
            </div>
          </div>
          @if (hwError()) { <div class="os-error">{{ hwError() }}</div> }
          <div class="sheet-actions">
            <button type="button" class="btn-secondary" (click)="panel.set(null)">Cancel</button>
            <button type="button" class="btn-primary" [disabled]="busy()" (click)="createHomework()">Create Homework</button>
          </div>
        </div>
      </div>
    }

    @if (panel() === 'quiz') {
      <div class="sheet-backdrop" (click)="panel.set(null)">
        <div class="sheet" (click)="$event.stopPropagation()">
          <h3>Record Quiz / Class Test</h3>
          <p class="muted sheet-sub">Class assessment — separate from formal exams. Results optional.</p>
          <div class="os-field">
            <label class="os-field-label">Date</label>
            <app-date-picker [(ngModel)]="quizDate" />
          </div>
          <div class="os-field">
            <label class="os-field-label">Type</label>
            <app-os-select [options]="quizTypeOptions" [value]="quizType" (valueChange)="onQuizType($event)" />
          </div>
          <div class="os-field">
            <label class="os-field-label">Title *</label>
            <input class="os-input" [(ngModel)]="quizTitle" />
          </div>
          <div class="form-row">
            <div class="os-field">
              <label class="os-field-label">Questions</label>
              <input class="os-input" type="number" [(ngModel)]="quizQuestions" />
            </div>
            <div class="os-field">
              <label class="os-field-label">Total marks</label>
              <input class="os-input" type="number" [(ngModel)]="quizMarks" />
            </div>
          </div>
          <div class="os-field">
            <label class="os-field-label">Notes</label>
            <textarea class="os-textarea" rows="2" [(ngModel)]="quizNotes"></textarea>
          </div>
          @if (quizError()) { <div class="os-error">{{ quizError() }}</div> }
          <div class="sheet-actions">
            <button type="button" class="btn-secondary" (click)="panel.set(null)">Cancel</button>
            <button type="button" class="btn-primary" [disabled]="busy()" (click)="saveQuiz(false)">Save</button>
            <button type="button" class="btn-secondary" [disabled]="busy()" (click)="saveQuiz(true)">Save + Results</button>
          </div>
        </div>
      </div>
    }

    @if (panel() === 'quizResults') {
      <div class="sheet-backdrop" (click)="panel.set(null)">
        <div class="sheet sheet-wide" (click)="$event.stopPropagation()">
          <h3>Enter Student Results</h3>
          <p class="muted sheet-sub">{{ activeAssessment()?.title }} · {{ activeAssessment()?.assessmentDate }}</p>
          <div class="roster">
            @for (row of quizRows; track row.studentId) {
              <div class="roster-card">
                <div class="roster-name">{{ row.studentName }} <span class="muted">{{ row.admissionNo }}</span></div>
                <div class="roster-fields">
                  <input class="os-input marks" type="number" placeholder="Marks" [(ngModel)]="row.obtainedMarks" />
                  <select class="os-input status-sel" [(ngModel)]="row.status">
                    <option [ngValue]="null">Assessment Result</option>
                    @for (lk of lookups(); track lk.code) {
                      <option [ngValue]="lk.code">{{ resultLabel(lk.code, lk.labelEn) }}</option>
                    }
                  </select>
                  <input class="os-input" placeholder="Remarks" [(ngModel)]="row.remarks" />
                </div>
              </div>
            }
          </div>
          @if (quizError()) { <div class="os-error">{{ quizError() }}</div> }
          <div class="sheet-actions">
            <button type="button" class="btn-secondary" (click)="panel.set(null)">Close</button>
            <button type="button" class="btn-primary" [disabled]="busy()" (click)="saveQuizResults()">Save Results</button>
          </div>
        </div>
      </div>
    }

    @if (panel() === 'sabaq') {
      <div class="sheet-backdrop" (click)="panel.set(null)">
        <div class="sheet sheet-wide" (click)="$event.stopPropagation()">
          <h3>Record Oral Assessment</h3>
          <p class="muted sheet-sub">Record each student's oral performance for this topic. Previous history is never overwritten.</p>
          <div class="os-field">
            <label class="os-field-label">Assessment Date</label>
            <app-date-picker [(ngModel)]="sabaqDate" />
          </div>
          <div class="default-row">
            <span class="muted">Set all to:</span>
            @for (lk of lookups(); track lk.code) {
              <button type="button" class="chip-btn" (click)="setAllSabaq(lk.code)">{{ resultLabel(lk.code, lk.labelEn) }}</button>
            }
          </div>
          <div class="roster">
            @for (row of sabaqRows; track row.studentId) {
              <div class="roster-card">
                <div class="roster-name">{{ row.studentName }}</div>
                <div class="status-chips">
                  @for (lk of lookups(); track lk.code) {
                    <button type="button" class="chip-btn"
                            [class.on]="row.resultStatus === lk.code"
                            (click)="row.resultStatus = lk.code">{{ resultLabel(lk.code, lk.labelEn) }}</button>
                  }
                </div>
                <input class="os-input" placeholder="Remarks" [(ngModel)]="row.remarks" />
              </div>
            }
          </div>
          @if (sabaqError()) { <div class="os-error">{{ sabaqError() }}</div> }
          <div class="sheet-actions">
            <button type="button" class="btn-secondary" (click)="panel.set(null)">Cancel</button>
            <button type="button" class="btn-primary" [disabled]="busy()" (click)="saveSabaq()">Save All</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .status-line {
      display: flex; flex-wrap: wrap; gap: .5rem; align-items: center;
      margin: -.15rem 0 .75rem; font-size: .88rem;
    }
    .status-label { color: #64748b; font-size: .88rem; }
    .prog { font-weight: 700; color: #334155; }
    .history-line { font-size: .88rem; color: #334155; padding: .35rem 0; border-top: 1px solid #f1f5f9; }
    .history-line:first-of-type { border-top: none; padding-top: 0; }
    .muted { color: #6b7280; font-size: .85rem; }
    .os-error { color: #b91c1c; margin: .5rem 0; font-size: .85rem; }
    .cta-bar {
      display: flex; flex-wrap: wrap; gap: .5rem; align-items: center;
      margin-bottom: .85rem;
    }
    .link-quiet {
      background: none; border: none; color: #64748b; font: inherit; font-size: .82rem;
      cursor: pointer; text-decoration: underline; padding: .25rem;
    }
    .tabs {
      display: flex; gap: .15rem; border-bottom: 1px solid #e5e7eb; margin-bottom: .85rem;
      overflow-x: auto;
    }
    .tab {
      background: none; border: none; border-bottom: 2px solid transparent;
      padding: .55rem .85rem; font: inherit; font-size: .88rem; font-weight: 600;
      color: #64748b; cursor: pointer; white-space: nowrap;
    }
    .tab.active { color: #1d4ed8; border-bottom-color: #2563eb; }
    .hist-tabs {
      display: flex; gap: .35rem; flex-wrap: wrap; margin-bottom: .65rem;
    }
    .hist-tabs button {
      border: 1px solid #e2e8f0; background: #fff; border-radius: 999px;
      padding: .28rem .7rem; font: inherit; font-size: .78rem; cursor: pointer; color: #475569;
    }
    .hist-tabs button.active { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; font-weight: 700; }
    .count {
      display: inline-block; margin-left: .25rem; font-size: .7rem;
      background: #e2e8f0; color: #475569; padding: .05rem .35rem; border-radius: 999px;
    }
    .lesson {
      background: #fff; border: 1px solid #e5e7eb; border-radius: 12px;
      padding: 1.1rem 1.25rem; min-height: 120px;
    }
    .panel-block {
      background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: .85rem 1rem;
    }
    .compact-list .hist-row { padding: .4rem 0; border-top: 1px solid #f1f5f9; font-size: .88rem; }
    .compact-list .hist-row:first-child { border-top: none; padding-top: 0; }
    .hist-main { display: flex; flex-wrap: wrap; gap: .4rem; align-items: center; }
    .empty { color: #94a3b8; font-size: .9rem; padding: .35rem 0; }
    .mat-row, .act-top {
      display: flex; gap: .5rem; align-items: center; flex-wrap: wrap;
    }
    .mat-row { padding: .45rem 0; border-top: 1px solid #f1f5f9; font-size: .9rem; }
    .mat-row:first-child { border-top: none; }
    .grow { flex: 1; min-width: 0; }
    .chip {
      font-size: .68rem; font-weight: 700; background: #eff6ff; color: #1d4ed8;
      padding: .12rem .4rem; border-radius: 4px;
    }
    .chip.act { background: #fef3c7; color: #92400e; }
    .act-card { padding: .55rem 0; border-top: 1px solid #f1f5f9; }
    .act-card:first-child { border-top: none; padding-top: 0; }
    .instr { font-size: .88rem; margin: .3rem 0; white-space: pre-wrap; }
    .act-media { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: .35rem; }
    .act-media img {
      max-width: 140px; max-height: 100px; object-fit: contain;
      border: 1px solid #e2e8f0; border-radius: 8px; background: #fff;
    }
    .sheet-backdrop {
      position: fixed; inset: 0; background: rgba(15,23,42,.4);
      display: grid; place-items: end center; z-index: 60;
    }
    .sheet {
      background: #fff; width: min(480px, 100vw); max-height: 92vh; overflow: auto;
      border-radius: 16px 16px 0 0; padding: 1.15rem; display: grid; gap: .7rem;
    }
    .sheet-wide { width: min(720px, 100vw); }
    .sheet h3 { margin: 0; font-size: 1.05rem; }
    .sheet-sub { margin: -.35rem 0 0; }
    .sheet .os-input, .os-textarea {
      box-sizing: border-box; width: 100%;
      border: 1px solid #e5e7eb; border-radius: 10px; font: inherit; font-size: 13px;
    }
    .sheet .os-input { height: 36px; padding: 0 10px; font-weight: 600; }
    .os-textarea { min-height: 72px; padding: .55rem .7rem; resize: vertical; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: .65rem; }
    .sheet-actions { display: flex; gap: .5rem; justify-content: flex-end; flex-wrap: wrap; padding-top: .25rem; }
    .roster { display: grid; gap: .55rem; max-height: 55vh; overflow: auto; }
    .roster-card {
      border: 1px solid #eef2f7; border-radius: 10px; padding: .55rem .65rem; background: #fafbfc;
    }
    .roster-name { font-weight: 700; font-size: .88rem; margin-bottom: .35rem; }
    .roster-fields { display: grid; grid-template-columns: 80px 1fr 1.2fr; gap: .4rem; }
    .marks { max-width: 80px; }
    .default-row, .status-chips { display: flex; flex-wrap: wrap; gap: .35rem; align-items: center; margin: .2rem 0 .45rem; }
    .chip-btn {
      border: 1px solid #e2e8f0; background: #fff; border-radius: 999px;
      padding: .22rem .55rem; font: inherit; font-size: .72rem; cursor: pointer; color: #475569;
    }
    .chip-btn.on { background: #dbeafe; border-color: #93c5fd; color: #1e40af; font-weight: 700; }
    @media (min-width: 720px) {
      .sheet-backdrop { place-items: center; padding: 1rem; }
      .sheet, .sheet-wide { border-radius: 12px; }
    }
    @media (max-width: 560px) {
      .cta-bar .btn-primary, .cta-bar .btn-secondary { flex: 1 1 calc(50% - .25rem); }
      .form-row, .roster-fields { grid-template-columns: 1fr; }
    }
  `]
})
export class TopicDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private curriculum = inject(CurriculumService);
  private assessmentsApi = inject(AssessmentService);
  private menuSvc = inject(MenuService);

  topic = signal<CourseTopicDto | null>(null);
  logs = signal<TeachingLogDto[]>([]);
  assessments = signal<ClassAssessmentDto[]>([]);
  performances = signal<StudentTopicPerformanceDto[]>([]);
  lookups = signal<AssessmentResultLookupDto[]>([]);
  activeAssessment = signal<ClassAssessmentDto | null>(null);
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  teachError = signal('');
  hwError = signal('');
  quizError = signal('');
  sabaqError = signal('');
  tab = signal<Tab>('content');
  historyTab = signal<HistoryTab>('teaching');
  panel = signal<Panel>(null);
  lastLogId: number | null = null;

  teachingDate = this.today();
  teachingType: string = 'NewTopic';
  remarks = '';
  extraNotes = '';
  hwTitle = '';
  hwDesc = '';
  hwAssigned = this.today();
  hwDue = this.today();

  quizDate = this.today();
  quizType = 'Quiz';
  quizTitle = '';
  quizQuestions: number | null = null;
  quizMarks: number | null = null;
  quizNotes = '';
  quizRows: RosterResultRow[] = [];

  sabaqDate = this.today();
  sabaqRows: SabaqRow[] = [];

  typeOptions: OsSelectOption<string>[] = [
    { value: 'NewTopic', label: 'New Topic' },
    { value: 'Revision', label: 'Revision' },
    { value: 'Practice', label: 'Practice' },
    { value: 'Assessment', label: 'Assessment' }
  ];
  quizTypeOptions: OsSelectOption<string>[] = [
    { value: 'Quiz', label: 'Quiz' },
    { value: 'ClassTest', label: 'Class Test' },
    { value: 'OralTest', label: 'Oral Assessment' },
    { value: 'Other', label: 'Other' }
  ];

  /** User-facing labels for AssessmentResultLookup codes (codes stay unchanged). */
  private static readonly RESULT_LABELS: Record<string, string> = {
    Remembered: 'Mastered',
    PartiallyRemembered: 'Partially Mastered',
    NotRemembered: 'Needs Improvement',
    NeedsPractice: 'Needs Practice'
  };

  private static readonly ASSESSMENT_TYPE_LABELS: Record<string, string> = {
    Quiz: 'Quiz',
    ClassTest: 'Class Test',
    OralTest: 'Oral Assessment',
    Other: 'Other'
  };

  pageTitle = computed(() => this.topic()?.title || 'Topic');
  historyLogs = computed(() =>
    [...this.logs()].sort((a, b) => a.teachingDate.localeCompare(b.teachingDate))
  );

  progressLabel = progressLabel;
  fileUrl(id: number) { return `${environment.fileServerUrl}/files/${id}`; }
  actLabel(t: string) { return activityTypeLabel(t); }
  matLabel(t: string) { return materialTypeLabel(t); }
  historyLine(l: TeachingLogDto) {
    return teachingHistoryLine(l.teachingDate, l.teacherName, l.teachingType, l.remarks);
  }
  resultLabel(code: string | null | undefined, fallback?: string | null) {
    if (!code) return fallback || '';
    return TopicDetailComponent.RESULT_LABELS[code] || fallback || code;
  }
  assessmentTypeLabel(type: string | null | undefined) {
    if (!type) return '';
    return TopicDetailComponent.ASSESSMENT_TYPE_LABELS[type] || type;
  }

  onTeachingType(v: string | null) { if (v) this.teachingType = v; }
  onQuizType(v: string | null) { if (v) this.quizType = v; }

  ngOnInit() {
    this.menuSvc.ensureLoaded().subscribe();
    this.assessmentsApi.getResultLookups().subscribe({ next: l => this.lookups.set(l), error: () => {} });
    const id = Number(this.route.snapshot.paramMap.get('topicId'));
    if (!id) { this.router.navigate(['/curriculum/my-courses']); return; }
    this.reload(id);
  }

  reload(id?: number) {
    const topicId = id ?? this.topic()?.courseTopicId;
    if (!topicId) return;
    this.loading.set(true);
    this.curriculum.getTopic(topicId).subscribe({
      next: t => {
        if (!t.activities) t.activities = [];
        if (!t.materials) t.materials = [];
        this.topic.set(t);
        this.loading.set(false);
        this.curriculum.getTeaching({ topicId }).subscribe(logs => this.logs.set(logs));
        this.assessmentsApi.listClassAssessments({ topicId }).subscribe({
          next: a => this.assessments.set(a), error: () => this.assessments.set([])
        });
        this.assessmentsApi.listSabaq({ topicId }).subscribe({
          next: p => this.performances.set(p), error: () => this.performances.set([])
        });
      },
      error: () => { this.loading.set(false); this.router.navigate(['/curriculum/my-courses']); }
    });
  }

  markCompleted() { this.setStatus('Completed'); }

  setStatus(status: string) {
    const t = this.topic();
    if (!t || t.progressStatus === status) return;
    this.busy.set(true);
    this.error.set('');
    this.curriculum.updateProgress(t.courseTopicId, { status: status as TopicProgressStatus }).subscribe({
      next: () => { this.busy.set(false); this.reload(); },
      error: err => { this.busy.set(false); this.error.set(err?.error?.error || 'Could not update status'); }
    });
  }

  openTeaching() {
    const t = this.topic();
    this.teachingDate = this.today();
    this.remarks = '';
    this.extraNotes = '';
    this.teachingType = t?.progressStatus === 'Completed' ? 'Revision' : 'NewTopic';
    this.teachError.set('');
    this.panel.set('teaching');
  }

  openHomework() {
    const t = this.topic();
    this.hwTitle = t ? `${t.title} — practice` : '';
    this.hwDesc = '';
    this.hwAssigned = this.teachingDate || this.today();
    this.hwDue = this.hwAssigned;
    this.hwError.set('');
    if (this.logs().length) this.lastLogId = this.logs()[0].courseTeachingLogId;
    this.panel.set('homework');
  }

  openQuiz() {
    const t = this.topic();
    this.quizDate = this.today();
    this.quizType = 'Quiz';
    this.quizTitle = t ? `${t.title} Quiz` : 'Class Quiz';
    this.quizQuestions = 10;
    this.quizMarks = 10;
    this.quizNotes = '';
    this.quizError.set('');
    this.panel.set('quiz');
  }

  openSabaq() {
    const t = this.topic();
    if (!t?.classId || !t.academicYearId) {
      this.error.set('Topic class/year context missing.');
      return;
    }
    this.sabaqDate = this.today();
    this.sabaqError.set('');
    const defaultStatus = this.lookups()[0]?.code || 'Remembered';
    this.assessmentsApi.getRoster(t.classId, t.academicYearId).subscribe({
      next: roster => {
        this.sabaqRows = roster.map(s => ({
          studentId: s.studentId,
          studentName: s.studentName,
          admissionNo: s.admissionNo,
          resultStatus: defaultStatus,
          remarks: ''
        }));
        this.panel.set('sabaq');
      },
      error: err => this.error.set(err?.error?.error || 'Could not load class roster.')
    });
  }

  setAllSabaq(code: string) {
    this.sabaqRows.forEach(r => r.resultStatus = code);
  }

  saveQuiz(thenResults: boolean) {
    const t = this.topic();
    if (!t) return;
    if (!this.quizTitle.trim()) { this.quizError.set('Title is required.'); return; }
    this.busy.set(true);
    this.quizError.set('');
    this.assessmentsApi.createClassAssessment({
      courseTopicId: t.courseTopicId,
      classId: t.classId || 0,
      subjectId: t.subjectId || 0,
      academicYearId: t.academicYearId || 0,
      assessmentDate: this.quizDate,
      title: this.quizTitle.trim(),
      assessmentType: this.quizType,
      totalQuestions: this.quizQuestions,
      totalMarks: this.quizMarks,
      notes: this.quizNotes.trim() || null
    }).subscribe({
      next: a => {
        this.busy.set(false);
        this.reload();
        if (thenResults) this.openQuizResults(a.classAssessmentId);
        else this.panel.set(null);
      },
      error: err => {
        this.busy.set(false);
        this.quizError.set(err?.error?.error || 'Failed to save assessment.');
      }
    });
  }

  openQuizResults(assessmentId: number) {
    const t = this.topic();
    if (!t?.classId || !t.academicYearId) return;
    this.quizError.set('');
    this.assessmentsApi.getClassAssessment(assessmentId).subscribe({
      next: a => {
        this.activeAssessment.set(a);
        this.assessmentsApi.getRoster(t.classId!, t.academicYearId!).subscribe({
          next: roster => {
            const byStudent = new Map(a.results.map(r => [r.studentId, r]));
            this.quizRows = roster.map(s => {
              const existing = byStudent.get(s.studentId);
              return {
                studentId: s.studentId,
                studentName: s.studentName,
                admissionNo: s.admissionNo,
                obtainedMarks: existing?.obtainedMarks ?? null,
                status: existing?.status ?? null,
                remarks: existing?.remarks || ''
              };
            });
            this.panel.set('quizResults');
          },
          error: err => this.quizError.set(err?.error?.error || 'Could not load roster.')
        });
      },
      error: err => this.error.set(err?.error?.error || 'Assessment not found.')
    });
  }

  saveQuizResults() {
    const a = this.activeAssessment();
    if (!a) return;
    this.busy.set(true);
    this.quizError.set('');
    this.assessmentsApi.saveClassResults(a.classAssessmentId, this.quizRows.map(r => ({
      studentId: r.studentId,
      obtainedMarks: r.obtainedMarks,
      status: r.status,
      remarks: r.remarks.trim() || null
    }))).subscribe({
      next: () => { this.busy.set(false); this.panel.set(null); this.reload(); this.tab.set('history'); this.historyTab.set('assessments'); },
      error: err => { this.busy.set(false); this.quizError.set(err?.error?.error || 'Failed to save results.'); }
    });
  }

  saveSabaq() {
    const t = this.topic();
    if (!t) return;
    if (!this.sabaqRows.length) { this.sabaqError.set('No students in roster.'); return; }
    if (this.sabaqRows.some(r => !r.resultStatus)) {
      this.sabaqError.set('Every student needs an assessment result.');
      return;
    }
    this.busy.set(true);
    this.sabaqError.set('');
    this.assessmentsApi.bulkSabaq({
      courseTopicId: t.courseTopicId,
      performanceDate: this.sabaqDate,
      performanceType: 'OralRecitation',
      items: this.sabaqRows.map(r => ({
        studentId: r.studentId,
        resultStatus: r.resultStatus,
        remarks: r.remarks.trim() || null
      }))
    }).subscribe({
      next: () => {
        this.busy.set(false);
        this.panel.set(null);
        this.reload();
        this.tab.set('history');
        this.historyTab.set('sabaq');
      },
      error: err => {
        this.busy.set(false);
        this.sabaqError.set(err?.error?.error || 'Failed to save oral assessment.');
      }
    });
  }

  saveTeaching(thenHomework: boolean) {
    const t = this.topic();
    if (!t) return;
    if (!this.teachingDate) { this.teachError.set('Teaching date is required.'); return; }
    this.busy.set(true);
    this.teachError.set('');
    this.curriculum.createTeaching({
      teachingDate: this.teachingDate,
      courseTopicId: t.courseTopicId,
      teachingType: this.teachingType,
      remarks: this.remarks.trim() || null,
      extraNotes: this.extraNotes.trim() || null
    }).subscribe({
      next: log => {
        this.busy.set(false);
        this.remarks = '';
        this.extraNotes = '';
        this.lastLogId = log.courseTeachingLogId;
        this.reload();
        if (thenHomework) {
          this.hwTitle = `${t.title} — practice`;
          this.hwAssigned = this.teachingDate;
          this.hwDue = this.teachingDate;
          this.panel.set('homework');
        } else {
          this.panel.set(null);
        }
      },
      error: err => {
        this.busy.set(false);
        this.teachError.set(err?.error?.error || 'Failed to save teaching.');
      }
    });
  }

  createHomework() {
    if (!this.hwTitle.trim()) {
      this.hwError.set('Title is required.');
      return;
    }
    const ensureLogThenLink = (logId: number) => {
      this.curriculum.linkHomework(logId, {
        title: this.hwTitle.trim(),
        description: this.hwDesc.trim() || null,
        assignedDate: this.hwAssigned,
        dueDate: this.hwDue
      }).subscribe({
        next: () => {
          this.busy.set(false);
          this.panel.set(null);
          this.reload();
        },
        error: err => {
          this.busy.set(false);
          this.hwError.set(err?.error?.error || 'Failed to create homework.');
        }
      });
    };

    this.busy.set(true);
    if (this.lastLogId) {
      ensureLogThenLink(this.lastLogId);
      return;
    }
    const t = this.topic();
    if (!t) { this.busy.set(false); return; }
    this.curriculum.createTeaching({
      teachingDate: this.hwAssigned || this.today(),
      courseTopicId: t.courseTopicId,
      teachingType: 'Practice',
      remarks: 'Homework assigned',
      extraNotes: null
    }).subscribe({
      next: log => {
        this.lastLogId = log.courseTeachingLogId;
        ensureLogThenLink(log.courseTeachingLogId);
      },
      error: err => {
        this.busy.set(false);
        this.hwError.set(err?.error?.error || 'Could not start homework.');
      }
    });
  }

  goBack() { history.back(); }

  private today(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
