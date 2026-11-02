import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StudentService } from '../../../core/services/student.service';
import { AcademicService } from '../../../core/services/academic.service';
import { InstituteService } from '../../../core/services/institute.service';
import { environment } from '../../../../environments/environment';
import { StudentListDto } from '../../../core/models/student.model';
import { ClassDto, AcademicYear } from '../../../core/models/academic.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { StudentLeavingComponent } from '../student-leaving/student-leaving.component';
import { OsSelectComponent, OsSelectOption } from '../../../shared/components/os-select/os-select.component';

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PageHeaderComponent, LoadingComponent, EmptyStateComponent, StudentLeavingComponent, OsSelectComponent],
  template: `
    <div class="os-page compact">
    <app-page-header [dense]="true" title="Student List" routeUrl="/students/list">
      <a routerLink="/students/new" class="btn-primary">
        <span class="material-icons-round">person_add</span>
        New Admission
      </a>
    </app-page-header>

    <div class="os-stage">
      <div class="os-stage-bar">
        <div class="os-toolbar-group">
          <div class="os-field grow">
            <div class="search-wrap">
              <span class="material-icons-round search-icon">search</span>
              <input class="search-input" placeholder="Search name or admission no..." [(ngModel)]="search" (ngModelChange)="onSearchChange()" />
            </div>
          </div>
          <app-os-select
            [options]="yearOptions()"
            [value]="selectedYear"
            (valueChange)="selectedYear = $event; onYearChange()"
            placeholder="All Years"
            icon="event"
            ariaLabel="Academic year" />
          <app-os-select
            [options]="classOptions()"
            [value]="selectedClass"
            (valueChange)="selectedClass = $event; onFilterChange()"
            placeholder="All Classes"
            icon="class"
            ariaLabel="Class"
            [searchable]="classOptions().length > 6" />
          <div class="os-seg square" role="tablist" aria-label="View mode">
            <button type="button" class="os-seg-btn"
                    [class.active]="viewMode() === 'list'"
                    (click)="setViewMode('list')"
                    title="List view">
              <span class="material-icons-round">view_list</span>
              <span class="seg-full">List</span>
            </button>
            <button type="button" class="os-seg-btn"
                    [class.active]="viewMode() === 'cards'"
                    (click)="setViewMode('cards')"
                    title="Student cards">
              <span class="material-icons-round">badge</span>
              <span class="seg-full">Cards</span>
            </button>
          </div>
        </div>
      </div>

    @if (loading()) {
      <div class="os-stage-body pad"><app-loading /></div>
    } @else if (students().length === 0) {
      <div class="os-stage-body pad">
        <app-empty-state icon="groups" title="No students found" message="Adjust your filters or add a new admission." />
      </div>
    } @else {
      @if (viewMode() === 'list') {
        <div class="os-stage-body">
          <table class="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Admission No</th>
                <th>Class</th>
                <th>Gender</th>
                <th>Phone</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (s of students(); track s.studentId) {
                <tr>
                  <td>
                    <div class="s-cell">
                      @if (s.photoFileId && !brokenPhotos().has(s.studentId)) {
                        <img class="s-av s-av-img" [src]="photoSrc(s.photoFileId)" [alt]="s.fullName"
                             (error)="markPhotoBroken(s.studentId)" />
                      } @else {
                        <div class="s-av">{{ s.fullName[0] }}</div>
                      }
                      <span class="s-name">{{ s.fullName }}</span>
                    </div>
                  </td>
                  <td><span class="adm-pill">{{ s.admissionNo }}</span></td>
                  <td>{{ s.className }} {{ s.section }}</td>
                  <td>{{ s.gender ?? '—' }}</td>
                  <td>{{ s.phone ?? '—' }}</td>
                  <td>
                    <span class="badge" [class.active]="s.isActive" [class.inactive]="!s.isActive">
                      {{ s.isActive ? 'Active' : 'Inactive' }}
                    </span>
                  </td>
                  <td>
                    <div class="actions">
                      <a [routerLink]="['/students/edit', s.studentId]" class="icon-btn" title="Edit student">
                        <span class="material-icons-round">edit</span>
                      </a>
                      <button class="icon-btn act-card" title="Print Student Card"
                              (click)="printStudentCard(s.studentId)"
                              [disabled]="printingCardId() === s.studentId">
                        <span class="material-icons-round">{{ printingCardId() === s.studentId ? 'refresh' : 'badge' }}</span>
                      </button>
                      @if (s.isActive) {
                        <button class="icon-btn act-leave" title="Mark as Leaving" (click)="openLeave(s)">
                          <span class="material-icons-round">exit_to_app</span>
                        </button>
                      }
                      @if (!s.isActive) {
                        <button class="icon-btn act-cert" title="Print Leaving Certificate" (click)="printCertificate(s.studentId)" [disabled]="printingId() === s.studentId">
                          <span class="material-icons-round">{{ printingId() === s.studentId ? 'refresh' : 'print' }}</span>
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="os-stage-body pad">
          <div class="stu-cards">
            @for (s of students(); track s.studentId) {
              <article class="stu-card" [class.inactive-card]="!s.isActive">
                <div class="stu-card-photo">
                  @if (s.photoFileId && !brokenPhotos().has(s.studentId)) {
                    <img [src]="photoSrc(s.photoFileId)" [alt]="s.fullName"
                         (error)="markPhotoBroken(s.studentId)" />
                  } @else {
                    <div class="stu-card-fallback">{{ s.fullName[0] }}</div>
                  }
                  <span class="stu-card-status badge" [class.active]="s.isActive" [class.inactive]="!s.isActive">
                    {{ s.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </div>
                <div class="stu-card-body">
                  <h3 class="stu-card-name">{{ s.fullName }}</h3>
                  <span class="adm-pill">{{ s.admissionNo }}</span>
                  <div class="stu-card-meta">
                    <span><span class="material-icons-round">class</span>{{ s.className || '—' }} {{ s.section }}</span>
                    <span><span class="material-icons-round">wc</span>{{ s.gender ?? '—' }}</span>
                    <span><span class="material-icons-round">call</span>{{ s.phone ?? '—' }}</span>
                  </div>
                  <div class="stu-card-actions actions">
                    <a [routerLink]="['/students/edit', s.studentId]" class="icon-btn" title="Edit student">
                      <span class="material-icons-round">edit</span>
                    </a>
                    <button class="icon-btn act-card" title="Print Student Card"
                            (click)="printStudentCard(s.studentId)"
                            [disabled]="printingCardId() === s.studentId">
                      <span class="material-icons-round">{{ printingCardId() === s.studentId ? 'refresh' : 'badge' }}</span>
                    </button>
                    @if (s.isActive) {
                      <button class="icon-btn act-leave" title="Mark as Leaving" (click)="openLeave(s)">
                        <span class="material-icons-round">exit_to_app</span>
                      </button>
                    }
                    @if (!s.isActive) {
                      <button class="icon-btn act-cert" title="Print Leaving Certificate" (click)="printCertificate(s.studentId)" [disabled]="printingId() === s.studentId">
                        <span class="material-icons-round">{{ printingId() === s.studentId ? 'refresh' : 'print' }}</span>
                      </button>
                    }
                  </div>
                </div>
              </article>
            }
          </div>
        </div>
      }

      <div class="os-stage-foot">
        <span class="tbl-count">{{ totalCount() }} students</span>
        <div class="pager-btns">
          <span class="pager-info">Page {{ page() }} of {{ totalPages() }}</span>
          <button class="pager-btn" (click)="goToPage(page() - 1)" [disabled]="page() <= 1">
            <span class="material-icons-round">chevron_left</span>
          </button>
          <button class="pager-btn" (click)="goToPage(page() + 1)" [disabled]="page() >= totalPages()">
            <span class="material-icons-round">chevron_right</span>
          </button>
        </div>
      </div>
    }
    </div>
    </div>

    @if (leavingStudent()) {
      <app-student-leaving
        [studentId]="leavingStudent()!.studentId"
        [studentName]="leavingStudent()!.fullName"
        [admissionNo]="leavingStudent()!.admissionNo"
        (closed)="onLeavingClosed($event)" />
    }
  `,
  styles: [`
    /* .tbl-meta and .pager removed: .os-stage-foot now provides the row
       and its top divider. The count/pager contents keep their own styles. */
    .tbl-count { font-size: 11px; font-weight: 600; color: var(--t4); text-transform: uppercase; letter-spacing: 0.6px; }
    .pager-info { font-size: 12px; color: var(--t4); }
    .pager-btns { display: flex; align-items: center; gap: 6px; }
    .pager-btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 32px; height: 32px; border-radius: 8px;
      background: var(--surface-2); border: 1px solid var(--border);
      color: var(--t2); cursor: pointer; transition: all .15s;
    }
    .pager-btn:hover:not(:disabled) { background: var(--accent-s); color: var(--accent); border-color: var(--accent-g); }
    .pager-btn:disabled { opacity: .4; cursor: not-allowed; }
    .pager-btn .material-icons-round { font-size: 18px; }
    .s-cell { display: flex; align-items: center; gap: 12px; }
    .s-av {
      width: 44px; height: 44px; border-radius: 12px;
      background: var(--accent);
      color: #fff; display: flex; align-items: center; justify-content: center;
      font-size: 15px; font-weight: 800; flex-shrink: 0; text-transform: uppercase;
    }
    .s-av-img {
      object-fit: cover; display: block;
      background: var(--surface-2); border: 1px solid var(--border);
    }
    .s-name { font-weight: 600; color: var(--t1); font-size: 13.5px; }

    /* .btn-edit / .btn-leave / .btn-cert removed — the global .icon-btn now
       supplies size, hover, disabled and focus. Only the two semantic hover
       tints are kept, because losing them would make "mark as leaving" and
       "print certificate" read as the same neutral action. Now token-based:
       the old rules hardcoded #fef3c7 / #d97706 / #fde68a, which did not
       respond to dark mode. */
    .icon-btn.act-leave:hover:not(:disabled) { background: var(--amber-s); color: var(--amber); }
    .icon-btn.act-cert:hover:not(:disabled)  { background: var(--green-s); color: var(--green); }
    .icon-btn.act-card:hover:not(:disabled)  { background: var(--accent-s); color: var(--accent); }

    /* Scoped to this screen's action column only. The global .icon-btn sets no
       icon size, so icons fall back to the 20px base in index.html, which fills
       a 32px button edge to edge. 17px restores visual weight closer to the
       15px the removed .btn-edit/.btn-leave/.btn-cert rules used. Deliberately
       NOT changed globally — other screens may want the 20px size. Button box
       stays 32px (min-width/min-height come from the global rule). */
    td .actions .icon-btn .material-icons-round { font-size: 17px; }

    .adm-pill {
      font-family: 'Courier New', monospace; font-size: 11.5px; font-weight: 700;
      color: var(--accent);
      background: var(--accent-s); border: 1px solid var(--accent-g);
      padding: 2px 9px; border-radius: 5px;
    }

    /* ── Student cards ── */
    .stu-cards {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 14px;
    }
    .stu-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: border-color .15s, box-shadow .15s;
    }
    .stu-card:hover {
      border-color: var(--accent-g);
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
    }
    .stu-card.inactive-card { opacity: 0.78; }
    .stu-card-photo {
      position: relative;
      aspect-ratio: 1 / 1;
      background: var(--surface-2);
      overflow: hidden;
    }
    .stu-card-photo img {
      width: 100%; height: 100%; object-fit: cover; display: block;
    }
    .stu-card-fallback {
      width: 100%; height: 100%;
      display: flex; align-items: center; justify-content: center;
      background: var(--accent); color: #fff;
      font-size: 56px; font-weight: 800; text-transform: uppercase;
    }
    .stu-card-status {
      position: absolute; top: 10px; right: 10px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.12);
    }
    .stu-card-body {
      padding: 12px 14px 14px;
      display: flex; flex-direction: column; gap: 8px;
      flex: 1;
    }
    .stu-card-name {
      margin: 0; font-size: 14.5px; font-weight: 700; color: var(--t1);
      line-height: 1.3;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .stu-card-meta {
      display: flex; flex-direction: column; gap: 5px;
      font-size: 12.5px; color: var(--t3);
    }
    .stu-card-meta > span {
      display: flex; align-items: center; gap: 6px; min-width: 0;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .stu-card-meta .material-icons-round {
      font-size: 15px; color: var(--t4); flex-shrink: 0;
    }
    .stu-card-actions {
      display: flex; gap: 6px; margin-top: auto; padding-top: 4px;
    }
    .stu-card-actions .icon-btn .material-icons-round { font-size: 17px; }

    @media (max-width: 560px) {
      .stu-cards { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; }
      .stu-card-name { font-size: 13.5px; }
    }
  `]
})
export class StudentListComponent implements OnInit {
  private static readonly VIEW_KEY = 'oneschool.studentList.view';

  private studentSvc   = inject(StudentService);
  private academicSvc  = inject(AcademicService);
  private instituteSvc = inject(InstituteService);

  students       = signal<StudentListDto[]>([]);
  years          = signal<AcademicYear[]>([]);
  classes        = signal<ClassDto[]>([]);
  loading        = signal(false);
  leavingStudent = signal<StudentListDto | null>(null);
  printingId     = signal<number | null>(null);
  printingCardId = signal<number | null>(null);
  brokenPhotos   = signal(new Set<number>());
  viewMode       = signal<'list' | 'cards'>(StudentListComponent.readStoredView());

  private static readStoredView(): 'list' | 'cards' {
    try {
      const v = localStorage.getItem(StudentListComponent.VIEW_KEY);
      return v === 'cards' ? 'cards' : 'list';
    } catch { return 'list'; }
  }

  setViewMode(mode: 'list' | 'cards'): void {
    this.viewMode.set(mode);
    try { localStorage.setItem(StudentListComponent.VIEW_KEY, mode); } catch { /* ignore */ }
  }

  photoSrc(fileId: number): string {
    return `${environment.fileServerUrl}/files/${fileId}`;
  }

  markPhotoBroken(studentId: number): void {
    this.brokenPhotos.update(s => new Set(s).add(studentId));
  }

  page       = signal(1);
  pageSize   = 25;
  totalCount = signal(0);
  totalPages = () => Math.max(1, Math.ceil(this.totalCount() / this.pageSize));

  selectedYear:  number | null = null;
  selectedClass: number | null = null;
  search = '';

  // Option lists for app-os-select, which takes `options` + `value` +
  // `valueChange` (it is not a ControlValueAccessor, so no ngModel).
  // Derived only — the filter values themselves are unchanged.
  yearOptions = computed<OsSelectOption<number | null>[]>(() => [
    { value: null, label: 'All Years' },
    ...this.years().map(y => ({ value: y.academicYearId as number | null, label: y.yearLabel }))
  ]);

  classOptions = computed<OsSelectOption<number | null>[]>(() => [
    { value: null, label: 'All Classes' },
    ...this.classes().map(c => ({
      value: c.classId as number | null,
      label: `${c.className} ${c.section ?? ''}`.trim()
    }))
  ]);
  private searchDebounce: ReturnType<typeof setTimeout> | null = null;

  openLeave(s: StudentListDto) { this.leavingStudent.set(s); }

  onLeavingClosed(withdrawn: boolean) {
    this.leavingStudent.set(null);
    if (withdrawn) this.load();
  }

  printCertificate(studentId: number) {
    if (this.printingId()) return;
    this.printingId.set(studentId);
    this.studentSvc.getById(studentId).subscribe({
      next: (r: any) => {
        this.instituteSvc.getMyInstitute().subscribe({
          next: (inst: any) => {
            this.printingId.set(null);
            this.openCertWindow(r, inst);
          },
          error: () => { this.printingId.set(null); this.openCertWindow(r, null); }
        });
      },
      error: () => this.printingId.set(null)
    });
  }

  printStudentCard(studentId: number) {
    if (this.printingCardId()) return;
    this.printingCardId.set(studentId);
    this.studentSvc.getById(studentId).subscribe({
      next: (r: any) => {
        this.instituteSvc.getMyInstitute().subscribe({
          next: (inst: any) => {
            this.printingCardId.set(null);
            this.openIdCardWindow(r, inst);
          },
          error: () => { this.printingCardId.set(null); this.openIdCardWindow(r, null); }
        });
      },
      error: () => this.printingCardId.set(null)
    });
  }

  private esc(v: unknown): string {
    return String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private openIdCardWindow(r: any, inst: any) {
    const schoolName = this.esc(inst?.name ?? 'School');
    const schoolPhone = this.esc(inst?.phone ?? '');
    const schoolEmail = this.esc(inst?.email ?? '');
    const schoolAddr  = this.esc(inst?.address ?? '');
    const logoUrl = inst?.logoUrl
      ? (inst.logoUrl.startsWith('http') ? inst.logoUrl : `${environment.serverUrl}${inst.logoUrl}`)
      : '';
    const initials = String(inst?.name ?? 'S')
      .split(' ').filter(Boolean).slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
    const logoHtml = logoUrl
      ? `<img src="${this.esc(logoUrl)}" class="sch-logo" alt="logo"/>`
      : `<div class="sch-logo-av">${this.esc(initials)}</div>`;

    const fullName = this.esc(`${r.firstName ?? ''} ${r.lastName ?? ''}`.trim());
    const admissionNo = this.esc(r.admissionNo ?? '—');
    const className = this.esc([r.currentClassName, r.currentSection].filter(Boolean).join(' ') || '—');
    const yearLabel = this.esc(r.currentAcademicYearLabel ?? '—');
    const gender = this.esc(r.gender ?? '—');
    const blood = this.esc(r.bloodGroup ?? '—');
    const address = this.esc(r.address ?? '—');
    const phone = this.esc(r.phone ?? '—');
    const guardian = r.guardians?.[0] ?? null;
    const guardianName = this.esc(guardian?.fullName ?? '—');
    const guardianPhone = this.esc(guardian?.phone ?? '—');
    const guardianRel = this.esc(guardian?.relation ?? 'Guardian');

    const fmt = (d: string | null | undefined) => {
      if (!d) return '—';
      const dt = new Date(d);
      return isNaN(dt.getTime())
        ? this.esc(d)
        : dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    };
    const dob = fmt(r.dateOfBirth);
    const admDate = fmt(r.admissionDate);

    const photoUrl = r.photoFileId
      ? `${environment.fileServerUrl}/files/${r.photoFileId}`
      : '';
    const photoHtml = photoUrl
      ? `<img class="stu-photo" src="${this.esc(photoUrl)}" alt="photo"/>`
      : `<div class="stu-photo-av">${this.esc((r.firstName?.[0] ?? 'S').toUpperCase())}</div>`;

    const win = window.open('', '_blank');
    if (!win) { alert('Allow popups to print the student card.'); return; }
    win.document.write(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/>
<title>Student Card — ${fullName}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Segoe UI',system-ui,sans-serif;background:#e8eef7;padding:24px;color:#0f172a;}
  .toolbar{display:flex;justify-content:space-between;align-items:center;background:#1e3a5f;color:#fff;padding:12px 18px;border-radius:10px;margin-bottom:22px;max-width:920px;margin-left:auto;margin-right:auto;}
  .toolbar h2{font-size:15px;font-weight:700;}
  .toolbar p{font-size:11px;color:rgba(255,255,255,.72);margin-top:2px;}
  .tbr{display:flex;gap:8px;}
  .btn-p{padding:8px 18px;background:#fff;color:#1e3a5f;border:none;border-radius:7px;font-size:13px;font-weight:700;cursor:pointer;}
  .btn-c{padding:8px 14px;background:rgba(255,255,255,.14);color:#fff;border:1.5px solid rgba(255,255,255,.35);border-radius:7px;font-size:13px;cursor:pointer;}
  .sheet{display:flex;flex-wrap:wrap;gap:22px;justify-content:center;align-items:flex-start;}
  .face-label{font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:#64748b;margin-bottom:8px;text-align:center;}
  .card{
    width:85.6mm;height:54mm;border-radius:3.2mm;overflow:hidden;position:relative;
    background:#fff;box-shadow:0 10px 28px rgba(15,23,42,.16);border:1px solid #cbd5e1;
  }
  .front{display:flex;flex-direction:column;background:linear-gradient(160deg,#f8fbff 0%,#ffffff 48%,#eef4ff 100%);}
  .front-head{
    display:flex;align-items:center;gap:8px;padding:5px 8px;
    background:linear-gradient(90deg,#1e3a5f,#2563eb);color:#fff;min-height:14mm;
  }
  .sch-logo{width:9.5mm;height:9.5mm;object-fit:contain;border-radius:2mm;background:#fff;padding:1px;flex-shrink:0;}
  .sch-logo-av{width:9.5mm;height:9.5mm;border-radius:2mm;background:#fff;color:#1e3a5f;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0;}
  .sch-meta{min-width:0;flex:1;}
  .sch-name{font-size:10.5px;font-weight:800;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .sch-tag{font-size:7.5px;opacity:.85;letter-spacing:.6px;text-transform:uppercase;margin-top:1px;}
  .front-body{display:flex;gap:8px;padding:6px 8px 5px;flex:1;min-height:0;}
  .stu-photo,.stu-photo-av{
    width:22mm;height:26mm;border-radius:2mm;object-fit:cover;flex-shrink:0;
    border:1.5px solid #93c5fd;background:#dbeafe;
  }
  .stu-photo-av{display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:#1e3a5f;}
  .stu-info{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:2.5px;}
  .stu-name{font-size:12px;font-weight:800;color:#0f172a;line-height:1.2;max-height:2.4em;overflow:hidden;}
  .row{display:flex;gap:5px;font-size:8px;line-height:1.25;}
  .lbl{color:#64748b;font-weight:700;min-width:18mm;text-transform:uppercase;letter-spacing:.3px;}
  .val{color:#0f172a;font-weight:650;word-break:break-word;}
  .front-foot{
    margin-top:auto;padding:3px 8px 4px;border-top:1px solid #dbeafe;
    display:flex;justify-content:space-between;align-items:center;
    font-size:7px;color:#475569;font-weight:600;
  }
  .adm-chip{
    background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;
    padding:1px 6px;border-radius:99px;font-family:ui-monospace,Consolas,monospace;font-weight:700;
  }
  .back{display:flex;flex-direction:column;background:linear-gradient(180deg,#1e3a5f 0 11mm,#ffffff 11mm);}
  .back-banner{color:#fff;padding:5px 9px 4px;}
  .back-banner h4{font-size:10px;font-weight:800;letter-spacing:.4px;}
  .back-banner p{font-size:7px;opacity:.85;margin-top:1px;}
  .back-body{padding:6px 9px 5px;flex:1;display:flex;flex-direction:column;gap:3px;}
  .back .row{font-size:8px;}
  .back .lbl{min-width:22mm;}
  .rules{
    margin-top:auto;padding:5px 9px 6px;background:#f8fafc;border-top:1px solid #e2e8f0;
    font-size:6.8px;color:#64748b;line-height:1.35;
  }
  .rules strong{color:#1e3a5f;}
  @media print{
    body{background:#fff!important;padding:8mm!important;}
    .toolbar{display:none!important;}
    .face-label{display:none!important;}
    .sheet{gap:10mm;}
    .card{box-shadow:none;page-break-inside:avoid;}
    @page{size:A4 portrait;margin:10mm;}
  }
</style></head><body>
<div class="toolbar">
  <div>
    <h2>Student Identity Card</h2>
    <p>${fullName} — ${admissionNo}</p>
  </div>
  <div class="tbr">
    <button class="btn-p" onclick="window.print()">Print / Save PDF</button>
    <button class="btn-c" onclick="window.close()">Close</button>
  </div>
</div>
<div class="sheet">
  <div>
    <div class="face-label">Front</div>
    <div class="card front">
      <div class="front-head">
        ${logoHtml}
        <div class="sch-meta">
          <div class="sch-name">${schoolName}</div>
          <div class="sch-tag">Student Identity Card</div>
        </div>
      </div>
      <div class="front-body">
        ${photoHtml}
        <div class="stu-info">
          <div class="stu-name">${fullName}</div>
          <div class="row"><span class="lbl">Class</span><span class="val">${className}</span></div>
          <div class="row"><span class="lbl">DOB</span><span class="val">${dob}</span></div>
          <div class="row"><span class="lbl">Gender</span><span class="val">${gender}</span></div>
          <div class="row"><span class="lbl">Session</span><span class="val">${yearLabel}</span></div>
        </div>
      </div>
      <div class="front-foot">
        <span class="adm-chip">${admissionNo}</span>
        <span>Valid while enrolled</span>
      </div>
    </div>
  </div>
  <div>
    <div class="face-label">Back</div>
    <div class="card back">
      <div class="back-banner">
        <h4>Student Details</h4>
        <p>${schoolName}</p>
      </div>
      <div class="back-body">
        <div class="row"><span class="lbl">Blood Group</span><span class="val">${blood}</span></div>
        <div class="row"><span class="lbl">Phone</span><span class="val">${phone}</span></div>
        <div class="row"><span class="lbl">Address</span><span class="val">${address}</span></div>
        <div class="row"><span class="lbl">${guardianRel}</span><span class="val">${guardianName}</span></div>
        <div class="row"><span class="lbl">Guardian Ph</span><span class="val">${guardianPhone}</span></div>
        <div class="row"><span class="lbl">Admitted</span><span class="val">${admDate}</span></div>
      </div>
      <div class="rules">
        <strong>If found,</strong> please return to ${schoolName}${schoolAddr ? ' · ' + schoolAddr : ''}${schoolPhone ? ' · ' + schoolPhone : ''}${schoolEmail ? ' · ' + schoolEmail : ''}.
        This card remains school property.
      </div>
    </div>
  </div>
</div>
</body></html>`);
    win.document.close();
  }

  private openCertWindow(r: any, inst: any) {
    const schoolName = inst?.name ?? 'School';
    const logoUrl    = inst?.logoUrl
      ? (inst.logoUrl.startsWith('http') ? inst.logoUrl : `${environment.serverUrl}${inst.logoUrl}`)
      : '';
    const initials   = schoolName.split(' ').slice(0,2).map((w: string) => w[0]).join('').toUpperCase();
    const logoHtml   = logoUrl
      ? `<img src="${logoUrl}" class="logo" alt="logo"/>`
      : `<div class="logo-av">${initials}</div>`;

    const fmt = (d: string) => {
      if (!d) return '—';
      const dt = new Date(d);
      return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const guardian      = r.guardians?.[0] ?? null;
    const guardianName  = guardian?.fullName ?? '—';
    const guardianPhone = guardian?.phone ?? '';
    const className     = [r.currentClassName, r.currentSection].filter(Boolean).join(' ') || '—';
    const yearLabel     = r.currentAcademicYearLabel ?? '—';
    const totalDues     = 0;

    const win = window.open('', '_blank');
    if (!win) { alert('Allow popups to print.'); return; }
    win.document.write(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/>
<title>School Leaving Certificate — ${r.firstName} ${r.lastName}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Times New Roman',serif;background:#f4f4f4;padding:30px;}
  .toolbar{display:flex;justify-content:space-between;align-items:center;background:#1e3a5f;color:#fff;padding:12px 20px;border-radius:8px;margin-bottom:24px;font-family:'Segoe UI',sans-serif;}
  .toolbar h2{font-size:15px;font-weight:700;}.toolbar p{font-size:11px;color:rgba(255,255,255,.7);margin-top:2px;}
  .tbr{display:flex;gap:8px;}
  .btn-p{padding:8px 20px;background:#fff;color:#1e3a5f;border:none;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Segoe UI',sans-serif;}
  .btn-c{padding:8px 16px;background:rgba(255,255,255,.15);color:#fff;border:1.5px solid rgba(255,255,255,.35);border-radius:6px;font-size:13px;cursor:pointer;font-family:'Segoe UI',sans-serif;}
  .cert{background:#fff;max-width:700px;margin:0 auto;border:3px double #1e3a5f;padding:40px 50px;}
  .cert-header{text-align:center;border-bottom:2px solid #1e3a5f;padding-bottom:20px;margin-bottom:28px;}
  .logo{width:70px;height:70px;object-fit:contain;border-radius:8px;border:1px solid #e5e7eb;}
  .logo-av{width:70px;height:70px;border-radius:8px;background:#1e3a5f;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;}
  .school-name{font-size:22px;font-weight:700;color:#1e3a5f;letter-spacing:.5px;margin:10px 0 4px;font-family:'Segoe UI',sans-serif;}
  .cert-title{font-size:17px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#374151;margin-top:16px;font-family:'Segoe UI',sans-serif;}
  .cert-subtitle{font-size:12px;color:#6b7280;letter-spacing:1px;text-transform:uppercase;margin-top:4px;font-family:'Segoe UI',sans-serif;}
  .cert-body{font-size:14px;line-height:2;color:#374151;margin-bottom:6px;}
  .field-line{border-bottom:1px dotted #9ca3af;display:inline-block;min-width:180px;color:#1e3a5f;font-weight:600;}
  .cert-table{width:100%;border-collapse:collapse;margin:20px 0;font-size:13px;}
  .cert-table td{padding:8px 12px;border:1px solid #e5e7eb;}
  .cert-table td:first-child{font-weight:700;color:#374151;background:#f9fafb;width:35%;text-transform:uppercase;font-size:11px;letter-spacing:.5px;}
  .cert-table td:last-child{color:#111;}
  .cert-footer{margin-top:40px;display:flex;justify-content:space-between;align-items:flex-end;}
  .sig-block{text-align:center;}
  .sig-line{width:160px;border-bottom:1.5px solid #374151;margin-bottom:6px;}
  .sig-lbl{font-size:11px;color:#6b7280;letter-spacing:.5px;text-transform:uppercase;font-family:'Segoe UI',sans-serif;}
  .cert-note{font-size:11px;color:#9ca3af;text-align:center;margin-top:28px;border-top:1px solid #f3f4f6;padding-top:12px;font-family:'Segoe UI',sans-serif;}
  @media print{body{background:#fff!important;padding:0!important;}.toolbar{display:none!important;}.cert{border:3px double #1e3a5f;max-width:100%;}@page{size:A4 portrait;margin:15mm;}}
</style></head><body>
<div class="toolbar">
  <div><h2>School Leaving Certificate</h2><p>${r.firstName} ${r.lastName} — ${r.admissionNo}</p></div>
  <div class="tbr">
    <button class="btn-p" onclick="window.print()">🖨️ Print / Save PDF</button>
    <button class="btn-c" onclick="window.close()">✕ Close</button>
  </div>
</div>
<div class="cert">
  <div class="cert-header">
    ${logoHtml}
    <div class="school-name">${schoolName}</div>
    <div class="cert-title">School Leaving Certificate</div>
    <div class="cert-subtitle">This is to certify that</div>
  </div>
  <div class="cert-body">
    <p>This is to certify that <span class="field-line">&nbsp;${r.firstName} ${r.lastName}&nbsp;</span>
    ${r.gender === 'Male' ? 'son' : r.gender === 'Female' ? 'daughter' : 'ward'} of
    <span class="field-line">&nbsp;${guardianName}&nbsp;</span>
    was a bonafide student of this institution.</p>
  </div>
  <table class="cert-table">
    <tr><td>Admission No.</td><td>${r.admissionNo}</td></tr>
    <tr><td>Date of Birth</td><td>${fmt(r.dateOfBirth)}</td></tr>
    <tr><td>Class / Year</td><td>${className} &nbsp;|&nbsp; ${yearLabel}</td></tr>
    <tr><td>Admission Date</td><td>${fmt(r.admissionDate)}</td></tr>
    <tr><td>Leaving Date</td><td>${fmt(r.leavingDate)}</td></tr>
    <tr><td>Reason for Leaving</td><td>${r.leavingReason ?? '—'}</td></tr>
    <tr><td>Guardian</td><td>${guardianName}${guardianPhone ? ' · ' + guardianPhone : ''}</td></tr>
    <tr><td>Fee Clearance</td><td>${totalDues > 0 ? `<span style="color:#b91c1c;font-weight:700;">Dues Pending: Rs. ${Number(totalDues).toLocaleString()}</span>` : '<span style="color:#059669;font-weight:700;">All dues cleared ✓</span>'}</td></tr>
  </table>
  <div class="cert-footer">
    <div class="sig-block"><div class="sig-line"></div><div class="sig-lbl">Class Teacher</div></div>
    <div class="sig-block"><div class="sig-line"></div><div class="sig-lbl">Principal</div></div>
    <div class="sig-block"><div class="sig-line"></div><div class="sig-lbl">School Stamp</div></div>
  </div>
  <div class="cert-note">
    Issued on: ${new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })}
    &nbsp;·&nbsp; This certificate is issued without any corrections or alterations.
  </div>
</div>
</body></html>`);
    win.document.close();
  }

  ngOnInit() {
    this.academicSvc.getYears().subscribe(y => this.years.set(y));
    this.load();
  }

  onYearChange() {
    this.selectedClass = null;
    if (this.selectedYear) {
      this.academicSvc.getClasses(this.selectedYear).subscribe(c => this.classes.set(c));
    } else { this.classes.set([]); }
    this.onFilterChange();
  }

  onFilterChange() {
    this.page.set(1);
    this.load();
  }

  onSearchChange() {
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => this.onFilterChange(), 350);
  }

  goToPage(p: number) {
    if (p < 1 || p > this.totalPages()) return;
    this.page.set(p);
    this.load();
  }

  load() {
    this.loading.set(true);
    this.studentSvc.getStudents(
      this.selectedClass ?? undefined,
      this.selectedYear ?? undefined,
      this.search.trim() || undefined,
      this.page(),
      this.pageSize
    ).subscribe({
      next: r => { this.students.set(r.items); this.totalCount.set(r.totalCount); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }
}
