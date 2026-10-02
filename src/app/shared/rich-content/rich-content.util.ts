import DOMPurify from 'dompurify';
import katex from 'katex';

const ALLOWED_TAGS = [
  'p', 'br', 'span', 'div', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
  'sub', 'sup', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'pre', 'code',
  'ol', 'ul', 'li', 'a', 'img', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td'
];

const ALLOWED_ATTR = [
  'href', 'src', 'alt', 'title', 'class', 'style', 'dir',
  'colspan', 'rowspan', 'data-value', 'target', 'rel', 'width', 'height'
];

/** Sanitize curriculum rich HTML before save or display. */
export function sanitizeRichHtml(html: string | null | undefined): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$)|data:image\/)/i
  });
}

/** True when Quill/HTML has no meaningful text or embeds. */
export function isEmptyRichHtml(html: string | null | undefined): boolean {
  if (!html) return true;
  const cleaned = html
    .replace(/<img\b[^>]*>/gi, 'IMG')
    .replace(/<hr\b[^>]*>/gi, 'HR')
    .replace(/class="ql-formula"[^>]*>/gi, 'F')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\u200B/g, '')
    .trim();
  return !cleaned;
}

/** Re-render KaTeX formulas inside a sanitized HTML root. */
export function renderKatexInElement(root: HTMLElement): void {
  root.querySelectorAll('.ql-formula[data-value]').forEach(node => {
    const el = node as HTMLElement;
    const value = el.getAttribute('data-value');
    if (!value) return;
    try {
      katex.render(value, el, { throwOnError: false, errorColor: '#b91c1c' });
      el.setAttribute('data-value', value);
    } catch {
      el.textContent = value;
    }
  });
}

export function ensureKatexGlobal(): void {
  (window as unknown as { katex: typeof katex }).katex = katex;
}
