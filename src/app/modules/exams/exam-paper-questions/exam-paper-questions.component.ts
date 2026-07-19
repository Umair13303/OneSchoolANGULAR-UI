import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ExamService } from '../../../core/services/exam.service';
import {
  ExamPaperDto, ExamQuestionDto, CreateExamQuestionDto,
  SavePaperQuestionsDto, QUESTION_TYPES, QUESTION_LANGUAGES
} from '../../../core/models/exam.model';

interface QuestionForm {
  id?: number;
  examPaperSectionId?: number;
  questionType: number;
  questionText: string;
  language: string;
  marks: number;
  sortOrder: number;
  correctAnswer?: string;
  isTrue?: boolean;
  questionNote?: string;
  answerLines?: number;
  options: { optionLabel: string; optionText: string; isCorrect: boolean }[];
  _collapsed: boolean;
}

// Maps section sectionType string → default question type id
const SECTION_TYPE_TO_QTYPE: Record<string, number> = {
  Objective:   1,
  ShortAnswer: 4,
  LongAnswer:  5,
  Practical:   5,
  Oral:        4,
};

const SEG_COLORS = ['#7c3aed','#0369a1','#b45309','#15803d','#be185d','#1d4ed8','#0f766e'];

@Component({
  selector: 'app-exam-paper-questions',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  styles: [`
    :host { display:block; font-family:inherit; }

    /* ── Page header ── */
    .page-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:1.25rem; gap:1rem; flex-wrap:wrap; }
    .ph-left { display:flex; align-items:center; gap:1rem; }
    .ph-icon { width:46px; height:46px; border-radius:12px; background:linear-gradient(135deg,#6366f1,#8b5cf6);
               display:flex; align-items:center; justify-content:center; color:#fff; flex-shrink:0; }
    .ph-icon .material-icons-round { font-size:22px; }
    .ph-left h1 { margin:0; font-size:1.3rem; font-weight:700; color:var(--t1,#1e293b); }
    .ph-left p  { margin:0; font-size:.82rem; color:var(--t3,#64748b); }

    /* ── Buttons ── */
    .btn-primary   { display:flex; align-items:center; gap:.4rem; padding:.5rem 1.1rem; border:none; border-radius:8px;
                     background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; font-weight:600; cursor:pointer; font-size:.88rem; }
    .btn-primary:disabled { opacity:.5; cursor:not-allowed; }
    .btn-secondary { display:flex; align-items:center; gap:.4rem; padding:.45rem 1rem; border:1.5px solid #e2e8f0;
                     border-radius:8px; background:#fff; color:#475569; font-weight:500; cursor:pointer; font-size:.88rem; }
    .btn-ghost { background:transparent; border:none; cursor:pointer; color:#94a3b8; padding:.25rem; border-radius:6px;
                 display:flex; align-items:center; transition:.15s; }
    .btn-ghost:hover { background:#f1f5f9; color:#475569; }
    .btn-ghost:disabled { opacity:.3; cursor:not-allowed; }

    /* ── Paper info banner ── */
    .paper-info { background:linear-gradient(135deg,#f8faff,#f0f4ff); border:1px solid #e0e7ff; border-radius:12px;
                  padding:.9rem 1.2rem; margin-bottom:1.25rem; display:flex; gap:1.5rem; flex-wrap:wrap; align-items:center; }
    .pi-item { display:flex; flex-direction:column; }
    .pi-label { font-size:.72rem; color:#6366f1; font-weight:600; text-transform:uppercase; letter-spacing:.05em; }
    .pi-value { font-size:.92rem; color:#1e293b; font-weight:600; }

    /* ── Section panel ── */
    .section-panel { border:1.5px solid #e2e8f0; border-radius:14px; overflow:hidden; margin-bottom:1.25rem; background:#fff; }
    .sec-header { display:flex; align-items:center; gap:.75rem; padding:.85rem 1.1rem;
                  background:#f8fafc; border-bottom:1.5px solid #e2e8f0; }
    .sec-color-bar { width:6px; height:36px; border-radius:3px; flex-shrink:0; }
    .sec-header-info { flex:1; }
    .sec-header-info h3 { margin:0 0 2px; font-size:.95rem; font-weight:700; color:#1e293b; }
    .sec-header-info p  { margin:0; font-size:.78rem; color:#64748b; }
    .sec-chips { display:flex; gap:.5rem; flex-wrap:wrap; margin-left:auto; align-items:center; }
    .chip { padding:.22rem .65rem; border-radius:20px; font-size:.72rem; font-weight:600; border:1px solid; }
    .chip-marks  { background:#ede9fe; color:#5b21b6; border-color:#c4b5fd; }
    .chip-q      { background:#e0f2fe; color:#0369a1; border-color:#7dd3fc; }
    .chip-mpq    { background:#fef3c7; color:#92400e; border-color:#fcd34d; }
    .chip-done   { background:#d1fae5; color:#065f46; border-color:#6ee7b7; }

    /* ── Add questions bar ── */
    .add-bar { display:flex; align-items:center; justify-content:space-between; padding:.65rem 1.1rem;
               border-bottom:1.5px solid #e2e8f0; background:#fafafa; flex-wrap:wrap; gap:.5rem; }
    .add-bar-left { font-size:.82rem; color:#475569; }
    .add-bar-left strong { color:#1e293b; }
    .btn-add-questions { display:flex; align-items:center; gap:.35rem; padding:.4rem .9rem; border:none; border-radius:8px;
                         background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; font-size:.82rem; font-weight:600;
                         cursor:pointer; transition:.15s; }
    .btn-add-questions:hover { opacity:.88; }
    .btn-add-questions .material-icons-round { font-size:.95rem; }

    /* ── Questions inside section ── */
    .q-list-inner { padding:.75rem 1rem; display:flex; flex-direction:column; gap:.65rem; }
    .q-list-inner:empty { display:none; }

    /* ── Question card ── */
    .q-card { border:1.5px solid #e2e8f0; border-radius:10px; overflow:hidden; background:#fff; transition:box-shadow .15s; }
    .q-card:hover { box-shadow:0 2px 12px rgba(99,102,241,.08); }
    .q-card.has-error { border-color:#fca5a5; }

    .q-card-header { display:flex; align-items:center; gap:.6rem; padding:.55rem .85rem;
                     background:#f8fafc; border-bottom:1px solid #e2e8f0; cursor:pointer; }
    .q-num { width:24px; height:24px; border-radius:7px; background:linear-gradient(135deg,#6366f1,#8b5cf6);
             color:#fff; font-size:.75rem; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .q-type-badge { padding:.15rem .5rem; border-radius:20px; font-size:.7rem; font-weight:600; }
    .type-1 { background:#dbeafe; color:#1d4ed8; }
    .type-2 { background:#d1fae5; color:#065f46; }
    .type-3 { background:#fef3c7; color:#92400e; }
    .type-4 { background:#e0f2fe; color:#0369a1; }
    .type-5 { background:#ede9fe; color:#5b21b6; }
    .q-preview { flex:1; font-size:.82rem; color:#374151; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .q-marks-chip { font-size:.75rem; font-weight:600; color:#475569; background:#f1f5f9; padding:.15rem .5rem; border-radius:6px; flex-shrink:0; }

    .q-body { padding:.85rem 1rem; }

    /* Question text */
    .q-text-row { margin-bottom:.75rem; }
    .q-text-row label { font-size:.75rem; font-weight:600; color:#64748b; display:block; margin-bottom:.3rem; }
    .q-text-row textarea { width:100%; padding:.5rem .75rem; border:1.5px solid #e2e8f0; border-radius:8px;
                           font-size:.88rem; color:#374151; background:#fff; box-sizing:border-box;
                           font-family:inherit; resize:vertical; min-height:62px; }
    .q-text-row textarea:focus { outline:none; border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.1); }

    /* MCQ options grid */
    .mcq-grid { display:grid; grid-template-columns:1fr 1fr; gap:.45rem .75rem; margin-bottom:.65rem; }
    @media(max-width:520px){ .mcq-grid { grid-template-columns:1fr; } }
    .mcq-opt { display:flex; align-items:center; gap:.5rem; }
    .opt-letter { width:24px; height:24px; border-radius:6px; background:#ede9fe; display:flex; align-items:center;
                  justify-content:center; font-weight:700; font-size:.78rem; color:#6366f1; flex-shrink:0; }
    .mcq-opt input { flex:1; padding:.38rem .65rem; border:1.5px solid #e2e8f0; border-radius:7px;
                     font-size:.85rem; font-family:inherit; }
    .mcq-opt input:focus { outline:none; border-color:#6366f1; }
    .correct-dot { width:18px; height:18px; border-radius:50%; border:2px solid #d1d5db; background:#fff;
                   cursor:pointer; flex-shrink:0; transition:.15s; }
    .correct-dot.active { border-color:#10b981; background:#10b981; }
    .correct-dot.active::after { content:''; display:block; width:6px; height:6px; border-radius:50%;
                                  background:#fff; margin:4px auto 0; }

    /* Short answer line */
    .answer-input { width:100%; padding:.45rem .75rem; border:1.5px solid #e2e8f0; border-radius:8px;
                    font-size:.88rem; color:#374151; background:#fff; box-sizing:border-box; font-family:inherit; }
    .answer-input:focus { outline:none; border-color:#6366f1; }

    /* T/F */
    .tf-row { display:flex; gap:.75rem; }
    .tf-btn { padding:.38rem 1rem; border:1.5px solid #e2e8f0; border-radius:8px; cursor:pointer;
              font-size:.85rem; font-weight:600; background:#fff; color:#374151; transition:.15s; }
    .tf-btn.sel-t { background:#d1fae5; border-color:#10b981; color:#065f46; }
    .tf-btn.sel-f { background:#fee2e2; border-color:#ef4444; color:#991b1b; }

    /* Row actions */
    .q-actions { display:flex; align-items:center; justify-content:flex-end; gap:.35rem; margin-top:.5rem; }

    /* Empty section state */
    .sec-empty { padding:1.5rem; text-align:center; color:#94a3b8; font-size:.85rem; }

    /* ── Toast ── */
    .toast { position:fixed; bottom:1.5rem; right:1.5rem; padding:.7rem 1.2rem; border-radius:10px;
             color:#fff; font-weight:600; z-index:9999; animation:fadeIn .3s; font-size:.88rem; }
    .toast-success { background:#10b981; }
    .toast-error   { background:#ef4444; }
    @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }

    /* Answer lines */
    .lines-row { display:flex; align-items:center; gap:.6rem; margin-bottom:.65rem; flex-wrap:wrap; }
    .lines-row label { font-size:.75rem; font-weight:600; color:#64748b; white-space:nowrap; }
    .lines-stepper { display:flex; align-items:center; gap:.3rem; }
    .lines-stepper button { width:26px; height:26px; border:1.5px solid #e2e8f0; border-radius:6px;
                            background:#fff; color:#475569; font-size:1rem; line-height:1; cursor:pointer;
                            display:flex; align-items:center; justify-content:center; transition:.15s; }
    .lines-stepper button:hover:not(:disabled) { border-color:#6366f1; color:#6366f1; }
    .lines-stepper button:disabled { opacity:.3; cursor:not-allowed; }
    .lines-stepper span { min-width:28px; text-align:center; font-size:.88rem; font-weight:700; color:#1e293b; }
    .lines-preview { display:flex; flex-direction:column; gap:6px; margin:6px 0 .65rem; padding:0 2px; }
    .answer-line { height:1px; background:#cbd5e1; border-radius:1px; }

    .spinner { animation:spin 1s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }

    .saving-overlay { opacity:.6; pointer-events:none; }
  `],
  template: `
<div [class.saving-overlay]="saving()">

  @if (toast()) {
    <div class="toast" [class.toast-success]="toastType()==='success'" [class.toast-error]="toastType()==='error'">
      {{ toast() }}
    </div>
  }

  <!-- Page header -->
  <div class="page-header">
    <div class="ph-left">
      <div class="ph-icon"><span class="material-icons-round">quiz</span></div>
      <div>
        <h1>Question Designer</h1>
        <p>{{ paper()?.title ?? 'Loading…' }}</p>
      </div>
    </div>
    <div style="display:flex;gap:.6rem;flex-wrap:wrap">
      <button class="btn-secondary" (click)="goBack()">
        <span class="material-icons-round">arrow_back</span> Back
      </button>
      <button class="btn-primary" (click)="saveAll()" [disabled]="saving()">
        @if (saving()) { <span class="material-icons-round spinner">refresh</span> }
        @else { <span class="material-icons-round">save</span> }
        Save Paper
      </button>
    </div>
  </div>

  <!-- Paper info -->
  @if (paper()) {
    <div class="paper-info">
      <div class="pi-item"><span class="pi-label">Subject</span><span class="pi-value">{{ paper()!.subjectName }}</span></div>
      <div class="pi-item"><span class="pi-label">Class</span><span class="pi-value">{{ paper()!.className }}</span></div>
      <div class="pi-item"><span class="pi-label">Type</span><span class="pi-value">{{ paper()!.examType }}</span></div>
      <div class="pi-item"><span class="pi-label">Total Marks</span><span class="pi-value">{{ paper()!.totalMarks }}</span></div>
      <div class="pi-item"><span class="pi-label">Questions Added</span><span class="pi-value">{{ totalQuestions() }}</span></div>
    </div>
  }

  <!-- ── Section panels ── -->
  @if (paper()?.sections?.length) {
    @for (sec of paper()!.sections; track sec.examPaperSectionId; let si = $index) {
      @let secQs = questionsForSection(sec.examPaperSectionId);
      @let secColor = SEG_COLORS[si % SEG_COLORS.length];
      @let expected = sec.totalQuestions ?? 0;
      @let isDone = secQs.length >= expected && expected > 0;

      <div class="section-panel">

        <!-- Section header -->
        <div class="sec-header">
          <div class="sec-color-bar" [style.background]="secColor"></div>
          <div class="sec-header-info">
            <h3>{{ sec.sectionName }}</h3>
            <p>{{ sectionTypeLabel(sec.sectionType) }}</p>
          </div>
          <div class="sec-chips">
            @if (sec.allocatedMarks) {
              <span class="chip chip-marks">{{ sec.allocatedMarks }} Marks</span>
            }
            @if (sec.totalQuestions) {
              <span class="chip chip-q">{{ sec.totalQuestions }} Questions</span>
            }
            @if (sec.marksPerQuestion) {
              <span class="chip chip-mpq">{{ sec.marksPerQuestion }}M each</span>
            }
            @if (isDone) {
              <span class="chip chip-done">
                <span class="material-icons-round" style="font-size:.75rem;vertical-align:middle">check</span>
                Complete
              </span>
            }
          </div>
        </div>

        <!-- Add questions bar -->
        <div class="add-bar">
          <span class="add-bar-left">
            <strong>{{ secQs.length }}</strong> / {{ expected || '?' }} questions added
            @if (sec.sectionNote) { — <em>{{ sec.sectionNote }}</em> }
          </span>
          <button class="btn-add-questions" (click)="generateQuestions(sec, si)">
            <span class="material-icons-round">add_circle_outline</span>
            @if (secQs.length === 0) { Add Questions } @else { Add More }
          </button>
        </div>

        <!-- Question cards for this section -->
        <div class="q-list-inner">
          @for (q of secQs; track q._idx; let qi = $index) {
            <div class="q-card" [class.has-error]="hasError(q)">

              <!-- Card header (click to collapse) -->
              <div class="q-card-header" (click)="q._collapsed = !q._collapsed">
                <span class="q-num">{{ qi + 1 }}</span>
                <span class="q-type-badge" [class]="'type-' + q.questionType">{{ typeLabel(q.questionType) }}</span>
                <span class="q-preview">{{ q.questionText || '(empty — click to edit)' }}</span>
                <span class="q-marks-chip">{{ q.marks }}M</span>
                <button class="btn-ghost" (click)="removeQ(q._idx); $event.stopPropagation()" title="Delete">
                  <span class="material-icons-round" style="font-size:17px;color:#ef4444">delete</span>
                </button>
                <span class="material-icons-round" style="font-size:18px;color:#94a3b8">
                  {{ q._collapsed ? 'expand_more' : 'expand_less' }}
                </span>
              </div>

              @if (!q._collapsed) {
                <div class="q-body">

                  <!-- Question text -->
                  <div class="q-text-row">
                    <label>Question Text</label>
                    <textarea [(ngModel)]="q.questionText"
                              [placeholder]="questionPlaceholder(q.questionType, qi + 1)"
                              rows="2"></textarea>
                  </div>

                  <!-- MCQ: 4-option grid -->
                  @if (q.questionType === 1) {
                    <div class="mcq-grid">
                      @for (opt of q.options; track $index; let oi = $index) {
                        <div class="mcq-opt">
                          <span class="opt-letter">{{ ['A','B','C','D'][oi] }}</span>
                          <input type="text" [(ngModel)]="opt.optionText"
                                 [placeholder]="'Option ' + ['A','B','C','D'][oi]" />
                          <div class="correct-dot" [class.active]="opt.isCorrect"
                               (click)="setCorrect(q, oi)" title="Mark correct"></div>
                        </div>
                      }
                    </div>
                  }

                  <!-- True / False -->
                  @if (q.questionType === 2) {
                    <div class="tf-row" style="margin-bottom:.65rem">
                      <button class="tf-btn" [class.sel-t]="q.isTrue===true"  (click)="q.isTrue=true">✓ True</button>
                      <button class="tf-btn" [class.sel-f]="q.isTrue===false" (click)="q.isTrue=false">✗ False</button>
                    </div>
                  }

                  <!-- Short / Long — answer lines + model answer -->
                  @if (q.questionType === 4 || q.questionType === 5) {
                    <div class="lines-row">
                      <label>Answer Lines on Paper:</label>
                      <div class="lines-stepper">
                        <button type="button" (click)="decLines(q)" [disabled]="!q.answerLines || q.answerLines <= 0">−</button>
                        <span>{{ q.answerLines || 0 }}</span>
                        <button type="button" (click)="incLines(q)" [disabled]="(q.answerLines || 0) >= 20">+</button>
                      </div>
                      <small style="color:#94a3b8">blank lines printed for student to write answer</small>
                    </div>
                    @if (q.answerLines && q.answerLines > 0) {
                      <div class="lines-preview">
                        @for (_ of linesArray(q.answerLines); track $index) {
                          <div class="answer-line"></div>
                        }
                      </div>
                    }
                    <div class="q-text-row">
                      <label>Model Answer <small style="color:#94a3b8">(optional, for answer key)</small></label>
                      <input class="answer-input" type="text" [(ngModel)]="q.correctAnswer"
                             placeholder="Enter model answer or marking guide…" />
                    </div>
                  }
                  @if (q.questionType === 3) {
                    <div class="q-text-row">
                      <label>Expected Answer <small style="color:#94a3b8">(fill in the blank)</small></label>
                      <input class="answer-input" type="text" [(ngModel)]="q.correctAnswer"
                             placeholder="Correct answer…" />
                    </div>
                  }

                  <!-- Marks (editable per question) -->
                  <div style="display:flex;align-items:center;gap:.5rem;margin-top:.3rem">
                    <label style="font-size:.75rem;font-weight:600;color:#64748b;margin:0">Marks:</label>
                    <input type="number" [(ngModel)]="q.marks" min="1" style="width:70px;padding:.32rem .6rem;
                           border:1.5px solid #e2e8f0;border-radius:7px;font-size:.85rem;" />
                  </div>

                </div>
              }
            </div>
          }
        </div>

        @if (secQs.length === 0) {
          <div class="sec-empty">
            <span class="material-icons-round" style="font-size:2rem;display:block;margin-bottom:.4rem;opacity:.3">
              {{ qTypeIcon(sectionDefaultQType(sec.sectionType)) }}
            </span>
            Click <strong>Add Questions</strong> to generate {{ expected || '' }} question slots for this section.
          </div>
        }

      </div>
    }
  } @else {
    <!-- No sections — fallback plain add buttons -->
    <div style="margin-bottom:1rem;display:flex;gap:.6rem;flex-wrap:wrap">
      @for (qt of questionTypes; track qt.value) {
        <button class="btn-secondary" (click)="addOneQuestion(qt.value)" style="font-size:.82rem;padding:.38rem .8rem">
          <span class="material-icons-round" style="font-size:.95rem">{{ qt.icon }}</span>
          {{ qt.label }}
        </button>
      }
    </div>
    <div class="q-list-inner">
      @for (q of questions(); track $index; let i = $index) {
        <div class="q-card" [class.has-error]="hasError(q)">
          <div class="q-card-header" (click)="q._collapsed = !q._collapsed">
            <span class="q-num">{{ i + 1 }}</span>
            <span class="q-type-badge" [class]="'type-' + q.questionType">{{ typeLabel(q.questionType) }}</span>
            <span class="q-preview">{{ q.questionText || '(empty)' }}</span>
            <span class="q-marks-chip">{{ q.marks }}M</span>
            <button class="btn-ghost" (click)="removeQ(i); $event.stopPropagation()">
              <span class="material-icons-round" style="font-size:17px;color:#ef4444">delete</span>
            </button>
            <span class="material-icons-round" style="font-size:18px;color:#94a3b8">
              {{ q._collapsed ? 'expand_more' : 'expand_less' }}
            </span>
          </div>
          @if (!q._collapsed) {
            <div class="q-body">
              <div class="q-text-row">
                <label>Question Text</label>
                <textarea [(ngModel)]="q.questionText" rows="2" placeholder="Enter question…"></textarea>
              </div>
              @if (q.questionType === 1) {
                <div class="mcq-grid">
                  @for (opt of q.options; track $index; let oi = $index) {
                    <div class="mcq-opt">
                      <span class="opt-letter">{{ ['A','B','C','D'][oi] }}</span>
                      <input type="text" [(ngModel)]="opt.optionText" [placeholder]="'Option ' + ['A','B','C','D'][oi]" />
                      <div class="correct-dot" [class.active]="opt.isCorrect" (click)="setCorrect(q, oi)"></div>
                    </div>
                  }
                </div>
              }
              @if (q.questionType === 2) {
                <div class="tf-row" style="margin-bottom:.65rem">
                  <button class="tf-btn" [class.sel-t]="q.isTrue===true"  (click)="q.isTrue=true">✓ True</button>
                  <button class="tf-btn" [class.sel-f]="q.isTrue===false" (click)="q.isTrue=false">✗ False</button>
                </div>
              }
              @if (q.questionType === 4 || q.questionType === 5) {
                <div class="lines-row">
                  <label>Answer Lines on Paper:</label>
                  <div class="lines-stepper">
                    <button type="button" (click)="decLines(q)" [disabled]="!q.answerLines || q.answerLines <= 0">−</button>
                    <span>{{ q.answerLines || 0 }}</span>
                    <button type="button" (click)="incLines(q)" [disabled]="(q.answerLines || 0) >= 20">+</button>
                  </div>
                </div>
                @if (q.answerLines && q.answerLines > 0) {
                  <div class="lines-preview">
                    @for (_ of linesArray(q.answerLines); track $index) {
                      <div class="answer-line"></div>
                    }
                  </div>
                }
                <div class="q-text-row">
                  <label>Model Answer</label>
                  <input class="answer-input" type="text" [(ngModel)]="q.correctAnswer" placeholder="Model answer…" />
                </div>
              }
              @if (q.questionType === 3) {
                <div class="q-text-row">
                  <label>Expected Answer</label>
                  <input class="answer-input" type="text" [(ngModel)]="q.correctAnswer" placeholder="Correct answer…" />
                </div>
              }
              <div style="display:flex;align-items:center;gap:.5rem;margin-top:.3rem">
                <label style="font-size:.75rem;font-weight:600;color:#64748b;margin:0">Marks:</label>
                <input type="number" [(ngModel)]="q.marks" min="1" style="width:70px;padding:.32rem .6rem;border:1.5px solid #e2e8f0;border-radius:7px;font-size:.85rem;" />
              </div>
            </div>
          }
        </div>
      }
    </div>
  }

  @if (questions().length > 4) {
    <div style="display:flex;justify-content:flex-end;margin-top:1rem">
      <button class="btn-primary" (click)="saveAll()" [disabled]="saving()">
        @if (saving()) { <span class="material-icons-round spinner">refresh</span> }
        @else { <span class="material-icons-round">save</span> }
        Save All Questions
      </button>
    </div>
  }

</div>
  `
})
export class ExamPaperQuestionsComponent implements OnInit {
  private route   = inject(ActivatedRoute);
  private router  = inject(Router);
  private examSvc = inject(ExamService);

  paper     = signal<ExamPaperDto | null>(null);
  questions = signal<(QuestionForm & { _idx: number })[]>([]);
  saving    = signal(false);
  toast     = signal('');
  toastType = signal<'success'|'error'>('success');

  readonly questionTypes = QUESTION_TYPES;
  readonly languages     = QUESTION_LANGUAGES;
  readonly SEG_COLORS    = SEG_COLORS;

  private paperId!: number;
  private toastTimer: any;
  private nextIdx = 0;

  ngOnInit() {
    this.paperId = Number(this.route.snapshot.paramMap.get('paperId'));
    this.examSvc.getPaper(this.paperId).subscribe(p => {
      this.paper.set(p);
      this.examSvc.getQuestions(this.paperId).subscribe(qs => {
        this.questions.set(qs.map(q => this.serverToForm(q)));
      });
    });
  }

  // ── Helpers ──

  questionsForSection(sectionId?: number) {
    return this.questions().filter(q => q.examPaperSectionId === sectionId);
  }

  totalQuestions() { return this.questions().length; }

  sectionDefaultQType(sectionType: string): number {
    return SECTION_TYPE_TO_QTYPE[sectionType] ?? 4;
  }

  sectionTypeLabel(sectionType: string): string {
    const map: Record<string,string> = {
      Objective:   'Objective / MCQs',
      ShortAnswer: 'Short Questions',
      LongAnswer:  'Long Questions',
      Practical:   'Practical / Lab',
      Oral:        'Oral / Viva',
    };
    return map[sectionType] ?? sectionType;
  }

  typeLabel(type: number): string {
    return this.questionTypes.find(t => t.value === type)?.label ?? '';
  }

  qTypeIcon(type: number): string {
    return this.questionTypes.find(t => t.value === type)?.icon ?? 'quiz';
  }

  questionPlaceholder(type: number, num: number): string {
    if (type === 1) return `MCQ ${num}: Enter the question here…`;
    if (type === 4) return `Short Q${num}: Enter your question here…`;
    if (type === 5) return `Long Q${num}: Enter your question here…`;
    if (type === 2) return `True/False ${num}: Enter the statement here…`;
    return `Question ${num}…`;
  }

  hasError(q: QuestionForm): boolean {
    if (!q.questionText?.trim()) return true;
    if (q.questionType === 1 && !q.options.some(o => o.isCorrect)) return true;
    if (q.questionType === 2 && q.isTrue == null) return true;
    return false;
  }

  // ── Generate questions from section settings ──

  generateQuestions(sec: any, _si: number) {
    const total   = sec.totalQuestions ?? 0;
    const mpq     = sec.marksPerQuestion ?? (sec.allocatedMarks && total ? Math.floor(sec.allocatedMarks / total) : 1);
    const qtype   = this.sectionDefaultQType(sec.sectionType);
    const existing = this.questionsForSection(sec.examPaperSectionId).length;
    const toAdd   = Math.max(total - existing, 1);

    const newQs: (QuestionForm & { _idx: number })[] = Array.from({ length: toAdd }, (_, i) => ({
      _idx:               this.nextIdx++,
      examPaperSectionId: sec.examPaperSectionId,
      questionType:       qtype,
      questionText:       '',
      language:           'en',
      marks:              mpq || 1,
      sortOrder:          existing + i + 1,
      correctAnswer:      undefined,
      isTrue:             undefined,
      questionNote:       undefined,
      options:            qtype === 1 ? this.defaultOptions() : [],
      _collapsed:         false,
    }));

    this.questions.update(qs => [...qs, ...newQs]);
  }

  addOneQuestion(type: number) {
    const q: QuestionForm & { _idx: number } = {
      _idx:               this.nextIdx++,
      examPaperSectionId: undefined,
      questionType:       type,
      questionText:       '',
      language:           'en',
      marks:              type <= 2 ? 1 : type === 3 ? 2 : type === 4 ? 4 : 8,
      sortOrder:          this.questions().length + 1,
      correctAnswer:      undefined,
      isTrue:             undefined,
      questionNote:       undefined,
      options:            type === 1 ? this.defaultOptions() : [],
      _collapsed:         false,
    };
    this.questions.update(qs => [...qs, q]);
  }

  removeQ(idx: number) {
    this.questions.update(qs => qs.filter(q => q._idx !== idx));
  }

  setCorrect(q: QuestionForm, correctIndex: number) {
    q.options.forEach((o, i) => o.isCorrect = i === correctIndex);
  }

  incLines(q: QuestionForm) { q.answerLines = Math.min((q.answerLines || 0) + 1, 20); }
  decLines(q: QuestionForm) { q.answerLines = Math.max((q.answerLines || 0) - 1, 0); }
  linesArray(n: number): number[] { return Array.from({ length: n }); }

  // ── Save ──

  saveAll() {
    const qs = this.questions();
    if (qs.some(q => this.hasError(q))) {
      this.showToast('Fix errors before saving (red-bordered questions)', 'error');
      return;
    }

    const dto: SavePaperQuestionsDto = {
      examPaperId: this.paperId,
      questions: qs.map((q, i) => ({
        examPaperId:        this.paperId,
        examPaperSectionId: q.examPaperSectionId,
        questionType:       q.questionType,
        questionText:       q.questionText,
        language:           q.language,
        marks:              q.marks,
        sortOrder:          i + 1,
        correctAnswer:      q.correctAnswer,
        isTrue:             q.isTrue,
        questionNote:       q.questionNote,
        options: q.questionType === 1
          ? q.options.map((o, j) => ({
              optionLabel: ['A','B','C','D'][j] || String(j+1),
              optionText:  o.optionText,
              isCorrect:   o.isCorrect,
              sortOrder:   j
            }))
          : []
      } as CreateExamQuestionDto))
    };

    this.saving.set(true);
    this.examSvc.saveAllQuestions(this.paperId, dto).subscribe({
      next: saved => {
        this.questions.set(saved.map(q => this.serverToForm(q)));
        this.saving.set(false);
        this.showToast('Paper saved successfully!', 'success');
      },
      error: err => {
        this.saving.set(false);
        this.showToast(err?.error?.error ?? 'Failed to save', 'error');
      }
    });
  }

  goBack() { this.router.navigate(['/exams/papers']); }

  // ── Private utils ──

  private serverToForm(q: ExamQuestionDto): QuestionForm & { _idx: number } {
    return {
      _idx:               this.nextIdx++,
      id:                 q.examQuestionId,
      examPaperSectionId: q.examPaperSectionId,
      questionType:       q.questionTypeId,
      questionText:       q.questionText,
      language:           q.language,
      marks:              q.marks,
      sortOrder:          q.sortOrder,
      correctAnswer:      q.correctAnswer,
      isTrue:             q.isTrue,
      questionNote:       q.questionNote,
      options: q.options.length
        ? q.options.map(o => ({ optionLabel: o.optionLabel, optionText: o.optionText, isCorrect: o.isCorrect }))
        : (q.questionTypeId === 1 ? this.defaultOptions() : []),
      _collapsed: true,
    };
  }

  private defaultOptions() {
    return ['A','B','C','D'].map(l => ({ optionLabel: l, optionText: '', isCorrect: false }));
  }

  private showToast(msg: string, type: 'success'|'error') {
    clearTimeout(this.toastTimer);
    this.toast.set(msg);
    this.toastType.set(type);
    this.toastTimer = setTimeout(() => this.toast.set(''), 3500);
  }
}
