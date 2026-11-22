import { Component, EventEmitter, Input, OnInit, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { Message } from 'primeng/message';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { CurriculumService } from '../../../core/services/curriculum.service';
import { AiService } from '../../../core/services/ai.service';
import {
  AI_COUNTS,
  AI_DIFFICULTIES,
  AI_LANGUAGES,
  AI_QUESTION_TYPES,
  GenerateQuestionsResponse
} from '../../../core/models/ai.model';
import { CoursePlanDetailDto, CoursePlanListDto } from '../../../core/models/curriculum.model';

export interface AiTopicChoice {
  id: number;
  title: string;
  classId: number;
  subjectId: number;
  className: string;
  subjectName: string;
  planId: number;
}

@Component({
  selector: 'app-ai-generate-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, Button, Select, InputText, Textarea, Message],
  template: `
    <div class="ai-panel os-stage">
      <div class="ai-panel-head">
        <div class="ai-panel-title">
          <h3>AI Generate Questions</h3>
          <p class="ai-panel-sub">Select curriculum, then generate a draft to review before saving.</p>
        </div>
        <p-button label="Close" icon="pi pi-times" size="small" severity="secondary" [outlined]="true"
          (onClick)="cancelled.emit()" [disabled]="busy()" />
      </div>

      <div class="ai-panel-body">
        @if (loadError()) {
          <p-message severity="error" styleClass="mb-2.5 w-full" [text]="loadError()" />
        }
        @if (error()) {
          <p-message severity="error" styleClass="mb-2.5 w-full" [text]="error()" />
        }

        <div class="ai-section">
          <div class="ai-section-label">Curriculum</div>
          <div class="ai-row cascade">
            <div class="os-field">
              <label class="os-field-label">Class</label>
              <p-select class="w-full" placeholder="Select class…" [options]="classes()"
                optionLabel="name" optionValue="id" [showClear]="true"
                [(ngModel)]="classId" (ngModelChange)="onClassChange()" />
            </div>
            <div class="os-field">
              <label class="os-field-label">Subject</label>
              <p-select class="w-full" placeholder="Select subject…" [options]="subjectsForClass()"
                optionLabel="name" optionValue="id" [showClear]="true"
                [(ngModel)]="subjectId" (ngModelChange)="onSubjectChange()" [disabled]="!classId" />
            </div>
            <div class="os-field topic">
              <label class="os-field-label">Topic</label>
              <p-select class="w-full" placeholder="Select topic…" [options]="topicsForSelection()"
                optionLabel="title" optionValue="id" [showClear]="true"
                [filter]="topicsForSelection().length > 8" filterBy="title"
                [(ngModel)]="courseTopicId" [disabled]="!classId || !subjectId" />
            </div>
          </div>
        </div>

        <div class="ai-section">
          <div class="ai-section-label">Question settings</div>
          <div class="ai-row options">
            <div class="os-field count">
              <label class="os-field-label">Count</label>
              <p-select class="w-full" [options]="counts" [(ngModel)]="count" />
            </div>
            <div class="os-field type">
              <label class="os-field-label">Question type</label>
              <p-select class="w-full" [options]="questionTypes" optionLabel="label" optionValue="value"
                [(ngModel)]="questionType" />
            </div>
            <div class="os-field">
              <label class="os-field-label">Difficulty</label>
              <p-select class="w-full" [options]="difficulties" [(ngModel)]="difficulty" />
            </div>
            <div class="os-field marks">
              <label class="os-field-label">Marks</label>
              <input pInputText class="w-full" type="number" min="1" max="100" [(ngModel)]="marks" />
            </div>
            <div class="os-field">
              <label class="os-field-label">Language</label>
              <p-select class="w-full" [options]="languages" optionLabel="label" optionValue="value"
                [(ngModel)]="language" />
            </div>
          </div>

          <div class="os-field instructions">
            <label class="os-field-label">Optional instructions</label>
            <textarea pTextarea class="w-full" rows="2" maxlength="1000" [(ngModel)]="instructions"
              placeholder="Extra context for the AI (not saved until you approve questions)…"></textarea>
          </div>
        </div>

        <div class="ai-actions">
          <p-button [label]="busy() ? 'Generating…' : 'Generate draft'" icon="pi pi-sparkles"
            [loading]="busy()" (onClick)="generate()" [disabled]="busy() || !canGenerate()" />
          <span class="hint">Drafts are not saved until you add selected questions to the bank.</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; min-width: 0; }

    .ai-panel {
      box-sizing: border-box;
      max-width: 100%;
      overflow-x: hidden;
      margin: 0;
    }
    .ai-panel-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 14px;
      border-bottom: 1px solid color-mix(in srgb, var(--border) 90%, transparent);
      background: var(--surface);
    }
    .ai-panel-title { min-width: 0; flex: 1; }
    .ai-panel-head h3 {
      margin: 0;
      font-size: 13.5px;
      font-weight: 700;
      color: var(--t1);
      line-height: 1.3;
    }
    .ai-panel-sub {
      margin: 2px 0 0;
      font-size: 12px;
      color: var(--t3);
      line-height: 1.35;
      max-width: 42rem;
    }
    .ai-panel-body {
      padding: 12px 14px 14px;
      background: var(--surface);
      box-sizing: border-box;
    }

    .ai-section + .ai-section {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid color-mix(in srgb, var(--border) 85%, transparent);
    }
    .ai-section-label {
      margin: 0 0 8px;
      font-size: 11px;
      font-weight: 700;
      color: var(--t3);
      text-transform: uppercase;
      letter-spacing: .05em;
      line-height: 1.2;
    }

    .os-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
    .os-field-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--t3);
      text-transform: uppercase;
      letter-spacing: .02em;
      line-height: 1.2;
    }
    .ai-row {
      display: grid;
      gap: 10px;
      min-width: 0;
    }
    .ai-row.cascade {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .ai-row.options {
      grid-template-columns: minmax(0, 0.7fr) minmax(0, 1.5fr) minmax(0, 1fr) minmax(0, 0.7fr) minmax(0, 1fr);
      margin-bottom: 10px;
    }
    .instructions { margin-bottom: 0; }

    .ai-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      margin-top: 14px;
      padding-top: 12px;
      border-top: 1px solid color-mix(in srgb, var(--border) 85%, transparent);
    }
    .hint {
      flex: 1;
      min-width: 0;
      font-size: 12px;
      color: var(--t3);
      line-height: 1.35;
    }

    @media (max-width: 900px) {
      .ai-row.cascade { grid-template-columns: 1fr 1fr; }
      .ai-row.cascade .topic { grid-column: 1 / -1; }
      .ai-row.options { grid-template-columns: 1fr 1fr; }
      .ai-row.options .type { grid-column: 1 / -1; }
    }
    @media (max-width: 420px) {
      .ai-panel-head,
      .ai-panel-body { padding-left: 10px; padding-right: 10px; }
      .ai-row.cascade,
      .ai-row.options { grid-template-columns: 1fr; }
      .ai-row.cascade .topic,
      .ai-row.options .type { grid-column: auto; }
      .ai-actions { flex-direction: column; align-items: stretch; gap: 8px; }
    }
  `]
})
export class AiGeneratePanelComponent implements OnInit {
  private curriculum = inject(CurriculumService);
  private ai = inject(AiService);

  @Output() generated = new EventEmitter<GenerateQuestionsResponse>();
  @Output() cancelled = new EventEmitter<void>();

  readonly counts = [...AI_COUNTS];
  readonly difficulties = [...AI_DIFFICULTIES];
  readonly languages = [...AI_LANGUAGES];
  readonly questionTypes = [...AI_QUESTION_TYPES];

  topics = signal<AiTopicChoice[]>([]);
  loadError = signal('');
  error = signal('');
  busy = signal(false);

  classId: number | null = null;
  subjectId: number | null = null;
  courseTopicId: number | null = null;
  count: 5 | 10 | 20 = 5;
  questionType = 1;
  difficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium';
  marks = 1;
  language: 'en' | 'ur' | 'ur-en' = 'en';
  instructions = '';

  classes = computed(() => {
    const map = new Map<number, string>();
    for (const t of this.topics()) map.set(t.classId, t.className);
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  });

  // Methods (not computed): classId/subjectId are plain fields; an early-return
  // computed never registered topics() and stayed stale after Class selection.
  subjectsForClass() {
    const all = this.topics();
    if (!this.classId) return [] as { id: number; name: string }[];
    const map = new Map<number, string>();
    for (const t of all) {
      if (t.classId === this.classId) map.set(t.subjectId, t.subjectName);
    }
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }

  topicsForSelection() {
    const all = this.topics();
    if (!this.classId || !this.subjectId) return [] as AiTopicChoice[];
    return all.filter(t => t.classId === this.classId && t.subjectId === this.subjectId);
  }

  ngOnInit() {
    this.loadTopics();
  }

  canGenerate() {
    return !!(this.classId && this.subjectId && this.courseTopicId && this.marks > 0);
  }

  onClassChange() {
    this.subjectId = null;
    this.courseTopicId = null;
  }

  onSubjectChange() {
    this.courseTopicId = null;
  }

  generate() {
    if (!this.canGenerate() || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.ai.generateQuestions({
      classId: this.classId!,
      subjectId: this.subjectId!,
      courseTopicId: this.courseTopicId!,
      count: this.count,
      questionType: this.questionType,
      difficulty: this.difficulty,
      marks: this.marks,
      language: this.language,
      instructions: this.instructions.trim() || null
    }).subscribe({
      next: res => {
        this.busy.set(false);
        const items = (res.items || []).map(i => ({ ...i, selected: true, expanded: false }));
        this.generated.emit({ ...res, items });
      },
      error: err => {
        this.busy.set(false);
        const status = err?.status;
        const msg = err?.error?.error || err?.message;
        if (status === 403) this.error.set('You are not authorized for this class, subject, or topic.');
        else if (status === 429) this.error.set(msg || 'Rate limit exceeded. Try again later.');
        else if (status === 503) this.error.set(msg || 'AI generation is currently disabled.');
        else this.error.set(msg || 'Generation failed.');
      }
    });
  }

  private loadTopics() {
    this.loadError.set('');
    this.curriculum.getMyCourses().pipe(
      catchError(() => of([] as CoursePlanListDto[])),
      switchMap(mine => {
        if (mine?.length) return of(mine);
        return this.curriculum.getPlans({ status: 'Published' }).pipe(catchError(() => of([] as CoursePlanListDto[])));
      }),
      switchMap(plans => {
        if (!plans.length) return of([] as AiTopicChoice[]);
        return forkJoin(
          plans.slice(0, 30).map(p =>
            this.curriculum.getWorkspace(p.coursePlanId).pipe(
              catchError(() => this.curriculum.getPlan(p.coursePlanId)),
              catchError(() => of(null as CoursePlanDetailDto | null)),
              map(detail => {
                if (!detail?.chapters) return [] as AiTopicChoice[];
                return detail.chapters.flatMap(ch =>
                  (ch.topics || []).map(t => ({
                    id: t.courseTopicId,
                    title: t.title,
                    classId: detail.classId,
                    subjectId: detail.subjectId,
                    className: detail.className,
                    subjectName: detail.subjectName,
                    planId: detail.coursePlanId
                  }))
                );
              })
            )
          )
        ).pipe(map(groups => groups.flat()));
      })
    ).subscribe({
      next: topics => {
        const uniq = new Map<number, AiTopicChoice>();
        for (const t of topics) uniq.set(t.id, t);
        this.topics.set([...uniq.values()].sort((a, b) => a.title.localeCompare(b.title)));
        if (!topics.length) this.loadError.set('No course topics available for AI generation.');
      },
      error: () => this.loadError.set('Failed to load topics for AI generation.')
    });
  }
}
