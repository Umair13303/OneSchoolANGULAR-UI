import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Tag } from 'primeng/tag';
import { Select } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { Checkbox } from 'primeng/checkbox';
import { RadioButton } from 'primeng/radiobutton';
import { Message } from 'primeng/message';
import {
  AI_QUESTION_TYPES,
  GenerateQuestionsResponse,
  GeneratedQuestionDraftDto
} from '../../../core/models/ai.model';

@Component({
  selector: 'app-ai-review-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, Button, Tag, Select, InputText, Textarea, Checkbox, RadioButton, Message],
  template: `
    <div class="ai-review os-stage">
      <div class="ai-review-head">
        <div class="ai-review-title">
          <h3>Review AI draft</h3>
          <p class="sub">Edit and select questions, then add them to the Question Bank. Nothing is saved until you approve.</p>
        </div>
        <div class="head-actions flex flex-wrap items-center gap-2">
          <p-button label="Select all" size="small" severity="secondary" [outlined]="true"
            (onClick)="selectAll()" [disabled]="saving()" />
          <p-button label="Deselect all" size="small" severity="secondary" [outlined]="true"
            (onClick)="deselectAll()" [disabled]="saving()" />
          <p-button label="Discard" size="small" severity="danger" [outlined]="true"
            (onClick)="discard.emit()" [disabled]="saving()" />
          <p-button size="small" icon="pi pi-check" [loading]="saving()"
            [label]="saving() ? 'Saving…' : 'Add selected (' + selectedCount() + ')'"
            (onClick)="addSelected()" [disabled]="saving() || selectedCount() === 0" />
        </div>
      </div>

      <div class="ai-review-body">
        @if (warnings().length) {
          <p-message severity="warn" styleClass="mb-2.5 w-full">
            <div>
              @for (w of warnings(); track w) { <div>{{ w }}</div> }
            </div>
          </p-message>
        }
        @if (error()) {
          <p-message severity="error" styleClass="mb-2.5 w-full" [text]="error()" />
        }
        @if (ok()) {
          <p-message severity="success" styleClass="mb-2.5 w-full" [text]="ok()" />
        }

        <div class="ai-section-label">Draft questions ({{ items().length }})</div>

        <div class="draft-list">
          @for (q of items(); track q.clientKey; let i = $index) {
            <article class="draft-item" [class.selected]="q.selected">
              <header class="draft-head">
                <label class="sel">
                  <p-checkbox [binary]="true" [(ngModel)]="q.selected" [disabled]="saving()" />
                  <span class="q-title">Q{{ i + 1 }} · {{ typeLabel(q.questionTypeId || q.questionType) }}</span>
                </label>
                @if (q.difficulty) {
                  <p-tag [value]="q.difficulty" severity="secondary" />
                }
              </header>

              <div class="draft-body">
                <div class="os-field">
                  <label class="os-field-label">Question</label>
                  <textarea pTextarea class="w-full" rows="2" [(ngModel)]="q.questionText" [disabled]="saving()"
                    [attr.dir]="q.language === 'ur' || q.language === 'ur-en' ? 'rtl' : 'ltr'"></textarea>
                </div>

                <div class="meta-row">
                  <div class="os-field marks">
                    <label class="os-field-label">Marks</label>
                    <input pInputText class="w-full" type="number" min="1" [(ngModel)]="q.marks" [disabled]="saving()" />
                  </div>
                  <div class="os-field grow">
                    <label class="os-field-label">Explanation</label>
                    <input pInputText class="w-full" [(ngModel)]="q.questionNote" [disabled]="saving()" />
                  </div>
                </div>

                @if ((q.questionTypeId || q.questionType) === 1) {
                  <div class="opts">
                    <div class="os-field-label opts-label">Options</div>
                    @for (o of q.options; track o.optionLabel) {
                      <label class="opt">
                        <p-radiobutton [name]="'ai-correct-' + q.clientKey"
                          [value]="o.optionLabel"
                          [ngModel]="correctLabel(q)"
                          (ngModelChange)="setCorrect(q, $event)"
                          [disabled]="saving()" />
                        <span class="lbl">{{ o.optionLabel }}</span>
                        <input pInputText class="w-full" [(ngModel)]="o.optionText" [disabled]="saving()" />
                      </label>
                    }
                  </div>
                }
                @if ((q.questionTypeId || q.questionType) === 2) {
                  <div class="os-field correct-field">
                    <label class="os-field-label">Correct</label>
                    <p-select class="w-full" [options]="trueFalseOptions" optionLabel="label" optionValue="value"
                      appendTo="body" [(ngModel)]="q.isTrue" [disabled]="saving()" />
                  </div>
                }
                @if ((q.questionTypeId || q.questionType) === 3 || (q.questionTypeId || q.questionType) === 4) {
                  <div class="os-field">
                    <label class="os-field-label">Correct / model answer</label>
                    <textarea pTextarea class="w-full" rows="2" [(ngModel)]="q.correctAnswer" [disabled]="saving()"></textarea>
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
    .q-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--t1);
      line-height: 1.3;
      min-width: 0;
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
      .meta-row { grid-template-columns: 1fr; }
      .correct-field { max-width: none; }
    }
    @media (max-width: 420px) {
      .head-actions { flex-direction: column; align-items: stretch; }
      .draft-head { flex-wrap: wrap; }
    }
  `]
})
export class AiReviewPanelComponent {
  readonly questionTypes = AI_QUESTION_TYPES;
  readonly trueFalseOptions = [
    { label: 'True', value: true },
    { label: 'False', value: false }
  ];

  correctLabel(q: GeneratedQuestionDraftDto): string | null {
    return q.options?.find(o => o.isCorrect)?.optionLabel ?? null;
  }

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

  setCorrect(q: GeneratedQuestionDraftDto, label: string | null) {
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
