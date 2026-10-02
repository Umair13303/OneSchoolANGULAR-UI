import {
  AfterViewInit,
  Component,
  OnDestroy,
  ViewEncapsulation,
  forwardRef,
  inject,
  input,
  viewChild,
  ElementRef
} from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import Quill from 'quill';
import katex from 'katex';
import 'quill/dist/quill.snow.css';
import 'katex/dist/katex.min.css';
import { FileUploadService } from '../../core/services/file-upload.service';
import { environment } from '../../../environments/environment';
import { ensureKatexGlobal, isEmptyRichHtml, sanitizeRichHtml } from './rich-content.util';

const BlockEmbed = Quill.import('blots/block/embed') as any;
class DividerBlot extends BlockEmbed {
  static blotName = 'divider';
  static tagName = 'HR';
}
Quill.register(DividerBlot, true);

@Component({
  selector: 'app-rich-content-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RichContentEditorComponent),
      multi: true
    }
  ],
  template: `
    <div class="rce" [class.rce-disabled]="disabled">
      <div #toolbar class="rce-toolbar">
        <span class="ql-formats">
          <select class="ql-header">
            <option value="1"></option>
            <option value="2"></option>
            <option value="3"></option>
            <option selected></option>
          </select>
        </span>
        <span class="ql-formats">
          <button type="button" class="ql-bold" title="Bold"></button>
          <button type="button" class="ql-italic" title="Italic"></button>
          <button type="button" class="ql-underline" title="Underline"></button>
          <button type="button" class="ql-strike" title="Strikethrough"></button>
        </span>
        <span class="ql-formats">
          <button type="button" class="ql-script" value="super" title="Superscript (x²)"></button>
          <button type="button" class="ql-script" value="sub" title="Subscript"></button>
          <button type="button" class="ql-formula" title="Math formula (LaTeX)"></button>
        </span>
        <span class="ql-formats">
          <button type="button" class="ql-list" value="ordered" title="Numbered list"></button>
          <button type="button" class="ql-list" value="bullet" title="Bullet list"></button>
          <button type="button" class="ql-indent" value="-1" title="Decrease indent"></button>
          <button type="button" class="ql-indent" value="+1" title="Increase indent"></button>
        </span>
        <span class="ql-formats">
          <select class="ql-align" title="Align">
            <option selected></option>
            <option value="center"></option>
            <option value="right"></option>
            <option value="justify"></option>
          </select>
          <button type="button" class="ql-direction" value="rtl" title="RTL paragraph (Urdu / Arabic)"></button>
        </span>
        <span class="ql-formats">
          <button type="button" class="ql-link" title="Link"></button>
          <button type="button" class="ql-image" title="Insert image"></button>
          <button type="button" class="ql-table" title="Insert table"></button>
          <button type="button" class="ql-hr" title="Horizontal rule"></button>
        </span>
        <span class="ql-formats">
          <button type="button" class="ql-undo" title="Undo"></button>
          <button type="button" class="ql-redo" title="Redo"></button>
          <button type="button" class="ql-clean" title="Clear formatting"></button>
        </span>
      </div>
      <div #host class="rce-host" [style.minHeight]="minHeight()"></div>
      @if (formulaOpen) {
        <div class="rce-formula-bar">
          <label class="rce-formula-label">Math (LaTeX)</label>
          <input class="rce-formula-input" [(ngModel)]="formulaDraft"
            placeholder="e.g. x^2 , \\frac{a}{b} , \\sqrt{25} , \\alpha"
            (keydown.enter)="insertFormula(); $event.preventDefault()" />
          <div class="rce-formula-chips">
            @for (c of formulaChips; track c.latex) {
              <button type="button" class="rce-chip" (click)="formulaDraft = c.latex">{{ c.label }}</button>
            }
          </div>
          <div class="rce-formula-actions">
            <button type="button" class="btn-secondary rce-btn" (click)="cancelFormula()">Cancel</button>
            <button type="button" class="btn-primary rce-btn" (click)="insertFormula()" [disabled]="!formulaDraft.trim()">Insert</button>
          </div>
          @if (formulaPreview) {
            <div class="rce-formula-preview" [innerHTML]="formulaPreview"></div>
          }
        </div>
      }
      @if (hint()) {
        <div class="rce-hint">{{ hint() }}</div>
      }
      @if (uploadError) {
        <div class="rce-error">{{ uploadError }}</div>
      }
    </div>
  `,
  styles: [`
    .rce {
      border: 1px solid var(--border, #e5e7eb);
      border-radius: 10px;
      background: var(--surface, #fff);
      overflow: hidden;
    }
    .rce-disabled { opacity: .65; pointer-events: none; }
    .rce-toolbar {
      border-bottom: 1px solid var(--border, #e5e7eb);
      background: var(--surface-2, #f8fafc);
      padding: .35rem .4rem;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: .15rem;
      min-height: 42px;
      max-height: none;
      overflow: visible;
    }
    .rce .ql-toolbar.ql-snow {
      border: none;
      padding: 0;
      font-family: inherit;
    }
    .rce .ql-toolbar.ql-snow .ql-formats {
      display: inline-flex;
      flex-wrap: wrap;
      align-items: center;
      margin-right: .45rem;
      vertical-align: middle;
    }
    /* Quill SVGs explode without snow.css sizing — pin them */
    .rce .ql-toolbar svg {
      width: 18px !important;
      height: 18px !important;
      max-width: 18px !important;
      max-height: 18px !important;
      display: inline-block;
      vertical-align: middle;
    }
    .rce .ql-toolbar button,
    .rce .ql-toolbar .ql-picker-label {
      width: 28px;
      height: 28px;
      display: inline-flex !important;
      align-items: center;
      justify-content: center;
      vertical-align: middle;
      float: none !important;
      box-sizing: border-box;
    }
    .rce .ql-toolbar .ql-picker {
      display: inline-flex !important;
      float: none !important;
      height: 28px;
      vertical-align: middle;
    }
    .rce .ql-toolbar .ql-picker:not(.ql-color-picker):not(.ql-icon-picker) .ql-picker-label {
      padding-right: 16px;
      width: auto;
      min-width: 72px;
      justify-content: flex-start;
      position: relative;
    }
    .rce .ql-toolbar .ql-picker:not(.ql-color-picker):not(.ql-icon-picker) .ql-picker-label svg {
      position: absolute;
      right: 2px;
      top: 50%;
      margin-top: -9px;
    }
    .rce .ql-toolbar .ql-picker-options {
      display: none;
      position: absolute;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(15, 23, 42, .12);
      padding: .35rem;
      z-index: 20;
      max-height: 220px;
      overflow: auto;
    }
    .rce .ql-toolbar .ql-picker.ql-expanded .ql-picker-options {
      display: block;
    }
    .rce .ql-toolbar .ql-picker.ql-expanded .ql-picker-label {
      z-index: 21;
    }
    .rce .ql-toolbar .ql-icon-picker .ql-picker-options {
      width: auto;
      padding: .25rem;
    }
    .rce .ql-toolbar .ql-icon-picker .ql-picker-item {
      display: inline-flex;
      width: 28px;
      height: 28px;
      align-items: center;
      justify-content: center;
    }
    .rce .ql-container.ql-snow {
      border: none;
      font-family: inherit;
      font-size: 14px;
    }
    .rce-host { min-height: 160px; }
    .rce .ql-editor {
      min-height: 140px;
      line-height: 1.55;
      color: var(--t1, #111827);
    }
    .rce .ql-editor.ql-blank::before {
      color: var(--t4, #9ca3af);
      font-style: normal;
      left: 15px;
      right: 15px;
    }
    .rce .ql-editor[dir="rtl"],
    .rce .ql-editor *[dir="rtl"],
    .rce .ql-editor .ql-direction-rtl {
      direction: rtl;
      text-align: right;
    }
    .rce .ql-editor .ql-align-center { text-align: center; }
    .rce .ql-editor .ql-align-right { text-align: right; }
    .rce .ql-editor .ql-align-justify { text-align: justify; }
    .rce .ql-editor img {
      max-width: 100%;
      height: auto;
      border-radius: 6px;
    }
    .rce .ql-editor table {
      border-collapse: collapse;
      width: 100%;
      margin: .5rem 0;
    }
    .rce .ql-editor td, .rce .ql-editor th {
      border: 1px solid #cbd5e1;
      padding: .35rem .5rem;
    }
    .rce .ql-editor hr {
      border: none;
      border-top: 1px solid #cbd5e1;
      margin: .85rem 0;
    }
    .rce .ql-snow .ql-undo::before,
    .rce .ql-snow .ql-redo::before,
    .rce .ql-snow .ql-table::before,
    .rce .ql-snow .ql-hr::before {
      display: inline-block;
      width: 18px;
      text-align: center;
      font-weight: 700;
      font-size: 13px;
      line-height: 18px;
    }
    .rce .ql-snow .ql-undo::before { content: '↶'; }
    .rce .ql-snow .ql-redo::before { content: '↷'; }
    .rce .ql-snow .ql-table::before { content: '▦'; }
    .rce .ql-snow .ql-hr::before { content: '―'; }
    .rce-formula-bar {
      display: grid; gap: .45rem;
      padding: .65rem .75rem;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
    }
    .rce-formula-label {
      font-size: .72rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: .03em; color: #64748b;
    }
    .rce-formula-input {
      box-sizing: border-box; width: 100%; height: 34px; padding: 0 10px;
      border: 1px solid #e5e7eb; border-radius: 8px; font: inherit; font-size: 13px;
    }
    .rce-formula-chips { display: flex; flex-wrap: wrap; gap: .35rem; }
    .rce-chip {
      border: 1px solid #cbd5e1; background: #fff; border-radius: 999px;
      padding: .15rem .55rem; font-size: .78rem; cursor: pointer; color: #1e40af;
    }
    .rce-chip:hover { background: #eff6ff; }
    .rce-formula-actions { display: flex; gap: .4rem; justify-content: flex-end; }
    .rce-btn { height: 30px !important; padding: 0 12px !important; font-size: 12px !important; }
    .rce-formula-preview {
      padding: .45rem .55rem; background: #fff; border: 1px solid #e2e8f0;
      border-radius: 8px; min-height: 2rem;
    }
    .rce-hint {
      font-size: .75rem;
      color: #64748b;
      padding: .35rem .75rem .55rem;
      border-top: 1px solid #f1f5f9;
      background: #fafafa;
    }
    .rce-error {
      color: #b91c1c;
      font-size: .8rem;
      padding: .35rem .75rem .55rem;
    }
    @media print {
      .rce-toolbar, .rce-hint, .rce-error { display: none !important; }
      .rce { border: none; }
    }
  `]
})
export class RichContentEditorComponent implements AfterViewInit, OnDestroy, ControlValueAccessor {
  private fileUpload = inject(FileUploadService);
  private sanitizer = inject(DomSanitizer);

  host = viewChild.required<ElementRef<HTMLDivElement>>('host');
  toolbar = viewChild.required<ElementRef<HTMLDivElement>>('toolbar');

  placeholder = input('Write lesson content…');
  hint = input(
    'Use Superscript for x². Formula for LaTeX (fractions, √, Greek). RTL button for Urdu/Arabic paragraphs.'
  );
  minHeight = input('160px');
  uploadEntityType = input('CourseTopic');

  private quill: Quill | null = null;
  private pendingHtml: string | null = null;
  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};
  private formulaRangeIndex: number | null = null;
  disabled = false;
  uploadError = '';
  formulaOpen = false;
  formulaDraft = '';

  formulaChips = [
    { label: 'x²', latex: 'x^2' },
    { label: 'x³', latex: 'x^3' },
    { label: 'xⁿ', latex: 'x^n' },
    { label: '√25=5', latex: '\\sqrt{25}=5' },
    { label: 'a/b', latex: '\\frac{a}{b}' },
    { label: 'α+β', latex: '\\alpha+\\beta' }
  ];

  get formulaPreview(): SafeHtml | null {
    const v = this.formulaDraft.trim();
    if (!v) return null;
    try {
      return this.sanitizer.bypassSecurityTrustHtml(
        katex.renderToString(v, { throwOnError: false, errorColor: '#b91c1c' })
      );
    } catch {
      return null;
    }
  }

  ngAfterViewInit() {
    ensureKatexGlobal();
    const toolbarEl = this.toolbar().nativeElement;
    const hostEl = this.host().nativeElement;

    this.quill = new Quill(hostEl, {
      theme: 'snow',
      placeholder: this.placeholder(),
      modules: {
        table: true,
        history: { delay: 500, maxStack: 100, userOnly: true },
        toolbar: {
          container: toolbarEl,
          handlers: {
            image: () => this.insertImage(),
            formula: () => this.openFormula(),
            undo: function (this: { quill: Quill }) {
              (this.quill as any).history.undo();
            },
            redo: function (this: { quill: Quill }) {
              (this.quill as any).history.redo();
            },
            table: function (this: { quill: Quill }) {
              const table = this.quill.getModule('table') as { insertTable: (r: number, c: number) => void };
              table?.insertTable(3, 3);
            },
            hr: function (this: { quill: Quill }) {
              const range = this.quill.getSelection(true);
              this.quill.insertEmbed(range.index, 'divider', true, 'user');
              this.quill.setSelection(range.index + 1, 0, 'user');
            }
          }
        }
      }
    });

    if (this.pendingHtml != null) {
      this.setHtml(this.pendingHtml);
      this.pendingHtml = null;
    }

    this.quill.on('text-change', () => {
      if (!this.quill) return;
      const html = sanitizeRichHtml(this.quill.root.innerHTML);
      this.onChange(isEmptyRichHtml(html) ? '' : html);
    });

    this.quill.root.addEventListener('blur', () => this.onTouched());

    if (this.disabled) {
      this.quill.enable(false);
    }
  }

  ngOnDestroy() {
    this.quill = null;
  }

  writeValue(value: string | null): void {
    const html = value || '';
    if (!this.quill) {
      this.pendingHtml = html;
      return;
    }
    this.setHtml(html);
  }

  registerOnChange(fn: (v: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.quill?.enable(!isDisabled);
  }

  private setHtml(html: string) {
    if (!this.quill) return;
    const safe = sanitizeRichHtml(html);
    const current = sanitizeRichHtml(this.quill.root.innerHTML);
    if (current === safe) return;
    const delta = this.quill.clipboard.convert({ html: safe || '<p><br></p>' });
    this.quill.setContents(delta, 'silent');
  }

  private insertImage() {
    this.uploadError = '';
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/jpg,image/webp,image/gif';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file || !this.quill) return;
      this.fileUpload.upload(file, this.uploadEntityType(), { label: 'rich-content' }).subscribe({
        next: res => {
          const url = `${environment.fileServerUrl}/files/${res.fileId}`;
          const range = this.quill!.getSelection(true);
          this.quill!.insertEmbed(range.index, 'image', url, 'user');
          this.quill!.setSelection(range.index + 1, 0, 'user');
        },
        error: () => {
          this.uploadError = 'Image upload failed. Ensure FileServer is running.';
        }
      });
    };
    input.click();
  }

  openFormula() {
    if (!this.quill) return;
    const range = this.quill.getSelection(true);
    this.formulaRangeIndex = range?.index ?? this.quill.getLength() - 1;
    this.formulaDraft = '';
    this.formulaOpen = true;
  }

  cancelFormula() {
    this.formulaOpen = false;
    this.formulaDraft = '';
    this.formulaRangeIndex = null;
  }

  insertFormula() {
    if (!this.quill || !this.formulaDraft.trim()) return;
    const index = this.formulaRangeIndex ?? this.quill.getLength() - 1;
    const latex = this.formulaDraft.trim();
    this.quill.insertEmbed(index, 'formula', latex, 'user');
    this.quill.insertText(index + 1, ' ', 'user');
    this.quill.setSelection(index + 2, 0, 'user');
    this.cancelFormula();
  }
}
