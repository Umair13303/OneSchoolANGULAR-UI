import { Component, inject, OnInit, signal } from '@angular/core';
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

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PageHeaderComponent, LoadingComponent, EmptyStateComponent, StudentLeavingComponent],
  template: `
    <app-page-header title="Students" subtitle="All enrolled students">
      <a routerLink="/students/new" class="btn-primary">
        <span class="material-icons-round" style="font-size:17px">person_add</span>
        New Admission
      </a>
    </app-page-header>

    <div class="filter-bar">
      <div class="search-wrap">
        <span class="material-icons-round search-icon">search</span>
        <input class="search-input" placeholder="Search name or admission no..." [(ngModel)]="search" (ngModelChange)="onSearchChange()" />
      </div>
      <select class="filter-select" [(ngModel)]="selectedYear" (change)="onYearChange()">
        <option [ngValue]="null">All Years</option>
        @for (y of years(); track y.academicYearId) {
          <option [ngValue]="y.academicYearId">{{ y.yearLabel }}</option>
        }
      </select>
      <select class="filter-select" [(ngModel)]="selectedClass" (change)="onFilterChange()">
        <option [ngValue]="null">All Classes</option>
        @for (c of classes(); track c.classId) {
          <option [ngValue]="c.classId">{{ c.className }} {{ c.section }}</option>
        }
      </select>
    </div>

    @if (leavingStudent()) {
      <app-student-leaving
        [studentId]="leavingStudent()!.studentId"
        [studentName]="leavingStudent()!.fullName"
        [admissionNo]="leavingStudent()!.admissionNo"
        (closed)="onLeavingClosed($event)" />
    }

    @if (loading()) {
      <div class="card"><app-loading /></div>
    } @else if (students().length === 0) {
      <div class="card">
        <app-empty-state icon="groups" title="No students found" message="Adjust your filters or add a new admission." />
      </div>
    } @else {
      <div class="card">
        <div class="tbl-meta">
          <span class="tbl-count">{{ totalCount() }} students</span>
        </div>
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
                    <div class="s-av">{{ s.fullName[0] }}</div>
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
                <td class="actions-cell">
                  <a [routerLink]="['/students/edit', s.studentId]" class="btn-edit" title="Edit student">
                    <span class="material-icons-round">edit</span>
                  </a>
                  @if (s.isActive) {
                    <button class="btn-leave" title="Mark as Leaving" (click)="openLeave(s)">
                      <span class="material-icons-round">exit_to_app</span>
                    </button>
                  }
                  @if (!s.isActive) {
                    <button class="btn-cert" title="Print Leaving Certificate" (click)="printCertificate(s.studentId)" [disabled]="printingId() === s.studentId">
                      <span class="material-icons-round">{{ printingId() === s.studentId ? 'refresh' : 'print' }}</span>
                    </button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
        <div class="pager">
          <span class="pager-info">
            Page {{ page() }} of {{ totalPages() }} &middot; {{ totalCount() }} total
          </span>
          <div class="pager-btns">
            <button class="pager-btn" (click)="goToPage(page() - 1)" [disabled]="page() <= 1">
              <span class="material-icons-round">chevron_left</span>
            </button>
            <button class="pager-btn" (click)="goToPage(page() + 1)" [disabled]="page() >= totalPages()">
              <span class="material-icons-round">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .tbl-meta { padding: 14px 18px 0; display: flex; justify-content: flex-end; }
    .tbl-count { font-size: 11px; font-weight: 600; color: var(--t4); text-transform: uppercase; letter-spacing: 0.6px; }
    .pager {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 18px; border-top: 1px solid var(--border);
    }
    .pager-info { font-size: 12px; color: var(--t4); }
    .pager-btns { display: flex; gap: 6px; }
    .pager-btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 32px; height: 32px; border-radius: 8px;
      background: var(--surface-2); border: 1px solid var(--border);
      color: var(--t2); cursor: pointer; transition: all .15s;
    }
    .pager-btn:hover:not(:disabled) { background: var(--accent-s); color: var(--accent); border-color: var(--accent-g); }
    .pager-btn:disabled { opacity: .4; cursor: not-allowed; }
    .pager-btn .material-icons-round { font-size: 18px; }
    .s-cell { display: flex; align-items: center; gap: 10px; }
    .s-av {
      width: 30px; height: 30px; border-radius: 8px;
      background: var(--accent);
      color: #fff; display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 800; flex-shrink: 0; text-transform: uppercase;
    }
    .s-name { font-weight: 600; color: var(--t1); font-size: 13.5px; }
    .actions-cell { display: flex; align-items: center; gap: 6px; }
    .btn-edit {
      display: inline-flex; align-items: center; justify-content: center;
      width: 30px; height: 30px; border-radius: 8px;
      background: var(--surface-2); border: 1px solid var(--border);
      color: var(--t3); text-decoration: none; transition: all .15s;
    }
    .btn-edit:hover { background: var(--accent-s); color: var(--accent); border-color: var(--accent-g); }
    .btn-edit .material-icons-round { font-size: 15px; }
    .btn-leave {
      display: inline-flex; align-items: center; justify-content: center;
      width: 30px; height: 30px; border-radius: 8px;
      background: var(--surface-2); border: 1px solid var(--border);
      color: var(--t3); cursor: pointer; transition: all .15s;
    }
    .btn-leave:hover { background: #fef3c7; color: #d97706; border-color: #fde68a; }
    .btn-leave .material-icons-round { font-size: 15px; }
    .btn-cert {
      display: inline-flex; align-items: center; justify-content: center;
      width: 30px; height: 30px; border-radius: 8px;
      background: var(--surface-2); border: 1px solid var(--border);
      color: var(--t3); cursor: pointer; transition: all .15s;
    }
    .btn-cert:hover:not(:disabled) { background: var(--green-s); color: var(--green); border-color: var(--green-b); }
    .btn-cert:disabled { opacity: .5; cursor: not-allowed; }
    .btn-cert .material-icons-round { font-size: 15px; }
    .adm-pill {
      font-family: 'Courier New', monospace; font-size: 11.5px; font-weight: 700;
      color: var(--accent);
      background: var(--accent-s); border: 1px solid #bfdbfe;
      padding: 2px 9px; border-radius: 5px;
    }
  `]
})
export class StudentListComponent implements OnInit {
  private studentSvc   = inject(StudentService);
  private academicSvc  = inject(AcademicService);
  private instituteSvc = inject(InstituteService);

  students       = signal<StudentListDto[]>([]);
  years          = signal<AcademicYear[]>([]);
  classes        = signal<ClassDto[]>([]);
  loading        = signal(false);
  leavingStudent = signal<StudentListDto | null>(null);
  printingId     = signal<number | null>(null);

  page       = signal(1);
  pageSize   = 25;
  totalCount = signal(0);
  totalPages = () => Math.max(1, Math.ceil(this.totalCount() / this.pageSize));

  selectedYear:  number | null = null;
  selectedClass: number | null = null;
  search = '';
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
