import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { AuthService } from '../../../core/services/auth.service';
import { TimetableService } from '../../../core/services/timetable.service';
import { AcademicService } from '../../../core/services/academic.service';
import { CurriculumService } from '../../../core/services/curriculum.service';
import { AttendanceService } from '../../../core/services/attendance.service';
import { TimetableEntryDto, DAY_NAMES } from '../../../core/models/timetable.model';
import { ClassSubjectDto } from '../../../core/models/academic.model';
import { CoursePlanDetailDto, CoursePlanListDto, CourseTopicDto } from '../../../core/models/curriculum.model';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';

export interface ClassroomSession {
  classId: number;
  className: string;
  section: string | null;
  subjectId: number;
  subjectName: string;
  periodId: number | null;
  periodNo: number | null;
  startTime: string | null;
  endTime: string | null;
  academicYearId: number | null;
  planId: number | null;
  topicId: number | null;
}

interface WorkflowStep {
  key: string;
  title: string;
  hint: string;
  icon: string;
  color: string;
  needsTopic: boolean;
  link: (s: ClassroomSession) => any[] | null;
  query?: (s: ClassroomSession) => Record<string, string | number>;
}

@Component({
  selector: 'app-classroom-today',
  standalone: true,
  imports: [CommonModule, RouterModule, LoadingComponent],
  template: `
    <div class="os-page compact cr">
      @if (loading()) {
        <app-loading />
      } @else if (session(); as s) {
        <div class="sess-shell" [style.--subj]="accent(s.classId, s.subjectName)">
          <div class="sess-bar">
            <button type="button" class="back" (click)="exitSession()" title="Back">
              <span class="material-icons-round">arrow_back</span>
            </button>
            <div class="sess-av">
              <span class="material-icons-round">{{ subjectIcon(s.subjectName) }}</span>
            </div>
            <div class="sess-info">
              <h1>{{ s.subjectName }} <em class="live">Live</em></h1>
              <div class="sess-meta">
                <span>{{ s.className }}{{ s.section ? ' — ' + s.section : '' }}</span>
                @if (s.periodNo) { <span>P{{ s.periodNo }}</span> }
                @if (s.startTime) { <span>{{ fmt(s.startTime) }}–{{ fmt(s.endTime || '') }}</span> }
              </div>
            </div>
            <div class="topic-inline" [class.on]="!!s.topicId">
              <span class="material-icons-round">auto_stories</span>
              @if (!s.planId) {
                <a routerLink="/curriculum/my-courses">Set up course</a>
              } @else if (!topics().length) {
                <a [routerLink]="['/curriculum/workspace', s.planId]">Add topics</a>
              } @else {
                <select [value]="s.topicId ?? ''" (change)="onTopicChange($event)">
                  <option value="" disabled>Today’s topic…</option>
                  @for (t of topics(); track t.courseTopicId) {
                    <option [value]="t.courseTopicId">{{ t.title }}</option>
                  }
                </select>
              }
            </div>
          </div>

          <div class="path-strip" aria-label="Class workflow">
            <span class="ps">1 Attendance</span>
            <span class="ps-arrow material-icons-round">chevron_right</span>
            <span class="ps">2 Check homework</span>
            <span class="ps-arrow material-icons-round">chevron_right</span>
            <span class="ps" [class.warn]="!s.topicId" [class.ok]="!!s.topicId">
              3 Teach {{ s.topicId ? '' : '(pick topic)' }}
            </span>
            <span class="ps-arrow material-icons-round">chevron_right</span>
            <span class="ps">4 Quiz</span>
            <span class="ps-arrow material-icons-round">chevron_right</span>
            <span class="ps">5 Assign homework</span>
          </div>

          <div class="primary-actions">
            @for (key of primaryKeys; track key; let i = $index) {
              @let st = stepByKey(key);
              @if (st) {
                @let locked = st.needsTopic && !s.topicId;
                @let href = st.link(s);
                <a class="p-tile"
                   [class.locked]="locked || !href"
                   [style.--c]="st.color"
                   [routerLink]="locked || !href ? null : href"
                   [queryParams]="locked || !href ? null : st.query?.(s) ?? null"
                   [title]="locked ? 'Select today’s topic first' : st.hint">
                  <span class="p-step">{{ i + 1 }}</span>
                  <span class="p-ic"><span class="material-icons-round">{{ st.icon }}</span></span>
                  <span class="p-text">
                    <strong>
                      {{ st.title }}
                      @if (key === 'attendance' && attendanceState() === 'done') {
                        <em class="p-badge done">Done</em>
                      } @else if (key === 'attendance' && attendanceState() === 'pending') {
                        <em class="p-badge pending">Pending</em>
                      }
                    </strong>
                    <small>{{ locked ? 'Select topic above first' : st.hint }}</small>
                  </span>
                  <span class="material-icons-round p-go">arrow_forward</span>
                </a>
              }
            }
          </div>

          <button type="button" class="more-toggle" (click)="moreOpen.set(!moreOpen())" [attr.aria-expanded]="moreOpen()">
            <span class="material-icons-round">{{ moreOpen() ? 'expand_less' : 'expand_more' }}</span>
            {{ moreOpen() ? 'Hide more actions' : 'More for this period' }}
          </button>

          @if (moreOpen()) {
            <div class="more-grid">
              @for (key of moreKeys; track key) {
                @let st = stepByKey(key);
                @if (st) {
                  @let locked = st.needsTopic && !s.topicId;
                  @let href = st.link(s);
                  <a class="m-tile"
                     [class.locked]="locked || !href"
                     [style.--c]="st.color"
                     [routerLink]="locked || !href ? null : href"
                     [queryParams]="locked || !href ? null : st.query?.(s) ?? null"
                     [title]="locked ? 'Select today’s topic first' : st.hint">
                    <span class="m-ic"><span class="material-icons-round">{{ st.icon }}</span></span>
                    <strong>{{ st.title }}</strong>
                  </a>
                }
              }
            </div>
          }

          <!-- Finish → Next Class (reuse today's timetable entries) -->
          <div class="finish-bar">
            @if (nextClassEntry(); as nxt) {
              <div class="finish-copy">
                <span class="finish-label">Next class</span>
                <strong>{{ nxt.subjectName }} · {{ nxt.className }}{{ nxt.section ? ' — ' + nxt.section : '' }}</strong>
                <span class="finish-time">{{ fmt(nxt.startTime) }}–{{ fmt(nxt.endTime) }}</span>
              </div>
              <button type="button" class="btn-primary finish-cta" (click)="startFromEntry(nxt)">
                Next Class →
              </button>
            } @else {
              <div class="finish-copy done">
                <span class="finish-label">Schedule</span>
                <strong>You're done for today</strong>
                <span class="finish-time">No more periods on your timetable</span>
              </div>
              <button type="button" class="btn-secondary finish-cta" (click)="exitSession()">
                Back to class
              </button>
            }
          </div>
        </div>
      } @else {
        <!-- HUB -->
        <section class="hero">
          <div class="hero-copy">
            <p class="eyebrow">{{ greeting }}</p>
            <h1>Classroom</h1>
            <p class="hero-sub">
              {{ todayLabel }}
              · {{ assignments().length }} class{{ assignments().length === 1 ? '' : 'es' }}
              @if (todayEntries().length) {
                · {{ todayEntries().length }} period{{ todayEntries().length === 1 ? '' : 's' }} today
              } @else {
                · no periods on timetable
              }
            </p>
          </div>
          <div class="hero-actions">
            <a routerLink="/attendance/mark" class="h-cta">
              <span class="material-icons-round">how_to_reg</span> Attendance
            </a>
            <a routerLink="/homework/list" class="h-cta">
              <span class="material-icons-round">menu_book</span> Diary
            </a>
            <a routerLink="/curriculum/my-courses" class="h-cta h-cta-p">
              <span class="material-icons-round">auto_stories</span> Courses
            </a>
          </div>
        </section>

        @if (todayEntries().length) {
          <div class="block-label">
            <span class="material-icons-round">wb_sunny</span>
            Today’s periods · {{ dayNames[todayDow] }}
          </div>
          <div class="lesson-stack">
            @for (e of todayEntries(); track e.timetableId; let i = $index) {
              <button type="button" class="lesson" [style.--subj]="accent(e.classId, e.subjectName)" (click)="startFromEntry(e)">
                <div class="lesson-rail">
                  <span class="rail-no">{{ e.periodNo }}</span>
                  <span class="rail-time">{{ fmt(e.startTime) }}</span>
                  <span class="rail-time dim">{{ fmt(e.endTime) }}</span>
                </div>
                <div class="lesson-main">
                  <div class="lesson-ic">
                    <span class="material-icons-round">{{ subjectIcon(e.subjectName) }}</span>
                  </div>
                  <div class="lesson-text">
                    <strong>{{ e.subjectName }}</strong>
                    <span>{{ e.className }}{{ e.section ? ' — ' + e.section : '' }}</span>
                  </div>
                  <span class="lesson-cta">
                    Start class
                    <span class="material-icons-round">play_arrow</span>
                  </span>
                </div>
              </button>
            }
          </div>
        }

        <div class="block-label">
          <span class="material-icons-round">school</span>
          {{ todayEntries().length ? 'All teaching load' : 'Choose a class to begin' }}
        </div>

        @if (!assignments().length) {
          <div class="empty-panel">
            <div class="empty-ic"><span class="material-icons-round">assignment_ind</span></div>
            <div>
              <strong>Nothing assigned yet</strong>
              <p>Ask admin to assign class–subjects to your account.</p>
            </div>
          </div>
        } @else {
          <div class="lesson-stack">
            @for (a of assignments(); track a.id; let i = $index) {
              @let course = courseFor(a);
              @let pct = course ? coursePct(course) : 0;
              <button type="button" class="lesson lesson-lg" [style.--subj]="accent(a.classId, a.subjectName)" (click)="startFromAssignment(a)">
                <div class="lesson-main">
                  <div class="lesson-ic lg">
                    <span class="material-icons-round">{{ subjectIcon(a.subjectName) }}</span>
                  </div>
                  <div class="lesson-text">
                    <div class="lesson-tags">
                      <span class="tag class-tag">{{ a.className }}{{ a.classSection ? ' — ' + a.classSection : '' }}</span>
                      @if (course) {
                        <span class="tag ok">{{ pct }}% complete</span>
                      } @else {
                        <span class="tag mute">No course plan</span>
                      }
                    </div>
                    <strong>{{ a.subjectName }}</strong>
                    @if (course) {
                      <div class="bar"><div class="bar-fill" [style.width.%]="pct"></div></div>
                      <em>{{ course.completedTopicCount }} of {{ course.topicCount }} topics done</em>
                    } @else {
                      <em>Attendance &amp; homework still available</em>
                    }
                  </div>
                  <span class="lesson-cta solid">
                    Start
                    <span class="material-icons-round">arrow_forward</span>
                  </span>
                </div>
              </button>
            }
          </div>
        }
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .cr { max-width: 100%; }

    /* ── Hero (matches teacher dashboard language) ── */
    .hero {
      display: flex; align-items: center; justify-content: space-between; gap: 16px;
      margin-bottom: 18px; padding: 18px 20px; border-radius: var(--r-xl, 16px);
      border: 1px solid var(--border); box-shadow: var(--sh);
      background:
        radial-gradient(ellipse 80% 120% at 100% 0%, rgba(var(--accent-rgb), .12), transparent 55%),
        linear-gradient(135deg, var(--surface) 0%, var(--surface-2) 100%);
      position: relative; overflow: hidden;
    }
    .eyebrow {
      margin: 0; font-size: 10px; font-weight: 700; color: var(--accent);
      text-transform: uppercase; letter-spacing: 1px;
      display: flex; align-items: center; gap: 8px;
    }
    .eyebrow::before { content: ''; width: 14px; height: 2px; background: var(--accent); border-radius: 2px; }
    .hero h1 {
      margin: 4px 0 0; font-size: 24px; font-weight: 800; color: var(--t1);
      letter-spacing: -.4px; line-height: 1.15;
    }
    .hero-sub { margin: 5px 0 0; font-size: 12.5px; color: var(--t4); font-weight: 600; }
    .hero-actions { display: flex; gap: 8px; flex-wrap: wrap; flex-shrink: 0; }
    .h-cta {
      display: inline-flex; align-items: center; gap: 5px;
      height: 34px; padding: 0 12px; border-radius: 9px;
      border: 1px solid var(--border); background: var(--surface);
      color: var(--t2); font-size: 12px; font-weight: 700; text-decoration: none;
      transition: .15s ease;
      .material-icons-round { font-size: 15px; }
    }
    .h-cta:hover { border-color: var(--accent); color: var(--accent); transform: translateY(-1px); }
    .h-cta-p {
      background: var(--accent); border-color: var(--accent); color: #fff;
      box-shadow: 0 4px 12px rgba(var(--accent-rgb), .25);
    }
    .h-cta-p:hover { background: var(--accent-h); color: #fff; border-color: var(--accent-h); }
    @media (max-width: 700px) {
      .hero { flex-direction: column; align-items: flex-start; }
      .hero-actions { width: 100%; }
      .h-cta { flex: 1; justify-content: center; }
    }

    .block-label {
      display: flex; align-items: center; gap: 8px;
      margin: 4px 2px 10px;
      font-size: 12px; font-weight: 800; color: var(--t3);
      text-transform: uppercase; letter-spacing: .04em;
      .material-icons-round { font-size: 18px; color: var(--accent); }
    }

    /* ── Lesson cards ── */
    .lesson-stack { display: flex; flex-direction: column; gap: 10px; margin-bottom: 18px; }
    .lesson {
      display: flex; width: 100%; padding: 0; border: 1px solid var(--border);
      border-radius: 16px; background: var(--surface); overflow: hidden;
      cursor: pointer; font-family: inherit; text-align: left;
      box-shadow: 0 1px 2px rgba(15,23,42,.04);
      transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease;
    }
    .lesson:hover {
      transform: translateY(-2px);
      border-color: color-mix(in srgb, var(--subj) 40%, var(--border));
      box-shadow: 0 12px 28px rgba(15,23,42,.08);
    }
    .lesson-rail {
      width: 72px; flex-shrink: 0; padding: 14px 10px;
      background: color-mix(in srgb, var(--subj) 12%, var(--surface));
      border-right: 1px solid color-mix(in srgb, var(--subj) 18%, var(--border));
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
    }
    .rail-no {
      width: 28px; height: 28px; border-radius: 8px;
      background: var(--subj); color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 800; margin-bottom: 4px;
    }
    .rail-time { font-size: 11px; font-weight: 800; color: var(--t2); }
    .rail-time.dim { font-weight: 600; color: var(--t4); }

    .lesson-main {
      flex: 1; min-width: 0; display: flex; align-items: center; gap: 14px;
      padding: 16px 16px 16px 14px;
    }
    .lesson-ic {
      width: 48px; height: 48px; border-radius: 14px; flex-shrink: 0;
      background: var(--subj); color: #fff;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 12px color-mix(in srgb, var(--subj) 35%, transparent);
      .material-icons-round { font-size: 24px; }
    }
    .lesson-ic.lg { width: 54px; height: 54px; border-radius: 16px; .material-icons-round { font-size: 26px; } }
    .lesson-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
    .lesson-text strong {
      font-size: 17px; font-weight: 800; color: var(--t1); letter-spacing: -.2px;
    }
    .lesson-text > span, .lesson-text > em {
      font-size: 12.5px; font-weight: 600; color: var(--t3); font-style: normal;
    }
    .lesson-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 2px; }
    .tag {
      font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 99px;
    }
    .class-tag {
      background: color-mix(in srgb, var(--subj) 14%, transparent); color: var(--subj);
    }
    .tag.ok { background: #d1fae5; color: #047857; }
    .tag.mute { background: var(--surface-2); color: var(--t4); }
    .bar {
      height: 5px; border-radius: 99px; background: var(--surface-2);
      overflow: hidden; margin-top: 6px; max-width: 200px;
    }
    .bar-fill { height: 100%; background: var(--subj); border-radius: 99px; }

    .lesson-cta {
      display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0;
      height: 40px; padding: 0 14px; border-radius: 10px;
      border: 1.5px solid color-mix(in srgb, var(--subj) 35%, var(--border));
      background: color-mix(in srgb, var(--subj) 8%, var(--surface));
      color: var(--subj); font-size: 13px; font-weight: 800;
      transition: .15s ease;
      .material-icons-round { font-size: 18px; }
    }
    .lesson:hover .lesson-cta {
      background: var(--subj); color: #fff; border-color: var(--subj);
    }
    .lesson-cta.solid {
      background: var(--subj); color: #fff; border-color: var(--subj);
      box-shadow: 0 4px 14px color-mix(in srgb, var(--subj) 35%, transparent);
    }
    .lesson:hover .lesson-cta.solid {
      filter: brightness(1.05); transform: translateX(2px);
    }

    @media (max-width: 620px) {
      .lesson { flex-direction: column; }
      .lesson-rail {
        width: 100%; flex-direction: row; gap: 10px; padding: 10px 14px;
        border-right: none; border-bottom: 1px solid color-mix(in srgb, var(--subj) 18%, var(--border));
      }
      .rail-no { margin-bottom: 0; }
      .lesson-main { flex-wrap: wrap; }
      .lesson-cta, .lesson-cta.solid { width: 100%; justify-content: center; }
    }

    .empty-panel {
      display: flex; gap: 14px; align-items: center;
      padding: 22px 18px; border-radius: 16px; margin-bottom: 18px;
      border: 1px dashed var(--border-2); background: var(--surface-2);
      strong { display: block; font-size: 15px; color: var(--t1); }
      p { margin: 3px 0 0; font-size: 13px; color: var(--t3); }
    }
    .empty-ic {
      width: 48px; height: 48px; border-radius: 14px; background: var(--surface);
      border: 1px solid var(--border); color: var(--t4);
      display: flex; align-items: center; justify-content: center;
      .material-icons-round { font-size: 24px; }
    }

    /* ── Session (dense) ── */
    .sess-shell { display: flex; flex-direction: column; gap: 8px; }

    .sess-bar {
      display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
      padding: 8px 10px; border-radius: 10px;
      border: 1px solid var(--border); background: var(--surface);
      box-shadow: 0 1px 2px rgba(15,23,42,.04);
    }
    .back {
      width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0;
      border: 1px solid var(--border); background: var(--surface-2); color: var(--t2);
      display: inline-flex; align-items: center; justify-content: center; cursor: pointer;
      .material-icons-round { font-size: 18px; }
    }
    .back:hover { border-color: var(--subj); color: var(--subj); }
    .sess-av {
      width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0;
      background: var(--subj); color: #fff;
      display: flex; align-items: center; justify-content: center;
      .material-icons-round { font-size: 18px; }
    }
    .sess-info { min-width: 0; flex: 1 1 140px; }
    .sess-info h1 {
      margin: 0; font-size: 15px; font-weight: 800; color: var(--t1); letter-spacing: -.2px;
      line-height: 1.15; display: flex; align-items: center; gap: 8px;
    }
    .live {
      font-style: normal; font-size: 9.5px; font-weight: 800; letter-spacing: .06em;
      text-transform: uppercase; color: #059669;
      background: rgba(5,150,105,.1); border: 1px solid rgba(5,150,105,.22);
      padding: 2px 6px; border-radius: 999px; line-height: 1.2;
    }
    .sess-meta {
      display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px;
      margin-top: 2px; font-size: 11.5px; font-weight: 600; color: var(--t3);
      span + span::before {
        content: '·'; margin-right: 8px; color: var(--t4); font-weight: 700;
      }
    }

    .topic-inline {
      display: flex; align-items: center; gap: 6px; flex: 1 1 240px;
      min-width: 180px; max-width: 420px; margin-left: auto;
      padding: 4px 8px; border-radius: 8px;
      background: var(--surface-2); border: 1px solid var(--border);
      > .material-icons-round { font-size: 16px; color: var(--t4); flex-shrink: 0; }
      a {
        font-size: 12px; font-weight: 800; color: var(--subj);
        text-decoration: none; white-space: nowrap;
      }
      a:hover { text-decoration: underline; }
      select {
        flex: 1; min-width: 0; height: 28px; padding: 0 6px;
        border: 1px solid var(--border); border-radius: 6px;
        background: var(--surface); font: inherit; font-size: 12px; font-weight: 700; color: var(--t1);
      }
      select:focus {
        outline: none; border-color: var(--subj);
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--subj) 18%, transparent);
      }
    }
    .topic-inline.on {
      border-color: color-mix(in srgb, var(--subj) 40%, var(--border));
      background: color-mix(in srgb, var(--subj) 8%, var(--surface));
      > .material-icons-round { color: var(--subj); }
    }

    .path-strip {
      display: flex; flex-wrap: wrap; align-items: center; gap: 4px 2px;
      padding: 2px 2px 0; font-size: 11.5px; font-weight: 700; color: var(--t4);
    }
    .ps {
      padding: 4px 8px; border-radius: 999px; background: var(--surface-2);
      border: 1px solid var(--border); color: var(--t3);
    }
    .ps.ok { color: #15803d; background: #f0fdf4; border-color: #bbf7d0; }
    .ps.warn { color: #b45309; background: #fffbeb; border-color: #fde68a; }
    .ps-arrow { font-size: 16px; color: var(--t4); }

    .primary-actions {
      display: flex; flex-direction: column; gap: 8px;
    }
    .p-tile {
      display: flex; align-items: center; gap: 12px;
      min-height: 64px; padding: 12px 14px; border-radius: 14px;
      text-decoration: none; color: inherit;
      background: var(--surface); border: 1px solid var(--border);
      box-shadow: 0 1px 2px rgba(15,23,42,.04);
      touch-action: manipulation; -webkit-tap-highlight-color: transparent;
      transition: border-color .12s, background .12s, transform .12s;
    }
    .p-tile:hover:not(.locked) {
      border-color: color-mix(in srgb, var(--c) 45%, var(--border));
      background: color-mix(in srgb, var(--c) 6%, var(--surface));
      transform: translateY(-1px);
    }
    .p-tile.locked { opacity: .45; pointer-events: none; }
    .p-step {
      width: 22px; height: 22px; border-radius: 999px; flex-shrink: 0;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 800; color: #fff; background: var(--c);
    }
    .p-ic {
      width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      background: color-mix(in srgb, var(--c) 14%, transparent); color: var(--c);
      .material-icons-round { font-size: 22px; }
    }
    .p-text {
      flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px;
      strong {
        font-size: 15px; font-weight: 800; color: var(--t1); line-height: 1.2;
        display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap;
      }
      small { font-size: 12px; font-weight: 600; color: var(--t4); line-height: 1.25; }
    }
    .p-badge {
      font-style: normal; font-size: 10px; font-weight: 800; letter-spacing: .04em;
      text-transform: uppercase; padding: 2px 7px; border-radius: 999px;
    }
    .p-badge.pending { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
    .p-badge.done { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .p-go { font-size: 20px; color: var(--t4); flex-shrink: 0; }

    .finish-bar {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      flex-wrap: wrap; margin-top: 6px; padding: 12px 14px;
      border-radius: 12px; border: 1px solid var(--border);
      background: linear-gradient(165deg, #f8fafc 0%, var(--surface) 70%);
    }
    .finish-copy { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
    .finish-copy.done strong { color: #15803d; }
    .finish-label {
      font-size: 10px; font-weight: 800; letter-spacing: .06em;
      text-transform: uppercase; color: var(--t4);
    }
    .finish-copy strong { font-size: 14px; font-weight: 800; color: var(--t1); }
    .finish-time { font-size: 12px; font-weight: 600; color: var(--t3); }
    .finish-cta { flex-shrink: 0; min-height: 40px; font-weight: 800 !important; }

    .more-toggle {
      display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      width: 100%; min-height: 40px; margin-top: 2px;
      border: 1px dashed var(--border); border-radius: 10px;
      background: transparent; color: var(--t3);
      font: inherit; font-size: 12.5px; font-weight: 700; cursor: pointer;
      touch-action: manipulation;
      .material-icons-round { font-size: 20px; }
    }
    .more-toggle:hover { border-color: var(--subj); color: var(--subj); }

    .more-grid {
      display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px;
    }
    .m-tile {
      display: flex; align-items: center; gap: 8px;
      min-height: 44px; padding: 8px 10px; border-radius: 10px;
      text-decoration: none; color: inherit;
      background: var(--surface-2); border: 1px solid var(--border);
      touch-action: manipulation;
      strong {
        font-size: 12.5px; font-weight: 800; color: var(--t1);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
    }
    .m-tile:hover:not(.locked) {
      border-color: color-mix(in srgb, var(--c) 45%, var(--border));
      background: color-mix(in srgb, var(--c) 8%, var(--surface));
    }
    .m-tile.locked { opacity: .4; pointer-events: none; }
    .m-ic {
      width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      background: color-mix(in srgb, var(--c) 14%, transparent); color: var(--c);
      .material-icons-round { font-size: 17px; }
    }

    @media (max-width: 900px) {
      .topic-inline { margin-left: 0; max-width: none; flex: 1 1 100%; }
      .more-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 560px) {
      .sess-bar { gap: 8px; padding: 10px; }
      .back, .sess-av { width: 40px; height: 40px; }
      .path-strip { gap: 4px; }
      .ps-arrow { display: none; }
      .primary-actions { gap: 10px; }
      .p-tile { min-height: 72px; border-radius: 16px; padding: 14px; }
      .p-text strong { font-size: 16px; }
      .more-grid { grid-template-columns: 1fr; gap: 8px; }
      .m-tile { min-height: 52px; border-radius: 12px; padding: 12px 14px; }
      .m-tile strong { font-size: 14px; }
      .finish-bar { flex-direction: column; align-items: stretch; }
      .finish-cta { width: 100%; justify-content: center; }
    }

    /* Hub density tweaks */
    .hero { margin-bottom: 10px; padding: 12px 14px; }
    .lesson-stack { gap: 6px; margin-bottom: 10px; }
    .lesson-main { padding: 10px 12px; gap: 10px; }
    .block-label { margin: 0 0 6px; }
  `]
})
export class ClassroomTodayComponent implements OnInit {
  private auth = inject(AuthService);
  private ttSvc = inject(TimetableService);
  private academic = inject(AcademicService);
  private curriculum = inject(CurriculumService);
  private attendance = inject(AttendanceService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly dayNames = DAY_NAMES;
  readonly todayDow = (() => { const d = new Date().getDay(); return d === 0 ? 7 : d; })();
  readonly todayLabel = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'short', year: 'numeric'
  });
  readonly todayIso = new Date().toISOString().slice(0, 10);
  readonly greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  })();

  loading = signal(true);
  todayEntries = signal<TimetableEntryDto[]>([]);
  assignments = signal<ClassSubjectDto[]>([]);
  courses = signal<CoursePlanListDto[]>([]);
  topics = signal<CourseTopicDto[]>([]);
  session = signal<ClassroomSession | null>(null);
  moreOpen = signal(false);
  /** One lookup for the open session only — avoids N calls on the hub. */
  attendanceState = signal<'unknown' | 'pending' | 'done'>('unknown');

  suggestedTopic = computed(() => {
    const list = this.topics();
    return list.find(t => t.progressStatus !== 'Completed') ?? list[0] ?? null;
  });

  /** Next period after the live session (by periodNo, else by start time). */
  nextClassEntry = computed(() => {
    const s = this.session();
    if (!s) return null;
    const entries = this.todayEntries();
    if (s.periodNo != null) {
      return entries.find(e => e.periodNo > (s.periodNo as number)) ?? null;
    }
    if (s.startTime) {
      const mins = this.timeToMinutes(s.startTime);
      return entries.find(e => this.timeToMinutes(e.startTime) > mins) ?? null;
    }
    return null;
  });

  /** Primary day path — Check HW & Assign promoted out of More. */
  readonly primaryKeys = ['attendance', 'hw-check', 'teach', 'quiz', 'hw-assign'] as const;
  /** Secondary period tools. */
  readonly moreKeys = ['progress', 'oral', 'activity', 'results'] as const;

  private readonly SUBJECT_COLORS = [
    '#4f6ef7', '#0891b2', '#059669', '#d97706', '#db2777', '#ea580c', '#0d9488', '#6366f1'
  ];
  private readonly SUBJECT_ICONS: Record<string, string> = {
    english: 'menu_book', maths: 'calculate', mathematics: 'calculate', math: 'calculate',
    science: 'science', urdu: 'translate', islamiyat: 'mosque', islamiat: 'mosque',
    computer: 'computer', 'computer science': 'computer', art: 'palette',
    sports: 'sports_soccer', pe: 'sports_soccer', history: 'history_edu', geography: 'public'
  };

  /** Distinct accent per class so same-subject cards don’t look identical */
  accent(classId: number, subjectName: string) {
    return this.SUBJECT_COLORS[Math.abs(classId * 7 + (subjectName?.length || 0)) % this.SUBJECT_COLORS.length];
  }

  subjectIcon(name: string) {
    const key = (name || '').trim().toLowerCase();
    return this.SUBJECT_ICONS[key] || 'auto_stories';
  }

  courseFor(a: ClassSubjectDto) {
    return this.courses().find(c => c.classId === a.classId && c.subjectId === a.subjectId) ?? null;
  }

  coursePct(c: CoursePlanListDto) {
    return c.topicCount ? Math.round((c.completedTopicCount / c.topicCount) * 100) : 0;
  }

  stepByKey(key: string) {
    return this.steps.find(s => s.key === key) ?? null;
  }

  /** Shared Classroom → leaf context (preserves session on return). */
  private ctxQuery(
    s: ClassroomSession,
    extra: Record<string, string | number> = {}
  ): Record<string, string | number> {
    return {
      from: 'classroom',
      classId: s.classId,
      subjectId: s.subjectId,
      className: s.className,
      section: s.section || '',
      subjectName: s.subjectName,
      ...(s.periodId ? { periodId: s.periodId } : {}),
      ...(s.periodNo ? { periodNo: s.periodNo } : {}),
      ...(s.academicYearId ? { academicYearId: s.academicYearId } : {}),
      ...(s.topicId ? { topicId: s.topicId } : {}),
      ...(s.startTime ? { startTime: s.startTime } : {}),
      ...(s.endTime ? { endTime: s.endTime } : {}),
      ...extra
    };
  }

  private timeToMinutes(t: string): number {
    if (!t) return -1;
    const [h, m] = t.slice(0, 5).split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return -1;
    return h * 60 + m;
  }

  readonly steps: WorkflowStep[] = [
    {
      key: 'attendance',
      title: 'Mark attendance',
      hint: 'Who is present this period',
      icon: 'how_to_reg',
      color: '#0891b2',
      needsTopic: false,
      link: () => ['/attendance/mark'],
      query: s => this.ctxQuery(s, { date: this.todayIso })
    },
    {
      key: 'hw-check',
      title: 'Check homework',
      hint: 'Diary & submissions for this class',
      icon: 'fact_check',
      color: '#0284c7',
      needsTopic: false,
      link: () => ['/homework/list'],
      query: s => this.ctxQuery(s)
    },
    {
      key: 'teach',
      title: 'Teach topic',
      hint: 'Lesson content & teaching log',
      icon: 'school',
      color: '#4f6ef7',
      needsTopic: true,
      link: s => s.topicId ? ['/curriculum/topics', s.topicId] : null,
      query: s => this.ctxQuery(s, { panel: 'teaching' })
    },
    {
      key: 'quiz',
      title: 'Quiz / class test',
      hint: 'In-class assessment for this topic',
      icon: 'quiz',
      color: '#7c3aed',
      needsTopic: true,
      link: s => s.topicId ? ['/curriculum/topics', s.topicId] : null,
      query: s => this.ctxQuery(s, { panel: 'quiz' })
    },
    {
      key: 'hw-assign',
      title: 'Assign homework',
      hint: 'Practice for today',
      icon: 'edit_note',
      color: '#ea580c',
      needsTopic: false,
      link: s => s.topicId ? ['/curriculum/topics', s.topicId] : ['/homework/assign'],
      query: s => s.topicId
        ? this.ctxQuery(s, { panel: 'homework' })
        : this.ctxQuery(s)
    },
    {
      key: 'progress',
      title: 'Topic progress',
      hint: 'Mark complete / in progress',
      icon: 'task_alt',
      color: '#059669',
      needsTopic: true,
      link: s => s.topicId ? ['/curriculum/topics', s.topicId] : null,
      query: s => this.ctxQuery(s, { tab: 'content' })
    },
    {
      key: 'oral',
      title: 'Oral / reading',
      hint: 'Questioning & recitation',
      icon: 'record_voice_over',
      color: '#db2777',
      needsTopic: true,
      link: s => s.topicId ? ['/curriculum/topics', s.topicId] : null,
      query: s => this.ctxQuery(s, { panel: 'sabaq' })
    },
    {
      key: 'activity',
      title: 'Activity',
      hint: 'Topic classroom activity',
      icon: 'extension',
      color: '#d97706',
      needsTopic: true,
      link: s => s.topicId ? ['/curriculum/topics', s.topicId] : null,
      query: s => this.ctxQuery(s, { tab: 'activities' })
    },
    {
      key: 'results',
      title: 'Enter exam marks',
      hint: 'Formal exam paper results',
      icon: 'grading',
      color: '#0d9488',
      needsTopic: false,
      link: () => ['/exams/results/enter'],
      query: s => this.ctxQuery(s)
    }
  ];

  ngOnInit() {
    const user = this.auth.currentUser();
    if (!user) {
      this.loading.set(false);
      return;
    }

    // Assignments first so the hub paints quickly when timetable/courses are empty or slow.
    this.academic.getAssignmentsByTeacher(user.userId).pipe(
      catchError(() => of([] as ClassSubjectDto[]))
    ).subscribe({
      next: assigns => {
        this.assignments.set((assigns || []).filter(a => a.isActive));
        this.loading.set(false);
        this.tryOpenFromQuery();
      },
      error: () => this.loading.set(false)
    });

    this.ttSvc.getForTeacher(user.userId).pipe(catchError(() => of([]))).subscribe({
      next: (tt: any) => {
        const days = tt as any[];
        const today = (Array.isArray(days) ? days : [])
          .flatMap((d: any) => d.entries ?? [])
          .filter((e: TimetableEntryDto) => !e.isBreak && e.periodNo > 0 && e.dayOfWeek === this.todayDow)
          .sort((a: TimetableEntryDto, b: TimetableEntryDto) => a.periodNo - b.periodNo);
        this.todayEntries.set(today);
      }
    });

    this.curriculum.getMyCourses().pipe(
      catchError(() => of([] as CoursePlanListDto[]))
    ).subscribe({
      next: courses => this.courses.set(courses || [])
    });
  }

  private tryOpenFromQuery() {
    const qp = this.route.snapshot.queryParamMap;
    const classId = Number(qp.get('classId'));
    const subjectId = Number(qp.get('subjectId'));
    if (!classId || !subjectId) return;
    this.openSession({
      classId,
      subjectId,
      periodId: qp.get('periodId') ? Number(qp.get('periodId')) : null,
      periodNo: qp.get('periodNo') ? Number(qp.get('periodNo')) : null,
      topicId: qp.get('topicId') ? Number(qp.get('topicId')) : null,
      startTime: qp.get('startTime'),
      endTime: qp.get('endTime'),
      academicYearId: qp.get('academicYearId') ? Number(qp.get('academicYearId')) : null,
      className: qp.get('className'),
      section: qp.get('section'),
      subjectName: qp.get('subjectName')
    });
  }

  fmt(t: string) { return t ? t.slice(0, 5) : ''; }

  startFromEntry(e: TimetableEntryDto) {
    this.openSession({
      classId: e.classId,
      className: e.className,
      section: e.section,
      subjectId: e.subjectId,
      subjectName: e.subjectName,
      periodId: e.periodId,
      periodNo: e.periodNo,
      startTime: e.startTime,
      endTime: e.endTime,
      academicYearId: e.academicYearId,
      topicId: null
    });
  }

  startFromAssignment(a: ClassSubjectDto) {
    const match = this.todayEntries().find(
      e => e.classId === a.classId && e.subjectId === a.subjectId
    );
    this.openSession({
      classId: a.classId,
      className: a.className ?? '',
      section: a.classSection ?? null,
      subjectId: a.subjectId,
      subjectName: a.subjectName,
      periodId: match?.periodId ?? null,
      periodNo: match?.periodNo ?? null,
      startTime: match?.startTime ?? null,
      endTime: match?.endTime ?? null,
      academicYearId: match?.academicYearId ?? null,
      topicId: null
    });
  }

  openSession(partial: {
    classId: number;
    subjectId: number;
    className?: string | null;
    section?: string | null;
    subjectName?: string | null;
    periodId?: number | null;
    periodNo?: number | null;
    startTime?: string | null;
    endTime?: string | null;
    academicYearId?: number | null;
    topicId?: number | null;
  }) {
    const assign = this.assignments().find(
      a => a.classId === partial.classId && a.subjectId === partial.subjectId
    );
    const entry = this.todayEntries().find(
      e => e.classId === partial.classId && e.subjectId === partial.subjectId
    );
    const plan = this.courses().find(
      c => c.classId === partial.classId && c.subjectId === partial.subjectId
    );

    const s: ClassroomSession = {
      classId: partial.classId,
      className: partial.className || assign?.className || entry?.className || `Class ${partial.classId}`,
      section: partial.section ?? assign?.classSection ?? entry?.section ?? null,
      subjectId: partial.subjectId,
      subjectName: partial.subjectName || assign?.subjectName || entry?.subjectName || `Subject ${partial.subjectId}`,
      periodId: partial.periodId ?? entry?.periodId ?? null,
      periodNo: partial.periodNo ?? entry?.periodNo ?? null,
      startTime: partial.startTime ?? entry?.startTime ?? null,
      endTime: partial.endTime ?? entry?.endTime ?? null,
      academicYearId: partial.academicYearId ?? entry?.academicYearId ?? plan?.academicYearId ?? null,
      planId: plan?.coursePlanId ?? null,
      topicId: partial.topicId ?? null
    };

    this.moreOpen.set(false);
    this.session.set(s);
    this.syncUrl(s);
    this.loadTopics(s);
    this.refreshAttendanceState(s);
  }

  /** Single getForClass for the open period only (not every hub card). */
  private refreshAttendanceState(s: ClassroomSession) {
    this.attendanceState.set('unknown');
    if (!s.periodId) return;
    this.attendance.getForClass(s.classId, this.todayIso, s.periodId).subscribe({
      next: rows => this.attendanceState.set(rows?.length ? 'done' : 'pending'),
      error: () => this.attendanceState.set('unknown')
    });
  }

  private loadTopics(s: ClassroomSession) {
    this.topics.set([]);
    if (!s.planId) return;
    this.curriculum.getWorkspace(s.planId).subscribe({
      next: (plan: CoursePlanDetailDto) => {
        const all = plan.chapters.flatMap(ch => ch.topics || []);
        this.topics.set(all);
        if (!s.topicId) {
          const next = all.find(t => t.progressStatus !== 'Completed') ?? all[0];
          if (next) this.selectTopic(next.courseTopicId, false);
        }
      }
    });
  }

  onTopicChange(ev: Event) {
    const id = Number((ev.target as HTMLSelectElement).value);
    if (id) this.selectTopic(id);
  }

  selectTopic(topicId: number, sync = true) {
    const s = this.session();
    if (!s) return;
    const next = { ...s, topicId };
    this.session.set(next);
    if (sync) this.syncUrl(next);
  }

  private syncUrl(s: ClassroomSession) {
    this.router.navigate([], {
      relativeTo: this.route,
      replaceUrl: true,
      queryParams: {
        classId: s.classId,
        subjectId: s.subjectId,
        periodId: s.periodId || null,
        periodNo: s.periodNo || null,
        topicId: s.topicId || null,
        academicYearId: s.academicYearId || null,
        className: s.className,
        section: s.section,
        subjectName: s.subjectName,
        startTime: s.startTime,
        endTime: s.endTime
      }
    });
  }

  exitSession() {
    this.moreOpen.set(false);
    this.session.set(null);
    this.topics.set([]);
    this.attendanceState.set('unknown');
    this.router.navigate(['/classroom/today'], { replaceUrl: true });
  }
}
