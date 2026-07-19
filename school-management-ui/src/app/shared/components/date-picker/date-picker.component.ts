import {
  Component, Input, Output, EventEmitter, OnInit, OnDestroy,
  signal, computed, HostListener, ElementRef, forwardRef, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

interface Day { date: Date; curr: boolean; today: boolean; selected: boolean; disabled: boolean; }

const DAYS   = ['Su','Mo','Tu','We','Th','Fr','Sa'];
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function fromYMD(s: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return isNaN(y) ? null : new Date(y, m - 1, d);
}

@Component({
  selector: 'app-date-picker',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => DatePickerComponent),
    multi: true
  }],
  template: `
    <div class="dp-wrap" [class.dp-open]="open()" [class.dp-disabled]="disabled">

      <!-- Trigger input -->
      <div class="dp-input" (click)="toggle(); $event.stopPropagation()" [class.dp-focus]="open()" [class.dp-error]="hasError">
        <span class="material-icons-round dp-cal-icon">calendar_month</span>
        <span class="dp-val" [class.dp-placeholder]="!value()">
          {{ value() ? formatDisplay(value()!) : placeholder }}
        </span>
        @if (value() && !disabled) {
          <button class="dp-clear" (click)="clear($event)" type="button" tabindex="-1">
            <span class="material-icons-round">close</span>
          </button>
        } @else {
          <span class="material-icons-round dp-chev">expand_more</span>
        }
      </div>

      <!-- Dropdown panel -->
      @if (open()) {
        <div class="dp-panel" (click)="$event.stopPropagation()">

          <!-- Header: prev / month+year / next -->
          <div class="dp-header">
            <button class="dp-nav" (click)="prevMonth()" type="button">
              <span class="material-icons-round">chevron_left</span>
            </button>

            @if (view() === 'days') {
              <button class="dp-hd-btn" (click)="view.set('months')" type="button">
                {{ MONTHS[cursor().month] }} {{ cursor().year }}
              </button>
            } @else if (view() === 'months') {
              <button class="dp-hd-btn" (click)="view.set('years')" type="button">
                {{ cursor().year }}
              </button>
            } @else {
              <span class="dp-hd-btn dp-hd-static">
                {{ yearRangeLabel() }}
              </span>
            }

            <button class="dp-nav" (click)="nextMonth()" type="button">
              <span class="material-icons-round">chevron_right</span>
            </button>
          </div>

          <!-- Day grid -->
          @if (view() === 'days') {
            <div class="dp-dow-row">
              @for (d of DAYS; track d) { <span class="dp-dow">{{ d }}</span> }
            </div>
            <div class="dp-days">
              @for (day of days(); track day.date.getTime()) {
                <button
                  class="dp-day"
                  [class.dp-other]="!day.curr"
                  [class.dp-today]="day.today"
                  [class.dp-sel]="day.selected"
                  [class.dp-dis]="day.disabled"
                  [disabled]="day.disabled"
                  (click)="selectDay(day)"
                  type="button">
                  {{ day.date.getDate() }}
                </button>
              }
            </div>
          }

          <!-- Month grid -->
          @if (view() === 'months') {
            <div class="dp-months">
              @for (m of MONTHS; track m; let i = $index) {
                <button
                  class="dp-month"
                  [class.dp-sel]="cursor().month === i && cursor().year === selectedYear()"
                  (click)="selectMonth(i)"
                  type="button">
                  {{ m.slice(0,3) }}
                </button>
              }
            </div>
          }

          <!-- Year grid -->
          @if (view() === 'years') {
            <div class="dp-years">
              @for (y of yearRange(); track y) {
                <button
                  class="dp-year"
                  [class.dp-sel]="cursor().year === y"
                  (click)="selectYear(y)"
                  type="button">
                  {{ y }}
                </button>
              }
            </div>
          }

          <!-- Footer: Today shortcut -->
          <div class="dp-footer">
            <button class="dp-today-btn" (click)="goToday()" type="button">Today</button>
            @if (value()) {
              <button class="dp-clear-btn" (click)="clear($event)" type="button">Clear</button>
            }
          </div>

        </div>
      }
    </div>
  `,
  styles: [`
    .dp-wrap { position: relative; display: block; }

    /* ── Trigger ─────────────────────────────────── */
    .dp-input {
      display: flex; align-items: center; gap: 8px;
      padding: 9px 12px;
      background: var(--surface);
      border: 1.5px solid var(--border);
      border-radius: var(--r);
      cursor: pointer;
      transition: border-color .15s, box-shadow .15s;
      user-select: none; min-height: 40px;
    }
    .dp-input:hover { border-color: var(--border-2); }
    .dp-focus  { border-color: var(--accent) !important; box-shadow: 0 0 0 3px var(--accent-g); }
    .dp-error  { border-color: var(--red) !important; }
    .dp-disabled .dp-input { opacity: .55; cursor: not-allowed; pointer-events: none; }

    .dp-cal-icon { font-size: 17px; color: var(--accent); flex-shrink: 0;
      font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 20; }
    .dp-val { flex: 1; font-size: 13.5px; color: var(--t1); font-family: inherit; }
    .dp-placeholder { color: var(--t5); }
    .dp-chev { font-size: 18px; color: var(--t4); transition: transform .2s; }
    .dp-open .dp-chev { transform: rotate(180deg); }

    .dp-clear {
      display: flex; align-items: center; justify-content: center;
      width: 20px; height: 20px; border-radius: 50%;
      border: none; background: var(--surface-3); cursor: pointer; padding: 0;
      color: var(--t4); transition: all .15s; flex-shrink: 0;
    }
    .dp-clear:hover { background: var(--red-s); color: var(--red); }
    .dp-clear .material-icons-round { font-size: 13px; }

    /* ── Panel ───────────────────────────────────── */
    .dp-panel {
      position: absolute; top: calc(100% + 6px); left: 0; z-index: 500;
      width: 288px;
      background: var(--surface);
      border: 1.5px solid var(--border);
      border-radius: var(--r-xl);
      box-shadow: var(--sh-lg);
      padding: 14px 12px 10px;
      animation: dp-in .15s cubic-bezier(.22,1,.36,1);
    }
    @keyframes dp-in { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:none; } }

    /* ── Header ──────────────────────────────────── */
    .dp-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 10px; gap: 4px;
    }
    .dp-nav {
      display: flex; align-items: center; justify-content: center;
      width: 30px; height: 30px; border-radius: 8px;
      border: 1.5px solid var(--border); background: var(--surface-2);
      cursor: pointer; color: var(--t3); transition: all .15s; flex-shrink: 0; padding: 0;
    }
    .dp-nav:hover { background: var(--accent-s); color: var(--accent); border-color: var(--accent-g); }
    .dp-nav .material-icons-round { font-size: 18px; }

    .dp-hd-btn {
      flex: 1; text-align: center;
      font-size: 13.5px; font-weight: 700; color: var(--t1); font-family: inherit;
      border: none; background: none; cursor: pointer; padding: 4px 6px;
      border-radius: 8px; transition: background .15s;
    }
    .dp-hd-btn:hover { background: var(--accent-s); color: var(--accent); }
    .dp-hd-static { display: block; }

    /* ── Day-of-week row ─────────────────────────── */
    .dp-dow-row {
      display: grid; grid-template-columns: repeat(7, 1fr);
      margin-bottom: 4px;
    }
    .dp-dow {
      text-align: center; font-size: 10.5px; font-weight: 700;
      color: var(--t4); text-transform: uppercase; letter-spacing: .5px;
      padding: 4px 0;
    }

    /* ── Day grid ────────────────────────────────── */
    .dp-days { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; }

    .dp-day {
      aspect-ratio: 1; display: flex; align-items: center; justify-content: center;
      font-size: 12.5px; font-family: inherit; font-weight: 500;
      border: none; background: none; cursor: pointer; border-radius: 8px;
      color: var(--t1); transition: background .12s, color .12s;
    }
    .dp-day:hover:not(.dp-dis) { background: var(--accent-s); color: var(--accent); }
    .dp-other { color: var(--t5); }
    .dp-today { font-weight: 800; color: var(--accent); }
    .dp-today:not(.dp-sel)::after {
      content: ''; display: block;
      width: 4px; height: 4px; border-radius: 50%;
      background: var(--accent); position: absolute; bottom: 3px;
    }
    .dp-day.dp-today { position: relative; }
    .dp-sel {
      background: var(--accent) !important; color: #fff !important;
      font-weight: 700; border-radius: 8px;
    }
    .dp-dis { opacity: .35; cursor: not-allowed; }

    /* ── Month grid ──────────────────────────────── */
    .dp-months { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; padding: 4px 0; }
    .dp-month {
      padding: 10px 4px; text-align: center;
      font-size: 12.5px; font-weight: 600; font-family: inherit;
      border: none; background: none; cursor: pointer; border-radius: 10px;
      color: var(--t2); transition: all .12s;
    }
    .dp-month:hover { background: var(--accent-s); color: var(--accent); }
    .dp-month.dp-sel { background: var(--accent); color: #fff; }

    /* ── Year grid ───────────────────────────────── */
    .dp-years { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; padding: 4px 0; }
    .dp-year {
      padding: 9px 4px; text-align: center;
      font-size: 12px; font-weight: 600; font-family: inherit;
      border: none; background: none; cursor: pointer; border-radius: 10px;
      color: var(--t2); transition: all .12s;
    }
    .dp-year:hover { background: var(--accent-s); color: var(--accent); }
    .dp-year.dp-sel { background: var(--accent); color: #fff; }

    /* ── Footer ──────────────────────────────────── */
    .dp-footer {
      display: flex; gap: 8px; justify-content: flex-end;
      border-top: 1px solid var(--border); margin-top: 10px; padding-top: 8px;
    }
    .dp-today-btn, .dp-clear-btn {
      font-size: 12px; font-weight: 600; font-family: inherit;
      padding: 5px 12px; border-radius: 8px; cursor: pointer;
      border: 1.5px solid var(--border); transition: all .15s;
    }
    .dp-today-btn { background: var(--accent-s); color: var(--accent); border-color: var(--accent-g); }
    .dp-today-btn:hover { background: var(--accent); color: #fff; }
    .dp-clear-btn { background: var(--surface-2); color: var(--t3); }
    .dp-clear-btn:hover { background: var(--red-s); color: var(--red); border-color: var(--red-b); }

    /* ── Mobile ──────────────────────────────────── */
    @media (max-width: 480px) {
      .dp-panel { width: 100%; left: 0; right: 0; }
    }
  `]
})
export class DatePickerComponent implements OnInit, OnDestroy, ControlValueAccessor {
  @Input() placeholder = 'Select date';
  @Input() min?: string;
  @Input() max?: string;
  @Input() disabled = false;
  @Input() hasError = false;
  /** Extra class forwarded to the host for layout use */
  @Input() inputClass = '';

  @Output() dateChange = new EventEmitter<string>();

  readonly DAYS   = DAYS;
  readonly MONTHS = MONTHS;

  value   = signal<string | null>(null);
  open    = signal(false);
  view    = signal<'days' | 'months' | 'years'>('days');
  cursor  = signal({ year: new Date().getFullYear(), month: new Date().getMonth() });

  private onChange: (v: string | null) => void = () => {};
  private onTouched: () => void = () => {};
  private docClick = () => this.open.set(false);

  ngOnInit() { document.addEventListener('click', this.docClick); }
  ngOnDestroy() { document.removeEventListener('click', this.docClick); }

  // ── ControlValueAccessor ─────────────────────────
  writeValue(v: string | null) {
    this.value.set(v || null);
    if (v) {
      const d = fromYMD(v);
      if (d) this.cursor.set({ year: d.getFullYear(), month: d.getMonth() });
    }
  }
  registerOnChange(fn: (v: string | null) => void) { this.onChange = fn; }
  registerOnTouched(fn: () => void) { this.onTouched = fn; }
  setDisabledState(d: boolean) { this.disabled = d; }

  // ── Computed ─────────────────────────────────────
  selectedYear = computed(() => {
    const v = this.value();
    return v ? fromYMD(v)?.getFullYear() ?? null : null;
  });

  days = computed<Day[]>(() => {
    const { year, month } = this.cursor();
    const today = toYMD(new Date());
    const sel   = this.value();

    const first = new Date(year, month, 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());           // back-fill to Sunday

    const cells: Day[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const ymd = toYMD(d);
      cells.push({
        date: d,
        curr: d.getMonth() === month,
        today: ymd === today,
        selected: ymd === sel,
        disabled: (!!this.min && ymd < this.min) || (!!this.max && ymd > this.max)
      });
    }
    // Trim last row if all other-month
    if (cells.slice(35).every(c => !c.curr)) cells.splice(35, 7);
    return cells;
  });

  yearRange = computed<number[]>(() => {
    const base = Math.floor(this.cursor().year / 12) * 12;
    return Array.from({ length: 12 }, (_, i) => base + i);
  });

  yearRangeLabel = computed(() => {
    const r = this.yearRange();
    return `${r[0]} – ${r[r.length - 1]}`;
  });

  // ── Interactions ─────────────────────────────────
  toggle() {
    if (this.disabled) return;
    this.open.update(o => !o);
    if (this.open()) this.onTouched();
  }

  selectDay(day: Day) {
    if (day.disabled) return;
    const ymd = toYMD(day.date);
    this.value.set(ymd);
    this.onChange(ymd);
    this.dateChange.emit(ymd);
    this.open.set(false);
    this.view.set('days');
  }

  selectMonth(m: number) {
    this.cursor.update(c => ({ ...c, month: m }));
    this.view.set('days');
  }

  selectYear(y: number) {
    this.cursor.update(c => ({ ...c, year: y }));
    this.view.set('months');
  }

  prevMonth() {
    if (this.view() === 'days') {
      this.cursor.update(({ year, month }) =>
        month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 });
    } else if (this.view() === 'months') {
      this.cursor.update(c => ({ ...c, year: c.year - 1 }));
    } else {
      this.cursor.update(c => ({ ...c, year: c.year - 12 }));
    }
  }

  nextMonth() {
    if (this.view() === 'days') {
      this.cursor.update(({ year, month }) =>
        month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 });
    } else if (this.view() === 'months') {
      this.cursor.update(c => ({ ...c, year: c.year + 1 }));
    } else {
      this.cursor.update(c => ({ ...c, year: c.year + 12 }));
    }
  }

  goToday() {
    const today = new Date();
    const ymd   = toYMD(today);
    this.cursor.set({ year: today.getFullYear(), month: today.getMonth() });
    this.value.set(ymd);
    this.onChange(ymd);
    this.dateChange.emit(ymd);
    this.view.set('days');
    this.open.set(false);
  }

  clear(e: Event) {
    e.stopPropagation();
    this.value.set(null);
    this.onChange(null);
    this.dateChange.emit('');
  }

  formatDisplay(ymd: string): string {
    const d = fromYMD(ymd);
    if (!d) return ymd;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
