import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AI_QUESTION_TYPES,
  GenerateQuestionsResponse,
  GeneratedQuestionDraftDto
} from '../../../core/models/ai.model';

@Component({
  selector: 'app-ai-review-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="ai-review os-stage">
      <div class="ai-review-head">
        <div class="ai-review-title">
          <h3>Review AI draft</h3>
          <p class="sub">Edit and select questions, then add them to the Question Bank. Nothing is saved until you approve.</p>
        </div>
        <div class="head-actions">
          <button type="button" class="btn-ghost" (click)="selectAll()" [disabled]="saving()">Select all</button>
          <button type="button" class="btn-ghost" (click)="deselectAll()" [disabled]="saving()">Deselect all</button>
          <button type="button" class="btn-ghost" (click)="discard.emit()" [disabled]="saving()">Discard</button>
          <button type="button" class="btn-primary" (click)="addSelected()" [disabled]="saving() || selectedCount() === 0">
            @if (saving()) { Saving… } @else { Add selected ({{ selectedCount() }}) }
          </button>
        </div>
      </div>

      <div class="ai-review-body">
        @if (warnings().length) {
          <div class="os-alert warn">
            @for (w of warnings(); track w) { <div>{{ w }}</div> }
          </div>
        }
        @if (error()) {
          <div class="os-alert error">{{ error() }}</div>
        }
        @if (ok()) {
          <div class="os-alert ok">{{ ok() }}</div>
        }

        <div class="ai-section-label">Draft questions ({{ items().length }})</div>

        <div class="draft-list">
          @for (q of items(); track q.clientKey; let i = $index) {
            <article class="draft-item" [class.selected]="q.selected">
              <header class="draft-head">
                <label class="sel">
                  <input type="checkbox" [(ngModel)]="q.selected" [disabled]="saving()" />
                  <span class="q-title">Q{{ i + 1 }} · {{ typeLabel(q.questionTypeId || q.questionType) }}</span>
                </label>
                @if (q.difficulty) {
                  <span class="diff">{{ q.difficulty }}</span>
                }
              </header>

              <div class="draft-body">
                <div class="os-field">
                  <label class="os-field-label">Question</label>
                  <textarea class="os-input" rows="2" [(ngModel)]="q.questionText" [disabled]="saving()"
                    [attr.dir]="q.language === 'ur' || q.language === 'ur-en' ? 'rtl' : 'ltr'"></textarea>
                </div>

                <div class="meta-row">
                  <div class="os-field marks">
                    <label class="os-field-label">Marks</label>
                    <input class="os-input" type="number" min="1" [(ngModel)]="q.marks" [disabled]="saving()" />
                  </div>
                  <div class="os-field grow">
                    <label class="os-field-label">Explanation</label>
                    <input class="os-input" [(ngModel)]="q.questionNote" [disabled]="saving()" />
                  </div>
                </div>

                @if ((q.questionTypeId || q.questionType) === 1) {
                  <div class="opts">
                    <div class="os-field-label opts-label">Options</div>
                    @for (o of q.options; track o.optionLabel) {
                      <label class="opt">
                        <input type="radio" [name]="'ai-correct-' + q.clientKey"
                          [checked]="o.isCorrect"
                          (change)="setCorrect(q, o.optionLabel)"
                          [disabled]="saving()" />
                        <span class="lbl">{{ o.optionLabel }}</span>
                        <input class="os-input" [(ngModel)]="o.optionText" [disabled]="saving()" />
                      </label>
                    }
                  </div>
                }
                @if ((q.questionTypeId || q.questionType) === 2) {
                  <div class="os-field correct-field">
                    <label class="os-field-label">Correct</label>
                    <select class="os-input" [(ngModel)]="q.isTrue" [disabled]="saving()">
                      <option [ngValue]="true">True</option>
                      <option [ngValue]="false">False</option>
                    </select>
                  </div>
                }
                @if ((q.questionTypeId || q.questionType) === 3 || (q.questionTypeId || q.questionType) === 4) {
                  <div class="os-field">
                    <label class="os-field-label">Correct / model answer</label>
                    <textarea class="os-input" rows="2" [(ngModel)]="q.correctAnswer" [disabled]="saving()"></textarea>
                  </div>
                }
              </div>
            </article>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; min-width: 0; }

    .ai-review {
      box-sizing: border-box;
      max-width: 100%;
      overflow-x: hidden;
      margin: 0;
    }

    .ai-review-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      padding: 10px 14px;
      border-bottom: 1px solid color-mix(in srgb, var(--border) 90%, transparent);
      background: var(--surface);
    }
    .ai-review-title { min-width: 0; flex: 1; }
    .ai-review-head h3 {
      margin: 0;
      font-size: 13.5px;
      font-weight: 700;
      color: var(--t1);
      line-height: 1.3;
    }
    .sub {
      margin: 2px 0 0;
      font-size: 12px;
      color: var(--t3);
      line-height: 1.35;
      max-width: 42rem;
    }
    .head-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }

    .ai-review .btn-ghost {
      height: 32px;
      padding: 0 12px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--t2);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      border-radius: 0;
    }
    .ai-review .btn-ghost:hover:not(:disabled) {
      background: var(--surface-2);
      color: var(--t1);
    }
    .ai-review .btn-ghost:disabled { opacity: .5; cursor: not-allowed; }

    .ai-review .btn-primary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 32px;
      min-height: 32px;
      padding: 0 14px;
      border: none;
      border-radius: 0;
      background: var(--accent);
      color: #fff;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 1px 4px rgba(var(--accent-rgb), 0.35);
      white-space: nowrap;
    }
    .ai-review .btn-primary:hover:not(:disabled) {
      background: var(--accent-h);
      box-shadow: 0 4px 12px rgba(var(--accent-rgb), 0.4);
    }
    .ai-review .btn-primary:disabled {
      background: var(--surface-2);
      color: var(--t4);
      box-shadow: none;
      cursor: not-allowed;
      opacity: 1;
      border: 1px solid var(--border);
    }

    .ai-review-body {
      padding: 12px 14px 14px;
      background: var(--surface);
      box-sizing: border-box;
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

    .os-alert {
      margin: 0 0 10px;
      padding: 8px 10px;
      font-size: 12px;
      border-radius: 0;
      line-height: 1.35;
    }
    .os-alert.warn { background: #fff7ed; color: #9a3412; border: 1px solid #fed7aa; }
    .os-alert.error { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
    .os-alert.ok { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }

    .draft-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-height: min(70vh, 720px);
      overflow-x: hidden;
      overflow-y: auto;
      min-width: 0;
      padding-right: 2px;
    }

    .draft-item {
      flex: 0 0 auto;
      align-self: stretch;
      width: 100%;
      min-width: 0;
      min-height: min-content;
      border: 1px solid var(--border);
      border-radius: 0;
      background: var(--surface);
      box-sizing: border-box;
      box-shadow: none;
    }
    .draft-item.selected {
      border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
      box-shadow: inset 3px 0 0 var(--accent);
    }
    .draft-item:not(.selected) {
      opacity: .92;
    }

    .draft-head {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      background: var(--surface-2);
      border-bottom: 1px solid color-mix(in srgb, var(--border) 85%, transparent);
    }
    .sel {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      min-width: 0;
      cursor: pointer;
      margin: 0;
    }
    .sel input { flex-shrink: 0; accent-color: var(--accent); }
    .q-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--t1);
      line-height: 1.3;
      min-width: 0;
    }
    .diff {
      flex-shrink: 0;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      background: var(--surface);
      color: var(--t3);
      border: 1px solid var(--border);
      border-radius: 0;
      text-transform: uppercase;
      letter-spacing: .03em;
    }

    .draft-body {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 10px 12px 12px;
      min-width: 0;
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
    .os-input {
      width: 100%;
      height: 34px;
      padding: 0 10px;
      border: 1px solid var(--border);
      border-radius: 0 !important;
      font-size: 13px;
      font-family: inherit;
      background: var(--surface);
      color: var(--t1);
      box-sizing: border-box;
    }
    .os-input:disabled {
      background: var(--surface-2);
      color: var(--t4);
      cursor: not-allowed;
      opacity: 1;
    }
    .os-input:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: var(--input-shadow-focus);
    }
    textarea.os-input {
      height: auto;
      min-height: 52px;
      max-height: 96px;
      padding: 8px 10px;
      resize: vertical;
      line-height: 1.4;
    }

    .meta-row {
      display: grid;
      grid-template-columns: 88px minmax(0, 1fr);
      gap: 10px;
      min-width: 0;
    }
    .correct-field { max-width: 180px; }

    .opts {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
    }
    .opts-label { margin-bottom: 2px; }
    .opt {
      display: grid;
      grid-template-columns: auto 22px minmax(0, 1fr);
      align-items: center;
      gap: 8px;
      margin: 0;
      min-width: 0;
    }
    .opt input[type="radio"] { accent-color: var(--accent); }
    .opt .lbl {
      font-size: 12px;
      font-weight: 700;
      color: var(--t2);
      text-align: center;
    }

    @media (max-width: 720px) {
      .ai-review-head { padding: 10px; }
      .ai-review-body { padding: 10px; }
      .head-actions { width: 100%; }
      .ai-review .btn-primary { flex: 1; }
      .meta-row { grid-template-columns: 1fr; }
      .correct-field { max-width: none; }
    }
    @media (max-width: 420px) {
      .head-actions { flex-direction: column; align-items: stretch; }
      .ai-review .btn-ghost,
      .ai-review .btn-primary { width: 100%; }
      .draft-head { flex-wrap: wrap; }
    }
  `]
})
export class AiReviewPanelComponent {
  readonly questionTypes = AI_QUESTION_TYPES;

  items = signal<GeneratedQuestionDraftDto[]>([]);
  warnings = signal<string[]>([]);
  error = signal('');
  ok = signal('');
  saving = signal(false);

  @Input() set draft(value: GenerateQuestionsResponse | null) {
    if (!value) {
      this.items.set([]);
      this.warnings.set([]);
      return;
    }
    this.items.set((value.items || []).map(i => ({
      ...i,
      selected: i.selected !== false,
      expanded: !!i.expanded,
      options: (i.options || []).map(o => ({ ...o }))
    })));
    this.warnings.set(value.warnings || []);
    this.error.set('');
    this.ok.set('');
  }

  @Output() discard = new EventEmitter<void>();
  @Output() addSelectedRequest = new EventEmitter<GeneratedQuestionDraftDto[]>();

  selectedCount() {
    return this.items().filter(i => i.selected).length;
  }

  typeLabel(id: number) {
    return this.questionTypes.find(t => t.value === id)?.label ?? String(id);
  }

  selectAll() {
    this.items.update(list => list.map(i => ({ ...i, selected: true })));
  }

  deselectAll() {
    this.items.update(list => list.map(i => ({ ...i, selected: false })));
  }

  setCorrect(q: GeneratedQuestionDraftDto, label: string) {
    for (const o of q.options) o.isCorrect = o.optionLabel === label;
  }

  addSelected() {
    const selected = this.items().filter(i => i.selected);
    if (!selected.length) return;
    this.error.set('');
    this.ok.set('');
    this.addSelectedRequest.emit(selected);
  }

  /** Called by parent while saving / after partial failure. */
  setSaving(v: boolean) { this.saving.set(v); }
  setError(msg: string) { this.error.set(msg); }
  setOk(msg: string) { this.ok.set(msg); }
  keepFailed(failedKeys: Set<string>) {
    this.items.update(list => list.map(i => ({
      ...i,
      selected: failedKeys.has(i.clientKey)
    })));
  }
}
