import {
  Component,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  signal,
  computed,
  viewChild,
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface OsSelectOption<T = unknown> {
  value: T;
  label: string;
  hint?: string;
}

@Component({
  selector: 'app-os-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="os-dd" [class.open]="open()" [class.disabled]="disabled()">
      <button
        type="button"
        class="os-dd-trigger"
        [id]="id() || null"
        [disabled]="disabled()"
        [attr.aria-expanded]="open()"
        [attr.aria-haspopup]="'listbox'"
        [attr.aria-label]="ariaLabel() || placeholder()"
        (click)="toggle()">
        @if (icon()) {
          <span class="material-icons-round os-dd-icon">{{ icon() }}</span>
        }
        <span class="os-dd-value" [class.placeholder]="!selectedLabel()">
          {{ selectedLabel() || placeholder() }}
        </span>
        <span class="material-icons-round os-dd-caret"
              [class.spin]="open()">expand_more</span>
      </button>

      @if (open()) {
        <div class="os-dd-panel" role="listbox" [attr.aria-label]="ariaLabel() || placeholder()">
          @if (searchable()) {
            <div class="os-dd-search">
              <span class="material-icons-round">search</span>
              <input
                #searchInput
                type="text"
                [ngModel]="query()"
                (ngModelChange)="onQuery($event)"
                placeholder="Search…"
                autocomplete="off"
                (keydown)="onSearchKey($event)"
                (click)="$event.stopPropagation()" />
            </div>
          }

          <div class="os-dd-list">
            @if (filtered().length === 0) {
              <div class="os-dd-empty">No matches</div>
            } @else {
              @for (opt of filtered(); track trackOpt($index, opt); let i = $index) {
                <button
                  type="button"
                  class="os-dd-option"
                  role="option"
                  [class.active]="isSelected(opt.value)"
                  [class.focused]="i === focusIndex()"
                  [attr.aria-selected]="isSelected(opt.value)"
                  (click)="pick(opt.value); $event.stopPropagation()"
                  (mouseenter)="focusIndex.set(i)">
                  <span class="os-dd-option-text">
                    <span class="os-dd-option-label">{{ opt.label }}</span>
                    @if (opt.hint) {
                      <span class="os-dd-option-hint">{{ opt.hint }}</span>
                    }
                  </span>
                  @if (isSelected(opt.value)) {
                    <span class="material-icons-round os-dd-check">check</span>
                  }
                </button>
              }
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; min-width: 0; }

    .os-dd {
      position: relative;
      min-width: 200px;
      max-width: 100%;
    }

    .os-dd-trigger {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      height: 34px;
      padding: 0 8px 0 10px;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--surface);
      color: var(--t1);
      font: inherit;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
      text-align: left;
    }

    .os-dd-trigger:hover:not(:disabled) {
      border-color: var(--border-2, var(--border));
      background: var(--surface-2);
    }

    .os-dd.open .os-dd-trigger,
    .os-dd-trigger:focus-visible {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-g);
      background: var(--surface);
    }

    .os-dd-trigger:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .os-dd-icon {
      font-size: 17px;
      color: var(--accent);
      flex-shrink: 0;
    }

    .os-dd-value {
      flex: 1;
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.2;
    }

    .os-dd-value.placeholder {
      color: var(--t4);
      font-weight: 500;
    }

    .os-dd-caret {
      font-size: 18px;
      color: var(--t4);
      flex-shrink: 0;
      transition: transform 0.18s ease;
    }

    .os-dd-caret.spin { transform: rotate(180deg); color: var(--accent); }

    .os-dd-panel {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      right: 0;
      min-width: max(100%, 220px);
      z-index: 40;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12), 0 2px 6px rgba(15, 23, 42, 0.06);
      overflow: hidden;
      animation: os-dd-in 0.14s ease-out;
    }

    @keyframes os-dd-in {
      from { opacity: 0; transform: translateY(-4px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .os-dd-search {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      border-bottom: 1px solid var(--border);
      background: var(--surface-2);
    }

    .os-dd-search .material-icons-round {
      font-size: 18px;
      color: var(--t4);
    }

    .os-dd-search input {
      flex: 1;
      min-width: 0;
      border: 0;
      outline: none;
      background: transparent;
      font: inherit;
      font-size: 13px;
      font-weight: 500;
      color: var(--t1);
    }

    .os-dd-search input::placeholder { color: var(--t4); }

    .os-dd-list {
      max-height: 260px;
      overflow-y: auto;
      padding: 6px;
      overscroll-behavior: contain;
    }

    .os-dd-empty {
      padding: 16px 12px;
      text-align: center;
      font-size: 12.5px;
      font-weight: 500;
      color: var(--t4);
    }

    .os-dd-option {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 8px 10px;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: var(--t1);
      font: inherit;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      text-align: left;
      transition: background 0.12s;
    }

    .os-dd-option:hover,
    .os-dd-option.focused {
      background: var(--surface-2);
    }

    .os-dd-option.active {
      background: var(--accent-s, rgba(var(--accent-rgb), 0.1));
      color: var(--accent-d, var(--accent));
    }

    .os-dd-option-text {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    .os-dd-option-label {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .os-dd-option-hint {
      font-size: 11px;
      font-weight: 500;
      color: var(--t3);
    }

    .os-dd-option.active .os-dd-option-hint { color: inherit; opacity: 0.75; }

    .os-dd-check {
      font-size: 16px;
      color: var(--accent);
      flex-shrink: 0;
    }
  `]
})
export class OsSelectComponent<T = unknown> {
  private host = inject(ElementRef<HTMLElement>);

  id = input('');
  options = input<OsSelectOption<T>[]>([]);
  value = input<T | null>(null);
  placeholder = input('Select…');
  icon = input('');
  ariaLabel = input('');
  searchable = input(false);
  disabled = input(false);

  valueChange = output<T | null>();

  readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  open = signal(false);
  query = signal('');
  focusIndex = signal(0);

  selectedLabel = computed(() => {
    const v = this.value();
    return this.options().find(o => o.value === v)?.label ?? '';
  });

  filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const opts = this.options();
    if (!q) return opts;
    return opts.filter(o =>
      o.label.toLowerCase().includes(q) ||
      (o.hint?.toLowerCase().includes(q) ?? false)
    );
  });

  constructor() {
    effect(() => {
      if (this.open() && this.searchable()) {
        queueMicrotask(() => this.searchInput()?.nativeElement?.focus());
      }
    });
  }

  trackOpt = (_: number, opt: OsSelectOption<T>) => opt.value as object | string | number | boolean;

  isSelected(v: T) {
    return v === this.value();
  }

  toggle() {
    if (this.disabled()) return;
    this.open() ? this.close() : this.openPanel();
  }

  openPanel() {
    this.query.set('');
    const idx = Math.max(0, this.options().findIndex(o => o.value === this.value()));
    this.focusIndex.set(idx);
    this.open.set(true);
  }

  close() {
    this.open.set(false);
  }

  onQuery(q: string) {
    this.query.set(q);
    this.focusIndex.set(0);
  }

  pick(v: T) {
    this.valueChange.emit(v);
    this.close();
  }

  onSearchKey(e: KeyboardEvent) {
    const list = this.filtered();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.focusIndex.set(Math.min(list.length - 1, this.focusIndex() + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.focusIndex.set(Math.max(0, this.focusIndex() - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = list[this.focusIndex()];
      if (opt) this.pick(opt.value);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent) {
    if (!this.open()) return;
    if (!this.host.nativeElement.contains(ev.target as Node)) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  onEsc() {
    if (this.open()) this.close();
  }
}
