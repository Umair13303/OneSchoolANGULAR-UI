import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CurriculumService } from '../../../core/services/curriculum.service';
import { AssessmentService } from '../../../core/services/assessment.service';
import { AuthService } from '../../../core/services/auth.service';
import { MenuService } from '../../../core/services/menu.service';
import {
  CourseTopicDto,
  TeachingLogDto,
  TopicProgressStatus
} from '../../../core/models/curriculum.model';
import {
  AssessmentResultLookupDto,
  ClassAssessmentDto,
  StudentTopicPerformanceDto
} from '../../../core/models/assessment.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';
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
  marksError?: string;
}

interface SabaqRow {
  studentId: number;
  studentName: string;
  admissionNo: string;
  resultStatus: string;
  /** 0 = unset, 1–5 = classic star rating (maps to resultStatus). */
  stars: number;
  remarks: string;
  showRemark: boolean;
}

@Component({
  selector: 'app-topic-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule, PageHeaderComponent, LoadingComponent,
    DatePickerComponent, RichContentViewComponent
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
        @if (saveFlash()) { <div class="os-success">{{ saveFlash() }}</div> }

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
      <div class="sheet-backdrop" (click)="closePanel()">
        <div class="sheet sheet-sm" (click)="$event.stopPropagation()" role="dialog" aria-label="Continue Teaching">
          <div class="sheet-head">
            <h3>Continue Teaching</h3>
            <p class="ctx-line">{{ topicContext() }}</p>
            <p class="muted tiny">Teacher: {{ teacherName }} · Date defaults to today</p>
          </div>

          <div class="os-field tight">
            <label class="os-field-label">Date</label>
            <app-date-picker [(ngModel)]="teachingDate" />
          </div>

          <div class="os-field tight">
            <label class="os-field-label">Type</label>
            <div class="seg" role="group" aria-label="Teaching type">
              @for (opt of typeOptions; track opt.value) {
                <button type="button" class="seg-btn"
                        [class.on]="teachingType === opt.value"
                        (click)="teachingType = opt.value">{{ opt.label }}</button>
              }
            </div>
          </div>

          <div class="os-field tight">
            <label class="os-field-label">Notes <span class="opt">optional</span></label>
            <textarea class="os-textarea short" rows="2" [(ngModel)]="remarks"
                      placeholder="What was taught today?"></textarea>
          </div>

          @if (teachError()) { <div class="os-error">{{ teachError() }}</div> }
          <div class="sheet-actions sticky-actions">
            <button type="button" class="btn-secondary" (click)="closePanel()">Cancel</button>
            <button type="button" class="btn-secondary" [disabled]="busy()" (click)="saveTeaching(true)">+ Homework</button>
            <button type="button" class="btn-primary" [disabled]="busy()" (click)="saveTeaching(false)">Save</button>
          </div>
        </div>
      </div>
    }

    @if (panel() === 'homework') {
      <div class="sheet-backdrop" (click)="closePanel()">
        <div class="sheet sheet-sm" (click)="$event.stopPropagation()" role="dialog" aria-label="Add Homework">
          <div class="sheet-head">
            <h3>Add Homework</h3>
            <p class="ctx-line">{{ topicContext() }}</p>
          </div>

          <div class="os-field tight">
            <label class="os-field-label">Homework</label>
            <input class="os-input primary-input" [(ngModel)]="hwTitle"
                   placeholder="What should students do?" autofocus />
          </div>

          <button type="button" class="more-toggle" (click)="hwMore = !hwMore">
            {{ hwMore ? 'Hide options' : 'Dates & description' }}
          </button>
          @if (hwMore) {
            <div class="more-block">
              <div class="os-field tight">
                <label class="os-field-label">Description <span class="opt">optional</span></label>
                <textarea class="os-textarea short" rows="2" [(ngModel)]="hwDesc"></textarea>
              </div>
              <div class="form-row">
                <div class="os-field tight">
                  <label class="os-field-label">Assigned</label>
                  <app-date-picker [(ngModel)]="hwAssigned" />
                </div>
                <div class="os-field tight">
                  <label class="os-field-label">Due</label>
                  <app-date-picker [(ngModel)]="hwDue" />
                </div>
              </div>
            </div>
          } @else {
            <p class="muted tiny">Assigned {{ hwAssigned }} · Due {{ hwDue }}</p>
          }

          @if (hwError()) { <div class="os-error">{{ hwError() }}</div> }
          <div class="sheet-actions sticky-actions">
            <button type="button" class="btn-secondary" (click)="closePanel()">Cancel</button>
            <button type="button" class="btn-primary" [disabled]="busy()" (click)="createHomework()">Save Homework</button>
          </div>
        </div>
      </div>
    }

    @if (panel() === 'quiz') {
      <div class="sheet-backdrop" (click)="closePanel()">
        <div class="sheet sheet-sm" (click)="$event.stopPropagation()" role="dialog" aria-label="Record Quiz">
          <div class="sheet-head">
            <h3>Quiz / Class Test</h3>
            <p class="ctx-line">{{ topicContext() }}</p>
          </div>

          <div class="os-field tight">
            <label class="os-field-label">Type</label>
            <div class="seg" role="group">
              @for (opt of quizTypeOptions; track opt.value) {
                <button type="button" class="seg-btn"
                        [class.on]="quizType === opt.value"
                        (click)="quizType = opt.value">{{ opt.label }}</button>
              }
            </div>
          </div>

          <div class="os-field tight">
            <label class="os-field-label">Title</label>
            <input class="os-input primary-input" [(ngModel)]="quizTitle" />
          </div>

          <div class="form-row">
            <div class="os-field tight">
              <label class="os-field-label">Questions</label>
              <input class="os-input" type="number" min="0" [(ngModel)]="quizQuestions" />
            </div>
            <div class="os-field tight">
              <label class="os-field-label">Max marks</label>
              <input class="os-input" type="number" min="0" [(ngModel)]="quizMarks" />
            </div>
          </div>

          <button type="button" class="more-toggle" (click)="quizMore = !quizMore">
            {{ quizMore ? 'Hide options' : 'Date & notes (optional)' }}
          </button>
          @if (quizMore) {
            <div class="more-block">
              <div class="os-field tight">
                <label class="os-field-label">Date</label>
                <app-date-picker [(ngModel)]="quizDate" />
              </div>
              <textarea class="os-textarea short" rows="2" [(ngModel)]="quizNotes" placeholder="Notes"></textarea>
            </div>
          } @else {
            <p class="muted tiny">Date {{ quizDate }} · defaults to today</p>
          }

          @if (quizError()) { <div class="os-error">{{ quizError() }}</div> }
          <div class="sheet-actions sticky-actions">
            <button type="button" class="btn-secondary" (click)="closePanel()">Cancel</button>
            <button type="button" class="btn-secondary" [disabled]="busy()" (click)="saveQuiz(false)">Save only</button>
            <button type="button" class="btn-primary" [disabled]="busy()" (click)="saveQuiz(true)">Save & Enter Results</button>
          </div>
        </div>
      </div>
    }

    @if (panel() === 'quizResults') {
      <div class="sheet-backdrop" (click)="closePanel()">
        <div class="sheet sheet-wide entry-sheet" (click)="$event.stopPropagation()" role="dialog" aria-label="Enter results">
          <div class="sheet-head row-head">
            <div>
              <h3>Enter Results</h3>
              <p class="ctx-line">{{ activeAssessment()?.title }}
                @if (activeAssessment()?.totalMarks != null) {
                  · <strong>Max {{ activeAssessment()?.totalMarks }}</strong>
                }
              </p>
            </div>
            <span class="progress-pill">{{ quizFilledCount() }} / {{ quizRows.length }} entered</span>
          </div>

          <div class="entry-table-wrap" (keydown)="onQuizKeydown($event)">
            <table class="entry-table">
              <thead>
                <tr>
                  <th class="col-num">#</th>
                  <th class="col-name">Student</th>
                  <th class="col-marks">Marks</th>
                  <th class="col-status">Status</th>
                  <th class="col-remark">Remark</th>
                </tr>
              </thead>
              <tbody>
                @for (row of quizRows; track row.studentId; let i = $index) {
                  <tr [class.row-focus]="quizFocus() === i" (click)="quizFocus.set(i)">
                    <td class="col-num muted">{{ i + 1 }}</td>
                    <td class="col-name">
                      <div class="name">{{ row.studentName }}</div>
                      @if (row.admissionNo) { <div class="adm">{{ row.admissionNo }}</div> }
                      <div class="mini-chips mobile-status">
                        @for (lk of lookups(); track lk.code) {
                          <button type="button"
                                  class="result-chip mini"
                                  [class.on]="row.status === lk.code"
                                  [attr.data-tone]="resultTone(lk.code)"
                                  (click)="row.status = row.status === lk.code ? null : lk.code; $event.stopPropagation()">
                            {{ shortResultLabel(lk.code, lk.labelEn) }}
                          </button>
                        }
                      </div>
                    </td>
                    <td class="col-marks">
                      <div class="marks-cell">
                        <input class="os-input marks-input"
                               type="number"
                               min="0"
                               [attr.max]="activeAssessment()?.totalMarks ?? null"
                               [(ngModel)]="row.obtainedMarks"
                               [attr.data-quiz-idx]="i"
                               (focus)="quizFocus.set(i)"
                               (ngModelChange)="validateQuizMarks(row)"
                               (keydown.enter)="focusNextQuiz($event, i)" />
                        @if (activeAssessment()?.totalMarks != null) {
                          <span class="max-hint">/ {{ activeAssessment()?.totalMarks }}</span>
                        }
                      </div>
                      @if (row.marksError) { <div class="inline-err">{{ row.marksError }}</div> }
                    </td>
                    <td class="col-status">
                      <div class="mini-chips desktop-status">
                        @for (lk of lookups(); track lk.code) {
                          <button type="button"
                                  class="result-chip mini"
                                  [class.on]="row.status === lk.code"
                                  [attr.data-tone]="resultTone(lk.code)"
                                  (click)="row.status = row.status === lk.code ? null : lk.code; $event.stopPropagation()">
                            {{ shortResultLabel(lk.code, lk.labelEn) }}
                          </button>
                        }
                      </div>
                    </td>
                    <td class="col-remark">
                      <input class="os-input remark-input" placeholder="—"
                             [(ngModel)]="row.remarks" (focus)="quizFocus.set(i)" />
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          @if (quizError()) { <div class="os-error">{{ quizError() }}</div> }
          <div class="sheet-actions sticky-actions">
            <button type="button" class="btn-secondary" (click)="closePanel()">Close</button>
            <button type="button" class="btn-primary" [disabled]="busy() || hasQuizErrors()"
                    (click)="saveQuizResults()">Save All</button>
          </div>
        </div>
      </div>
    }

    @if (panel() === 'sabaq') {
      <div class="sheet-backdrop" (click)="closePanel()">
        <div class="sheet sheet-wide entry-sheet" (click)="$event.stopPropagation()" role="dialog" aria-label="Oral Assessment">
          <div class="sheet-head row-head">
            <div>
              <h3>Oral Assessment</h3>
              <p class="ctx-line">{{ topicContext() }} · {{ sabaqDate }}</p>
            </div>
            <span class="progress-pill" [class.ready]="sabaqAssessedCount() === sabaqRows.length && sabaqRows.length > 0">
              {{ sabaqAssessedCount() }} / {{ sabaqRows.length }} assessed
            </span>
          </div>

          <div class="star-legend" aria-label="Star rating meaning">
            @for (lv of starLegend; track lv.stars) {
              <span class="legend-item">
                <span class="legend-stars" [attr.data-tone]="resultTone(lv.code)">{{ starChars(lv.stars) }}</span>
                <span class="legend-label">{{ lv.label }}</span>
              </span>
            }
          </div>

          <div class="toolbar-row">
            <div class="os-field tight date-inline">
              <label class="os-field-label">Date</label>
              <app-date-picker [(ngModel)]="sabaqDate" />
            </div>
            <div class="set-all">
              <span class="muted tiny">Set all:</span>
              <div class="rate set-all-rate" role="group" aria-label="Set all students">
                @for (n of starLevels; track n) {
                  <button type="button" class="rate-star"
                          [class.filled]="n <= setAllPreview()"
                          [attr.aria-label]="'Set all to ' + labelForStars(n)"
                          [attr.title]="labelForStars(n)"
                          (mouseenter)="setAllPreview.set(n)"
                          (mouseleave)="setAllPreview.set(0)"
                          (click)="setAllSabaqStars(n)">★</button>
                }
              </div>
            </div>
          </div>
          <p class="kbd-hint muted tiny">Tip: click a star (1–5) · keys 1–5 · ↑↓ move · Enter next</p>

          <div class="entry-table-wrap" tabindex="0"
               (keydown)="onSabaqKeydown($event)"
               #sabaqWrap>
            <table class="entry-table oral-table">
              <thead>
                <tr>
                  <th class="col-num">#</th>
                  <th class="col-name">Student</th>
                  <th class="col-result">Result</th>
                  <th class="col-remark-oral">Remark</th>
                </tr>
              </thead>
              <tbody>
                @for (row of sabaqRows; track row.studentId; let i = $index) {
                  <tr [class.row-focus]="sabaqFocus() === i"
                      [class.assessed]="row.stars > 0"
                      (click)="focusSabaq(i)">
                    <td class="col-num muted">{{ i + 1 }}</td>
                    <td class="col-name">
                      <div class="name">{{ row.studentName }}</div>
                      @if (row.stars > 0) {
                        <div class="star-picked">{{ labelForStars(row.stars) }}</div>
                      }
                    </td>
                    <td class="col-result">
                      <div class="rate" role="radiogroup"
                           [attr.aria-label]="'Rating for ' + row.studentName"
                           (mouseleave)="clearStarHover()">
                        @for (n of starLevels; track n) {
                          <button type="button"
                                  class="rate-star"
                                  role="radio"
                                  [attr.aria-checked]="row.stars === n"
                                  [class.filled]="n <= displayStars(i, row)"
                                  [attr.data-tone]="resultTone(codeForStars(displayStars(i, row)) || '')"
                                  [attr.aria-label]="n + ' stars — ' + labelForStars(n)"
                                  [attr.title]="labelForStars(n)"
                                  (mouseenter)="setStarHover(i, n)"
                                  (click)="selectSabaqStars(i, n); $event.stopPropagation()">★</button>
                        }
                      </div>
                    </td>
                    <td class="col-remark-oral">
                      @if (row.showRemark || row.remarks) {
                        <input class="os-input remark-input"
                               placeholder="Optional remark"
                               [(ngModel)]="row.remarks"
                               [attr.data-sabaq-remark]="i"
                               (focus)="focusSabaq(i)"
                               (keydown.enter)="focusSabaq(i + 1); $event.preventDefault()" />
                      } @else {
                        <button type="button" class="link-quiet" (click)="row.showRemark = true; $event.stopPropagation()">+ remark</button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          @if (sabaqError()) { <div class="os-error">{{ sabaqError() }}</div> }
          <div class="sheet-actions sticky-actions">
            <button type="button" class="btn-secondary" (click)="closePanel()">Cancel</button>
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
    .tiny { font-size: .78rem; }
    .opt { color: #94a3b8; font-weight: 500; font-size: .75rem; }
    .os-error { color: #b91c1c; margin: .35rem 0; font-size: .85rem; }
    .os-success {
      background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;
      border-radius: 8px; padding: .45rem .7rem; margin: 0 0 .65rem; font-size: .85rem; font-weight: 600;
    }
    .inline-err { color: #b91c1c; font-size: .7rem; margin-top: .15rem; }
    .cta-bar {
      display: flex; flex-wrap: wrap; gap: .5rem; align-items: center;
      margin-bottom: .85rem;
    }
    .link-quiet {
      background: none; border: none; color: #64748b; font: inherit; font-size: .78rem;
      cursor: pointer; text-decoration: underline; padding: .15rem;
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
      border-radius: 16px 16px 0 0; padding: 1rem 1.1rem .9rem; display: grid; gap: .55rem;
    }
    .sheet-sm { width: min(440px, 100vw); }
    .sheet-wide { width: min(900px, 100vw); }
    .entry-sheet { gap: .45rem; }
    .sheet h3 { margin: 0; font-size: 1.05rem; }
    .sheet-head { display: grid; gap: .15rem; }
    .row-head {
      display: flex; justify-content: space-between; align-items: flex-start; gap: .75rem; flex-wrap: wrap;
    }
    .ctx-line { margin: 0; font-size: .82rem; color: #334155; font-weight: 600; }
    .progress-pill {
      font-size: .75rem; font-weight: 700; color: #475569; background: #f1f5f9;
      border-radius: 999px; padding: .28rem .65rem; white-space: nowrap;
    }
    .progress-pill.ready { background: #d1fae5; color: #047857; }
    .sheet .os-input, .os-textarea {
      box-sizing: border-box; width: 100%;
      border: 1px solid #e5e7eb; border-radius: 8px; font: inherit; font-size: 13px;
    }
    .sheet .os-input { height: 36px; padding: 0 10px; font-weight: 600; }
    .primary-input { height: 42px !important; font-size: 15px !important; }
    .os-textarea { min-height: 64px; padding: .5rem .65rem; resize: vertical; }
    .os-textarea.short { min-height: 56px; }
    .os-field.tight { margin: 0; }
    .os-field-label { display: block; font-size: .75rem; font-weight: 600; color: #64748b; margin-bottom: .25rem; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: .55rem; }
    .sheet-actions { display: flex; gap: .5rem; justify-content: flex-end; flex-wrap: wrap; padding-top: .15rem; }
    .sticky-actions {
      position: sticky; bottom: 0; background: #fff; padding: .55rem 0 .1rem;
      border-top: 1px solid #f1f5f9; margin-top: .2rem;
    }
    .more-toggle {
      background: none; border: none; color: #2563eb; font: inherit; font-size: .8rem;
      font-weight: 600; cursor: pointer; padding: 0; text-align: left; width: fit-content;
    }
    .more-block { display: grid; gap: .5rem; }

    .seg { display: flex; flex-wrap: wrap; gap: .3rem; }
    .seg-btn {
      border: 1px solid #e2e8f0; background: #fff; border-radius: 8px;
      padding: .4rem .7rem; font: inherit; font-size: .8rem; cursor: pointer; color: #475569;
    }
    .seg-btn.on { background: #1d4ed8; border-color: #1d4ed8; color: #fff; font-weight: 700; }

    .toolbar-row {
      display: flex; flex-wrap: wrap; gap: .65rem; align-items: flex-end;
      justify-content: space-between;
    }
    .date-inline { min-width: 140px; }
    .set-all { display: flex; flex-wrap: wrap; gap: .3rem; align-items: center; }
    .kbd-hint { margin: 0; }

    .entry-table-wrap {
      max-height: 58vh; overflow: auto; border: 1px solid #e5e7eb; border-radius: 10px;
      outline: none;
    }
    .entry-table {
      width: 100%; border-collapse: collapse; font-size: .84rem;
    }
    .entry-table thead th {
      position: sticky; top: 0; background: #f8fafc; z-index: 1;
      text-align: left; font-size: .72rem; text-transform: uppercase; letter-spacing: .02em;
      color: #64748b; font-weight: 700; padding: .45rem .5rem; border-bottom: 1px solid #e2e8f0;
    }
    .entry-table td {
      padding: .4rem .5rem; border-bottom: 1px solid #f1f5f9; vertical-align: middle;
    }
    .entry-table tr.row-focus { background: #eff6ff; }
    .entry-table tr.assessed:not(.row-focus) { background: #f8fafc; }
    .col-num { width: 2.2rem; text-align: right; }
    .col-name { min-width: 7.5rem; max-width: 11rem; }
    .col-marks { width: 6.5rem; }
    .col-status { min-width: 11rem; }
    .col-remark { width: 7rem; }
    .col-result { min-width: 9.5rem; }
    .col-remark-oral { width: 8rem; }
    .name { font-weight: 700; color: #0f172a; line-height: 1.25; }
    .adm { font-size: .7rem; color: #94a3b8; }
    .star-picked {
      margin-top: .15rem; font-size: .7rem; font-weight: 700; color: #64748b;
    }

    .marks-cell { display: flex; align-items: center; gap: .25rem; }
    .marks-input { width: 3.4rem !important; max-width: 3.4rem; height: 34px !important; text-align: center; }
    .max-hint { color: #94a3b8; font-size: .75rem; font-weight: 600; white-space: nowrap; }
    .remark-input { height: 32px !important; font-weight: 500 !important; font-size: 12px !important; }

    .star-legend {
      display: flex; flex-wrap: wrap; gap: .45rem .85rem; align-items: center;
      padding: .45rem .65rem; background: #f8fafc; border: 1px solid #eef2f7;
      border-radius: 8px; font-size: .74rem;
    }
    .legend-item { display: inline-flex; align-items: center; gap: .28rem; white-space: nowrap; }
    .legend-stars {
      font-size: .72rem; letter-spacing: -.05em; font-weight: 700; line-height: 1;
      color: #f59e0b;
    }
    .legend-stars[data-tone='mastered'] { color: #059669; }
    .legend-stars[data-tone='partial'] { color: #d97706; }
    .legend-stars[data-tone='needs'] { color: #dc2626; }
    .legend-stars[data-tone='practice'] { color: #4f46e5; }
    .legend-label { color: #475569; font-weight: 600; }

    .rate {
      display: inline-flex; align-items: center; gap: 1px;
      padding: .1rem .15rem; border-radius: 8px;
    }
    .rate-star {
      border: none; background: transparent; cursor: pointer; padding: .15rem .12rem;
      font-size: 1.35rem; line-height: 1; color: #cbd5e1;
      transition: color .1s, transform .1s;
    }
    .rate-star:hover { transform: scale(1.12); }
    .rate-star.filled { color: #f59e0b; }
    .rate-star.filled[data-tone='mastered'] { color: #10b981; }
    .rate-star.filled[data-tone='partial'] { color: #f59e0b; }
    .rate-star.filled[data-tone='needs'] { color: #ef4444; }
    .rate-star.filled[data-tone='practice'] { color: #6366f1; }
    .set-all-rate .rate-star { font-size: 1.15rem; }

    .result-chips, .mini-chips { display: flex; flex-wrap: wrap; gap: .28rem; }
    .mobile-status { display: none; margin-top: .3rem; }
    .result-chip {
      border: 1.5px solid #cbd5e1; background: #fff; border-radius: 8px;
      padding: .38rem .55rem; font: inherit; font-size: .72rem; font-weight: 600;
      cursor: pointer; color: #475569; line-height: 1.15; min-height: 34px;
    }
    .result-chip.mini { padding: .22rem .4rem; font-size: .68rem; min-height: 28px; border-radius: 6px; }
    .result-chip.on[data-tone='mastered'] { background: #d1fae5; border-color: #34d399; color: #065f46; }
    .result-chip.on[data-tone='partial'] { background: #fef3c7; border-color: #fbbf24; color: #92400e; }
    .result-chip.on[data-tone='needs'] { background: #fee2e2; border-color: #f87171; color: #991b1b; }
    .result-chip.on[data-tone='practice'] { background: #e0e7ff; border-color: #818cf8; color: #3730a3; }
    .result-chip.on[data-tone='other'] { background: #dbeafe; border-color: #60a5fa; color: #1e40af; }

    @media (min-width: 720px) {
      .sheet-backdrop { place-items: center; padding: 1rem; }
      .sheet, .sheet-wide, .sheet-sm { border-radius: 12px; }
    }
    @media (max-width: 700px) {
      .cta-bar .btn-primary, .cta-bar .btn-secondary { flex: 1 1 calc(50% - .25rem); }
      .form-row { grid-template-columns: 1fr 1fr; }
      .col-status, .col-remark { display: none; }
      .mobile-status { display: flex; }
      .result-chip { flex: 1 1 calc(50% - .28rem); text-align: center; }
      .rate-star { font-size: 1.45rem; padding: .2rem .1rem; }
      .entry-table-wrap { max-height: 52vh; }
      .star-legend { gap: .35rem .65rem; }
    }
    @media (max-width: 480px) {
      .form-row { grid-template-columns: 1fr; }
      .col-remark-oral { display: none; }
    }
  `]
})
export class TopicDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private curriculum = inject(CurriculumService);
  private assessmentsApi = inject(AssessmentService);
  private menuSvc = inject(MenuService);
  private auth = inject(AuthService);

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
  saveFlash = signal('');
  tab = signal<Tab>('content');
  historyTab = signal<HistoryTab>('teaching');
  panel = signal<Panel>(null);
  sabaqFocus = signal(0);
  sabaqHover = signal<{ row: number; stars: number } | null>(null);
  setAllPreview = signal(0);
  quizFocus = signal(0);
  lastLogId: number | null = null;

  teachingDate = this.today();
  teachingType: string = 'NewTopic';
  remarks = '';
  extraNotes = '';
  hwTitle = '';
  hwDesc = '';
  hwAssigned = this.today();
  hwDue = this.today();
  hwMore = false;

  quizDate = this.today();
  quizType = 'Quiz';
  quizTitle = '';
  quizQuestions: number | null = null;
  quizMarks: number | null = null;
  quizNotes = '';
  quizMore = false;
  quizRows: RosterResultRow[] = [];

  sabaqDate = this.today();
  sabaqRows: SabaqRow[] = [];

  typeOptions = [
    { value: 'NewTopic', label: 'New Topic' },
    { value: 'Revision', label: 'Revision' },
    { value: 'Practice', label: 'Practice' },
    { value: 'Assessment', label: 'Assessment' }
  ];
  quizTypeOptions = [
    { value: 'Quiz', label: 'Quiz' },
    { value: 'ClassTest', label: 'Class Test' },
    { value: 'OralTest', label: 'Oral' },
    { value: 'Other', label: 'Other' }
  ];

  private static readonly RESULT_LABELS: Record<string, string> = {
    Remembered: 'Mastered',
    PartiallyRemembered: 'Partially Mastered',
    NotRemembered: 'Needs Improvement',
    NeedsPractice: 'Needs Practice'
  };

  private static readonly SHORT_RESULT_LABELS: Record<string, string> = {
    Remembered: 'Mastered',
    PartiallyRemembered: 'Partial',
    NotRemembered: 'Needs Imp.',
    NeedsPractice: 'Practice'
  };

  private static readonly RESULT_TONES: Record<string, string> = {
    Remembered: 'mastered',
    PartiallyRemembered: 'partial',
    NotRemembered: 'needs',
    NeedsPractice: 'practice'
  };

  /** Classic 5★ entry → existing API codes (no schema change). */
  private static readonly STAR_TO_CODE: Record<number, string> = {
    5: 'Remembered',
    4: 'PartiallyRemembered',
    3: 'NotRemembered',
    2: 'NeedsPractice',
    1: 'NeedsPractice'
  };

  private static readonly CODE_TO_STARS: Record<string, number> = {
    Remembered: 5,
    PartiallyRemembered: 4,
    NotRemembered: 3,
    NeedsPractice: 2
  };

  private static readonly STAR_LABELS: Record<number, string> = {
    5: 'Mastered',
    4: 'Partial',
    3: 'Needs Imp.',
    2: 'Practice',
    1: 'Practice'
  };

  readonly starLevels = [1, 2, 3, 4, 5];
  readonly starLegend = [
    { stars: 5, code: 'Remembered', label: 'Mastered' },
    { stars: 4, code: 'PartiallyRemembered', label: 'Partial' },
    { stars: 3, code: 'NotRemembered', label: 'Needs Imp.' },
    { stars: 2, code: 'NeedsPractice', label: 'Practice (1–2★)' }
  ];

  private static readonly ASSESSMENT_TYPE_LABELS: Record<string, string> = {
    Quiz: 'Quiz',
    ClassTest: 'Class Test',
    OralTest: 'Oral Assessment',
    Other: 'Other'
  };

  pageTitle = computed(() => this.topic()?.title || 'Topic');
  historyLogs = computed(() =>
    [...this.logs()].sort((a, b) => b.teachingDate.localeCompare(a.teachingDate)
      || b.courseTeachingLogId - a.courseTeachingLogId)
  );
  teacherName = this.auth.currentUser()?.fullName || 'You';

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
  shortResultLabel(code: string | null | undefined, fallback?: string | null) {
    if (!code) return fallback || '';
    return TopicDetailComponent.SHORT_RESULT_LABELS[code] || this.resultLabel(code, fallback);
  }
  resultTone(code: string) {
    return TopicDetailComponent.RESULT_TONES[code] || 'other';
  }
  starChars(n: number) {
    return '★'.repeat(Math.max(0, n));
  }
  codeForStars(stars: number): string | null {
    if (stars < 1) return null;
    return TopicDetailComponent.STAR_TO_CODE[stars] ?? null;
  }
  labelForStars(stars: number): string {
    return TopicDetailComponent.STAR_LABELS[stars]
      || this.shortResultLabel(this.codeForStars(stars));
  }
  starsForCode(code: string): number {
    return TopicDetailComponent.CODE_TO_STARS[code] || 0;
  }
  displayStars(rowIndex: number, row: SabaqRow): number {
    const h = this.sabaqHover();
    if (h && h.row === rowIndex) return h.stars;
    return row.stars;
  }
  setStarHover(row: number, stars: number) {
    this.sabaqHover.set({ row, stars });
  }
  clearStarHover() {
    this.sabaqHover.set(null);
  }
  assessmentTypeLabel(type: string | null | undefined) {
    if (!type) return '';
    return TopicDetailComponent.ASSESSMENT_TYPE_LABELS[type] || type;
  }
  topicContext() {
    const t = this.topic();
    if (!t) return '';
    return [t.subjectName, t.className, t.title].filter(Boolean).join(' · ');
  }

  sabaqAssessedCount() {
    return this.sabaqRows.filter(r => r.stars > 0 && !!r.resultStatus).length;
  }
  quizFilledCount() {
    return this.quizRows.filter(r => r.obtainedMarks != null || !!r.status).length;
  }
  hasQuizErrors() {
    return this.quizRows.some(r => !!r.marksError);
  }

  ngOnInit() {
    this.menuSvc.ensureLoaded().subscribe();
    this.assessmentsApi.getResultLookups().subscribe({ next: l => this.lookups.set(l), error: () => {} });
    const id = Number(this.route.snapshot.paramMap.get('topicId'));
    if (!id) { this.router.navigate(['/curriculum/my-courses']); return; }
    this.reload(id);
  }

  closePanel() { this.panel.set(null); }

  reload(id?: number, after?: () => void) {
    const topicId = id ?? this.topic()?.courseTopicId;
    if (!topicId) return;
    this.loading.set(true);
    this.curriculum.getTopic(topicId).subscribe({
      next: t => {
        if (!t.activities) t.activities = [];
        if (!t.materials) t.materials = [];
        this.topic.set(t);
        this.loading.set(false);
        this.curriculum.getTeaching({ topicId }).subscribe(logs => {
          this.logs.set(logs);
          after?.();
        });
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
    this.hwAssigned = this.today();
    this.hwDue = this.tomorrow();
    this.hwMore = false;
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
    this.quizMore = false;
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
    this.sabaqFocus.set(0);
    this.assessmentsApi.getRoster(t.classId, t.academicYearId).subscribe({
      next: roster => {
        this.sabaqRows = roster.map(s => ({
          studentId: s.studentId,
          studentName: s.studentName,
          admissionNo: s.admissionNo,
          resultStatus: '',
          stars: 0,
          remarks: '',
          showRemark: false
        }));
        this.panel.set('sabaq');
      },
      error: err => this.error.set(err?.error?.error || 'Could not load class roster.')
    });
  }

  setAllSabaq(code: string) {
    const stars = this.starsForCode(code);
    this.sabaqRows.forEach(r => {
      r.resultStatus = code;
      r.stars = stars;
    });
  }

  setAllSabaqStars(stars: number) {
    const code = this.codeForStars(stars);
    if (!code) return;
    this.sabaqRows.forEach(r => {
      r.stars = stars;
      r.resultStatus = code;
    });
    this.setAllPreview.set(0);
  }

  focusSabaq(i: number) {
    if (i < 0 || i >= this.sabaqRows.length) return;
    this.sabaqFocus.set(i);
  }

  selectSabaqResult(index: number, code: string) {
    this.selectSabaqStars(index, this.starsForCode(code) || 0);
  }

  selectSabaqStars(index: number, stars: number) {
    const row = this.sabaqRows[index];
    const code = this.codeForStars(stars);
    if (!row || !code) return;
    row.stars = stars;
    row.resultStatus = code;
    this.sabaqFocus.set(index);
    this.clearStarHover();
    if (index + 1 < this.sabaqRows.length) {
      setTimeout(() => this.sabaqFocus.set(index + 1), 0);
    }
  }

  onSabaqKeydown(ev: KeyboardEvent) {
    const i = this.sabaqFocus();
    if (ev.key >= '1' && ev.key <= '5') {
      ev.preventDefault();
      this.selectSabaqStars(i, Number(ev.key));
      return;
    }
    if (ev.key === 'ArrowDown' || ev.key === 'Enter') {
      ev.preventDefault();
      this.focusSabaq(Math.min(i + 1, this.sabaqRows.length - 1));
      return;
    }
    if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      this.focusSabaq(Math.max(i - 1, 0));
    }
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
        else {
          this.panel.set(null);
          this.flash('Quiz saved.');
          this.tab.set('history');
          this.historyTab.set('assessments');
        }
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
    this.quizFocus.set(0);
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
                remarks: existing?.remarks || '',
                marksError: ''
              };
            });
            this.panel.set('quizResults');
            setTimeout(() => this.focusQuizInput(0), 50);
          },
          error: err => this.quizError.set(err?.error?.error || 'Could not load roster.')
        });
      },
      error: err => this.error.set(err?.error?.error || 'Assessment not found.')
    });
  }

  validateQuizMarks(row: RosterResultRow) {
    const max = this.activeAssessment()?.totalMarks;
    if (row.obtainedMarks == null || row.obtainedMarks === ('' as unknown as number)) {
      row.marksError = '';
      return;
    }
    if (row.obtainedMarks < 0) {
      row.marksError = 'Cannot be negative';
      return;
    }
    if (max != null && row.obtainedMarks > max) {
      row.marksError = `Max is ${max}`;
      return;
    }
    row.marksError = '';
  }

  focusNextQuiz(ev: Event, i: number) {
    ev.preventDefault();
    this.focusQuizInput(i + 1);
  }

  focusQuizInput(i: number) {
    if (i < 0 || i >= this.quizRows.length) return;
    this.quizFocus.set(i);
    const el = document.querySelector(`input[data-quiz-idx="${i}"]`) as HTMLInputElement | null;
    el?.focus();
    el?.select();
  }

  onQuizKeydown(ev: KeyboardEvent) {
    const i = this.quizFocus();
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      this.focusQuizInput(Math.min(i + 1, this.quizRows.length - 1));
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      this.focusQuizInput(Math.max(i - 1, 0));
    }
  }

  saveQuizResults() {
    const a = this.activeAssessment();
    if (!a) return;
    this.quizRows.forEach(r => this.validateQuizMarks(r));
    if (this.hasQuizErrors()) {
      this.quizError.set('Fix marks that exceed the maximum.');
      return;
    }
    this.busy.set(true);
    this.quizError.set('');
    this.assessmentsApi.saveClassResults(a.classAssessmentId, this.quizRows.map(r => ({
      studentId: r.studentId,
      obtainedMarks: r.obtainedMarks,
      status: r.status,
      remarks: r.remarks.trim() || null
    }))).subscribe({
      next: () => {
        this.busy.set(false);
        this.panel.set(null);
        this.flash('Results saved.');
        this.reload();
        this.tab.set('history');
        this.historyTab.set('assessments');
      },
      error: err => { this.busy.set(false); this.quizError.set(err?.error?.error || 'Failed to save results.'); }
    });
  }

  saveSabaq() {
    const t = this.topic();
    if (!t) return;
    if (!this.sabaqRows.length) { this.sabaqError.set('No students in roster.'); return; }
    if (this.sabaqRows.some(r => r.stars < 1 || !r.resultStatus)) {
      this.sabaqError.set('Rate every student with stars (or use Set all).');
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
        this.flash(`Oral assessment saved for ${this.sabaqRows.length} students.`);
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
        if (thenHomework) {
          this.reload();
          this.hwTitle = `${t.title} — practice`;
          this.hwAssigned = this.teachingDate;
          this.hwDue = this.tomorrowFrom(this.teachingDate);
          this.hwMore = false;
          this.panel.set('homework');
        } else {
          this.panel.set(null);
          this.flash('Teaching saved.');
          this.reload(undefined, () => {
            this.tab.set('history');
            this.historyTab.set('teaching');
          });
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
          this.flash('Homework saved.');
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

  private flash(msg: string) {
    this.saveFlash.set(msg);
    setTimeout(() => this.saveFlash.set(''), 3200);
  }

  private today(): string {
    return this.formatDate(new Date());
  }

  private tomorrow(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return this.formatDate(d);
  }

  private tomorrowFrom(iso: string): string {
    const d = new Date(iso + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    return this.formatDate(d);
  }

  private formatDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
