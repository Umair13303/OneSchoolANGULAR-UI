import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { Dialog } from 'primeng/dialog';
import { Tooltip } from 'primeng/tooltip';
import { AcademicService } from '../../../core/services/academic.service';
import { AuthService } from '../../../core/services/auth.service';
import { AcademicYear, AcademicCalendarEvent, CalendarEventType, CreateCalendarEventDto, CreateCalendarEventTypeDto } from '../../../core/models/academic.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';

const ICON_OPTIONS = [
  'beach_access','flag','sports_soccer','quiz','school','emoji_events','event',
  'celebration','cake','science','history_edu','book','fitness_center','music_note',
  'theater_comedy','palette','computer','engineering','medical_services','star'
];

@Component({
  selector: 'app-academic-calendar',
  standalone: true,
  imports: [
    CommonModule, FormsModule, PageHeaderComponent, LoadingComponent, DatePickerComponent,
    Button, InputText, Textarea, Dialog, Tooltip
  ],
  template: `
    <div class="os-page compact">
    <app-page-header
      [title]="year()?.yearLabel ? year()!.yearLabel + ' — Academic Calendar' : 'Academic Calendar'"
      [dense]="true">
      @if (canManage()) {
        <p-button
          label="Back"
          icon="pi pi-arrow-left"
          severity="secondary"
          [outlined]="true"
          (onClick)="router.navigate(['/academics/years'])" />
        <p-button
          label="Event Types"
          icon="pi pi-sliders-h"
          severity="secondary"
          [outlined]="true"
          (onClick)="showTypesPanel.set(!showTypesPanel())" />
        <p-button label="Add Event" icon="pi pi-plus" (onClick)="openAdd()" />
      }
    </app-page-header>

    <!-- Event Types management panel -->
    @if (canManage() && showTypesPanel()) {
      <div class="os-stage">
        <div class="os-stage-bar">
          <div>
            <div class="types-panel-title">Event Types</div>
            <div class="types-panel-sub">Customize categories for calendar events</div>
          </div>
          <p-button label="Add Type" icon="pi pi-plus" size="small" (onClick)="openAddType()" />
        </div>

        <div class="os-stage-body flex flex-col">
          @for (t of eventTypes(); track t.calendarEventTypeId) {
            <div class="type-row">
              <div class="type-badge-preview" [style.background]="t.color + '22'" [style.color]="t.color">
                <span class="material-icons-round">{{ t.icon }}</span>
              </div>
              <span class="type-name">{{ t.name }}</span>
              <div class="flex gap-1">
                <p-button icon="pi pi-pencil" [text]="true" [rounded]="true" size="small" severity="secondary"
                          ariaLabel="Edit type" pTooltip="Edit" (onClick)="openEditType(t)" />
                <p-button icon="pi pi-trash" [text]="true" [rounded]="true" size="small" severity="danger"
                          ariaLabel="Delete type" pTooltip="Delete" (onClick)="deleteType(t)" />
              </div>
            </div>
          }
        </div>
      </div>
    }

    @if (loading()) { <app-loading /> }
    @else {
      <div class="os-stage">
        <!-- Event type filter tabs -->
        <div class="os-stage-bar">
          <div class="type-tabs">
            <button type="button" class="type-tab" [class.active]="filterTypeId() === null" (click)="filterTypeId.set(null)">
              <span class="material-icons-round">grid_view</span> All
              <span class="tab-count">{{ events().length }}</span>
            </button>
            @for (t of eventTypes(); track t.calendarEventTypeId) {
              <button type="button" class="type-tab" [class.active]="filterTypeId() === t.calendarEventTypeId"
                  (click)="filterTypeId.set(t.calendarEventTypeId)"
                  [style.--tc]="t.color" [style.--tb]="t.color + '18'">
                <span class="material-icons-round">{{ t.icon }}</span>
                {{ t.name }}
                <span class="tab-count">{{ countByType(t.calendarEventTypeId) }}</span>
              </button>
            }
          </div>
        </div>

        <div class="os-stage-body">
      @if (filtered().length === 0) {
        <div class="empty-state">
          <span class="material-icons-round empty-icon">event_note</span>
          <div class="empty-title">No events yet</div>
          <div class="empty-sub">Add holidays, exams and other key dates for this academic year.</div>
          @if (canManage()) {
            @if (canManage()) {
              <p-button class="mt-3" label="Add First Event" icon="pi pi-plus" size="small" (onClick)="openAdd()" />
            }
          }
        </div>
      } @else {
        @for (group of groupedEvents(); track group.month) {
          <div class="month-group">
            <div class="month-header">
              <span class="material-icons-round month-icon">calendar_month</span>
              {{ group.month }}
              <span class="month-count">{{ group.events.length }} event{{ group.events.length !== 1 ? 's' : '' }}</span>
            </div>
            <div class="events-list">
              @for (e of group.events; track e.academicCalendarEventId; let last = $last) {
                <div class="event-row" [class.last]="last">
                  <div class="event-type-badge"
                      [style.background]="e.eventTypeColor + '22'"
                      [style.color]="e.eventTypeColor">
                    <span class="material-icons-round">{{ e.eventTypeIcon }}</span>
                  </div>
                  <div class="event-main">
                    <div class="event-title">{{ e.title }}</div>
                    <div class="event-meta">
                      <span class="event-type-label" [style.color]="e.eventTypeColor">{{ e.eventTypeName }}</span>
                      @if (e.description) {
                        <span class="event-desc-dot">·</span>
                        <span class="event-desc">{{ e.description }}</span>
                      }
                    </div>
                  </div>
                  <div class="event-dates">
                    <span class="event-date-from">{{ e.startDate | date:'dd MMM' }}</span>
                    @if (e.endDate && e.endDate !== e.startDate) {
                      <span class="event-date-arrow">→</span>
                      <span class="event-date-to">{{ e.endDate | date:'dd MMM' }}</span>
                    }
                  </div>
                  @if (canManage()) {
                    <div class="flex shrink-0 gap-1">
                      <p-button icon="pi pi-pencil" [text]="true" [rounded]="true" size="small" severity="secondary"
                                ariaLabel="Edit event" pTooltip="Edit" (onClick)="openEdit(e)" />
                      <p-button icon="pi pi-trash" [text]="true" [rounded]="true" size="small" severity="danger"
                                ariaLabel="Delete event" pTooltip="Delete" (onClick)="confirmDelete(e)" />
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }
      }
        </div>
      </div>
    }
    </div>

    <!-- Add/Edit Event Dialog -->
    <p-dialog
      [visible]="showModal()"
      (visibleChange)="showModal.set($event)"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
      [style]="{ width: '30rem' }"
      [breakpoints]="{ '640px': '96vw' }">

      <ng-template #header>
        <div class="flex items-center gap-2.5">
          @if (selectedType()) {
            <span class="material-icons-round modal-hd-icon" [style.color]="selectedType()!.color">{{ selectedType()!.icon }}</span>
          }
          <h3 class="dlg-title">{{ editingId() ? 'Edit Event' : 'Add Event' }}</h3>
        </div>
      </ng-template>

      <div class="flex flex-col gap-1.5 mb-3.5">
        <label class="lbl">Event Type *</label>
        @if (eventTypes().length === 0) {
          <p class="hint-msg">No event types yet. <p-button label="Add one first →" [link]="true" size="small" (onClick)="closeModal(); showTypesPanel.set(true)" /></p>
        } @else {
          <div class="type-grid">
            @for (t of eventTypes(); track t.calendarEventTypeId) {
              <div class="type-option"
                  [class.selected]="form.calendarEventTypeId === t.calendarEventTypeId"
                  [style.--tc]="t.color" [style.--tb]="t.color + '18'"
                  (click)="form.calendarEventTypeId = t.calendarEventTypeId">
                <span class="material-icons-round" [style.color]="t.color">{{ t.icon }}</span>
                <span>{{ t.name }}</span>
              </div>
            }
          </div>
        }
      </div>

      <div class="flex flex-col gap-1.5 mb-3.5">
        <label class="lbl" for="ev-title">Title *</label>
        <input pInputText id="ev-title" class="w-full" [(ngModel)]="form.title" placeholder="e.g. Eid ul Fitr" />
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div class="flex flex-col gap-1.5 mb-3.5">
          <label class="lbl">Start Date *</label>
          <app-date-picker [(ngModel)]="form.startDate" (dateChange)="onStartChange()" />
        </div>
        <div class="flex flex-col gap-1.5 mb-3.5">
          <label class="lbl">End Date <span class="optional">(optional)</span></label>
          <app-date-picker [(ngModel)]="form.endDate" [min]="form.startDate" />
        </div>
      </div>

      <div class="flex flex-col gap-1.5 mb-3.5">
        <label class="lbl" for="ev-desc">Description <span class="optional">(optional)</span></label>
        <textarea pTextarea id="ev-desc" class="w-full" [(ngModel)]="form.description" rows="2" [autoResize]="true" placeholder="Any additional notes…"></textarea>
      </div>

      @if (modalError()) { <p class="error-msg">{{ modalError() }}</p> }

      <ng-template #footer>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <p-button label="Cancel" severity="secondary" [outlined]="true" (onClick)="closeModal()" />
          <p-button
            [label]="saving() ? 'Saving…' : 'Save'"
            icon="pi pi-check"
            [loading]="saving()"
            [disabled]="saving()"
            (onClick)="save()" />
        </div>
      </ng-template>
    </p-dialog>

    <!-- Add/Edit Event Type Dialog -->
    <p-dialog
      [header]="editingTypeId() ? 'Edit Event Type' : 'Add Event Type'"
      [visible]="showTypeModal()"
      (visibleChange)="showTypeModal.set($event)"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
      [style]="{ width: '32rem' }"
      [breakpoints]="{ '640px': '96vw' }">

      <div class="flex flex-col gap-1.5 mb-3.5">
        <label class="lbl" for="type-name">Name *</label>
        <input pInputText id="type-name" class="w-full" [(ngModel)]="typeForm.name" placeholder="e.g. Parent-Teacher Meeting" />
      </div>

      <div class="flex flex-col gap-1.5 mb-3.5">
        <label class="lbl">Color *</label>
        <div class="flex flex-wrap items-center gap-2">
          @for (c of colorPalette; track c) {
            <div class="color-swatch" [style.background]="c"
                [class.selected]="typeForm.color === c"
                (click)="typeForm.color = c"></div>
          }
          <input type="color" [(ngModel)]="typeForm.color" class="color-custom" title="Custom color" />
        </div>
      </div>

      <div class="flex flex-col gap-1.5 mb-3.5">
        <label class="lbl">Icon *</label>
        <div class="icon-grid">
          @for (ic of iconOptions; track ic) {
            <div class="icon-option" [class.selected]="typeForm.icon === ic"
                [style.color]="typeForm.color"
                (click)="typeForm.icon = ic" [title]="ic">
              <span class="material-icons-round">{{ ic }}</span>
            </div>
          }
        </div>
      </div>

      <div class="type-preview">
        <div class="type-preview-badge" [style.background]="typeForm.color + '22'" [style.color]="typeForm.color">
          <span class="material-icons-round">{{ typeForm.icon }}</span>
        </div>
        <span class="type-preview-name">{{ typeForm.name || 'Preview' }}</span>
      </div>

      @if (typeModalError()) { <p class="error-msg">{{ typeModalError() }}</p> }

      <ng-template #footer>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <p-button label="Cancel" severity="secondary" [outlined]="true" (onClick)="closeTypeModal()" />
          <p-button
            [label]="savingType() ? 'Saving…' : 'Save'"
            icon="pi pi-check"
            [loading]="savingType()"
            [disabled]="savingType()"
            (onClick)="saveType()" />
        </div>
      </ng-template>
    </p-dialog>

    <!-- Delete Event Confirmation -->
    <p-dialog
      header="Delete Event?"
      [visible]="!!deleteTarget()"
      (visibleChange)="!$event && deleteTarget.set(null)"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
      [style]="{ width: '24rem' }"
      [breakpoints]="{ '640px': '96vw' }">

      <div class="flex flex-col items-center text-center">
        <span class="material-icons-round confirm-icon">delete_forever</span>
        <p class="confirm-text">Delete <strong>{{ deleteTarget()?.title }}</strong>? This cannot be undone.</p>
      </div>

      <ng-template #footer>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <p-button label="Cancel" severity="secondary" [outlined]="true" (onClick)="deleteTarget.set(null)" />
          <p-button
            [label]="saving() ? 'Deleting…' : 'Delete'"
            icon="pi pi-trash"
            severity="danger"
            [loading]="saving()"
            [disabled]="saving()"
            (onClick)="doDelete()" />
        </div>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    /* ── Types panel ─────────────────────────────────────────── */
    .types-panel-title { font-size:13px; font-weight:800; color:var(--t1); }
    .types-panel-sub { font-size:11px; color:var(--t4); margin-top:2px; }

    .type-row { display:flex; align-items:center; gap:10px; padding:6px 14px; border-bottom:1px solid var(--border); }
    .type-row:last-child { border-bottom:none; }
    .type-badge-preview { width:28px; height:28px; border-radius:7px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .type-badge-preview .material-icons-round { font-size:16px; font-variation-settings:'FILL' 1; }
    .type-name { flex:1; font-size:13px; font-weight:600; color:var(--t1); }

    /* ── Type filter tabs ────────────────────────────────────── */
    .type-tabs { display:flex; gap:6px; flex-wrap:wrap; }
    .type-tab { display:flex; align-items:center; gap:5px; padding:4px 11px; border:1px solid var(--border); border-radius:99px; background:var(--surface); cursor:pointer; font-size:12px; font-weight:600; color:var(--t3); transition:all .15s; }
    .type-tab .material-icons-round { font-size:14px; }
    .type-tab:hover { border-color:var(--tc,var(--accent)); color:var(--tc,var(--accent)); background:var(--tb,var(--surface)); }
    .type-tab.active { background:var(--tc,var(--accent)); border-color:var(--tc,var(--accent)); color:#fff; }
    .tab-count { background:rgba(255,255,255,.25); padding:1px 6px; border-radius:99px; font-size:10px; }
    .type-tab:not(.active) .tab-count { background:var(--surface-2,#f1f5f9); color:var(--t4); }

    /* ── Empty state ─────────────────────────────────────────── */
    .empty-state { display:flex; flex-direction:column; align-items:center; padding:28px 16px; text-align:center; }
    .empty-icon { font-size:32px; color:var(--border); margin-bottom:6px; }
    .empty-title { font-size:14px; font-weight:700; color:var(--t2); }
    .empty-sub { font-size:12px; color:var(--t4); margin-top:4px; max-width:340px; }

    /* ── Month groups ────────────────────────────────────────── */
    .month-group + .month-group { border-top:1px solid var(--border); }
    .month-header { display:flex; align-items:center; gap:7px; font-size:11px; font-weight:800; color:var(--t3); text-transform:uppercase; letter-spacing:.6px; padding:6px 14px; background:var(--surface-2,#f8fafc); border-bottom:1px solid var(--border); }
    .month-icon { font-size:14px; color:var(--accent); }
    .month-count { font-size:10px; font-weight:600; color:var(--t4); background:var(--surface); padding:1px 7px; border-radius:99px; }

    /* ── Event rows ──────────────────────────────────────────── */
    .events-list { padding:0; }
    .event-row { display:flex; align-items:center; gap:10px; padding:6px 14px; border-bottom:1px solid var(--border); transition:background .12s; }
    .event-row.last { border-bottom:none; }
    .event-row:hover { background:var(--surface-2,#f8fafc); }
    .event-type-badge { width:30px; height:30px; border-radius:8px; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
    .event-type-badge .material-icons-round { font-size:17px; font-variation-settings:'FILL' 1; }
    .event-main { flex:1; min-width:0; }
    .event-title { font-size:13px; font-weight:700; color:var(--t1); }
    .event-meta { display:flex; align-items:center; gap:6px; margin-top:1px; flex-wrap:wrap; }
    .event-type-label { font-size:11px; font-weight:700; }
    .event-desc-dot { color:var(--border); }
    .event-desc { font-size:11px; color:var(--t4); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:200px; }
    .event-dates { display:flex; align-items:center; gap:5px; flex-shrink:0; font-size:12px; font-weight:600; color:var(--t2); white-space:nowrap; }
    .event-date-arrow { color:var(--t4); }

    /* ── Dialog shared ───────────────────────────────────────── */
    .lbl { font-size:12px; font-weight:700; color:var(--t2); }
    .dlg-title { margin:0; font-size:16px; font-weight:800; color:var(--t1); }
    .modal-hd-icon { font-size:24px; font-variation-settings:'FILL' 1; }
    .error-msg { color:#ef4444; font-size:12.5px; margin:8px 0 0; }
    .optional { font-size:10px; color:var(--t4); font-weight:400; }
    .hint-msg { font-size:13px; color:var(--t4); margin:0; display:flex; align-items:center; gap:4px; flex-wrap:wrap; }

    /* ── Event dialog ────────────────────────────────────────── */
    .type-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
    @media(max-width:520px){ .type-grid { grid-template-columns:repeat(2,1fr); } }
    .type-option { display:flex; flex-direction:column; align-items:center; gap:5px; padding:10px 6px; border:2px solid var(--border); border-radius:10px; cursor:pointer; font-size:11px; font-weight:700; color:var(--t3); text-align:center; transition:all .15s; }
    .type-option .material-icons-round { font-size:20px; font-variation-settings:'FILL' 1; }
    .type-option:hover { border-color:var(--tc); background:var(--tb); }
    .type-option.selected { border-color:var(--tc); background:var(--tb); color:var(--t1); }

    /* ── Event Type dialog ───────────────────────────────────── */
    .color-swatch { width:28px; height:28px; border-radius:50%; cursor:pointer; transition:transform .15s; border:3px solid transparent; }
    .color-swatch:hover { transform:scale(1.15); }
    .color-swatch.selected { border-color:var(--t1); transform:scale(1.15); }
    .color-custom { width:36px; height:36px; border:none; background:none; cursor:pointer; padding:0; border-radius:6px; }

    .icon-grid { display:grid; grid-template-columns:repeat(10,1fr); gap:6px; }
    @media(max-width:520px){ .icon-grid { grid-template-columns:repeat(6,1fr); } }
    .icon-option { width:36px; height:36px; border-radius:8px; border:2px solid var(--border); display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all .15s; }
    .icon-option .material-icons-round { font-size:18px; font-variation-settings:'FILL' 1; }
    .icon-option:hover { border-color:currentColor; background:currentColor; }
    .icon-option:hover .material-icons-round { color:#fff; }
    .icon-option.selected { border-color:currentColor; background:currentColor; }
    .icon-option.selected .material-icons-round { color:#fff; }

    .type-preview { display:flex; align-items:center; gap:12px; padding:12px 14px; background:var(--surface-2,#f8fafc); border-radius:10px; margin-top:4px; }
    .type-preview-badge { width:38px; height:38px; border-radius:10px; display:flex; align-items:center; justify-content:center; }
    .type-preview-badge .material-icons-round { font-size:20px; font-variation-settings:'FILL' 1; }
    .type-preview-name { font-size:14px; font-weight:700; color:var(--t1); }

    /* ── Delete confirm ──────────────────────────────────────── */
    .confirm-icon { font-size:48px; color:#dc2626; margin-bottom:10px; font-variation-settings:'FILL' 1; }
    .confirm-text { font-size:13px; color:var(--t3); margin:0; }
  `]
})
export class AcademicCalendarComponent implements OnInit {
  private route = inject(ActivatedRoute);
  readonly router = inject(Router);
  private svc = inject(AcademicService);
  private auth = inject(AuthService);

  /** Admin/principal/superadmin can edit; teachers/parents get read-only calendar. */
  canManage = () => this.auth.hasRole('superadmin', 'admin', 'principal');

  readonly iconOptions = ICON_OPTIONS;
  readonly colorPalette = [
    '#7c3aed','#dc2626','#d97706','#0891b2','#059669','#ea580c',
    '#db2777','#0284c7','#16a34a','#ca8a04','#9333ea','#475569'
  ];

  year         = signal<AcademicYear | null>(null);
  events       = signal<AcademicCalendarEvent[]>([]);
  eventTypes   = signal<CalendarEventType[]>([]);
  loading      = signal(false);
  showModal    = signal(false);
  saving       = signal(false);
  modalError   = signal('');
  editingId    = signal<number | null>(null);
  filterTypeId = signal<number | null>(null);
  deleteTarget = signal<AcademicCalendarEvent | null>(null);
  showTypesPanel = signal(false);

  // Event type modal state
  showTypeModal  = signal(false);
  savingType     = signal(false);
  typeModalError = signal('');
  editingTypeId  = signal<number | null>(null);
  typeForm: CreateCalendarEventTypeDto = { name: '', color: '#7c3aed', icon: 'event', sortOrder: 0 };

  form: { calendarEventTypeId: number; title: string; startDate: string; endDate: string; description: string } = {
    calendarEventTypeId: 0, title: '', startDate: '', endDate: '', description: ''
  };

  private yearId = 0;

  // Plain method (not computed): `form` is a non-signal object, so a computed would cache a stale type.
  selectedType() {
    return this.eventTypes().find(t => t.calendarEventTypeId === this.form.calendarEventTypeId) ?? null;
  }

  filtered = computed(() => {
    const id = this.filterTypeId();
    return id ? this.events().filter(e => e.calendarEventTypeId === id) : this.events();
  });

  groupedEvents = computed(() => {
    const map = new Map<string, AcademicCalendarEvent[]>();
    for (const e of this.filtered()) {
      const month = new Date(e.startDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      if (!map.has(month)) map.set(month, []);
      map.get(month)!.push(e);
    }
    return [...map.entries()].map(([month, events]) => ({ month, events }));
  });

  countByType(id: number) { return this.events().filter(e => e.calendarEventTypeId === id).length; }

  ngOnInit() {
    const routeYear = Number(this.route.snapshot.paramMap.get('yearId'));
    this.svc.getYears().subscribe(years => {
      const selected = routeYear
        ? years.find(y => y.academicYearId === routeYear)
        : (years.find(y => y.isActive) ?? years[0]);
      this.year.set(selected ?? null);
      this.yearId = selected?.academicYearId ?? 0;
      if (this.yearId) this.loadEvents();
      else this.loading.set(false);
    });
    this.loadTypes();
  }

  loadTypes() {
    this.svc.getCalendarEventTypes().subscribe(t => this.eventTypes.set(t));
  }

  loadEvents() {
    this.loading.set(true);
    this.svc.getCalendarEvents(this.yearId).subscribe({
      next: ev => { this.events.set(ev); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  // ── Event CRUD ────────────────────────────────────────────────
  openAdd() {
    this.editingId.set(null);
    const firstType = this.eventTypes()[0];
    this.form = { calendarEventTypeId: firstType?.calendarEventTypeId ?? 0, title: '', startDate: '', endDate: '', description: '' };
    this.modalError.set('');
    this.showModal.set(true);
  }

  openEdit(e: AcademicCalendarEvent) {
    this.editingId.set(e.academicCalendarEventId);
    this.form = {
      calendarEventTypeId: e.calendarEventTypeId,
      title:               e.title,
      startDate:           e.startDate.substring(0, 10),
      endDate:             e.endDate ? e.endDate.substring(0, 10) : '',
      description:         e.description ?? ''
    };
    this.modalError.set('');
    this.showModal.set(true);
  }

  onStartChange() {
    if (this.form.endDate && this.form.endDate < this.form.startDate)
      this.form.endDate = this.form.startDate;
  }

  closeModal() { this.showModal.set(false); }

  save() {
    if (!this.form.title.trim() || !this.form.startDate || !this.form.calendarEventTypeId) {
      this.modalError.set('Event type, title and start date are required.'); return;
    }
    this.saving.set(true);
    const dto: CreateCalendarEventDto = {
      calendarEventTypeId: this.form.calendarEventTypeId,
      title:               this.form.title.trim(),
      startDate:           this.form.startDate,
      endDate:             this.form.endDate || null,
      description:         this.form.description.trim() || null
    };
    const id = this.editingId();
    const req = id
      ? this.svc.updateCalendarEvent(this.yearId, id, dto)
      : this.svc.createCalendarEvent(this.yearId, dto);
    req.subscribe({
      next: () => { this.saving.set(false); this.closeModal(); this.loadEvents(); },
      error: (e: any) => { this.saving.set(false); this.modalError.set(e?.error?.error ?? 'Failed to save.'); }
    });
  }

  confirmDelete(e: AcademicCalendarEvent) { this.deleteTarget.set(e); }

  doDelete() {
    const e = this.deleteTarget();
    if (!e) return;
    this.saving.set(true);
    this.svc.deleteCalendarEvent(this.yearId, e.academicCalendarEventId).subscribe({
      next: () => { this.saving.set(false); this.deleteTarget.set(null); this.loadEvents(); },
      error: () => { this.saving.set(false); this.deleteTarget.set(null); }
    });
  }

  // ── Event Type CRUD ────────────────────────────────────────────
  openAddType() {
    this.editingTypeId.set(null);
    this.typeForm = { name: '', color: '#7c3aed', icon: 'event', sortOrder: this.eventTypes().length };
    this.typeModalError.set('');
    this.showTypeModal.set(true);
  }

  openEditType(t: CalendarEventType) {
    this.editingTypeId.set(t.calendarEventTypeId);
    this.typeForm = { name: t.name, color: t.color, icon: t.icon, sortOrder: t.sortOrder };
    this.typeModalError.set('');
    this.showTypeModal.set(true);
  }

  closeTypeModal() { this.showTypeModal.set(false); }

  saveType() {
    if (!this.typeForm.name.trim()) { this.typeModalError.set('Name is required.'); return; }
    this.savingType.set(true);
    const id = this.editingTypeId();
    const req = id
      ? this.svc.updateCalendarEventType(id, this.typeForm)
      : this.svc.createCalendarEventType(this.typeForm);
    req.subscribe({
      next: () => { this.savingType.set(false); this.closeTypeModal(); this.loadTypes(); },
      error: (e: any) => { this.savingType.set(false); this.typeModalError.set(e?.error?.error ?? 'Failed to save.'); }
    });
  }

  deleteType(t: CalendarEventType) {
    if (!confirm(`Delete type "${t.name}"?`)) return;
    this.svc.deleteCalendarEventType(t.calendarEventTypeId).subscribe({
      next: () => this.loadTypes(),
      error: (e: any) => alert(e?.error?.error ?? 'Cannot delete this type.')
    });
  }
}
