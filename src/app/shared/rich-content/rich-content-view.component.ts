import {
  Component,
  ElementRef,
  ViewEncapsulation,
  effect,
  inject,
  input,
  viewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { isEmptyRichHtml, renderKatexInElement, sanitizeRichHtml } from './rich-content.util';

/** Read-only, sanitized rich curriculum content (teacher/student/print). */
@Component({
  selector: 'app-rich-content-view',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    @if (hasContent()) {
      <div #root class="rcv ql-editor" [innerHTML]="safeHtml()"></div>
    } @else if (emptyText()) {
      <div class="rcv-empty">{{ emptyText() }}</div>
    }
  `,
  styles: [`
    .rcv {
      padding: 0 !important;
      overflow-wrap: anywhere;
      line-height: 1.55;
      font-size: .9rem;
      color: #1e293b;
    }
    .rcv img {
      max-width: 100%;
      height: auto;
      border-radius: 6px;
      margin: .35rem 0;
    }
    .rcv table {
      border-collapse: collapse;
      width: 100%;
      margin: .5rem 0;
    }
    .rcv td, .rcv th {
      border: 1px solid #cbd5e1;
      padding: .35rem .5rem;
    }
    .rcv .ql-direction-rtl,
    .rcv [dir="rtl"] {
      direction: rtl;
      text-align: right;
    }
    .rcv .ql-align-center { text-align: center; }
    .rcv .ql-align-right { text-align: right; }
    .rcv .ql-align-justify { text-align: justify; }
    .rcv hr {
      border: none;
      border-top: 1px solid #cbd5e1;
      margin: .75rem 0;
    }
    .rcv-empty { color: #94a3b8; font-size: .85rem; }
    @media print {
      .rcv { color: #000; font-size: 11pt; }
      .rcv a { color: #000; text-decoration: underline; }
    }
  `]
})
export class RichContentViewComponent {
  private sanitizer = inject(DomSanitizer);

  html = input<string | null | undefined>('');
  emptyText = input('');

  private root = viewChild<ElementRef<HTMLDivElement>>('root');

  constructor() {
    effect(() => {
      this.html();
      queueMicrotask(() => {
        const el = this.root()?.nativeElement;
        if (el) renderKatexInElement(el);
      });
    });
  }

  safeHtml(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(sanitizeRichHtml(this.html()));
  }

  hasContent(): boolean {
    return !isEmptyRichHtml(this.html());
  }
}
