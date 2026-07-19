import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormArray, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subscription, merge } from 'rxjs';
import { ExamService }     from '../../../core/services/exam.service';
import { AcademicService } from '../../../core/services/academic.service';
import { ExamPaperDto, EXAM_TYPES, CLASS_GROUPS } from '../../../core/models/exam.model';
import { ConfirmDeleteComponent } from '../../../shared/components/confirm-delete/confirm-delete.component';
import { ConfirmDeleteService } from '../../../shared/components/confirm-delete/confirm-delete.service';

const SECTION_TYPES = [
  { value: 'Objective',   label: 'Objective / MCQs'  },
  { value: 'ShortAnswer', label: 'Short Questions'    },
  { value: 'LongAnswer',  label: 'Long Questions'     },
  { value: 'Practical',   label: 'Practical / Lab'    },
  { value: 'Oral',        label: 'Oral / Viva'        },
];

const SEG_COLORS = ['#7c3aed','#0369a1','#b45309','#15803d','#be185d','#1d4ed8','#0f766e'];

@Component({
  selector: 'app-exam-papers',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, ConfirmDeleteComponent],
  template: `
    <!-- PAGE HEADER -->
    <div class="page-header">
      <div class="ph-left">
        <div class="ph-icon"><span class="material-icons-round">edit_document</span></div>
        <div>
          <h1>Exam Paper Setup</h1>
          <p>Create and manage exam papers for all classes</p>
        </div>
      </div>
      <button class="btn-primary" (click)="openForm()">
        <span class="material-icons-round">add</span> New Paper
      </button>
    </div>

    <!-- FILTERS -->
    <div class="filter-bar">
      <select [(ngModel)]="filterClass" (ngModelChange)="load()" [ngModelOptions]="{standalone:true}">
        <option value="">All Classes</option>
        @for (c of classes(); track c.classId) {
          <option [value]="c.classId">{{ c.className }}</option>
        }
      </select>
      <select [(ngModel)]="filterType" (ngModelChange)="load()" [ngModelOptions]="{standalone:true}">
        <option value="">All Types</option>
        @for (t of examTypes; track t.value) {
          <option [value]="t.value">{{ t.label }}</option>
        }
      </select>
    </div>

    <!-- INLINE FORM PANEL -->
    @if (showForm()) {
      <div class="inline-panel">

        <!-- Panel header -->
        <div class="panel-header">
          <div class="mh-left">
            <div class="mh-icon"><span class="material-icons-round">edit_document</span></div>
            <div>
              <h2>{{ editPaper() ? 'Edit Exam Paper' : 'New Exam Paper' }}</h2>
              <p>Complete both tabs then save</p>
            </div>
          </div>
          <button class="icon-btn" (click)="closeForm()"><span class="material-icons-round">close</span></button>
        </div>

        <!-- Tab bar -->
        <div class="modal-tabs">
          <button class="mtab" [class.active]="activeTab() === 0" (click)="activeTab.set(0)">
            <span class="material-icons-round">info</span>
            Paper Information
          </button>
          <button class="mtab" [class.active]="activeTab() === 1" (click)="activeTab.set(1)">
            <span class="material-icons-round">tune</span>
            Paper Settings
            @if (sections.length > 0) {
              <span class="mtab-badge">{{ sections.length }}</span>
            }
          </button>
        </div>

        <!-- Form body -->
        <div class="panel-body">
          <form [formGroup]="form" (ngSubmit)="save()">

            <!-- ══ TAB 0: Paper Information ══ -->
            <div [hidden]="activeTab() !== 0">

              <div class="fg two">
                <div class="fi">
                  <label>Academic Year *</label>
                  <select formControlName="academicYearId">
                    <option value="">— Select —</option>
                    @for (y of years(); track y.academicYearId) {
                      <option [value]="y.academicYearId">{{ y.yearLabel }}</option>
                    }
                  </select>
                </div>
                <div class="fi">
                  <label>Class *</label>
                  <select formControlName="classId">
                    <option value="">— Select —</option>
                    @for (c of classes(); track c.classId) {
                      <option [value]="c.classId">{{ c.className }}</option>
                    }
                  </select>
                </div>
              </div>

              <div class="fg two">
                <div class="fi">
                  <label>Subject *</label>
                  <select formControlName="subjectId">
                    <option value="">— Select —</option>
                    @for (s of subjects(); track s.subjectId) {
                      <option [value]="s.subjectId">{{ s.subjectName }}</option>
                    }
                  </select>
                </div>
                <div class="fi">
                  <label>Exam Type *</label>
                  <select formControlName="examType">
                    <option value="">— Select —</option>
                    @for (t of examTypes; track t.value) {
                      <option [value]="t.value">{{ t.label }}</option>
                    }
                  </select>
                </div>
              </div>

              <div class="fg two">
                <div class="fi">
                  <label>Class Group</label>
                  <select formControlName="classGroup">
                    @for (g of classGroups; track g.value) {
                      <option [value]="g.value">{{ g.label }}</option>
                    }
                  </select>
                </div>
                <div class="fi">
                  <label>Duration (minutes)</label>
                  <input type="number" formControlName="durationMinutes" placeholder="e.g. 180" min="0" />
                </div>
              </div>

              <div class="fg">
                <div class="fi full">
                  <label>Paper Title *</label>
                  <input formControlName="title" placeholder="e.g. Mathematics Final Term 2025" (input)="onTitleInput()" />
                </div>
              </div>

              <div class="fg two">
                <div class="fi">
                  <label>Total Marks *</label>
                  <input type="number" formControlName="totalMarks" placeholder="100" min="0" />
                </div>
                <div class="fi">
                  <label>Pass Marks *</label>
                  <input type="number" formControlName="passMarks" placeholder="33" min="0" />
                </div>
              </div>

              <div class="fg two">
                <div class="fi">
                  <label>Syllabus / Chapters</label>
                  <input formControlName="syllabusNote" placeholder="e.g. Chapter 1 – 5" />
                </div>
                <div class="fi">
                  <label>Instructions for Students</label>
                  <input formControlName="instructions" placeholder="e.g. Attempt all questions…" />
                </div>
              </div>

            </div>
            <!-- end tab 0 -->

            <!-- ══ TAB 1: Paper Settings ══ -->
            <div [hidden]="activeTab() !== 1" formArrayName="sections">

              <!-- Marks bar -->
              @if (sections.length > 0) {
                <div class="alloc-wrap">
                  <div class="alloc-bar">
                    @for (sg of sections.controls; track $index) {
                      <div class="alloc-seg"
                           [style.flex]="(+sg.get('allocatedMarks')?.value || 0)"
                           [style.background]="SEG_COLORS[$index % SEG_COLORS.length]">
                      </div>
                    }
                    @if (remaining() > 0) {
                      <div class="alloc-seg alloc-rem" [style.flex]="remaining()"></div>
                    }
                  </div>
                  <div class="alloc-info" [class.over]="remaining() < 0">
                    {{ sectionsTotal() }} / {{ form.value.totalMarks || 0 }} marks allocated
                    @if (remaining() > 0) { — <em>{{ remaining() }} remaining</em> }
                    @if (remaining() < 0) { — <strong>{{ -remaining() }} over!</strong> }
                  </div>
                </div>
              }

              <!-- No sections -->
              @if (sections.length === 0) {
                <div class="no-sections">
                  <span class="material-icons-round">segment</span>
                  <p>No sections yet — click <strong>+ Add Section</strong> below.</p>
                </div>
              }

              <!-- Section rows -->
              @for (sg of sections.controls; track $index; let i = $index) {
                <div [formGroupName]="i" class="sec-card">
                  <div class="sec-card-bar" [style.background]="SEG_COLORS[i % SEG_COLORS.length]"></div>
                  <div class="sec-card-body">
                    <div class="sec-card-head">
                      <span class="sec-num" [style.background]="SEG_COLORS[i % SEG_COLORS.length]">{{ i + 1 }}</span>
                      <span class="sec-title-text">{{ sg.get('sectionName')?.value || 'Section ' + (i+1) }}</span>
                      <span class="sec-type-label">{{ labelOf(sg.get('sectionType')?.value) }}</span>
                      <button type="button" class="sec-del-btn" (click)="removeSection(i)">
                        <span class="material-icons-round">delete_outline</span>
                      </button>
                    </div>
                    <div class="fg two">
                      <div class="fi">
                        <label>Section Name</label>
                        <input formControlName="sectionName" placeholder="e.g. Section A" />
                      </div>
                      <div class="fi">
                        <label>Section Type</label>
                        <select formControlName="sectionType">
                          @for (st of sectionTypes; track st.value) {
                            <option [value]="st.value">{{ st.label }}</option>
                          }
                        </select>
                      </div>
                    </div>
                    <div class="fg three">
                      <div class="fi">
                        <label>Allocated Marks</label>
                        <input type="number" formControlName="allocatedMarks" placeholder="0" min="0" />
                      </div>
                      <div class="fi">
                        <label>Total Questions</label>
                        <input type="number" formControlName="totalQuestions" placeholder="e.g. 20" min="0" />
                      </div>
                      <div class="fi">
                        <label>Marks / Question</label>
                        <input type="number" formControlName="marksPerQuestion" placeholder="1" min="0" />
                      </div>
                    </div>
                    <div class="fg two">
                      <div class="fi">
                        <label>Attempt (leave blank = all compulsory)</label>
                        <input type="number" formControlName="attemptQuestions" placeholder="e.g. 15" min="0" />
                      </div>
                      <div class="fi">
                        <label>Section Note</label>
                        <input formControlName="sectionNote" placeholder='e.g. Attempt any 5' />
                      </div>
                    </div>
                  </div>
                </div>
              }

              <button type="button" class="btn-add-section" (click)="addSection()">
                <span class="material-icons-round">add_circle_outline</span> Add Section
              </button>

            </div>
            <!-- end tab 1 -->

            @if (formError()) {
              <div class="alert-error">
                <span class="material-icons-round">error_outline</span> {{ formError() }}
              </div>
            }

          </form>
        </div>

        <!-- Panel footer -->
        <div class="panel-footer">
          <button type="button" class="btn-secondary" (click)="closeForm()">Cancel</button>
          @if (activeTab() === 0) {
            <button type="button" class="btn-primary" (click)="goNext()">
              Next: Paper Settings <span class="material-icons-round">arrow_forward</span>
            </button>
          }
          @if (activeTab() === 1) {
            <button type="button" class="btn-secondary" (click)="activeTab.set(0)">
              <span class="material-icons-round">arrow_back</span> Back
            </button>
            <button type="button" class="btn-primary" [disabled]="saving()" (click)="save()">
              @if (saving()) { <span class="material-icons-round spin">refresh</span> Saving… }
              @else { <span class="material-icons-round">save</span> {{ editPaper() ? 'Update Paper' : 'Create Paper' }} }
            </button>
          }
        </div>

      </div>
    }

    <!-- PAPERS GRID -->
    @if (loading()) {
      <div class="empty-state">
        <span class="material-icons-round spin">refresh</span>
        <p>Loading…</p>
      </div>
    } @else if (papers().length === 0) {
      <div class="empty-state">
        <span class="material-icons-round">edit_document</span>
        <p>No exam papers yet. Click <strong>New Paper</strong> to create one.</p>
      </div>
    } @else {
      <div class="papers-grid">
        @for (p of papers(); track p.examPaperId) {
          <div class="paper-card" [class.draft]="p.isDraft" [class.locked]="p.isLocked">
            <div class="pc-header">
              <div class="pc-type-badge">{{ p.examType }}</div>
              <div class="pc-status" [class.draft]="p.isDraft" [class.published]="!p.isDraft">
                {{ p.isDraft ? 'Draft' : p.isLocked ? 'Locked' : 'Published' }}
              </div>
            </div>
            <div class="pc-body">
              <h3>{{ p.title }}</h3>
              <div class="pc-meta">
                <span><span class="material-icons-round">school</span>{{ p.className }}</span>
                <span><span class="material-icons-round">auto_stories</span>{{ p.subjectName }}</span>
                <span><span class="material-icons-round">calendar_today</span>{{ p.academicYear }}</span>
              </div>
              <div class="pc-marks">
                <div class="mark-chip total">Total: {{ p.totalMarks }}</div>
                <div class="mark-chip pass">Pass: {{ p.passMarks }}</div>
                @if (p.durationMinutes) { <div class="mark-chip dur">{{ p.durationMinutes }} min</div> }
              </div>
              @if (p.sections?.length) {
                <div class="section-pills">
                  @for (s of p.sections; track s.examPaperSectionId) {
                    <span class="spill" [class]="'st-' + s.sectionType.toLowerCase()">
                      {{ s.sectionName }} · {{ s.allocatedMarks }}M
                    </span>
                  }
                </div>
              }
            </div>
            <div class="pc-actions">
              <button class="btn-sm btn-questions" (click)="designQuestions(p)">
                <span class="material-icons-round">quiz</span> Questions
              </button>
              @if (p.isDraft) {
                <button class="btn-sm btn-success" (click)="publish(p)">
                  <span class="material-icons-round">publish</span> Publish
                </button>
              }
              <button class="btn-sm btn-outline" (click)="openForm(p)" [disabled]="p.isLocked">
                <span class="material-icons-round">edit</span>
              </button>
              <button class="btn-sm btn-danger" (click)="deletePaper(p)" [disabled]="p.isLocked">
                <span class="material-icons-round">delete</span>
              </button>
            </div>
          </div>
        }
      </div>
    }

    <app-confirm-delete />
  `,
  styles: [`
    .page-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; }
    .ph-left { display:flex; align-items:center; gap:12px; }
    .ph-icon { width:44px; height:44px; border-radius:12px; background:var(--accent-s); display:flex; align-items:center; justify-content:center; }
    .ph-icon .material-icons-round { color:var(--accent); font-size:22px; }
    .ph-left h1 { font-size:18px; font-weight:700; color:var(--t1); margin:0 0 2px; }
    .ph-left p  { font-size:12px; color:var(--t3); margin:0; }

    .filter-bar { display:flex; gap:10px; margin-bottom:20px; flex-wrap:wrap; }
    .filter-bar select { padding:8px 12px; border:1.5px solid var(--border); border-radius:8px; font-size:13px; background:var(--surface); color:var(--t1); outline:none; }

    .empty-state { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:60px; color:var(--t4); gap:10px; text-align:center; }
    .empty-state .material-icons-round { font-size:48px; opacity:.3; }

    .papers-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:16px; }
    .paper-card { background:var(--surface); border:1px solid var(--border); border-radius:12px; overflow:hidden; transition:box-shadow .15s; }
    .paper-card:hover { box-shadow:var(--sh); }
    .paper-card.draft  { border-left:3px solid #f59e0b; }
    .paper-card.locked { border-left:3px solid #ef4444; opacity:.85; }
    .pc-header { display:flex; align-items:center; justify-content:space-between; padding:10px 14px; background:var(--surface-2); border-bottom:1px solid var(--border); }
    .pc-type-badge { font-size:11px; font-weight:700; color:var(--accent); background:var(--accent-s); padding:3px 8px; border-radius:99px; }
    .pc-status { font-size:11px; font-weight:700; padding:3px 8px; border-radius:99px; }
    .pc-status.draft { background:#fef3c7; color:#92400e; }
    .pc-status.published { background:var(--green-s); color:var(--green); }
    .pc-body { padding:14px; }
    .pc-body h3 { font-size:14px; font-weight:700; color:var(--t1); margin:0 0 8px; }
    .pc-meta { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:10px; }
    .pc-meta span { display:flex; align-items:center; gap:4px; font-size:12px; color:var(--t3); }
    .pc-meta .material-icons-round { font-size:13px; }
    .pc-marks { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px; }
    .mark-chip { font-size:11px; font-weight:600; padding:3px 8px; border-radius:6px; }
    .mark-chip.total { background:var(--accent-s); color:var(--accent); }
    .mark-chip.pass  { background:var(--green-s); color:var(--green); }
    .mark-chip.dur   { background:var(--surface-2); color:var(--t3); border:1px solid var(--border); }
    .section-pills { display:flex; flex-wrap:wrap; gap:4px; }
    .spill { font-size:10px; font-weight:600; padding:2px 7px; border-radius:5px; border:1px solid var(--border); }
    .spill.st-objective   { background:#ede9fe; color:#5b21b6; border-color:#c4b5fd; }
    .spill.st-shortanswer { background:#e0f2fe; color:#0369a1; border-color:#7dd3fc; }
    .spill.st-longanswer  { background:#fef3c7; color:#92400e; border-color:#fcd34d; }
    .spill.st-practical   { background:#dcfce7; color:#166534; border-color:#86efac; }
    .spill.st-oral        { background:#fce7f3; color:#9d174d; border-color:#f9a8d4; }
    .pc-actions { display:flex; gap:6px; padding:10px 14px; border-top:1px solid var(--border); background:var(--surface-2); }
    .btn-sm { display:flex; align-items:center; gap:4px; padding:5px 10px; border-radius:7px; font-size:12px; font-weight:600; border:none; cursor:pointer; transition:all .15s; }
    .btn-sm .material-icons-round { font-size:14px; }
    .btn-sm:disabled { opacity:.4; cursor:not-allowed; }
    .btn-success  { background:var(--green-s); color:var(--green); border:1px solid var(--green-b) !important; }
    .btn-success:hover:not(:disabled) { background:var(--green); color:#fff; }
    .btn-outline  { background:var(--surface); color:var(--t2); border:1px solid var(--border) !important; }
    .btn-outline:hover:not(:disabled) { border-color:var(--accent) !important; color:var(--accent); }
    .btn-danger   { background:var(--red-s); color:var(--red); border:1px solid var(--red-b) !important; margin-left:auto; }
    .btn-danger:hover:not(:disabled)  { background:var(--red); color:#fff; }
    .btn-questions { background:#ede9fe; color:#6d28d9; border:1px solid #c4b5fd !important; }
    .btn-questions:hover { background:#6d28d9; color:#fff; }

    /* Inline Panel */
    .inline-panel { background:var(--surface); border:1.5px solid var(--accent); border-radius:16px; margin-bottom:24px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,.08); }

    .panel-header { display:flex; align-items:center; justify-content:space-between; padding:16px 22px; border-bottom:1px solid var(--border); background:var(--surface-2); }
    .mh-left { display:flex; align-items:center; gap:12px; }
    .mh-icon { width:40px; height:40px; border-radius:10px; background:var(--accent-s); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .mh-icon .material-icons-round { color:var(--accent); font-size:20px; }
    .panel-header h2 { font-size:16px; font-weight:700; color:var(--t1); margin:0 0 2px; }
    .panel-header p  { font-size:12px; color:var(--t3); margin:0; }
    .icon-btn { width:32px; height:32px; border-radius:8px; border:1.5px solid var(--border); background:var(--surface); color:var(--t3); cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .15s; }
    .icon-btn:hover { border-color:var(--red); color:var(--red); }
    .icon-btn .material-icons-round { font-size:17px; }

    .modal-tabs { display:flex; border-bottom:2px solid var(--border); background:var(--surface-2); }
    .mtab { display:flex; align-items:center; gap:7px; padding:12px 24px; font-size:13px; font-weight:600; color:var(--t3); background:none; border:none; border-bottom:2px solid transparent; margin-bottom:-2px; cursor:pointer; transition:all .15s; }
    .mtab .material-icons-round { font-size:15px; }
    .mtab.active { color:var(--accent); border-bottom-color:var(--accent); }
    .mtab:hover:not(.active) { color:var(--t1); }
    .mtab-badge { background:var(--accent); color:#fff; font-size:10px; font-weight:800; min-width:17px; height:17px; border-radius:99px; display:flex; align-items:center; justify-content:center; padding:0 3px; }

    .panel-body { padding:22px; }
    .panel-footer { display:flex; justify-content:flex-end; gap:10px; padding:14px 22px; border-top:1px solid var(--border); background:var(--surface-2); }

    /* Form fields — same pattern as rest of app */
    .fg { display:flex; gap:12px; margin-bottom:14px; }
    .fg.two   .fi { flex:1; }
    .fg.three .fi { flex:1; }
    .fi { display:flex; flex-direction:column; gap:5px; }
    .fi.full { flex:1; }
    label { font-size:11px; font-weight:700; color:var(--t3); text-transform:uppercase; letter-spacing:.4px; }
    input, select, textarea { padding:8px 11px; border:1.5px solid var(--border); border-radius:8px; font-size:13px; font-family:inherit; background:var(--surface); color:var(--t1); outline:none; width:100%; transition:border-color .15s; box-sizing:border-box; }
    input:focus, select:focus, textarea:focus { border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-g); }

    /* Alloc bar */
    .alloc-wrap { margin-bottom:16px; position:sticky; top:-22px; z-index:10; background:var(--surface); padding:10px 0 8px; margin-top:-10px; }
    .alloc-bar  { display:flex; height:8px; border-radius:99px; overflow:hidden; background:var(--border); gap:2px; margin-bottom:5px; }
    .alloc-seg  { border-radius:99px; min-width:4px; }
    .alloc-rem  { background:var(--border) !important; }
    .alloc-info { font-size:12px; color:var(--t3); }
    .alloc-info.over { color:var(--red); font-weight:700; }

    /* No sections */
    .no-sections { display:flex; flex-direction:column; align-items:center; gap:8px; padding:28px; border:2px dashed var(--border); border-radius:10px; color:var(--t4); text-align:center; margin-bottom:14px; }
    .no-sections .material-icons-round { font-size:32px; opacity:.4; }
    .no-sections p { font-size:13px; margin:0; }
    .no-sections strong { color:var(--t2); }

    /* Section card */
    .sec-card { display:flex; border:1.5px solid var(--border); border-radius:10px; overflow:hidden; margin-bottom:10px; background:var(--surface); }
    .sec-card:hover { border-color:var(--accent); }
    .sec-card-bar  { width:5px; flex-shrink:0; }
    .sec-card-body { flex:1; padding:14px 16px; }
    .sec-card-head { display:flex; align-items:center; gap:8px; margin-bottom:12px; }
    .sec-num  { width:22px; height:22px; border-radius:50%; color:#fff; font-size:11px; font-weight:800; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .sec-title-text { font-size:13px; font-weight:700; color:var(--t1); flex:1; }
    .sec-type-label { font-size:11px; color:var(--t3); font-weight:600; }
    .sec-del-btn { display:flex; align-items:center; justify-content:center; width:28px; height:28px; border-radius:7px; border:1.5px solid var(--border); background:none; color:var(--t4); cursor:pointer; transition:all .15s; }
    .sec-del-btn:hover { background:var(--red-s); border-color:var(--red-b); color:var(--red); }
    .sec-del-btn .material-icons-round { font-size:15px; }

    .btn-add-section { display:flex; align-items:center; justify-content:center; gap:6px; width:100%; padding:11px; border:2px dashed var(--accent); border-radius:9px; background:none; color:var(--accent); font-size:13px; font-weight:600; cursor:pointer; transition:all .15s; margin-top:4px; }
    .btn-add-section:hover { background:var(--accent-s); }
    .btn-add-section .material-icons-round { font-size:18px; }

    .alert-error { display:flex; align-items:center; gap:8px; padding:10px 14px; background:var(--red-s); border:1px solid var(--red-b); border-radius:8px; font-size:13px; color:var(--red); margin-top:10px; }
    .alert-error .material-icons-round { font-size:16px; }

    .btn-primary   { display:flex; align-items:center; gap:6px; padding:9px 18px; background:var(--accent); color:#fff; border:none; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; }
    .btn-primary:disabled { opacity:.5; cursor:not-allowed; }
    .btn-secondary { display:flex; align-items:center; gap:6px; padding:9px 18px; background:var(--surface); color:var(--t2); border:1.5px solid var(--border); border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; }
    .btn-primary .material-icons-round, .btn-secondary .material-icons-round { font-size:16px; }

    @keyframes spin { to { transform:rotate(360deg); } }
    .spin { animation:spin .8s linear infinite; display:inline-block; }
  `]
})
export class ExamPapersComponent implements OnInit, OnDestroy {
  private examSvc = inject(ExamService);
  private confirmDelete = inject(ConfirmDeleteService);
  private acSvc   = inject(AcademicService);
  private router  = inject(Router);
  private fb      = inject(FormBuilder);

  papers    = signal<ExamPaperDto[]>([]);
  classes   = signal<any[]>([]);
  subjects  = signal<any[]>([]);
  years     = signal<any[]>([]);
  loading   = signal(false);
  saving    = signal(false);
  showForm  = signal(false);
  editPaper = signal<ExamPaperDto | null>(null);
  formError = signal('');
  activeTab = signal(0);

  filterClass = '';
  filterType  = '';
  private titleManuallyEdited = false;
  private titleSub?: Subscription;

  readonly examTypes    = EXAM_TYPES;
  readonly classGroups  = CLASS_GROUPS;
  readonly sectionTypes = SECTION_TYPES;
  readonly SEG_COLORS   = SEG_COLORS;

  form = this.fb.group({
    academicYearId:  ['', Validators.required],
    classId:         ['', Validators.required],
    subjectId:       ['', Validators.required],
    examType:        ['', Validators.required],
    classGroup:      [1],
    title:           ['', Validators.required],
    totalMarks:      [100, Validators.required],
    passMarks:       [33,  Validators.required],
    durationMinutes: [null as number | null],
    instructions:    [''],
    syllabusNote:    [''],
    sections:        this.fb.array([])
  });

  get sections(): FormArray { return this.form.get('sections') as FormArray; }

  labelOf(val: string) { return SECTION_TYPES.find(s => s.value === val)?.label ?? val; }

  sectionsTotal() {
    return this.sections.controls.reduce((s, c) => s + (+c.get('allocatedMarks')?.value || 0), 0);
  }
  remaining() {
    return (+(this.form.value.totalMarks ?? 0)) - this.sectionsTotal();
  }

  ngOnInit() {
    this.loadDropdowns();
    this.load();
  }

  loadDropdowns() {
    this.acSvc.getClasses().subscribe({
      next: c => this.classes.set(c),
      error: e => console.error('Failed to load classes', e)
    });
    this.acSvc.getSubjects().subscribe({
      next: s => this.subjects.set(s),
      error: e => console.error('Failed to load subjects', e)
    });
    this.acSvc.getYears().subscribe({
      next: y => this.years.set(y),
      error: e => console.error('Failed to load academic years', e)
    });
  }

  load() {
    this.loading.set(true);
    this.examSvc.getPapers(
      this.filterClass ? +this.filterClass : undefined,
      undefined, undefined,
      this.filterType || undefined
    ).subscribe({
      next:  p => { this.papers.set(p.map(x => ({ ...x, sections: x.sections ?? [] }))); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  openForm(paper?: ExamPaperDto) {
    this.loadDropdowns();
    this.editPaper.set(paper ?? null);
    this.formError.set('');
    this.activeTab.set(0);
    this.titleManuallyEdited = false;
    while (this.sections.length) this.sections.removeAt(0);

    if (paper) {
      this.titleManuallyEdited = true;
      this.form.patchValue({
        academicYearId:  paper.academicYearId as any,
        classId:         paper.classId as any,
        subjectId:       paper.subjectId as any,
        examType:        paper.examTypeId as any,
        classGroup:      paper.classGroupId as any,
        title:           paper.title,
        totalMarks:      paper.totalMarks,
        passMarks:       paper.passMarks,
        durationMinutes: paper.durationMinutes ?? null,
        instructions:    paper.instructions   ?? '',
        syllabusNote:    (paper as any).syllabusNote ?? '',
      });
      (paper.sections ?? []).forEach(s => this.sections.push(this.newSectionGroup(s)));
    } else {
      this.form.reset({ classGroup: 1, totalMarks: 100, passMarks: 33 });
    }

    this.titleSub?.unsubscribe();
    this.titleSub = merge(
      this.form.get('classId')!.valueChanges,
      this.form.get('subjectId')!.valueChanges,
      this.form.get('examType')!.valueChanges,
      this.form.get('academicYearId')!.valueChanges,
    ).subscribe(() => {
      if (!this.titleManuallyEdited) this.buildAutoTitle();
    });

    this.showForm.set(true);
  }

  closeForm() {
    this.titleSub?.unsubscribe();
    this.showForm.set(false);
  }

  onTitleInput() {
    const val = this.form.get('title')?.value ?? '';
    this.titleManuallyEdited = val.trim().length > 0;
  }

  private buildAutoTitle() {
    const classId        = +(this.form.get('classId')?.value ?? 0);
    const subjectId      = +(this.form.get('subjectId')?.value ?? 0);
    const examType       = +(this.form.get('examType')?.value ?? 0);
    const academicYearId = +(this.form.get('academicYearId')?.value ?? 0);

    const cls  = this.classes().find(c => c.classId        === classId);
    const sub  = this.subjects().find(s => s.subjectId      === subjectId);
    const type = this.examTypes.find(t => +t.value          === examType);
    const year = this.years().find(y => y.academicYearId    === academicYearId);

    const parts: string[] = [];
    if (cls)  parts.push(cls.className);
    if (sub)  parts.push(sub.subjectName);
    if (type) parts.push(type.label);
    if (year) parts.push(year.yearLabel);
    if (parts.length > 0) {
      this.form.get('title')?.setValue(parts.join(' – '), { emitEvent: false });
    }
  }

  ngOnDestroy() {
    this.titleSub?.unsubscribe();
  }

  goNext() {
    this.form.markAllAsTouched();
    const reqFields = ['academicYearId','classId','subjectId','examType','title','totalMarks','passMarks'];
    const invalid = reqFields.some(f => this.form.get(f)?.invalid);
    if (invalid) { this.formError.set('Please fill all required fields (*) before continuing.'); return; }
    this.formError.set('');
    this.activeTab.set(1);
  }

  addSection() {
    const names = ['Section A','Section B','Section C','Section D','Section E','Section F'];
    const types = ['Objective','ShortAnswer','LongAnswer','ShortAnswer','LongAnswer','Practical'];
    const i = this.sections.length;
    this.sections.push(this.newSectionGroup({
      sectionName:      names[i] ?? `Section ${String.fromCharCode(65 + i)}`,
      sectionType:      types[i] ?? 'ShortAnswer',
      allocatedMarks:   0,
      totalQuestions:   null, attemptQuestions: null, marksPerQuestion: null,
      sectionNote: '', sortOrder: i + 1,
    }));
  }

  removeSection(i: number) { this.sections.removeAt(i); }

  private newSectionGroup(s: any): FormGroup {
    return this.fb.group({
      sectionName:      [s.sectionName      ?? ''],
      sectionType:      [s.sectionType      ?? 'ShortAnswer'],
      allocatedMarks:   [s.allocatedMarks   ?? 0],
      totalQuestions:   [s.totalQuestions   ?? null],
      attemptQuestions: [s.attemptQuestions ?? null],
      marksPerQuestion: [s.marksPerQuestion ?? null],
      sectionNote:      [s.sectionNote      ?? ''],
      sortOrder:        [s.sortOrder        ?? 1],
    });
  }

  save() {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.formError.set('Please fill all required fields.');
      this.activeTab.set(0);
      return;
    }
    if (this.sections.length > 0 && this.remaining() < 0) {
      this.formError.set(`Sections total exceeds Total Marks by ${-this.remaining()}.`);
      this.activeTab.set(1);
      return;
    }
    this.saving.set(true);
    this.formError.set('');
    const v = this.form.value as any;

    const dto: any = {
      academicYearId:  +v.academicYearId,
      classId:         +v.classId,
      subjectId:       +v.subjectId,
      examType:        +v.examType,
      classGroup:      +v.classGroup,
      title:           v.title,
      totalMarks:      +v.totalMarks,
      passMarks:       +v.passMarks,
      durationMinutes: v.durationMinutes ? +v.durationMinutes : null,
      instructions:    v.instructions    || null,
      syllabusNote:    v.syllabusNote    || null,
      sections: this.sections.controls.map((c, i) => ({
        sectionName:      c.get('sectionName')?.value      || `Section ${String.fromCharCode(65+i)}`,
        sectionType:      c.get('sectionType')?.value,
        allocatedMarks:   +(c.get('allocatedMarks')?.value  || 0),
        totalQuestions:   c.get('totalQuestions')?.value   ? +c.get('totalQuestions')!.value   : null,
        attemptQuestions: c.get('attemptQuestions')?.value ? +c.get('attemptQuestions')!.value : null,
        marksPerQuestion: c.get('marksPerQuestion')?.value ? +c.get('marksPerQuestion')!.value : null,
        sectionNote:      c.get('sectionNote')?.value      || null,
        sortOrder:        i + 1,
      }))
    };

    const req = (this.editPaper()
      ? this.examSvc.updatePaper(this.editPaper()!.examPaperId, dto)
      : this.examSvc.createPaper(dto)) as import('rxjs').Observable<unknown>;

    req.subscribe({
      next:  () => { this.saving.set(false); this.closeForm(); this.load(); },
      error: (e: any) => { this.saving.set(false); this.formError.set(e?.error?.error ?? 'Failed to save.'); }
    });
  }

  publish(paper: ExamPaperDto) {
    if (!confirm(`Publish "${paper.title}"? This cannot be undone.`)) return;
    this.examSvc.publishPaper(paper.examPaperId).subscribe({ next: () => this.load() });
  }

  deletePaper(paper: ExamPaperDto) {
    this.confirmDelete.open(
      'Delete Exam Paper?',
      `Are you sure you want to delete <strong>"${paper.title}"</strong>? This cannot be undone.`,
      () => this.examSvc.deletePaper(paper.examPaperId),
      () => this.load()
    );
  }

  designQuestions(paper: ExamPaperDto) {
    this.router.navigate(['/exams/papers', paper.examPaperId, 'questions']);
  }
}
