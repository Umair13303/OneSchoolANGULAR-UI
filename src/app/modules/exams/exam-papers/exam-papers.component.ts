import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormArray, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { Tag } from 'primeng/tag';
import { Message } from 'primeng/message';
import { Tooltip } from 'primeng/tooltip';
import { Subscription, merge } from 'rxjs';
import { ExamService }     from '../../../core/services/exam.service';
import { AcademicService } from '../../../core/services/academic.service';
import { AuthService } from '../../../core/services/auth.service';
import { AssessmentService } from '../../../core/services/assessment.service';
import { CurriculumService } from '../../../core/services/curriculum.service';
import { ExamPaperDto, EXAM_TYPES, CLASS_GROUPS } from '../../../core/models/exam.model';
import { CourseChapterDto } from '../../../core/models/curriculum.model';
import { ClassDto } from '../../../core/models/academic.model';
import { ConfirmDeleteComponent } from '../../../shared/components/confirm-delete/confirm-delete.component';
import { ConfirmDeleteService } from '../../../shared/components/confirm-delete/confirm-delete.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { MenuService } from '../../../core/services/menu.service';
import Swal from 'sweetalert2';

interface SelectOpt { value: string; label: string; }

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
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, RouterModule, ConfirmDeleteComponent, PageHeaderComponent,
    Button, Select, InputText, Tag, Message, Tooltip
  ],
  template: `
    <div class="os-page compact exam-papers-page">
    <app-page-header [dense]="true" [title]="pageTitle()" routeUrl="/exams/papers">
      <div class="flex flex-wrap items-center gap-2">
        <p-button label="Question Bank" icon="pi pi-book" severity="secondary" [outlined]="true"
          routerLink="/exams/question-bank" />
        <p-button label="50 Marks Paper" icon="pi pi-file" severity="secondary" [outlined]="true"
          pTooltip="Create paper with 50 total marks and A/B/C sections" (onClick)="openFiftyMarksPaper()" />
        <p-button label="100 Marks Paper" icon="pi pi-file" severity="secondary" [outlined]="true"
          pTooltip="Create paper with 100 total marks and A/B/C sections" (onClick)="openHundredMarksPaper()" />
        <p-button label="New Paper" icon="pi pi-plus" (onClick)="openForm()" />
      </div>
    </app-page-header>

    <div class="os-toolbar">
      <div class="flex w-full flex-wrap items-end gap-3">
        <div class="flex min-w-[200px] flex-1 flex-col gap-1">
          <label class="os-field-label">Class</label>
          <p-select class="w-full" placeholder="All classes" [options]="classFilterOptions()"
            optionLabel="label" optionValue="value"
            [filter]="classFilterOptions().length > 6" filterBy="label"
            [ngModel]="filterClass" [ngModelOptions]="{standalone:true}"
            (ngModelChange)="filterClass = $event ?? ''; load()" />
        </div>
        <div class="flex min-w-[200px] flex-1 flex-col gap-1">
          <label class="os-field-label">Type</label>
          <p-select class="w-full" placeholder="All types" [options]="typeFilterOptions"
            optionLabel="label" optionValue="value"
            [ngModel]="filterType" [ngModelOptions]="{standalone:true}"
            (ngModelChange)="filterType = $event ?? ''; load()" />
        </div>
      </div>
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
          <p-button icon="pi pi-times" severity="secondary" [outlined]="true" size="small" ariaLabel="Close" (onClick)="closeForm()" />
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
                  <p-select class="w-full" formControlName="academicYearId" placeholder="— Select —"
                    [options]="years()" optionLabel="yearLabel" optionValue="academicYearId" />
                </div>
                <div class="fi">
                  <label>Class *</label>
                  <p-select class="w-full" formControlName="classId" placeholder="— Select —"
                    [options]="classes()" optionLabel="className" optionValue="classId"
                    [filter]="classes().length > 8" filterBy="className" />
                </div>
              </div>

              <div class="fg two">
                <div class="fi">
                  <label>Subject *</label>
                  <p-select class="w-full" formControlName="subjectId" placeholder="— Select —"
                    [options]="subjects()" optionLabel="subjectName" optionValue="subjectId"
                    [filter]="subjects().length > 8" filterBy="subjectName" />
                </div>
                <div class="fi">
                  <label>Exam Type *</label>
                  <p-select class="w-full" formControlName="examType" placeholder="— Select —"
                    [options]="examTypes" optionLabel="label" optionValue="value" />
                </div>
              </div>

              <div class="fg two">
                <div class="fi">
                  <label>Class Group</label>
                  <p-select class="w-full" formControlName="classGroup"
                    [options]="classGroups" optionLabel="label" optionValue="value" />
                </div>
                <div class="fi">
                  <label>Duration (minutes)</label>
                  <input pInputText class="w-full" type="number" formControlName="durationMinutes" placeholder="e.g. 180" min="0" />
                </div>
              </div>

              <div class="fg">
                <div class="fi full">
                  <label>Paper Title *</label>
                  <input pInputText class="w-full" formControlName="title" placeholder="e.g. Mathematics Final Term 2025" (input)="onTitleInput()" />
                </div>
              </div>

              <div class="fg two">
                <div class="fi">
                  <label>Total Marks *</label>
                  <input pInputText class="w-full" type="number" formControlName="totalMarks" placeholder="100" min="0" />
                </div>
                <div class="fi">
                  <label>Pass Marks *</label>
                  <input pInputText class="w-full" type="number" formControlName="passMarks" placeholder="33" min="0" />
                </div>
              </div>

              <div class="fg two">
                <div class="fi">
                  <label>Syllabus note (free text)</label>
                  <input pInputText class="w-full" formControlName="syllabusNote" placeholder="e.g. Chapter 1 – 5" />
                </div>
                <div class="fi">
                  <label>Instructions for Students</label>
                  <input pInputText class="w-full" formControlName="instructions" placeholder="e.g. Attempt all questions…" />
                </div>
              </div>

              @if (editPaper()) {
                <div class="syllabus-box">
                  <div class="syllabus-head">
                    <strong>Exam Syllabus</strong>
                    <span class="muted">{{ syllabusPlanTitle() || 'No published course plan for this class/subject' }}</span>
                  </div>
                  @if (syllabusChapters().length) {
                    @for (ch of syllabusChapters(); track ch.courseChapterId) {
                      <label class="syl-ch">
                        <input type="checkbox" [checked]="isChapterSelected(ch.courseChapterId)"
                               (change)="toggleChapter(ch.courseChapterId, $event)" />
                        <span>{{ ch.title }}</span>
                      </label>
                      @for (tp of ch.topics; track tp.courseTopicId) {
                        <label class="syl-tp">
                          <input type="checkbox" [checked]="isTopicSelected(tp.courseTopicId)"
                                 (change)="toggleTopic(tp.courseTopicId, $event)" />
                          <span>{{ tp.title }}</span>
                        </label>
                      }
                    }
                    <p-button label="Save Exam Syllabus" icon="pi pi-save" size="small" severity="secondary" [outlined]="true"
                      [loading]="savingSyllabus()" [disabled]="savingSyllabus()" (onClick)="saveSyllabus()" />
                    @if (syllabusMsg()) { <div class="muted">{{ syllabusMsg() }}</div> }
                  }
                </div>
              }

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
                  <p>No sections yet — add manually or apply a marks template.</p>
                  <div class="tpl-btns">
                    <p-button label="50-mark template" icon="pi pi-file" severity="secondary" [outlined]="true"
                      (onClick)="applyFiftyMarksTemplate()" />
                    <p-button label="100-mark template" icon="pi pi-file" severity="secondary" [outlined]="true"
                      (onClick)="applyHundredMarksTemplate()" />
                  </div>
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
                      <p-button icon="pi pi-trash" severity="danger" [text]="true" [rounded]="true" size="small"
                        ariaLabel="Remove section" (onClick)="removeSection(i)" />
                    </div>
                    <div class="fg two">
                      <div class="fi">
                        <label>Section Name</label>
                        <input pInputText class="w-full" formControlName="sectionName" placeholder="e.g. Section A" />
                      </div>
                      <div class="fi">
                        <label>Section Type</label>
                        <p-select class="w-full" formControlName="sectionType"
                          [options]="sectionTypes" optionLabel="label" optionValue="value" />
                      </div>
                    </div>
                    <div class="fg three">
                      <div class="fi">
                        <label>Allocated Marks</label>
                        <input pInputText class="w-full" type="number" formControlName="allocatedMarks" placeholder="0" min="0" />
                      </div>
                      <div class="fi">
                        <label>Total Questions</label>
                        <input pInputText class="w-full" type="number" formControlName="totalQuestions" placeholder="e.g. 20" min="0" />
                      </div>
                      <div class="fi">
                        <label>Marks / Question</label>
                        <input pInputText class="w-full" type="number" formControlName="marksPerQuestion" placeholder="1" min="0" />
                      </div>
                    </div>
                    <div class="fg two">
                      <div class="fi">
                        <label>Attempt (leave blank = all compulsory)</label>
                        <input pInputText class="w-full" type="number" formControlName="attemptQuestions" placeholder="e.g. 15" min="0" />
                      </div>
                      <div class="fi">
                        <label>Section Note</label>
                        <input pInputText class="w-full" formControlName="sectionNote" placeholder='e.g. Attempt any 5' />
                      </div>
                    </div>
                  </div>
                </div>
              }

              <p-button label="Add Section" icon="pi pi-plus-circle" severity="secondary" [outlined]="true"
                styleClass="w-full" class="block w-full" (onClick)="addSection()" />

            </div>
            <!-- end tab 1 -->

            @if (formError()) {
              <p-message severity="error" icon="pi pi-exclamation-circle" styleClass="mt-2.5 w-full" [text]="formError()" />
            }

          </form>
        </div>

        <!-- Panel footer -->
        <div class="panel-footer">
          <p-button label="Cancel" severity="secondary" [outlined]="true" (onClick)="closeForm()" />
          @if (activeTab() === 0) {
            <p-button label="Next: Paper Settings" icon="pi pi-arrow-right" iconPos="right" (onClick)="goNext()" />
          }
          @if (activeTab() === 1) {
            <p-button label="Back" icon="pi pi-arrow-left" severity="secondary" [outlined]="true" (onClick)="activeTab.set(0)" />
            <p-button [label]="saving() ? 'Saving…' : (editPaper() ? 'Update Paper' : 'Create Paper')" icon="pi pi-save"
              [loading]="saving()" [disabled]="saving()" (onClick)="save()" />
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
              <p-tag [value]="p.examType" severity="info" [rounded]="true" />
              <p-tag [value]="p.isDraft ? 'Draft' : p.isLocked ? 'Locked' : 'Published'"
                [severity]="p.isDraft ? 'warn' : p.isLocked ? 'danger' : 'success'" [rounded]="true" />
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
              <p-button label="Questions" icon="pi pi-question-circle" size="small" severity="help" [outlined]="true"
                (onClick)="designQuestions(p)" />
              <p-button label="PDF" icon="pi pi-file-pdf" size="small" severity="secondary" [outlined]="true"
                pTooltip="Download paper PDF" (onClick)="downloadPdf(p)" />
              @if (p.isDraft) {
                <p-button label="Publish" icon="pi pi-upload" size="small" severity="success" [outlined]="true"
                  (onClick)="publish(p)" />
              }
              <div class="ml-auto flex gap-1.5">
                <p-button icon="pi pi-pencil" size="small" severity="secondary" [outlined]="true"
                  ariaLabel="Edit" (onClick)="openForm(p)" [disabled]="p.isLocked" />
                <p-button icon="pi pi-trash" size="small" severity="danger" [outlined]="true"
                  ariaLabel="Delete" (onClick)="deletePaper(p)" [disabled]="p.isLocked" />
              </div>
            </div>
          </div>
        }
      </div>
    }

    <app-confirm-delete />
    </div>
  `,
  styles: [`
    :host { display:block; min-width:0; }
    .empty-state { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:60px; color:var(--t4); gap:10px; text-align:center; }
    .empty-state .material-icons-round { font-size:48px; opacity:.3; }

    .papers-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:16px; }
    .paper-card { background:var(--surface); border:1px solid var(--border); border-radius:12px; overflow:hidden; transition:box-shadow .15s; }
    .paper-card:hover { box-shadow:var(--sh); }
    .paper-card.draft  { border-left:3px solid #f59e0b; }
    .paper-card.locked { border-left:3px solid #ef4444; opacity:.85; }
    .pc-header { display:flex; align-items:center; justify-content:space-between; padding:10px 14px; background:var(--surface-2); border-bottom:1px solid var(--border); }
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
    /* Inline Panel */
    .inline-panel { background:var(--surface); border:1.5px solid var(--accent); border-radius:16px; margin-bottom:24px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,.08); }

    .panel-header { display:flex; align-items:center; justify-content:space-between; padding:16px 22px; border-bottom:1px solid var(--border); background:var(--surface-2); }
    .mh-left { display:flex; align-items:center; gap:12px; }
    .mh-icon { width:40px; height:40px; border-radius:10px; background:var(--accent-s); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .mh-icon .material-icons-round { color:var(--accent); font-size:20px; }
    .panel-header h2 { font-size:16px; font-weight:700; color:var(--t1); margin:0 0 2px; }
    .panel-header p  { font-size:12px; color:var(--t3); margin:0; }
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
    .tpl-btns { display:flex; flex-wrap:wrap; gap:8px; justify-content:center; }

    /* Section card */
    .sec-card { display:flex; border:1.5px solid var(--border); border-radius:10px; overflow:hidden; margin-bottom:10px; background:var(--surface); }
    .syllabus-box {
      margin-top: 12px; border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px;
      background: #fafbfc; display: grid; gap: 6px;
    }
    .syllabus-head { display:flex; flex-wrap:wrap; gap:8px; align-items:baseline; margin-bottom:4px; }
    .syllabus-head .muted { font-size: .8rem; color: #64748b; }
    .syl-ch, .syl-tp {
      display:flex; gap:8px; align-items:center; font-size: .85rem; cursor:pointer;
    }
    .syl-tp { padding-left: 18px; color: #475569; }
    .sec-card:hover { border-color:var(--accent); }
    .sec-card-bar  { width:5px; flex-shrink:0; }
    .sec-card-body { flex:1; padding:14px 16px; }
    .sec-card-head { display:flex; align-items:center; gap:8px; margin-bottom:12px; }
    .sec-num  { width:22px; height:22px; border-radius:50%; color:#fff; font-size:11px; font-weight:800; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .sec-title-text { font-size:13px; font-weight:700; color:var(--t1); flex:1; }
    .sec-type-label { font-size:11px; color:var(--t3); font-weight:600; }

    @keyframes spin { to { transform:rotate(360deg); } }
    .spin { animation:spin .8s linear infinite; display:inline-block; }
  `]
})
export class ExamPapersComponent implements OnInit, OnDestroy {
  private examSvc = inject(ExamService);
  private assessmentSvc = inject(AssessmentService);
  private curriculumSvc = inject(CurriculumService);
  private confirmDelete = inject(ConfirmDeleteService);
  private acSvc   = inject(AcademicService);
  private auth    = inject(AuthService);
  private router  = inject(Router);
  private fb      = inject(FormBuilder);
  private menuSvc = inject(MenuService);

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
  syllabusChapters = signal<CourseChapterDto[]>([]);
  syllabusPlanTitle = signal('');
  selectedChapterIds = signal<Set<number>>(new Set());
  selectedTopicIds = signal<Set<number>>(new Set());
  savingSyllabus = signal(false);
  syllabusMsg = signal('');

  filterClass = '';
  filterType  = '';
  private titleManuallyEdited = false;
  private titleSub?: Subscription;
  /** Teacher ClassSubject pairs for UI list/dropdowns (not a security boundary). */
  private allowedPairs = new Set<string>();
  private isTeacherOnly = false;

  readonly examTypes    = EXAM_TYPES;
  readonly classGroups  = CLASS_GROUPS;
  readonly sectionTypes = SECTION_TYPES;
  readonly SEG_COLORS   = SEG_COLORS;

  pageTitle = computed(() =>
    this.menuSvc.titleForRoute('/exams/papers', 'Paper Setup')
  );

  classFilterOptions = computed<SelectOpt[]>(() => [
    { value: '', label: 'All classes' },
    ...this.classes().map(c => ({ value: String(c.classId), label: c.className as string }))
  ]);

  readonly typeFilterOptions: SelectOpt[] = [
    { value: '', label: 'All types' },
    ...EXAM_TYPES.map(t => ({ value: String(t.value), label: t.label }))
  ];

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
    this.menuSvc.ensureLoaded().subscribe();
    const user = this.auth.currentUser();
    this.isTeacherOnly = this.auth.hasRole('teacher')
      && !this.auth.hasRole('admin', 'principal', 'superadmin');
    if (this.isTeacherOnly && user) {
      this.acSvc.getAssignmentsByTeacher(user.userId).subscribe({
        next: assigns => {
          const active = (assigns || []).filter(a => a.isActive);
          this.allowedPairs = new Set(active.map(a => `${a.classId}:${a.subjectId}`));
          const classMap = new Map<number, ClassDto>();
          const subjectMap = new Map<number, { subjectId: number; subjectName: string }>();
          active.forEach(a => {
            classMap.set(a.classId, {
              classId: a.classId,
              className: `${a.className}${a.classSection ? ' — ' + a.classSection : ''}`,
              section: a.classSection ?? ''
            } as ClassDto);
            subjectMap.set(a.subjectId, { subjectId: a.subjectId, subjectName: a.subjectName });
          });
          this.classes.set([...classMap.values()]);
          this.subjects.set([...subjectMap.values()]);
          this.acSvc.getYears().subscribe({ next: y => this.years.set(y), error: () => {} });
          this.load();
        },
        error: () => {
          this.loadDropdowns();
          this.load();
        }
      });
    } else {
      this.loadDropdowns();
      this.load();
    }
  }

  loadDropdowns() {
    if (this.isTeacherOnly && this.allowedPairs.size) return;
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
      next:  p => {
        let list = p.map(x => ({ ...x, sections: x.sections ?? [] }));
        if (this.allowedPairs.size) {
          list = list.filter(x => this.allowedPairs.has(`${x.classId}:${x.subjectId}`));
        }
        this.papers.set(list);
        this.loading.set(false);
      },
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
      this.loadSyllabusUi(paper.examPaperId);
    } else {
      this.form.reset({ classGroup: 1, totalMarks: 100, passMarks: 33 });
      this.syllabusChapters.set([]);
      this.syllabusPlanTitle.set('');
      this.selectedChapterIds.set(new Set());
      this.selectedTopicIds.set(new Set());
      this.syllabusMsg.set('');
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

  /** Opens new paper form prefilled as a standard 50-mark A/B/C paper. */
  openFiftyMarksPaper() {
    this.openForm();
    this.applyFiftyMarksTemplate();
  }

  /** Opens new paper form prefilled as a standard 100-mark A/B/C paper. */
  openHundredMarksPaper() {
    this.openForm();
    this.applyHundredMarksTemplate();
  }

  /**
   * Compact 50-mark layout:
   * A Objective 10 · B Short 20 · C Long 20
   */
  applyFiftyMarksTemplate() {
    this.applyMarksTemplate(50, 20, 90, [
      {
        sectionName: 'Section A',
        sectionType: 'Objective',
        allocatedMarks: 10,
        totalQuestions: 10,
        attemptQuestions: null,
        marksPerQuestion: 1,
        sectionNote: 'All MCQs compulsory',
        sortOrder: 1,
      },
      {
        sectionName: 'Section B',
        sectionType: 'ShortAnswer',
        allocatedMarks: 20,
        totalQuestions: 8,
        attemptQuestions: 5,
        marksPerQuestion: 4,
        sectionNote: 'Attempt any 5 questions',
        sortOrder: 2,
      },
      {
        sectionName: 'Section C',
        sectionType: 'LongAnswer',
        allocatedMarks: 20,
        totalQuestions: 4,
        attemptQuestions: 2,
        marksPerQuestion: 10,
        sectionNote: 'Attempt any 2 questions',
        sortOrder: 3,
      },
    ]);
  }

  /**
   * Pakistan-style 100-mark layout:
   * A Objective 20 · B Short 40 · C Long 40
   */
  applyHundredMarksTemplate() {
    this.applyMarksTemplate(100, 40, 180, [
      {
        sectionName: 'Section A',
        sectionType: 'Objective',
        allocatedMarks: 20,
        totalQuestions: 20,
        attemptQuestions: null,
        marksPerQuestion: 1,
        sectionNote: 'All MCQs compulsory',
        sortOrder: 1,
      },
      {
        sectionName: 'Section B',
        sectionType: 'ShortAnswer',
        allocatedMarks: 40,
        totalQuestions: 12,
        attemptQuestions: 8,
        marksPerQuestion: 5,
        sectionNote: 'Attempt any 8 questions',
        sortOrder: 2,
      },
      {
        sectionName: 'Section C',
        sectionType: 'LongAnswer',
        allocatedMarks: 40,
        totalQuestions: 5,
        attemptQuestions: 4,
        marksPerQuestion: 10,
        sectionNote: 'Attempt any 4 questions',
        sortOrder: 3,
      },
    ]);
  }

  private applyMarksTemplate(
    totalMarks: number,
    passMarks: number,
    durationMinutes: number,
    sections: Array<{
      sectionName: string;
      sectionType: string;
      allocatedMarks: number;
      totalQuestions: number | null;
      attemptQuestions: number | null;
      marksPerQuestion: number | null;
      sectionNote: string;
      sortOrder: number;
    }>
  ) {
    this.form.patchValue({ totalMarks, passMarks, durationMinutes });
    while (this.sections.length) this.sections.removeAt(0);
    sections.forEach(s => this.sections.push(this.newSectionGroup(s)));
    this.activeTab.set(1);
    this.formError.set('');
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

  loadSyllabusUi(paperId: number) {
    this.syllabusMsg.set('');
    this.assessmentSvc.getExamSyllabus(paperId).subscribe({
      next: syl => {
        this.syllabusPlanTitle.set(syl.coursePlanTitle || '');
        const chIds = new Set((syl.items || []).filter(i => i.courseChapterId).map(i => i.courseChapterId!));
        const tpIds = new Set((syl.items || []).filter(i => i.courseTopicId).map(i => i.courseTopicId!));
        this.selectedChapterIds.set(chIds);
        this.selectedTopicIds.set(tpIds);
        if (syl.coursePlanId) {
          this.curriculumSvc.getPlan(syl.coursePlanId).subscribe({
            next: plan => this.syllabusChapters.set(plan.chapters || []),
            error: () => this.syllabusChapters.set([])
          });
        } else {
          this.syllabusChapters.set([]);
        }
      },
      error: () => {
        this.syllabusChapters.set([]);
        this.syllabusPlanTitle.set('');
      }
    });
  }

  isChapterSelected(id: number) { return this.selectedChapterIds().has(id); }
  isTopicSelected(id: number) { return this.selectedTopicIds().has(id); }

  toggleChapter(id: number, ev: Event) {
    const checked = (ev.target as HTMLInputElement).checked;
    const next = new Set(this.selectedChapterIds());
    if (checked) next.add(id); else next.delete(id);
    this.selectedChapterIds.set(next);
  }

  toggleTopic(id: number, ev: Event) {
    const checked = (ev.target as HTMLInputElement).checked;
    const next = new Set(this.selectedTopicIds());
    if (checked) next.add(id); else next.delete(id);
    this.selectedTopicIds.set(next);
  }

  saveSyllabus() {
    const paper = this.editPaper();
    if (!paper) return;
    const items: { courseChapterId?: number | null; courseTopicId?: number | null }[] = [
      ...[...this.selectedChapterIds()].map(id => ({ courseChapterId: id, courseTopicId: null })),
      ...[...this.selectedTopicIds()].map(id => ({ courseChapterId: null, courseTopicId: id }))
    ];
    this.savingSyllabus.set(true);
    this.syllabusMsg.set('');
    this.assessmentSvc.saveExamSyllabus(paper.examPaperId, items).subscribe({
      next: () => { this.savingSyllabus.set(false); this.syllabusMsg.set('Exam syllabus saved.'); },
      error: (e: any) => {
        this.savingSyllabus.set(false);
        this.syllabusMsg.set(e?.error?.error || 'Failed to save syllabus.');
      }
    });
  }

  publish(paper: ExamPaperDto) {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const colors = isDark
      ? { bg: '#161922', t1: '#f1f5f9', t3: '#94a3b8' }
      : { bg: '#ffffff', t1: '#0f172a', t3: '#475569' };
    const safeTitle = paper.title
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    Swal.fire({
      html: `
        <div style="display:flex;flex-direction:column;align-items:center;gap:16px;padding:8px 0 4px">
          <div style="width:58px;height:58px;border-radius:16px;background:#dcfce7;display:flex;align-items:center;justify-content:center">
            <span class="material-icons-round" style="font-size:27px;color:#16a34a;font-variation-settings:'FILL' 1">publish</span>
          </div>
          <div style="text-align:center">
            <div style="font-size:17px;font-weight:800;color:${colors.t1};margin-bottom:6px">Publish Exam Paper?</div>
            <div style="font-size:13.5px;color:${colors.t3};line-height:1.6">
              Publish <b>${safeTitle}</b>?<br>
              Once published, this cannot be undone.
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Publish',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      focusCancel: true,
      customClass: {
        popup: 'swal-app-popup',
        confirmButton: 'swal-btn-success',
        cancelButton: 'swal-btn-cancel',
        actions: 'swal-actions'
      },
      buttonsStyling: false,
      background: colors.bg,
      showClass: { popup: 'swal-show' },
      hideClass: { popup: 'swal-hide' },
    }).then(result => {
      if (!result.isConfirmed) return;
      this.examSvc.publishPaper(paper.examPaperId).subscribe({
        next: () => {
          this.load();
          Swal.fire({
            html: `<div style="display:flex;flex-direction:column;align-items:center;gap:12px;padding:8px 0">
              <div style="width:50px;height:50px;border-radius:14px;background:#dcfce7;display:flex;align-items:center;justify-content:center">
                <span class="material-icons-round" style="font-size:24px;color:#16a34a;font-variation-settings:'FILL' 1">check_circle</span>
              </div>
              <div style="font-size:15px;font-weight:700;color:${colors.t1}">Paper Published</div>
            </div>`,
            background: colors.bg,
            timer: 1600,
            showConfirmButton: false,
            customClass: { popup: 'swal-app-popup', timerProgressBar: 'swal-progress-green' },
            timerProgressBar: true,
            buttonsStyling: false,
            showClass: { popup: 'swal-show' },
            hideClass: { popup: 'swal-hide' },
          });
        },
        error: (e: any) => {
          const status = e?.status as number | undefined;
          const text = e?.error?.error
            || (status === 403 ? 'You do not have permission to publish this paper.' : null)
            || (status === 404 ? 'Paper not found.' : null)
            || 'Please try again.';
          Swal.fire({
            icon: 'error',
            title: 'Publish failed',
            text,
            customClass: { popup: 'swal-app-popup', confirmButton: 'swal-btn-primary', actions: 'swal-actions' },
            buttonsStyling: false,
          });
        }
      });
    });
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

  downloadPdf(paper: ExamPaperDto, answerKey = false) {
    this.examSvc.downloadPaperPdf(paper.examPaperId, answerKey).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const safe = (paper.title || `Paper-${paper.examPaperId}`).replace(/[\\/:*?"<>|]+/g, '-');
        const a = document.createElement('a');
        a.href = url;
        a.download = `${safe}${answerKey ? '-AnswerKey' : ''}.pdf`;
        a.click();
        const win = window.open(url, '_blank');
        if (!win) {
          // popup blocked — download still saved via <a>
        }
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: () => {
        Swal.fire({
          icon: 'error',
          title: 'PDF failed',
          text: 'Could not generate the exam paper PDF. Try again.',
          customClass: { popup: 'swal-app-popup', confirmButton: 'swal-btn-primary', actions: 'swal-actions' },
          buttonsStyling: false,
        });
      }
    });
  }
}
