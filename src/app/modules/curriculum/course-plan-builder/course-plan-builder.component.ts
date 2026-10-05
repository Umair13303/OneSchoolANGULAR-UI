import { Component, ElementRef, HostListener, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CurriculumService } from '../../../core/services/curriculum.service';
import { MenuService } from '../../../core/services/menu.service';
import { AuthService } from '../../../core/services/auth.service';
import { CoursePlanDetailDto, CourseChapterDto, CourseTopicDto } from '../../../core/models/curriculum.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { courseHeading } from '../curriculum-ui.util';
import { isEmptyRichHtml } from '../../../shared/rich-content/rich-content.util';

@Component({
  selector: 'app-course-plan-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, LoadingComponent],
  template: `
    <div class="os-page compact">
      <app-page-header [dense]="true" [title]="headerTitle()">
        <a class="btn-secondary" [routerLink]="coursesBackLink()">{{ coursesBackLabel() }}</a>
        @if (plan(); as p) {
          @if (p.status !== 'Archived') {
            <button type="button" class="btn-secondary" (click)="openAddChapter()">Add Chapter</button>
            @if (p.status !== 'Published') {
              <button type="button" class="btn-primary" (click)="publish()" [disabled]="busy()">Publish</button>
            } @else if (!isTeacher()) {
              <button type="button" class="btn-secondary" (click)="archive()" [disabled]="busy()">Archive</button>
            }
          }
        }
      </app-page-header>

      @if (loading()) { <app-loading /> }
      @else if (plan(); as p) {
        <div class="hero">
          <div class="hero-text">
            <h1>{{ courseTitle() }}</h1>
            <div class="hero-meta">
              <span>{{ p.yearLabel }}</span>
              <span class="dot">·</span>
              <span class="status" [attr.data-status]="p.status">
                {{ p.status === 'Draft' ? 'Not published' : p.status }}
              </span>
              <span class="dot">·</span>
              <span>{{ p.chapterCount }} Chapters · {{ p.topicCount }} Topics</span>
            </div>
            @if (p.status === 'Draft') {
              <p class="draft-hint">{{ isTeacher()
                ? 'Add chapters and topics below. Publish when you are ready to teach.'
                : 'Draft — teachers cannot see this course until you publish.' }}</p>
            }
          </div>
        </div>

        @if (showGuide()) {
          <div class="guide">
            <div class="guide-step done"><span>1</span> Course created</div>
            <div class="guide-step" [class.active]="!p.chapters.length"><span>2</span> Add a chapter</div>
            <div class="guide-step" [class.active]="!!p.chapters.length && !p.topicCount"><span>3</span> Add topics</div>
            <div class="guide-step"><span>4</span> Publish</div>
          </div>
        }

        @if (error()) { <div class="os-error">{{ error() }}</div> }

        <div class="outline">
          @for (ch of p.chapters; track ch.courseChapterId; let ci = $index) {
            <div class="chapter" [class.open]="isOpen(ch.courseChapterId)">
              <div class="chapter-row">
                <button type="button" class="chapter-toggle" (click)="toggle(ch.courseChapterId)"
                        [attr.aria-expanded]="isOpen(ch.courseChapterId)">
                  <span class="chev" aria-hidden="true">{{ isOpen(ch.courseChapterId) ? '▾' : '▸' }}</span>
                  <span class="ch-label">Chapter {{ ci + 1 }} — {{ ch.title }}</span>
                  <span class="ch-count">{{ ch.topics.length }} topic{{ ch.topics.length === 1 ? '' : 's' }}</span>
                </button>
                @if (p.status !== 'Archived') {
                  <div class="menu-wrap">
                    <button type="button" class="menu-btn" (click)="toggleMenu('ch-' + ch.courseChapterId, $event)"
                            aria-label="Chapter actions">⋯</button>
                    @if (openMenu() === 'ch-' + ch.courseChapterId) {
                      <div class="menu" role="menu">
                        <button type="button" role="menuitem" (click)="startRenameChapter(ch)">Rename</button>
                        <button type="button" role="menuitem" (click)="openAddTopic(ch)">Add Topic</button>
                        <button type="button" role="menuitem" (click)="moveChapter(ci, -1)" [disabled]="ci === 0">Move up</button>
                        <button type="button" role="menuitem" (click)="moveChapter(ci, 1)" [disabled]="ci === p.chapters.length - 1">Move down</button>
                        <button type="button" role="menuitem" class="danger" (click)="deleteChapter(ch)">Delete</button>
                      </div>
                    }
                  </div>
                }
              </div>

              @if (isOpen(ch.courseChapterId)) {
                <div class="topics">
                  @if (!ch.topics.length) {
                    <div class="empty-topics">
                      No topics yet —
                      <button type="button" class="linkish" (click)="openAddTopic(ch)">add the first topic</button>
                    </div>
                  }
                  @for (t of ch.topics; track t.courseTopicId; let ti = $index) {
                    <div class="topic-row">
                      <a class="topic-link"
                         [routerLink]="['/curriculum/plans', p.coursePlanId, 'topics', t.courseTopicId]">
                        <span class="t-ord">{{ ci + 1 }}.{{ ti + 1 }}</span>
                        <span class="t-title">{{ t.title }}</span>
                        @if (!t.description || isBlankHtml(t.description)) {
                          <span class="t-need">Add lesson</span>
                        } @else if (t.materials.length || t.activities.length) {
                          <span class="t-meta">
                            @if (t.materials.length) { {{ t.materials.length }} material{{ t.materials.length === 1 ? '' : 's' }} }
                            @if (t.materials.length && t.activities.length) { · }
                            @if (t.activities.length) { {{ t.activities.length }} activit{{ t.activities.length === 1 ? 'y' : 'ies' }} }
                          </span>
                        }
                      </a>
                      @if (p.status !== 'Archived') {
                        <div class="menu-wrap">
                          <button type="button" class="menu-btn" (click)="toggleMenu('t-' + t.courseTopicId, $event)"
                                  aria-label="Topic actions">⋯</button>
                          @if (openMenu() === 't-' + t.courseTopicId) {
                            <div class="menu" role="menu">
                              <a role="menuitem"
                                 [routerLink]="['/curriculum/plans', p.coursePlanId, 'topics', t.courseTopicId]">Write lesson</a>
                              <a role="menuitem"
                                 [routerLink]="['/curriculum/plans', p.coursePlanId, 'topics', t.courseTopicId]"
                                 [queryParams]="{ preview: '1' }">Preview</a>
                              <button type="button" role="menuitem" (click)="moveTopic(ch, ti, -1)" [disabled]="ti === 0">Move up</button>
                              <button type="button" role="menuitem" (click)="moveTopic(ch, ti, 1)" [disabled]="ti === ch.topics.length - 1">Move down</button>
                              <button type="button" role="menuitem" class="danger" (click)="deleteTopic(t)">Delete</button>
                            </div>
                          }
                        </div>
                      }
                    </div>
                  }
                  @if (p.status !== 'Archived') {
                    <button type="button" class="add-inline" (click)="openAddTopic(ch)">+ Add topic</button>
                  }
                </div>
              }
            </div>
          } @empty {
            <div class="empty-outline">
              <strong>Start with a chapter</strong>
              <p>Example: “Numbers”, “Fractions”, or “Unit 1”. Then add topics under it.</p>
              @if (p.status !== 'Archived') {
                <button type="button" class="btn-primary" (click)="openAddChapter()">Add first chapter</button>
              }
            </div>
          }
        </div>
      }
    </div>

    @if (chapterSheet()) {
      <div class="sheet-backdrop" (click)="chapterSheet.set(false)">
        <div class="sheet" (click)="$event.stopPropagation()">
          <h3>{{ renamingChapterId() ? 'Rename chapter' : 'New chapter' }}</h3>
          <p class="sheet-hint">A chapter groups related topics (like a unit in the textbook).</p>
          <div class="os-field">
            <label class="os-field-label">Chapter name *</label>
            <input #chapterInput class="os-input" [(ngModel)]="chapterTitle"
                   placeholder="e.g. Numbers" (keydown.enter)="saveChapterSheet()" />
          </div>
          @if (sheetError()) { <div class="os-error">{{ sheetError() }}</div> }
          <div class="sheet-actions">
            <button type="button" class="btn-secondary" (click)="chapterSheet.set(false)">Cancel</button>
            <button type="button" class="btn-primary" (click)="saveChapterSheet()" [disabled]="busy()">
              {{ renamingChapterId() ? 'Save' : 'Add chapter' }}
            </button>
          </div>
        </div>
      </div>
    }

    @if (topicSheet()) {
      <div class="sheet-backdrop" (click)="topicSheet.set(false)">
        <div class="sheet" (click)="$event.stopPropagation()">
          <h3>New topic</h3>
          <p class="sheet-hint">After you add it, you can write the lesson content right away.</p>
          <div class="os-field">
            <label class="os-field-label">Topic name *</label>
            <input #topicInput class="os-input" [(ngModel)]="topicTitle"
                   placeholder="e.g. Addition up to 10" (keydown.enter)="saveTopicSheet()" />
          </div>
          @if (sheetError()) { <div class="os-error">{{ sheetError() }}</div> }
          <div class="sheet-actions">
            <button type="button" class="btn-secondary" (click)="topicSheet.set(false)">Cancel</button>
            <button type="button" class="btn-primary" (click)="saveTopicSheet()" [disabled]="busy()">
              Add &amp; write lesson
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .hero { margin: 0 0 1rem; }
    .hero h1 { margin: 0; font-size: 1.35rem; font-weight: 800; letter-spacing: -.01em; }
    .hero-meta {
      display: flex; flex-wrap: wrap; align-items: center; gap: .35rem .45rem;
      margin-top: .4rem; font-size: .88rem; color: #64748b;
    }
    .dot { color: #cbd5e1; }
    .draft-hint { margin: .45rem 0 0; font-size: .8rem; color: #92400e; }
    .guide {
      display: flex; flex-wrap: wrap; gap: .45rem; margin: 0 0 1rem;
    }
    .guide-step {
      display: inline-flex; align-items: center; gap: .4rem;
      padding: .35rem .65rem; border-radius: 999px; font-size: .78rem; font-weight: 700;
      background: #f1f5f9; color: #64748b;
    }
    .guide-step span {
      width: 18px; height: 18px; border-radius: 999px; display: grid; place-items: center;
      background: #e2e8f0; font-size: .7rem;
    }
    .guide-step.active { background: #dbeafe; color: #1d4ed8; }
    .guide-step.active span { background: #2563eb; color: #fff; }
    .guide-step.done { background: #dcfce7; color: #166534; }
    .guide-step.done span { background: #16a34a; color: #fff; }
    .status {
      font-size: .7rem; font-weight: 700; padding: .15rem .45rem; border-radius: 999px;
      background: #f3f4f6; color: #4b5563;
    }
    .status[data-status="Published"] { background: #dcfce7; color: #166534; }
    .status[data-status="Draft"] { background: #fef3c7; color: #92400e; }
    .status[data-status="Archived"] { background: #e5e7eb; color: #4b5563; }
    .os-error { color: #b91c1c; margin: .5rem 0; font-size: .85rem; }

    .outline { display: grid; gap: .5rem; }
    .chapter {
      background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: visible;
    }
    .chapter-row { display: flex; align-items: stretch; }
    .chapter-toggle {
      flex: 1; display: flex; align-items: center; gap: .55rem; min-width: 0;
      background: #f8fafc; border: none; border-radius: 12px 0 0 12px;
      padding: .75rem .85rem; text-align: left; cursor: pointer; font: inherit;
    }
    .chapter.open .chapter-toggle { border-radius: 12px 0 0 0; border-bottom: 1px solid #e5e7eb; }
    .chapter-row .menu-wrap {
      display: flex; align-items: center; padding: 0 .35rem;
      background: #f8fafc; border-radius: 0 12px 12px 0;
    }
    .chapter.open .chapter-row .menu-wrap { border-radius: 0 12px 0 0; border-bottom: 1px solid #e5e7eb; }
    .chev { color: #94a3b8; width: 1rem; text-align: center; flex-shrink: 0; }
    .ch-label { flex: 1; font-weight: 700; font-size: .95rem; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ch-count { font-size: .75rem; color: #94a3b8; flex-shrink: 0; }

    .topics { padding: .15rem 0 .35rem; }
    .empty-topics { padding: .65rem 1rem .5rem 2.4rem; font-size: .85rem; color: #94a3b8; }
    .linkish {
      background: none; border: none; padding: 0; font: inherit; font-size: inherit;
      color: #2563eb; font-weight: 700; cursor: pointer; text-decoration: underline;
    }
    .t-need {
      font-size: .72rem; font-weight: 800; color: #b45309; background: #fef3c7;
      padding: .12rem .4rem; border-radius: 999px; flex-shrink: 0;
    }
    .topic-row {
      display: flex; align-items: stretch; border-top: 1px solid #f1f5f9;
    }
    .topic-link {
      flex: 1; display: flex; align-items: center; gap: .55rem; min-width: 0;
      padding: .6rem .85rem .6rem 2.2rem; text-decoration: none; color: inherit;
    }
    .topic-link:hover { background: #f8fafc; }
    .t-ord { font-size: .75rem; font-weight: 700; color: #94a3b8; min-width: 2rem; flex-shrink: 0; }
    .t-title { flex: 1; font-size: .92rem; font-weight: 600; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .t-meta { font-size: .72rem; color: #94a3b8; flex-shrink: 0; }
    .add-inline {
      display: block; width: 100%; text-align: left;
      background: none; border: none; border-top: 1px dashed #e2e8f0;
      padding: .55rem .85rem .55rem 2.2rem; color: #2563eb; font: inherit; font-size: .85rem;
      font-weight: 600; cursor: pointer;
    }
    .add-inline:hover { background: #f8fafc; }

    .menu-wrap { position: relative; flex-shrink: 0; display: flex; align-items: center; padding-right: .35rem; }
    .menu-btn {
      background: none; border: none; width: 32px; height: 32px; border-radius: 8px;
      cursor: pointer; color: #64748b; font-size: 1.1rem; line-height: 1;
    }
    .menu-btn:hover { background: #e2e8f0; }
    .menu {
      position: absolute; right: 0; top: 100%; z-index: 20; min-width: 150px;
      background: #fff; border: 1px solid #e5e7eb; border-radius: 10px;
      box-shadow: 0 8px 24px rgba(15,23,42,.12); padding: .3rem; display: grid;
    }
    .menu button, .menu a {
      display: block; width: 100%; text-align: left; background: none; border: none;
      padding: .45rem .65rem; border-radius: 6px; font: inherit; font-size: .85rem;
      color: #0f172a; text-decoration: none; cursor: pointer;
    }
    .menu button:hover, .menu a:hover { background: #f1f5f9; }
    .menu button:disabled { opacity: .4; cursor: default; }
    .menu .danger { color: #dc2626; }

    .empty-outline {
      text-align: center; padding: 2rem 1rem; background: #fff;
      border: 1px dashed #e5e7eb; border-radius: 12px; color: #64748b;
    }
    .empty-outline strong { display: block; color: #0f172a; margin-bottom: .25rem; }
    .empty-outline p { margin: 0 0 .85rem; font-size: .9rem; }

    .sheet-backdrop {
      position: fixed; inset: 0; background: rgba(15,23,42,.4);
      display: grid; place-items: end center; z-index: 60;
    }
    .sheet {
      background: #fff; width: min(440px, 100vw); max-height: 90vh; overflow: auto;
      border-radius: 16px 16px 0 0; padding: 1.15rem; display: grid; gap: .7rem;
    }
    .sheet h3 { margin: 0; font-size: 1.05rem; }
    .sheet-hint { margin: 0; font-size: .82rem; color: #64748b; line-height: 1.4; }
    .sheet .os-input {
      box-sizing: border-box; width: 100%; height: 36px; padding: 0 10px;
      border: 1px solid #e5e7eb; border-radius: 10px; font: inherit; font-size: 13px; font-weight: 600;
    }
    .sheet-actions { display: flex; gap: .5rem; justify-content: flex-end; }
    @media (min-width: 720px) {
      .sheet-backdrop { place-items: center; padding: 1rem; }
      .sheet { border-radius: 12px; }
    }
    @media (max-width: 560px) {
      .t-meta { display: none; }
      .ch-count { display: none; }
    }
  `]
})
export class CoursePlanBuilderComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private curriculum = inject(CurriculumService);
  private menuSvc = inject(MenuService);
  private auth = inject(AuthService);

  plan = signal<CoursePlanDetailDto | null>(null);
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  openMenu = signal<string | null>(null);
  expanded = signal<Set<number>>(new Set());

  chapterSheet = signal(false);
  topicSheet = signal(false);
  sheetError = signal('');
  renamingChapterId = signal<number | null>(null);
  welcome = signal(false);
  addTopicChapterId: number | null = null;
  chapterTitle = '';
  topicTitle = '';
  pendingTopicAfterChapter = false;

  @ViewChild('chapterInput') chapterInput?: ElementRef<HTMLInputElement>;
  @ViewChild('topicInput') topicInput?: ElementRef<HTMLInputElement>;

  isTeacher = () => this.auth.hasRole('teacher') && !this.auth.hasRole('admin', 'principal', 'superadmin');
  coursesBackLink = () => this.isTeacher() ? '/curriculum/my-courses' : '/curriculum/plans';
  coursesBackLabel = () => this.isTeacher() ? 'My Courses' : 'Courses';
  showGuide = computed(() => {
    const p = this.plan();
    return !!p && p.status === 'Draft' && (this.welcome() || p.chapterCount === 0 || p.topicCount === 0);
  });

  headerTitle = computed(() => this.courseTitle() || this.menuSvc.titleForRoute('/curriculum/plans', 'Course'));
  courseTitle = computed(() => {
    const p = this.plan();
    return p ? courseHeading(p.subjectName, p.className, p.section) : '';
  });

  ngOnInit() {
    this.menuSvc.ensureLoaded().subscribe();
    this.welcome.set(this.route.snapshot.queryParamMap.get('welcome') === '1');
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) { this.router.navigate([this.coursesBackLink()]); return; }
    this.reload(id);
  }

  isBlankHtml(html?: string | null) {
    return isEmptyRichHtml(html);
  }

  private focusSheetInput(kind: 'chapter' | 'topic') {
    setTimeout(() => {
      const el = kind === 'chapter' ? this.chapterInput?.nativeElement : this.topicInput?.nativeElement;
      el?.focus();
      el?.select();
    }, 50);
  }

  @HostListener('document:click')
  closeMenus() { this.openMenu.set(null); }

  toggleMenu(key: string, ev: Event) {
    ev.stopPropagation();
    this.openMenu.update(cur => cur === key ? null : key);
  }

  isOpen(chapterId: number) { return this.expanded().has(chapterId); }

  toggle(chapterId: number) {
    this.expanded.update(set => {
      const next = new Set(set);
      if (next.has(chapterId)) next.delete(chapterId); else next.add(chapterId);
      return next;
    });
  }

  reload(id?: number, after?: () => void) {
    const planId = id ?? this.plan()?.coursePlanId;
    if (!planId) return;
    const soft = !!this.plan() && !id;
    if (!soft) this.loading.set(true);
    this.curriculum.getPlan(planId).subscribe({
      next: p => {
        for (const ch of p.chapters) {
          for (const t of ch.topics) {
            if (!t.activities) t.activities = [];
            if (!t.materials) t.materials = [];
          }
        }
        this.plan.set(p);
        if (this.expanded().size === 0 && p.chapters.length) {
          this.expanded.set(new Set(p.chapters.map(c => c.courseChapterId)));
        }
        this.loading.set(false);
        after?.();
      },
      error: () => { this.loading.set(false); this.error.set('Could not load this course.'); }
    });
  }

  openAddChapter() {
    this.renamingChapterId.set(null);
    this.chapterTitle = '';
    this.sheetError.set('');
    this.openMenu.set(null);
    this.chapterSheet.set(true);
    this.focusSheetInput('chapter');
  }

  startRenameChapter(ch: CourseChapterDto) {
    this.renamingChapterId.set(ch.courseChapterId);
    this.chapterTitle = ch.title;
    this.sheetError.set('');
    this.openMenu.set(null);
    this.chapterSheet.set(true);
    this.focusSheetInput('chapter');
  }

  saveChapterSheet() {
    const p = this.plan();
    if (!p || !this.chapterTitle.trim()) {
      this.sheetError.set('Please enter a chapter name.');
      return;
    }
    this.busy.set(true);
    this.sheetError.set('');
    const renameId = this.renamingChapterId();
    if (renameId) {
      this.curriculum.updateChapter(renameId, { title: this.chapterTitle.trim() }).subscribe({
        next: () => { this.busy.set(false); this.chapterSheet.set(false); this.reload(); },
        error: err => { this.busy.set(false); this.sheetError.set(err?.error?.error || 'Could not save.'); }
      });
    } else {
      this.curriculum.createChapter({ coursePlanId: p.coursePlanId, title: this.chapterTitle.trim() }).subscribe({
        next: ch => {
          this.busy.set(false);
          this.chapterSheet.set(false);
          this.expanded.update(s => new Set([...s, ch.courseChapterId]));
          this.pendingTopicAfterChapter = true;
          this.reload(undefined, () => {
            if (this.pendingTopicAfterChapter) {
              this.pendingTopicAfterChapter = false;
              const latest = this.plan()?.chapters.find(c => c.courseChapterId === ch.courseChapterId);
              if (latest) this.openAddTopic(latest);
            }
          });
        },
        error: err => { this.busy.set(false); this.sheetError.set(err?.error?.error || 'Could not add chapter.'); }
      });
    }
  }

  openAddTopic(ch: CourseChapterDto) {
    this.addTopicChapterId = ch.courseChapterId;
    this.topicTitle = '';
    this.sheetError.set('');
    this.openMenu.set(null);
    this.expanded.update(s => new Set([...s, ch.courseChapterId]));
    this.topicSheet.set(true);
    this.focusSheetInput('topic');
  }

  saveTopicSheet() {
    if (!this.addTopicChapterId || !this.topicTitle.trim()) {
      this.sheetError.set('Please enter a topic name.');
      return;
    }
    const planId = this.plan()?.coursePlanId;
    this.busy.set(true);
    this.curriculum.createTopic({ courseChapterId: this.addTopicChapterId, title: this.topicTitle.trim() }).subscribe({
      next: t => {
        this.busy.set(false);
        this.topicSheet.set(false);
        if (planId) {
          this.router.navigate(['/curriculum/plans', planId, 'topics', t.courseTopicId]);
        } else {
          this.reload();
        }
      },
      error: err => { this.busy.set(false); this.sheetError.set(err?.error?.error || 'Could not add topic.'); }
    });
  }

  deleteChapter(ch: CourseChapterDto) {
    this.openMenu.set(null);
    if (!confirm(`Delete chapter "${ch.title}" and its topics?`)) return;
    this.curriculum.deleteChapter(ch.courseChapterId).subscribe({ next: () => this.reload() });
  }

  deleteTopic(t: CourseTopicDto) {
    this.openMenu.set(null);
    if (!confirm(`Delete topic "${t.title}"?`)) return;
    this.curriculum.deleteTopic(t.courseTopicId).subscribe({ next: () => this.reload() });
  }

  moveChapter(index: number, delta: number) {
    this.openMenu.set(null);
    const p = this.plan();
    if (!p) return;
    const ids = p.chapters.map(c => c.courseChapterId);
    const j = index + delta;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    this.curriculum.reorderChapters(p.coursePlanId, ids).subscribe({ next: () => this.reload() });
  }

  moveTopic(ch: CourseChapterDto, index: number, delta: number) {
    this.openMenu.set(null);
    const ids = ch.topics.map(t => t.courseTopicId);
    const j = index + delta;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    this.curriculum.reorderTopics(ch.courseChapterId, ids).subscribe({ next: () => this.reload() });
  }

  publish() {
    const p = this.plan();
    if (!p) return;
    if (!p.chapters.length) {
      this.error.set('Add at least one chapter before publishing.');
      return;
    }
    this.busy.set(true);
    this.curriculum.publishPlan(p.coursePlanId).subscribe({
      next: () => { this.busy.set(false); this.reload(); },
      error: err => { this.busy.set(false); this.error.set(err?.error?.error || 'Publish failed'); }
    });
  }

  archive() {
    const p = this.plan();
    if (!p || !confirm('Archive this course? Teachers will no longer see it.')) return;
    this.curriculum.archivePlan(p.coursePlanId).subscribe({ next: () => this.reload() });
  }
}
