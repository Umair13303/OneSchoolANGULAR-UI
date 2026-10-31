import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CurriculumService } from '../../../core/services/curriculum.service';
import { FileUploadService } from '../../../core/services/file-upload.service';
import {
  CoursePlanDetailDto,
  CourseTopicDto,
  CourseActivityType
} from '../../../core/models/curriculum.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { OsSelectComponent, OsSelectOption } from '../../../shared/components/os-select/os-select.component';
import { RichContentEditorComponent } from '../../../shared/rich-content/rich-content-editor.component';
import { RichContentViewComponent } from '../../../shared/rich-content/rich-content-view.component';
import { isEmptyRichHtml, sanitizeRichHtml } from '../../../shared/rich-content/rich-content.util';
import { activityTypeLabel, courseHeading, materialTypeLabel } from '../curriculum-ui.util';
import { environment } from '../../../../environments/environment';

type Tab = 'content' | 'materials' | 'activities';

@Component({
  selector: 'app-topic-editor',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule, PageHeaderComponent, LoadingComponent,
    OsSelectComponent, RichContentEditorComponent, RichContentViewComponent
  ],
  template: `
    <div class="os-page compact te-page">
      <app-page-header
        [dense]="true"
        [title]="titleModel.trim() || 'Write lesson'"
        [subtitle]="courseLabel()">
        @if (preview()) {
          <button type="button" class="btn-primary" (click)="preview.set(false)">Back to Edit</button>
        }
      </app-page-header>

      @if (loading()) { <app-loading /> }
      @else if (topic(); as t) {
        @if (preview()) {
          <div class="preview-shell">
            <h2 class="preview-title">{{ titleModel }}</h2>
            <div class="preview-body">
              <app-rich-content-view [html]="contentModel" emptyText="No content yet." />
            </div>
            @if (t.materials.length) {
              <h3 class="sec-h">Materials</h3>
              @for (m of t.materials; track m.courseMaterialId) {
                <div class="mat-row">
                  <span class="chip">{{ matLabel(m.materialType) }}</span>
                  <span>{{ m.title }}</span>
                  @if (m.fileStoreId) {
                    <a [href]="fileUrl(m.fileStoreId)" target="_blank" rel="noopener">Open</a>
                  } @else if (m.url) {
                    <a [href]="m.url" target="_blank" rel="noopener">Open</a>
                  }
                </div>
              }
            }
            @if (t.activities.length) {
              <h3 class="sec-h">Activities</h3>
              @for (a of t.activities; track a.courseTopicActivityId) {
                <div class="act-card">
                  <div class="act-top">
                    <span class="chip act">{{ actLabel(a.activityType) }}</span>
                    <strong>{{ a.title }}</strong>
                  </div>
                  @if (a.instructionText) { <div class="instr">{{ a.instructionText }}</div> }
                  <div class="act-media">
                    @if (a.referenceImageFileId) {
                      <img [src]="fileUrl(a.referenceImageFileId)" [alt]="a.referenceImageName || 'Reference'" />
                    }
                    @if (a.exampleImageFileId) {
                      <img [src]="fileUrl(a.exampleImageFileId)" [alt]="a.exampleImageName || 'Example'" />
                    }
                    @if (a.worksheetFileId) {
                      <a [href]="fileUrl(a.worksheetFileId)" target="_blank" rel="noopener">
                        {{ a.worksheetFileName || 'Worksheet' }}
                      </a>
                    }
                  </div>
                </div>
              }
            }
          </div>
        } @else {
          <div class="te-card">
            <div class="te-card-top">
              <div class="os-field title-field">
                <label class="os-field-label" for="te-topic-title">Topic name</label>
                <input id="te-topic-title" class="os-input title-input" [(ngModel)]="titleModel"
                       name="topicTitle" autocomplete="off"
                       placeholder="e.g. Introduction to nouns" />
              </div>

              <div class="tabs" role="tablist">
                <button type="button" class="tab" [class.active]="tab() === 'content'" (click)="tab.set('content')">
                  <span class="material-icons-round">edit_note</span> Lesson
                </button>
                <button type="button" class="tab" [class.active]="tab() === 'materials'" (click)="tab.set('materials')">
                  <span class="material-icons-round">attach_file</span>
                  Files @if (t.materials.length) { <span class="count">{{ t.materials.length }}</span> }
                </button>
                <button type="button" class="tab" [class.active]="tab() === 'activities'" (click)="tab.set('activities')">
                  <span class="material-icons-round">extension</span>
                  Activities @if (t.activities.length) { <span class="count">{{ t.activities.length }}</span> }
                </button>
              </div>
            </div>

            <div class="te-card-body">
              @if (error()) { <div class="os-error">{{ error() }}</div> }
              @if (savedFlash()) { <div class="os-ok">Lesson saved.</div> }

              @if (tab() === 'content') {
                <p class="tab-hint">Write or paste the lesson. Maths, Urdu, Arabic, images and tables are supported.</p>
                <div class="editor-wrap">
                  <app-rich-content-editor
                    [(ngModel)]="contentModel"
                    placeholder="Start typing the lesson…"
                    uploadEntityType="CourseTopic"
                    minHeight="320px" />
                </div>
              }

              @if (tab() === 'materials') {
                <div class="panel-head in-card">
                  <p class="muted">Attach PDF, Word, worksheet, image, or a link.</p>
                  <button type="button" class="btn-primary btn-sm" (click)="openMaterial()">+ Add file</button>
                </div>
                @if (!t.materials.length) {
                  <div class="empty">No files yet — add a worksheet or notes for students.</div>
                } @else {
                  @for (m of t.materials; track m.courseMaterialId) {
                    <div class="mat-row">
                      <span class="chip">{{ matLabel(m.materialType) }}</span>
                      <span class="grow">{{ m.title }}</span>
                      @if (m.fileName) { <span class="muted">{{ m.fileName }}</span> }
                      @if (m.fileStoreId) {
                        <a [href]="fileUrl(m.fileStoreId)" target="_blank" rel="noopener">Open</a>
                      } @else if (m.url) {
                        <a [href]="m.url" target="_blank" rel="noopener">Open</a>
                      }
                      <button type="button" class="link danger" (click)="removeMaterial(m.courseMaterialId)">Remove</button>
                    </div>
                  }
                }
              }

              @if (tab() === 'activities') {
                <div class="panel-head in-card">
                  <p class="muted">Optional early-grade activities for this topic.</p>
                  <button type="button" class="btn-primary btn-sm" (click)="openActivity()">+ Add activity</button>
                </div>
                @if (!t.activities.length) {
                  <div class="empty">No activities yet.</div>
                } @else {
                  @for (a of t.activities; track a.courseTopicActivityId) {
                    <div class="act-card">
                      <div class="act-top">
                        <span class="chip act">{{ actLabel(a.activityType) }}</span>
                        <strong class="grow">{{ a.title }}</strong>
                        <button type="button" class="link danger" (click)="removeActivity(a.courseTopicActivityId)">Remove</button>
                      </div>
                      @if (a.instructionText) { <div class="instr">{{ a.instructionText }}</div> }
                      <div class="act-media">
                        @if (a.referenceImageFileId) {
                          <img [src]="fileUrl(a.referenceImageFileId)" alt="" />
                        }
                        @if (a.exampleImageFileId) {
                          <img [src]="fileUrl(a.exampleImageFileId)" alt="" />
                        }
                        @if (a.worksheetFileId) {
                          <a [href]="fileUrl(a.worksheetFileId)" target="_blank" rel="noopener">
                            {{ a.worksheetFileName || 'Worksheet' }}
                          </a>
                        }
                      </div>
                    </div>
                  }
                }
              }
            </div>

            <div class="te-card-foot">
              <a class="btn-secondary te-act"
                 [routerLink]="['/curriculum/plans', planId()]">Cancel</a>
              <div class="te-card-foot-end">
                <button type="button" class="btn-secondary te-act" (click)="preview.set(true)">Preview</button>
                <button type="button" class="btn-primary te-act te-save"
                        (click)="save()" [disabled]="busy() || !canSave()">
                  {{ busy() ? 'Saving…' : 'Save' }}
                </button>
              </div>
            </div>
          </div>
        }
      }
    </div>

    @if (materialOpen()) {
      <div class="sheet-backdrop" (click)="materialOpen.set(false)">
        <div class="sheet" (click)="$event.stopPropagation()">
          <h3>Add Material</h3>
          <div class="os-field">
            <label class="os-field-label">Title *</label>
            <input class="os-input" [(ngModel)]="matTitle" placeholder="e.g. Worksheet 1A" />
          </div>
          <div class="os-field">
            <label class="os-field-label">Type</label>
            <app-os-select [options]="materialTypes" [value]="matType" (valueChange)="matType = $event!" />
          </div>
          <div class="os-field">
            <label class="os-field-label">Link (optional)</label>
            <input class="os-input" [(ngModel)]="matUrl" placeholder="https://…" />
          </div>
          <div class="os-field">
            <label class="os-field-label">Upload file (optional)</label>
            <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx" (change)="onMatFile($event)" />
          </div>
          @if (matError()) { <div class="os-error">{{ matError() }}</div> }
          <div class="sheet-actions">
            <button type="button" class="btn-secondary" (click)="materialOpen.set(false)">Cancel</button>
            <button type="button" class="btn-primary" (click)="saveMaterial()" [disabled]="busy()">Add</button>
          </div>
        </div>
      </div>
    }

    @if (activityOpen()) {
      <div class="sheet-backdrop" (click)="activityOpen.set(false)">
        <div class="sheet sheet-lg" (click)="$event.stopPropagation()">
          <h3>Add Activity</h3>
          <div class="os-field">
            <label class="os-field-label">Activity *</label>
            <app-os-select [options]="activityTypes" [value]="actType" (valueChange)="onActType($event)" />
          </div>
          <div class="os-field">
            <label class="os-field-label">Title *</label>
            <input class="os-input" [(ngModel)]="actTitle" placeholder="e.g. Draw a circle" />
          </div>
          <div class="os-field">
            <label class="os-field-label">Instruction</label>
            <textarea class="os-textarea" rows="3" [(ngModel)]="actInstruction"
              placeholder="What should the student do?"></textarea>
          </div>
          @if (showActImages()) {
            <div class="os-field">
              <label class="os-field-label">Reference image</label>
              <input type="file" accept=".png,.jpg,.jpeg,.webp" (change)="onActRef($event)" />
            </div>
            <div class="os-field">
              <label class="os-field-label">Example image (optional)</label>
              <input type="file" accept=".png,.jpg,.jpeg,.webp" (change)="onActEx($event)" />
            </div>
          }
          @if (actType === 'Worksheet') {
            <div class="os-field">
              <label class="os-field-label">Worksheet file</label>
              <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx" (change)="onActWs($event)" />
            </div>
          }
          @if (actType === 'Matching') {
            <div class="os-field">
              <label class="os-field-label">Pairs (one per line: Left | Right)</label>
              <textarea class="os-textarea" rows="4" [(ngModel)]="cfgPairs"
                placeholder="Cat | Home"></textarea>
            </div>
          }
          @if (actType === 'FillBlanks') {
            <div class="os-field">
              <label class="os-field-label">Sentence (use ___ for blanks)</label>
              <input class="os-input" [(ngModel)]="cfgSentence" />
            </div>
            <div class="os-field">
              <label class="os-field-label">Answers (comma-separated)</label>
              <input class="os-input" [(ngModel)]="cfgAnswers" />
            </div>
          }
          @if (isOptionsType()) {
            <div class="os-field">
              <label class="os-field-label">Options (one per line)</label>
              <textarea class="os-textarea" rows="4" [(ngModel)]="cfgOptions"></textarea>
            </div>
            <div class="os-field">
              <label class="os-field-label">Correct option number (optional)</label>
              <input class="os-input" type="number" min="1" [(ngModel)]="cfgCorrectIndex" />
            </div>
          }
          @if (actType === 'ConnectDots') {
            <div class="os-field">
              <label class="os-field-label">Number of dots</label>
              <input class="os-input" type="number" min="2" [(ngModel)]="cfgDotCount" />
            </div>
            <div class="os-field">
              <label class="os-field-label">Hint (optional)</label>
              <input class="os-input" [(ngModel)]="cfgHint" />
            </div>
          }
          @if (actType === 'DragArrange') {
            <div class="os-field">
              <label class="os-field-label">Items in correct order (one per line)</label>
              <textarea class="os-textarea" rows="4" [(ngModel)]="cfgItems"></textarea>
            </div>
          }
          @if (actError()) { <div class="os-error">{{ actError() }}</div> }
          <div class="sheet-actions">
            <button type="button" class="btn-secondary" (click)="activityOpen.set(false)">Cancel</button>
            <button type="button" class="btn-primary" (click)="saveActivity()" [disabled]="busy()">Add</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .te-page { padding-bottom: var(--fab-page-pad); }

    .te-card {
      background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden;
      box-shadow: 0 1px 2px rgba(15,23,42,.04);
    }
    .te-card-top {
      padding: .9rem 1rem .15rem; background: #f8fafc; border-bottom: 1px solid #eef2f7;
    }
    .te-card-body { padding: .85rem 1rem 1rem; }

    /* Symmetric Cancel ←→ Preview + Save */
    .te-card-foot {
      position: sticky;
      bottom: 0;
      z-index: var(--z-sticky-footer);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: .75rem;
      padding: .85rem 1rem;
      border-top: 1px solid #e2e8f0;
      background: rgba(248, 250, 252, .97);
      backdrop-filter: blur(8px);
    }
    .te-card-foot-end {
      display: flex;
      align-items: center;
      gap: .55rem;
      margin-left: auto;
    }
    .te-act {
      box-sizing: border-box;
      min-width: 6.75rem;
      height: 40px !important;
      padding: 0 1.1rem !important;
      justify-content: center;
      text-align: center;
      font-weight: 700 !important;
    }
    .te-save { min-width: 7.25rem; }

    .title-field { margin-bottom: .45rem; }
    .title-field .os-field-label {
      display: block; margin-bottom: .3rem;
      font-size: .68rem; font-weight: 700; letter-spacing: .04em;
      text-transform: uppercase; color: #64748b;
    }
    .title-input {
      box-sizing: border-box; width: 100%; height: 46px; padding: 0 14px;
      border: 1px solid #e2e8f0; border-radius: 11px;
      font: inherit; font-size: 1.08rem; font-weight: 700; color: #0f172a;
      background: #fff;
    }
    .title-input:focus {
      outline: none; border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37,99,235,.15);
    }

    .tabs {
      display: flex; gap: .15rem; margin: 0 -.25rem;
      overflow-x: auto; scrollbar-width: none;
    }
    .tabs::-webkit-scrollbar { display: none; }
    .tab {
      display: inline-flex; align-items: center; gap: .3rem;
      background: none; border: none; border-bottom: 2px solid transparent;
      padding: .65rem .75rem; font: inherit; font-size: .86rem; font-weight: 700;
      color: #64748b; cursor: pointer; white-space: nowrap;
    }
    .tab .material-icons-round { font-size: 18px; opacity: .85; }
    .tab.active { color: #1d4ed8; border-bottom-color: #2563eb; }
    .count {
      display: inline-block; margin-left: .15rem; font-size: .68rem;
      background: #e2e8f0; color: #475569; padding: .05rem .35rem; border-radius: 999px;
    }
    .tab.active .count { background: #dbeafe; color: #1d4ed8; }

    .tab-hint { margin: 0 0 .65rem; font-size: .82rem; color: #64748b; }
    .muted { color: #6b7280; }
    .os-error {
      margin: 0 0 .65rem; padding: .55rem .75rem; border-radius: 10px;
      background: #fef2f2; color: #b91c1c; font-size: .85rem; font-weight: 600;
    }
    .os-ok {
      margin: 0 0 .65rem; padding: .55rem .75rem; border-radius: 10px;
      background: #dcfce7; color: #166534; font-size: .85rem; font-weight: 700;
    }

    .editor-wrap { margin-bottom: .25rem; }
    .editor-wrap ::ng-deep .ql-toolbar {
      border-radius: 10px 10px 0 0 !important; border-color: #e2e8f0 !important;
      background: #f8fafc;
    }
    .editor-wrap ::ng-deep .ql-container {
      border-radius: 0 0 10px 10px !important; border-color: #e2e8f0 !important;
    }

    .panel-head.in-card {
      display: flex; justify-content: space-between; gap: .75rem; align-items: center;
      margin-bottom: .75rem; flex-wrap: wrap;
    }
    .panel-head .muted { margin: 0; font-size: .85rem; }
    .btn-sm { height: 32px !important; padding: 0 12px !important; font-size: 12px !important; }
    .empty {
      color: #94a3b8; font-size: .9rem; padding: 1.25rem .5rem;
      text-align: center; border: 1px dashed #e2e8f0; border-radius: 10px;
    }
    .mat-row, .act-top {
      display: flex; gap: .5rem; align-items: center; flex-wrap: wrap;
      padding: .55rem 0; border-top: 1px solid #f1f5f9; font-size: .9rem;
    }
    .grow { flex: 1; min-width: 0; }
    .chip {
      font-size: .68rem; font-weight: 700; background: #eff6ff; color: #1d4ed8;
      padding: .12rem .4rem; border-radius: 4px;
    }
    .chip.act { background: #fef3c7; color: #92400e; }
    .link {
      background: none; border: none; color: #2563eb; cursor: pointer; font-size: .8rem; padding: 0;
    }
    .link.danger { color: #dc2626; }
    .act-card { padding: .35rem 0; border-top: 1px solid #f1f5f9; }
    .instr { font-size: .88rem; margin: .25rem 0; white-space: pre-wrap; }
    .act-media { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: .35rem; }
    .act-media img {
      max-width: 120px; max-height: 90px; object-fit: contain;
      border: 1px solid #e2e8f0; border-radius: 8px; background: #fff;
    }
    .preview-shell {
      background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1.1rem 1.25rem;
    }
    .preview-title { margin: 0 0 .75rem; font-size: 1.25rem; }
    .preview-body { margin-bottom: 1rem; }
    .sec-h { font-size: .95rem; margin: 1rem 0 .5rem; }
    .sheet-backdrop {
      position: fixed; inset: 0; background: rgba(15,23,42,.4);
      display: grid; place-items: end center; z-index: 60; padding: 0;
    }
    .sheet {
      background: #fff; width: min(480px, 100vw); max-height: 92vh; overflow: auto;
      border-radius: 16px 16px 0 0; padding: 1.15rem; display: grid; gap: .7rem;
    }
    .sheet-lg { width: min(560px, 100vw); }
    .sheet h3 { margin: 0; font-size: 1.05rem; }
    .sheet .os-input, .sheet .os-textarea { width: 100%; box-sizing: border-box; }
    .os-textarea {
      min-height: 90px; padding: .55rem .7rem; border: 1px solid #e5e7eb;
      border-radius: 10px; font: inherit; font-size: 13px; resize: vertical;
    }
    .sheet-actions { display: flex; gap: .5rem; justify-content: flex-end; padding-top: .35rem; }
    @media (min-width: 720px) {
      .sheet-backdrop { place-items: center; padding: 1rem; }
      .sheet, .sheet-lg { border-radius: 12px; }
      .te-card-foot { padding-left: 1.15rem; padding-right: 1.15rem; }
    }
    @media (max-width: 560px) {
      .panel-head.in-card { align-items: stretch; }
      .panel-head .btn-primary { width: 100%; }
      .te-card-foot {
        flex-direction: column-reverse;
        align-items: stretch;
      }
      .te-card-foot-end {
        margin-left: 0;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: .5rem;
      }
      .te-act { width: 100%; min-width: 0; }
    }
  `]
})
export class TopicEditorComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private curriculum = inject(CurriculumService);
  private fileUpload = inject(FileUploadService);

  planId = signal(0);
  topic = signal<CourseTopicDto | null>(null);
  plan = signal<CoursePlanDetailDto | null>(null);
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  savedFlash = signal(false);
  tab = signal<Tab>('content');
  preview = signal(false);

  titleModel = '';
  contentModel = '';

  materialOpen = signal(false);
  matError = signal('');
  matTitle = '';
  matType = 'Worksheet';
  matUrl = '';
  matFile: File | null = null;

  activityOpen = signal(false);
  actError = signal('');
  actType: CourseActivityType | string = 'Drawing';
  actTitle = '';
  actInstruction = '';
  actRef: File | null = null;
  actEx: File | null = null;
  actWs: File | null = null;
  cfgPairs = '';
  cfgSentence = '';
  cfgAnswers = '';
  cfgOptions = '';
  cfgCorrectIndex: number | null = null;
  cfgDotCount: number | null = 10;
  cfgHint = '';
  cfgItems = '';

  materialTypes: OsSelectOption<string>[] = [
    { value: 'Pdf', label: 'PDF' },
    { value: 'Worksheet', label: 'Worksheet' },
    { value: 'Image', label: 'Image' },
    { value: 'Booklet', label: 'Booklet' },
    { value: 'Link', label: 'External Link' },
    { value: 'Other', label: 'Other' }
  ];

  activityTypes: OsSelectOption<string>[] = [
    { value: 'Drawing', label: 'Drawing' },
    { value: 'Coloring', label: 'Coloring' },
    { value: 'Tracing', label: 'Tracing' },
    { value: 'Matching', label: 'Matching' },
    { value: 'ConnectDots', label: 'Connect Dots' },
    { value: 'ShapeIdentification', label: 'Shape Identification' },
    { value: 'PictureIdentification', label: 'Picture Identification' },
    { value: 'DragArrange', label: 'Drag & Arrange' },
    { value: 'FillBlanks', label: 'Fill in the Blanks' },
    { value: 'CircleSelect', label: 'Circle / Select' },
    { value: 'ImageQuestion', label: 'Image Question' },
    { value: 'Worksheet', label: 'Worksheet' }
  ];

  private imageTypes = new Set([
    'Drawing', 'Coloring', 'Tracing', 'Matching', 'ConnectDots',
    'ShapeIdentification', 'PictureIdentification', 'DragArrange',
    'FillBlanks', 'CircleSelect', 'ImageQuestion'
  ]);

  courseLabel = computed(() => {
    const p = this.plan();
    return p ? courseHeading(p.subjectName, p.className, p.section) : '';
  });

  ngOnInit() {
    const planId = Number(this.route.snapshot.paramMap.get('planId'));
    const topicId = Number(this.route.snapshot.paramMap.get('topicId'));
    if (!planId || !topicId) {
      this.router.navigate(['/curriculum/plans']);
      return;
    }
    this.planId.set(planId);
    if (this.route.snapshot.queryParamMap.get('preview') === '1') {
      this.preview.set(true);
    }
    this.reload(topicId, planId);
  }

  canSave() { return !!this.titleModel.trim(); }

  fileUrl(id: number) { return `${environment.fileServerUrl}/files/${id}`; }
  actLabel(t: string) { return activityTypeLabel(t); }
  matLabel(t: string) { return materialTypeLabel(t); }

  showActImages() { return this.imageTypes.has(String(this.actType)); }
  isOptionsType() {
    return ['CircleSelect', 'ImageQuestion', 'ShapeIdentification', 'PictureIdentification']
      .includes(String(this.actType));
  }

  /** Topic belongs to this plan via CourseTopic → CourseChapter → CoursePlan. */
  private topicBelongsToPlan(plan: CoursePlanDetailDto, topic: CourseTopicDto): boolean {
    return plan.chapters.some(ch =>
      ch.courseChapterId === topic.courseChapterId ||
      ch.topics.some(t => t.courseTopicId === topic.courseTopicId)
    );
  }

  private rejectOwnership(pid: number) {
    this.topic.set(null);
    this.titleModel = '';
    this.contentModel = '';
    this.plan.set(null);
    this.loading.set(false);
    this.router.navigate(['/curriculum/plans', pid]);
  }

  reload(topicId?: number, planId?: number) {
    const tid = topicId ?? this.topic()?.courseTopicId;
    const pid = planId ?? this.planId();
    if (!tid || !pid) return;
    this.loading.set(true);
    forkJoin({
      plan: this.curriculum.getPlan(pid),
      topic: this.curriculum.getTopic(tid)
    }).subscribe({
      next: ({ plan, topic }) => {
        if (!this.topicBelongsToPlan(plan, topic)) {
          this.rejectOwnership(pid);
          return;
        }
        if (!topic.activities) topic.activities = [];
        if (!topic.materials) topic.materials = [];
        this.plan.set(plan);
        this.topic.set(topic);
        this.titleModel = topic.title;
        this.contentModel = topic.description || '';
        this.loading.set(false);
      },
      error: () => {
        this.topic.set(null);
        this.titleModel = '';
        this.contentModel = '';
        this.loading.set(false);
        this.router.navigate(['/curriculum/plans', pid]);
      }
    });
  }

  save() {
    const t = this.topic();
    if (!t || !this.titleModel.trim()) return;
    this.busy.set(true);
    this.error.set('');
    this.savedFlash.set(false);
    this.curriculum.updateTopic(t.courseTopicId, {
      title: this.titleModel.trim(),
      description: isEmptyRichHtml(this.contentModel) ? null : sanitizeRichHtml(this.contentModel)
    }).subscribe({
      next: () => {
        this.busy.set(false);
        this.savedFlash.set(true);
        this.reload();
        setTimeout(() => this.savedFlash.set(false), 2000);
      },
      error: err => {
        this.busy.set(false);
        this.error.set(err?.error?.error || 'Could not save topic.');
      }
    });
  }

  openMaterial() {
    this.matTitle = '';
    this.matType = 'Worksheet';
    this.matUrl = '';
    this.matFile = null;
    this.matError.set('');
    this.materialOpen.set(true);
  }

  onMatFile(ev: Event) {
    this.matFile = (ev.target as HTMLInputElement).files?.[0] ?? null;
  }

  saveMaterial() {
    const t = this.topic();
    if (!t) return;
    if (!this.matTitle.trim()) { this.matError.set('Title is required.'); return; }
    this.busy.set(true);
    const finish = (fileStoreId?: number | null) => {
      this.curriculum.createMaterial({
        courseTopicId: t.courseTopicId,
        title: this.matTitle.trim(),
        materialType: this.matType,
        content: null,
        url: this.matUrl.trim() || null,
        fileStoreId: fileStoreId ?? null
      }).subscribe({
        next: () => {
          this.busy.set(false);
          this.materialOpen.set(false);
          this.reload();
          this.tab.set('materials');
        },
        error: err => {
          this.busy.set(false);
          this.matError.set(err?.error?.error || 'Failed to add material.');
        }
      });
    };
    if (this.matFile) {
      this.fileUpload.upload(this.matFile, 'CourseMaterial', { label: this.matTitle.trim() }).subscribe({
        next: res => finish(res.fileId),
        error: () => { this.busy.set(false); this.matError.set('Upload failed.'); }
      });
    } else {
      finish(null);
    }
  }

  removeMaterial(id: number) {
    if (!confirm('Remove this material?')) return;
    this.curriculum.deleteMaterial(id).subscribe({ next: () => this.reload() });
  }

  openActivity() {
    this.actType = 'Drawing';
    this.actTitle = '';
    this.actInstruction = '';
    this.actRef = this.actEx = this.actWs = null;
    this.cfgPairs = this.cfgSentence = this.cfgAnswers = this.cfgOptions = this.cfgHint = this.cfgItems = '';
    this.cfgCorrectIndex = null;
    this.cfgDotCount = 10;
    this.actError.set('');
    this.activityOpen.set(true);
  }

  onActType(v: string | null) { if (v) this.actType = v; }
  onActRef(ev: Event) { this.actRef = (ev.target as HTMLInputElement).files?.[0] ?? null; }
  onActEx(ev: Event) { this.actEx = (ev.target as HTMLInputElement).files?.[0] ?? null; }
  onActWs(ev: Event) { this.actWs = (ev.target as HTMLInputElement).files?.[0] ?? null; }

  private buildConfig(): string | null {
    const type = String(this.actType);
    if (type === 'Matching') {
      const pairs = this.cfgPairs.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
        const [left, ...rest] = line.split('|');
        return { left: (left || '').trim(), right: rest.join('|').trim() };
      }).filter(p => p.left || p.right);
      return pairs.length ? JSON.stringify({ pairs }) : null;
    }
    if (type === 'FillBlanks') {
      return JSON.stringify({
        sentence: this.cfgSentence.trim(),
        answers: this.cfgAnswers.split(',').map(s => s.trim()).filter(Boolean)
      });
    }
    if (this.isOptionsType()) {
      const options = this.cfgOptions.split('\n').map(s => s.trim()).filter(Boolean);
      const cfg: Record<string, unknown> = { options };
      if (this.cfgCorrectIndex != null && this.cfgCorrectIndex > 0) cfg['correctIndex'] = this.cfgCorrectIndex - 1;
      return options.length ? JSON.stringify(cfg) : null;
    }
    if (type === 'ConnectDots') {
      return JSON.stringify({ dotCount: this.cfgDotCount || 10, hint: this.cfgHint.trim() || null });
    }
    if (type === 'DragArrange') {
      const items = this.cfgItems.split('\n').map(s => s.trim()).filter(Boolean);
      return items.length ? JSON.stringify({ items, targetOrder: [...items] }) : null;
    }
    return null;
  }

  private uploadOptional(file: File | null, label: string): Promise<number | null> {
    if (!file) return Promise.resolve(null);
    return new Promise((resolve, reject) => {
      this.fileUpload.upload(file, 'CourseTopicActivity', { label }).subscribe({
        next: res => resolve(res.fileId),
        error: () => reject(new Error('upload'))
      });
    });
  }

  async saveActivity() {
    const t = this.topic();
    if (!t) return;
    if (!this.actTitle.trim()) { this.actError.set('Title is required.'); return; }
    this.busy.set(true);
    this.actError.set('');
    try {
      const canvasDefault = ['Drawing', 'Coloring', 'Tracing', 'ConnectDots'].includes(String(this.actType));
      const [refId, exId, wsId] = await Promise.all([
        this.uploadOptional(this.actRef, 'reference'),
        this.uploadOptional(this.actEx, 'example'),
        this.uploadOptional(this.actWs, 'worksheet')
      ]);
      this.curriculum.createActivity({
        courseTopicId: t.courseTopicId,
        activityType: this.actType,
        title: this.actTitle.trim(),
        instructionText: this.actInstruction.trim() || null,
        referenceImageFileId: refId,
        exampleImageFileId: exId,
        worksheetFileId: wsId,
        configJson: this.buildConfig(),
        canvasEnabled: canvasDefault
      }).subscribe({
        next: () => {
          this.busy.set(false);
          this.activityOpen.set(false);
          this.reload();
          this.tab.set('activities');
        },
        error: err => {
          this.busy.set(false);
          this.actError.set(err?.error?.error || 'Failed to add activity.');
        }
      });
    } catch {
      this.busy.set(false);
      this.actError.set('Image upload failed.');
    }
  }

  removeActivity(id: number) {
    if (!confirm('Remove this activity?')) return;
    this.curriculum.deleteActivity(id).subscribe({ next: () => this.reload() });
  }
}
