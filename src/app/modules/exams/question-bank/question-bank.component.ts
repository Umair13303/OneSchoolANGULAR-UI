import { Component, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { forkJoin, of, firstValueFrom } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { AssessmentService } from '../../../core/services/assessment.service';
import { CurriculumService } from '../../../core/services/curriculum.service';
import { ExamService } from '../../../core/services/exam.service';
import { MenuService } from '../../../core/services/menu.service';
import { QuestionBankItemDto } from '../../../core/models/assessment.model';
import { ExamPaperDto, QUESTION_TYPES } from '../../../core/models/exam.model';
import { GenerateQuestionsResponse, GeneratedQuestionDraftDto } from '../../../core/models/ai.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { AiGeneratePanelComponent } from './ai-generate-panel.component';
import { AiReviewPanelComponent } from './ai-review-panel.component';

interface TopicOption {
  id: number;
  title: string;
  label: string;
}

interface BankForm {
  courseTopicId: number | null;
  questionType: number;
  questionText: string;
  marks: number;
  correctAnswer: string;
  isTrue: boolean | null;
  questionNote: string;
  isActive: boolean;
  options: { optionLabel: string; optionText: string; isCorrect: boolean }[];
}

@Component({
  selector: 'app-question-bank',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, EmptyStateComponent, AiGeneratePanelComponent, AiReviewPanelComponent],
  template: `
    <div class="os-page compact qb-page">
      <app-page-header [dense]="true" [title]="pageTitle()" routeUrl="/exams/question-bank" subtitle="Reusable questions linked to course topics">
        <button type="button" class="btn-ghost" (click)="openAiGenerate()" [disabled]="aiMode() === 'review'">
          <span class="material-icons-round">auto_awesome</span> AI Generate
        </button>
        <button type="button" class="btn-primary" (click)="openCreate()">
          <span class="material-icons-round">add</span> New Question
        </button>
      </app-page-header>

      @if (aiMode() === 'generate') {
        <app-ai-generate-panel
          (generated)="onAiGenerated($event)"
          (cancelled)="closeAi()" />
      }
      @if (aiMode() === 'review' && aiDraft()) {
        <app-ai-review-panel
          [draft]="aiDraft()"
          (discard)="closeAi()"
          (addSelectedRequest)="saveAiSelected($event)" />
      }

      <div class="os-stage">
        <div class="os-stage-bar">
          <div class="os-toolbar-group qb-filters">
            <div class="os-field inline grow">
              <label class="os-field-label">Search</label>
              <input class="os-input" type="search" [(ngModel)]="search" (keyup.enter)="load()" placeholder="Question text…" />
            </div>
            <div class="os-field inline grow">
              <label class="os-field-label">Course Topic</label>
              <select class="os-input" [(ngModel)]="filterTopicId" (ngModelChange)="load()">
                <option [ngValue]="null">All topics</option>
                @for (t of topics(); track t.id) {
                  <option [ngValue]="t.id">{{ t.label }}</option>
                }
              </select>
            </div>
            <div class="os-field inline">
              <label class="os-field-label">Type</label>
              <select class="os-input" [(ngModel)]="filterType" (ngModelChange)="applyClientFilters()">
                <option value="">All types</option>
                @for (qt of questionTypes; track qt.value) {
                  <option [value]="qt.value">{{ qt.label }}</option>
                }
              </select>
            </div>
            <div class="os-field inline">
              <label class="os-field-label">Status</label>
              <select class="os-input" [(ngModel)]="filterActive" (ngModelChange)="load()">
                <option value="active">Active</option>
                <option value="all">All</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
          <div class="os-toolbar-group end">
            <button type="button" class="btn-secondary" (click)="load()" [disabled]="loading()">
              <span class="material-icons-round">search</span> Search
            </button>
          </div>
        </div>

        <div class="os-stage-body">
          @if (error()) {
            <div class="banner error">{{ error() }}</div>
          }
          @if (aiSaveOk()) {
            <div class="banner ok">{{ aiSaveOk() }}</div>
          }

          @if (loading()) {
            <div class="banner muted">Loading question bank…</div>
          } @else if (!filtered().length) {
            <app-empty-state title="No questions" message="Create a question or adjust filters." icon="quiz" />
          } @else {
            <div class="table-wrap">
              <table class="qb-table">
                <thead>
                  <tr>
                    <th class="col-q">Question</th>
                    <th class="col-topic">Topic</th>
                    <th class="col-type">Type</th>
                    <th class="col-marks">Marks</th>
                    <th class="col-status">Status</th>
                    <th class="col-act">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (q of filtered(); track q.questionBankItemId) {
                    <tr>
                      <td class="col-q">
                        <span class="q-text" [title]="q.questionText">{{ q.questionText }}</span>
                      </td>
                      <td class="col-topic">{{ q.topicTitle || '—' }}</td>
                      <td class="col-type">{{ typeLabel(q.questionTypeId) }}</td>
                      <td class="col-marks">{{ q.marks }}</td>
                      <td class="col-status">
                        <span class="chip" [class.on]="q.isActive" [class.off]="!q.isActive">
                          {{ q.isActive ? 'Active' : 'Archived' }}
                        </span>
                      </td>
                      <td class="col-act">
                        <div class="qb-actions">
                          <button type="button" class="act-btn" (click)="openEdit(q)">Edit</button>
                          <button type="button" class="act-btn" (click)="openCopy(q)">Add to paper</button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      </div>

      @if (showForm()) {
        <div class="sheet-backdrop" (click)="closeForm()"></div>
        <div class="sheet" role="dialog">
          <div class="sheet-head">
            <h3>{{ editingId() ? 'Edit Question' : 'New Question' }}</h3>
            <button type="button" class="icon-btn" (click)="closeForm()">
              <span class="material-icons-round">close</span>
            </button>
          </div>
          <div class="sheet-body">
            @if (formError()) { <div class="banner error">{{ formError() }}</div> }

            @if (!editingId()) {
              <div class="fi">
                <label>Course Topic *</label>
                <select [(ngModel)]="form.courseTopicId">
                  <option [ngValue]="null">— Select topic —</option>
                  @for (t of topics(); track t.id) {
                    <option [ngValue]="t.id">{{ t.label }}</option>
                  }
                </select>
              </div>
            } @else {
              <div class="fi muted-line">Topic: <strong>{{ editTopicTitle() }}</strong></div>
            }

            <div class="fi">
              <label>Question Type *</label>
              <select [(ngModel)]="form.questionType" [disabled]="!!editingId()" (ngModelChange)="onTypeChange()">
                @for (qt of questionTypes; track qt.value) {
                  <option [ngValue]="qt.value">{{ qt.label }}</option>
                }
              </select>
            </div>

            <div class="fi">
              <label>Question Text *</label>
              <textarea rows="3" [(ngModel)]="form.questionText" placeholder="Enter question…"></textarea>
            </div>

            <div class="fi row">
              <div>
                <label>Marks *</label>
                <input type="number" min="1" [(ngModel)]="form.marks" />
              </div>
              @if (editingId()) {
                <label class="check">
                  <input type="checkbox" [(ngModel)]="form.isActive" /> Active
                </label>
              }
            </div>

            @if (form.questionType === 1) {
              <div class="mcq">
                @for (opt of form.options; track $index; let i = $index) {
                  <div class="mcq-row">
                    <span class="letter">{{ opt.optionLabel }}</span>
                    <input type="text" [(ngModel)]="opt.optionText" [placeholder]="'Option ' + opt.optionLabel" />
                    <button type="button" class="correct" [class.on]="opt.isCorrect" (click)="setCorrect(i)" title="Mark correct">✓</button>
                  </div>
                }
              </div>
            }

            @if (form.questionType === 2) {
              <div class="tf">
                <button type="button" [class.on]="form.isTrue === true" (click)="form.isTrue = true">True</button>
                <button type="button" [class.on]="form.isTrue === false" (click)="form.isTrue = false">False</button>
              </div>
            }

            @if (form.questionType === 3 || form.questionType === 4 || form.questionType === 5) {
              <div class="fi">
                <label>{{ form.questionType === 3 ? 'Expected Answer' : 'Model Answer / Explanation' }}</label>
                <input type="text" [(ngModel)]="form.correctAnswer" placeholder="Optional" />
              </div>
            }

            <div class="fi">
              <label>Note</label>
              <input type="text" [(ngModel)]="form.questionNote" placeholder="Optional internal note" />
            </div>
          </div>
          <div class="sheet-foot">
            <button type="button" class="btn-secondary" (click)="closeForm()">Cancel</button>
            <button type="button" class="btn-primary" [disabled]="busy()" (click)="saveForm()">
              {{ busy() ? 'Saving…' : 'Save' }}
            </button>
          </div>
        </div>
      }

      @if (copyItem()) {
        <div class="sheet-backdrop" (click)="closeCopy()"></div>
        <div class="sheet" role="dialog">
          <div class="sheet-head">
            <h3>Add to Exam Paper</h3>
            <button type="button" class="icon-btn" (click)="closeCopy()">
              <span class="material-icons-round">close</span>
            </button>
          </div>
          <div class="sheet-body">
            <p class="hint">Copies an independent ExamQuestion. Later bank edits will not change the paper.</p>
            @if (copyError()) { <div class="banner error">{{ copyError() }}</div> }
            @if (copyOk()) { <div class="banner ok">{{ copyOk() }}</div> }
            <div class="fi">
              <label>Exam Paper *</label>
              <select [ngModel]="copyPaperId" (ngModelChange)="onCopyPaperChange($event)">
                <option [ngValue]="null">— Select paper —</option>
                @for (p of papers(); track p.examPaperId) {
                  <option [ngValue]="p.examPaperId">{{ p.title }} · {{ p.className }} · {{ p.subjectName }}</option>
                }
              </select>
            </div>
          </div>
          <div class="sheet-foot">
            <button type="button" class="btn-secondary" (click)="closeCopy()">Close</button>
            <button type="button" class="btn-primary" [disabled]="busy() || !copyPaperId" (click)="confirmCopy()">
              {{ busy() ? 'Copying…' : 'Copy to Paper' }}
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; min-width: 0; }
    .qb-page { width: 100%; max-width: none; }
    .qb-filters { flex: 1; min-width: 0; flex-wrap: wrap; gap: 8px; }
    .qb-filters .os-field.inline { min-width: 120px; }
    .qb-filters .os-field.grow { flex: 1 1 160px; min-width: 160px; }
    .os-stage-body { padding: 0; }
    .os-input, .fi select, .fi input, .fi textarea {
      width: 100%; height: 34px; padding: 0 10px;
      border: 1px solid var(--border); border-radius: 0;
      font-size: 13px; font-family: inherit;
      background: var(--surface); color: var(--t1); box-sizing: border-box;
    }
    .fi textarea { height: auto; padding: 8px 10px; resize: vertical; min-height: 72px; }
    .btn-primary, .btn-secondary {
      display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      height: 34px; padding: 0 14px; border-radius: 0;
      font-size: 13px; font-weight: 600; cursor: pointer; border: none;
    }
    .btn-primary { background: var(--accent); color: #fff; }
    .btn-primary:disabled { opacity: .5; cursor: not-allowed; }
    .btn-secondary {
      background: var(--surface); color: var(--t2);
      border: 1px solid var(--border);
    }
    .banner { padding: 10px 12px; margin: 0; font-size: 13px; border-bottom: 1px solid var(--border); }
    .banner.error { background: #fef2f2; color: #991b1b; }
    .banner.ok { background: #ecfdf5; color: #065f46; }
    .banner.muted { color: var(--t4); }

    .table-wrap { width: 100%; overflow-x: auto; }
    .qb-table {
      width: 100%; border-collapse: collapse; table-layout: fixed;
      font-size: 13px;
    }
    .qb-table th {
      text-align: left; padding: 10px 12px;
      color: var(--t4); font-size: 11px; font-weight: 700;
      text-transform: uppercase; letter-spacing: .04em;
      border-bottom: 1px solid var(--border);
      background: var(--surface-2); white-space: nowrap;
    }
    .qb-table td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--border);
      vertical-align: middle; color: var(--t2);
    }
    .qb-table tbody tr:hover td { background: var(--surface-2); }
    .qb-table tbody tr:last-child td { border-bottom: none; }

    .col-q { width: 34%; }
    .col-topic { width: 16%; }
    .col-type { width: 14%; }
    .col-marks { width: 8%; text-align: center; }
    .col-status { width: 10%; }
    .col-act { width: 18%; text-align: right; }
    th.col-marks, th.col-act { text-align: inherit; }
    th.col-act { text-align: right; }

    .q-text {
      display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      font-weight: 600; color: var(--t1);
    }
    .col-topic, .col-type {
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .chip {
      display: inline-flex; align-items: center;
      height: 22px; padding: 0 8px; border-radius: 999px;
      font-size: 11px; font-weight: 700;
    }
    .chip.on { background: #d1fae5; color: #065f46; }
    .chip.off { background: var(--surface-2); color: var(--t4); }

    /* Do NOT use global .actions — it breaks <td> layout */
    .qb-actions {
      display: inline-flex; align-items: center; justify-content: flex-end;
      gap: 6px; flex-wrap: wrap;
    }
    .act-btn {
      height: 28px; padding: 0 10px;
      border: 1px solid var(--border); border-radius: 0;
      background: var(--surface); color: var(--accent);
      font: inherit; font-size: 12px; font-weight: 700; cursor: pointer;
      white-space: nowrap;
    }
    .act-btn:hover { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 6%, var(--surface)); }
    .sheet-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,.35); z-index: 40; }
    .sheet {
      position: fixed; top: 0; right: 0; width: min(440px, 100%); height: 100%; background: #fff;
      z-index: 50; display: flex; flex-direction: column; box-shadow: -8px 0 24px rgba(15,23,42,.12);
    }
    .sheet-head, .sheet-foot {
      display: flex; align-items: center; justify-content: space-between; gap: .75rem;
      padding: .9rem 1rem; border-bottom: 1px solid #e2e8f0;
    }
    .sheet-foot { border-bottom: none; border-top: 1px solid #e2e8f0; justify-content: flex-end; }
    .sheet-head h3 { margin: 0; font-size: 1rem; }
    .sheet-body { padding: 1rem; overflow: auto; flex: 1; }
    .icon-btn { border: none; background: transparent; cursor: pointer; color: #94a3b8; }
    .fi { margin-bottom: .85rem; }
    .fi label { display: block; font-size: .75rem; font-weight: 600; color: #64748b; margin-bottom: .3rem; }
    .fi.row { display: flex; align-items: end; gap: 1rem; }
    .fi.row > div { flex: 1; }
    .check { display: flex; align-items: center; gap: .4rem; font-size: .85rem; color: #475569; padding-bottom: .4rem; }
    .muted-line { font-size: .88rem; color: #64748b; margin-bottom: .85rem; }
    .hint { font-size: .82rem; color: #64748b; margin: 0 0 .85rem; line-height: 1.4; }
    .mcq { display: flex; flex-direction: column; gap: .45rem; margin-bottom: .85rem; }
    .mcq-row { display: flex; align-items: center; gap: .45rem; }
    .letter { width: 24px; height: 24px; border-radius: 6px; background: #ede9fe; color: #6366f1;
      display: flex; align-items: center; justify-content: center; font-size: .75rem; font-weight: 700; flex-shrink: 0; }
    .mcq-row input { flex: 1; }
    .correct { width: 28px; height: 28px; border-radius: 50%; border: 1.5px solid #d1d5db; background: #fff; cursor: pointer; color: transparent; }
    .correct.on { background: #10b981; border-color: #10b981; color: #fff; }
    .tf { display: flex; gap: .5rem; margin-bottom: .85rem; }
    .tf button { padding: .4rem 1rem; border-radius: 8px; border: 1.5px solid #e2e8f0; background: #fff; cursor: pointer; font-weight: 600; }
    .tf button.on { background: #d1fae5; border-color: #10b981; color: #065f46; }
    @media (max-width: 900px) {
      .col-type, .col-marks { display: none; }
      .col-q { width: 40%; }
      .col-topic { width: 22%; }
      .col-status { width: 14%; }
      .col-act { width: 24%; }
    }
    @media (max-width: 640px) {
      .os-stage-bar { flex-direction: column; align-items: stretch; }
      .os-toolbar-group.end { margin-left: 0; width: 100%; }
      .os-toolbar-group.end .btn-secondary { width: 100%; }
      .col-status { display: none; }
      .col-q { width: 48%; }
      .col-topic { width: 24%; }
      .col-act { width: 28%; }
      .qb-actions { flex-direction: column; align-items: stretch; }
      .act-btn { width: 100%; }
      .sheet { width: 100%; }
    }
  `]
})
export class QuestionBankComponent implements OnInit {
  private assessment = inject(AssessmentService);
  private curriculum = inject(CurriculumService);
  private examSvc = inject(ExamService);
  private menuSvc = inject(MenuService);
  private aiReview = viewChild(AiReviewPanelComponent);

  readonly questionTypes = QUESTION_TYPES;

  items = signal<QuestionBankItemDto[]>([]);
  topics = signal<TopicOption[]>([]);
  papers = signal<ExamPaperDto[]>([]);
  loading = signal(false);
  busy = signal(false);
  error = signal('');
  formError = signal('');
  copyError = signal('');
  copyOk = signal('');
  showForm = signal(false);
  editingId = signal<number | null>(null);
  editTopicTitle = signal('');
  copyItem = signal<QuestionBankItemDto | null>(null);
  copyPaperId: number | null = null;

  /** none | generate | review — AI draft stays in memory only */
  aiMode = signal<'none' | 'generate' | 'review'>('none');
  aiDraft = signal<GenerateQuestionsResponse | null>(null);
  aiSaveOk = signal('');

  search = '';
  filterTopicId: number | null = null;
  filterType = '';
  filterActive: 'active' | 'all' | 'archived' = 'active';

  form: BankForm = this.blankForm();

  pageTitle = computed(() => this.menuSvc.titleForRoute('/exams/question-bank', 'Question Bank'));

  filtered = computed(() => {
    let list = this.items();
    if (this.filterType) {
      const t = Number(this.filterType);
      list = list.filter(q => q.questionTypeId === t);
    }
    if (this.filterActive === 'archived') list = list.filter(q => !q.isActive);
    return list;
  });

  ngOnInit() {
    this.menuSvc.ensureLoaded().subscribe();
    this.loadTopics();
    this.load();
  }

  openAiGenerate() {
    this.showForm.set(false);
    this.aiDraft.set(null);
    this.aiSaveOk.set('');
    this.aiMode.set('generate');
  }

  onAiGenerated(res: GenerateQuestionsResponse) {
    this.aiDraft.set(res);
    this.aiMode.set('review');
  }

  closeAi() {
    this.aiMode.set('none');
    this.aiDraft.set(null);
  }

  async saveAiSelected(selected: GeneratedQuestionDraftDto[]) {
    const review = this.aiReview();
    if (!selected.length) return;
    review?.setSaving(true);
    review?.setError('');
    review?.setOk('');

    const failed = new Set<string>();
    let saved = 0;
    for (const q of selected) {
      const typeId = q.questionTypeId || q.questionType;
      try {
        await firstValueFrom(this.assessment.createQuestionBankItem({
          courseTopicId: q.courseTopicId,
          questionType: typeId,
          questionText: q.questionText,
          language: q.language === 'ur-en' ? 'ur' : (q.language || 'en'),
          marks: q.marks,
          correctAnswer: typeId === 3 || typeId === 4 ? (q.correctAnswer ?? null) : null,
          isTrue: typeId === 2 ? (q.isTrue ?? null) : null,
          questionNote: q.questionNote ?? null,
          options: typeId === 1
            ? (q.options || []).map((o, i) => ({
                optionLabel: o.optionLabel || String.fromCharCode(65 + i),
                optionText: o.optionText,
                isCorrect: !!o.isCorrect,
                sortOrder: o.sortOrder || i + 1
              }))
            : []
        }));
        saved++;
      } catch (err: any) {
        failed.add(q.clientKey);
        const msg = err?.error?.error || 'Save failed.';
        review?.setError(`Failed on “${(q.questionText || '').slice(0, 40)}…”: ${msg}`);
      }
    }

    review?.setSaving(false);
    if (failed.size) {
      review?.keepFailed(failed);
      if (saved > 0) {
        review?.setOk(`${saved} question(s) saved. ${failed.size} failed — still selected for retry.`);
        this.load();
      }
      return;
    }

    review?.setOk(`${saved} question(s) added to the Question Bank.`);
    this.aiSaveOk.set(`${saved} AI question(s) added to the Question Bank.`);
    this.closeAi();
    this.load();
  }

  applyClientFilters() {
    // computed reads filterType via this.filterType — force refresh by reassigning items
    this.items.set([...this.items()]);
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.assessment.listQuestionBank({
      topicId: this.filterTopicId ?? undefined,
      search: this.search.trim() || undefined,
      activeOnly: this.filterActive === 'active' ? true : undefined
    }).subscribe({
      next: rows => {
        let list = rows || [];
        if (this.filterActive === 'archived') list = list.filter(r => !r.isActive);
        this.items.set(list);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(err?.error?.error || 'Failed to load question bank.');
      }
    });
  }

  typeLabel(id: number) {
    return this.questionTypes.find(t => t.value === id)?.label ?? String(id);
  }

  openCreate() {
    this.editingId.set(null);
    this.editTopicTitle.set('');
    this.form = this.blankForm();
    this.formError.set('');
    this.showForm.set(true);
  }

  openEdit(q: QuestionBankItemDto) {
    this.editingId.set(q.questionBankItemId);
    this.editTopicTitle.set(q.topicTitle || `Topic ${q.courseTopicId}`);
    this.form = {
      courseTopicId: q.courseTopicId,
      questionType: q.questionTypeId,
      questionText: q.questionText,
      marks: q.marks,
      correctAnswer: q.correctAnswer || '',
      isTrue: q.isTrue ?? null,
      questionNote: q.questionNote || '',
      isActive: q.isActive,
      options: q.options?.length
        ? q.options.map(o => ({ optionLabel: o.optionLabel, optionText: o.optionText, isCorrect: o.isCorrect }))
        : this.defaultOptions()
    };
    this.formError.set('');
    this.showForm.set(true);
  }

  closeForm() { this.showForm.set(false); }

  onTypeChange() {
    if (this.form.questionType === 1 && !this.form.options.length) {
      this.form.options = this.defaultOptions();
    }
    if (this.form.questionType === 2 && this.form.isTrue == null) this.form.isTrue = true;
  }

  setCorrect(i: number) {
    this.form.options.forEach((o, idx) => o.isCorrect = idx === i);
  }

  saveForm() {
    this.formError.set('');
    if (!this.form.questionText.trim()) {
      this.formError.set('Question text is required.');
      return;
    }
    if (!this.editingId() && !this.form.courseTopicId) {
      this.formError.set('Course topic is required.');
      return;
    }
    if (this.form.questionType === 1) {
      if (this.form.options.some(o => !o.optionText.trim()) || !this.form.options.some(o => o.isCorrect)) {
        this.formError.set('MCQ needs all options filled and one correct answer.');
        return;
      }
    }
    if (this.form.questionType === 2 && this.form.isTrue == null) {
      this.formError.set('Select True or False.');
      return;
    }

    this.busy.set(true);
    const id = this.editingId();
    if (id) {
      this.assessment.updateQuestionBankItem(id, {
        questionText: this.form.questionText.trim(),
        marks: this.form.marks,
        correctAnswer: this.form.correctAnswer || null,
        isTrue: this.form.questionType === 2 ? this.form.isTrue : null,
        questionNote: this.form.questionNote || null,
        isActive: this.form.isActive,
        options: this.form.questionType === 1
          ? this.form.options.map((o, i) => ({
              optionLabel: o.optionLabel, optionText: o.optionText, isCorrect: o.isCorrect, sortOrder: i
            }))
          : []
      }).subscribe({
        next: () => { this.busy.set(false); this.closeForm(); this.load(); },
        error: err => { this.busy.set(false); this.formError.set(err?.error?.error || 'Update failed.'); }
      });
    } else {
      this.assessment.createQuestionBankItem({
        courseTopicId: this.form.courseTopicId!,
        questionType: this.form.questionType,
        questionText: this.form.questionText.trim(),
        language: 'en',
        marks: this.form.marks || 1,
        correctAnswer: this.form.correctAnswer || null,
        isTrue: this.form.questionType === 2 ? this.form.isTrue : null,
        questionNote: this.form.questionNote || null,
        options: this.form.questionType === 1
          ? this.form.options.map((o, i) => ({
              optionLabel: o.optionLabel, optionText: o.optionText, isCorrect: o.isCorrect, sortOrder: i
            }))
          : []
      }).subscribe({
        next: () => { this.busy.set(false); this.closeForm(); this.load(); },
        error: err => { this.busy.set(false); this.formError.set(err?.error?.error || 'Create failed.'); }
      });
    }
  }

  openCopy(q: QuestionBankItemDto) {
    this.copyItem.set(q);
    this.copyPaperId = null;
    this.copyError.set('');
    this.copyOk.set('');
    this.examSvc.getPapers().subscribe({
      next: papers => this.papers.set(papers || []),
      error: () => this.papers.set([])
    });
  }

  closeCopy() { this.copyItem.set(null); }

  onCopyPaperChange(v: number | string | null) {
    if (v === null || v === '' || v === undefined) this.copyPaperId = null;
    else this.copyPaperId = Number(v);
  }

  confirmCopy() {
    const item = this.copyItem();
    if (!item || !this.copyPaperId) return;
    this.busy.set(true);
    this.copyError.set('');
    this.copyOk.set('');
    this.assessment.copyQuestionBankToPaper(this.copyPaperId, [item.questionBankItemId]).subscribe({
      next: () => {
        this.busy.set(false);
        this.copyOk.set('Copied to paper. The exam question is independent of the bank.');
      },
      error: err => {
        this.busy.set(false);
        this.copyError.set(err?.error?.error || 'Copy failed.');
      }
    });
  }

  private loadTopics() {
    // Prefer teacher workspace courses; fall back to published plans for admin/principal.
    this.curriculum.getMyCourses().pipe(
      catchError(() => of([])),
      switchMap(mine => {
        if (mine?.length) return of(mine);
        return this.curriculum.getPlans({ status: 'Published' }).pipe(catchError(() => of([])));
      }),
      switchMap(plans => {
        if (!plans.length) return of([] as TopicOption[]);
        return forkJoin(
          plans.slice(0, 20).map(p =>
            this.curriculum.getWorkspace(p.coursePlanId).pipe(
              catchError(() => this.curriculum.getPlan(p.coursePlanId)),
              catchError(() => of(null)),
              map(detail => {
                if (!detail?.chapters) return [] as TopicOption[];
                return detail.chapters.flatMap(ch =>
                  (ch.topics || []).map(t => ({
                    id: t.courseTopicId,
                    title: t.title,
                    label: `${t.title} · ${detail.className} · ${detail.subjectName}`
                  }))
                );
              })
            )
          )
        ).pipe(map(groups => groups.flat()));
      })
    ).subscribe(topics => {
      const uniq = new Map<number, TopicOption>();
      for (const t of topics) uniq.set(t.id, t);
      this.topics.set([...uniq.values()].sort((a, b) => a.title.localeCompare(b.title)));
    });
  }

  private blankForm(): BankForm {
    return {
      courseTopicId: null,
      questionType: 4,
      questionText: '',
      marks: 2,
      correctAnswer: '',
      isTrue: null,
      questionNote: '',
      isActive: true,
      options: this.defaultOptions()
    };
  }

  private defaultOptions() {
    return ['A', 'B', 'C', 'D'].map(l => ({ optionLabel: l, optionText: '', isCorrect: false }));
  }
}
