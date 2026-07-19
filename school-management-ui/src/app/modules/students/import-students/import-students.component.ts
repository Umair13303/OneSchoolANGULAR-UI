import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AcademicService } from '../../../core/services/academic.service';
import { ClassDto, AcademicYear } from '../../../core/models/academic.model';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';

interface ImportRowResult {
  row: number;
  name: string;
  success: boolean;
  admissionNo?: string;
  error?: string;
}

interface ImportResponse {
  totalRows: number;
  successCount: number;
  failCount: number;
  results: ImportRowResult[];
}

@Component({
  selector: 'app-import-students',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="import-card">

      <!-- Header -->
      <div class="imp-header">
        <div class="imp-header-left">
          <div class="imp-icon">
            <span class="material-icons-round">upload_file</span>
          </div>
          <div>
            <h2 class="imp-title">Import Students</h2>
            <p class="imp-sub">Bulk upload student records from an Excel file, class-wise</p>
          </div>
        </div>
        <button class="imp-close-btn" (click)="router.navigate(['/students/list'])">
          <span class="material-icons-round">close</span>
        </button>
      </div>

      <!-- Step indicator -->
      <div class="step-bar">
        <div class="step-item" [class.active]="step() === 1" [class.done]="step() > 1">
          <div class="step-dot">@if (step() > 1) { <span class="material-icons-round">check</span> } @else { 1 }</div>
          <span class="step-label">Select Class</span>
        </div>
        <div class="step-line" [class.done]="step() > 1"></div>
        <div class="step-item" [class.active]="step() === 2" [class.done]="step() > 2">
          <div class="step-dot">@if (step() > 2) { <span class="material-icons-round">check</span> } @else { 2 }</div>
          <span class="step-label">Download & Upload</span>
        </div>
        <div class="step-line" [class.done]="step() > 2"></div>
        <div class="step-item" [class.active]="step() === 3">
          <div class="step-dot">3</div>
          <span class="step-label">Results</span>
        </div>
      </div>

      <div class="imp-body">

        <!-- ── Step 1: Select Year & Class ── -->
        @if (step() === 1) {
          <div class="step-pane">
            <div class="section-hint">
              <span class="material-icons-round">info</span>
              Choose the academic year and class you want to import students into.
            </div>

            <div class="field-row">
              <div class="field">
                <label>Academic Year <span class="req">*</span></label>
                <select [(ngModel)]="selectedYearId" (ngModelChange)="onYearChange()">
                  <option [ngValue]="null">— Select year —</option>
                  @for (y of years(); track y.academicYearId) {
                    <option [ngValue]="y.academicYearId">{{ y.yearLabel }}</option>
                  }
                </select>
              </div>
              <div class="field">
                <label>Class <span class="req">*</span></label>
                <select [(ngModel)]="selectedClassId" [disabled]="!selectedYearId || classes().length === 0">
                  <option [ngValue]="null">— Select class —</option>
                  @for (c of classes(); track c.classId) {
                    <option [ngValue]="c.classId">{{ c.className }}{{ c.section ? ' ' + c.section : '' }}</option>
                  }
                </select>
              </div>
            </div>

            @if (selectedYearId && classes().length === 0) {
              <div class="warn-box">
                <span class="material-icons-round">warning</span>
                No classes found for this year. <a (click)="router.navigate(['/academics/classes'])">Add classes first.</a>
              </div>
            }

            <div class="step-nav">
              <span></span>
              <button class="btn-primary" [disabled]="!selectedYearId || !selectedClassId" (click)="step.set(2)">
                Next <span class="material-icons-round">arrow_forward</span>
              </button>
            </div>
          </div>
        }

        <!-- ── Step 2: Download template & Upload ── -->
        @if (step() === 2) {
          <div class="step-pane">

            <!-- Download block -->
            <div class="action-card download-card">
              <div class="ac-icon green">
                <span class="material-icons-round">download</span>
              </div>
              <div class="ac-content">
                <div class="ac-title">Step A — Download Sample Template</div>
                <div class="ac-sub">
                  Download the Excel template pre-filled with 2 sample rows for
                  <strong>{{ selectedClassLabel() }}</strong> / <strong>{{ selectedYearLabel() }}</strong>.
                  Fill it in and save.
                </div>
              </div>
              <button class="btn-download" (click)="downloadTemplate()" [disabled]="downloading()">
                @if (downloading()) {
                  <span class="material-icons-round spin">refresh</span> Downloading…
                } @else {
                  <span class="material-icons-round">table_view</span> Download .xlsx
                }
              </button>
            </div>

            <!-- Upload block -->
            <div class="action-card upload-card" [class.has-file]="selectedFile()">
              <div class="ac-icon blue">
                <span class="material-icons-round">upload</span>
              </div>
              <div class="ac-content">
                <div class="ac-title">Step B — Upload Filled Template</div>
                <div class="ac-sub">
                  @if (selectedFile()) {
                    <strong class="file-name">
                      <span class="material-icons-round">description</span>
                      {{ selectedFile()!.name }}
                    </strong>
                    <span class="file-size">({{ (selectedFile()!.size / 1024).toFixed(1) }} KB)</span>
                    <button class="btn-clear" (click)="clearFile()">
                      <span class="material-icons-round">close</span>
                    </button>
                  } @else {
                    Select the filled .xlsx file to upload. Only .xlsx format is accepted.
                  }
                </div>
              </div>
              <label class="btn-upload">
                <span class="material-icons-round">folder_open</span>
                {{ selectedFile() ? 'Change file' : 'Browse file' }}
                <input type="file" accept=".xlsx" (change)="onFileSelected($event)" style="display:none" />
              </label>
            </div>

            @if (importError()) {
              <div class="err-box">
                <span class="material-icons-round">error_outline</span> {{ importError() }}
              </div>
            }

            <div class="step-nav">
              <button class="btn-secondary" (click)="step.set(1)">
                <span class="material-icons-round">arrow_back</span> Back
              </button>
              <button class="btn-primary" [disabled]="!selectedFile() || importing()" (click)="runImport()">
                @if (importing()) {
                  <span class="material-icons-round spin">refresh</span> Importing…
                } @else {
                  <span class="material-icons-round">upload_file</span> Import Now
                }
              </button>
            </div>
          </div>
        }

        <!-- ── Step 3: Results ── -->
        @if (step() === 3 && importResult()) {
          <div class="step-pane">

            <!-- Summary banner -->
            <div class="result-banner" [class.all-ok]="importResult()!.failCount === 0" [class.has-errors]="importResult()!.failCount > 0">
              <div class="rb-stat">
                <span class="material-icons-round">check_circle</span>
                <div>
                  <div class="rb-num">{{ importResult()!.successCount }}</div>
                  <div class="rb-lbl">Imported</div>
                </div>
              </div>
              <div class="rb-divider"></div>
              <div class="rb-stat fail">
                <span class="material-icons-round">cancel</span>
                <div>
                  <div class="rb-num">{{ importResult()!.failCount }}</div>
                  <div class="rb-lbl">Failed</div>
                </div>
              </div>
              <div class="rb-divider"></div>
              <div class="rb-stat total">
                <span class="material-icons-round">table_rows</span>
                <div>
                  <div class="rb-num">{{ importResult()!.totalRows }}</div>
                  <div class="rb-lbl">Total Rows</div>
                </div>
              </div>
            </div>

            <!-- Row-by-row table -->
            <div class="result-table-wrap">
              <table class="result-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Student Name</th>
                    <th>Status</th>
                    <th>Admission No. / Error</th>
                  </tr>
                </thead>
                <tbody>
                  @for (r of importResult()!.results; track r.row) {
                    <tr [class.row-ok]="r.success" [class.row-fail]="!r.success">
                      <td class="row-num">{{ r.row }}</td>
                      <td class="row-name">{{ r.name }}</td>
                      <td class="row-status">
                        @if (r.success) {
                          <span class="badge ok"><span class="material-icons-round">check</span> Success</span>
                        } @else {
                          <span class="badge fail"><span class="material-icons-round">close</span> Failed</span>
                        }
                      </td>
                      <td class="row-detail">
                        @if (r.success) {
                          <span class="adm-no">{{ r.admissionNo }}</span>
                        } @else {
                          <span class="err-msg">{{ r.error }}</span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <div class="step-nav">
              <button class="btn-secondary" (click)="resetImport()">
                <span class="material-icons-round">upload_file</span> Import Another File
              </button>
              <button class="btn-primary" (click)="router.navigate(['/students/list'])">
                <span class="material-icons-round">list</span> View Student List
              </button>
            </div>
          </div>
        }

      </div>
    </div>
  `,
  styles: [`
    .import-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; box-shadow: var(--sh); }

    /* ── Header ── */
    .imp-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 20px;
      background: linear-gradient(135deg, var(--accent-s) 0%, var(--surface) 100%);
      border-bottom: 1px solid var(--border); border-radius: 16px 16px 0 0;
    }
    .imp-header-left { display: flex; align-items: center; gap: 12px; }
    .imp-icon {
      width: 40px; height: 40px; border-radius: 11px; flex-shrink: 0;
      background: var(--accent); display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,.15);
      .material-icons-round { font-size: 20px; color: #fff; font-variation-settings: 'FILL' 1; }
    }
    .imp-title { font-size: 15px; font-weight: 800; color: var(--t1); }
    .imp-sub { font-size: 12px; color: var(--t4); margin-top: 2px; }
    .imp-close-btn {
      width: 30px; height: 30px; border-radius: 8px; border: 1px solid var(--border-2);
      background: var(--surface); color: var(--t3); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      .material-icons-round { font-size: 16px; }
    }
    .imp-close-btn:hover { background: var(--red-s); border-color: var(--red); color: var(--red); }

    /* ── Step bar ── */
    .step-bar {
      display: flex; align-items: center; padding: 12px 20px;
      background: var(--surface-2); border-bottom: 1px solid var(--border);
    }
    .step-item { display: flex; align-items: center; gap: 6px; }
    .step-dot {
      width: 26px; height: 26px; border-radius: 50%;
      border: 2px solid var(--border-2); background: var(--surface);
      color: var(--t4); font-size: 11px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      .material-icons-round { font-size: 12px; }
    }
    .step-label { font-size: 12px; font-weight: 600; color: var(--t4); }
    .step-item.active .step-dot { background: var(--accent); border-color: var(--accent); color: #fff; box-shadow: 0 0 0 3px var(--accent-g); }
    .step-item.active .step-label { color: var(--accent); }
    .step-item.done .step-dot { background: var(--green); border-color: var(--green); color: #fff; }
    .step-item.done .step-label { color: var(--green); }
    .step-line { flex: 1; height: 2px; background: var(--border); margin: 0 8px; border-radius: 2px; }
    .step-line.done { background: var(--green); }

    /* ── Body ── */
    .imp-body { padding: 0; }
    .step-pane { padding: 20px; display: flex; flex-direction: column; gap: 14px; }

    .section-hint {
      display: flex; align-items: center; gap: 8px; padding: 10px 14px;
      border-radius: 8px; background: var(--surface-2); border: 1px solid var(--border);
      font-size: 12.5px; color: var(--t3);
      .material-icons-round { font-size: 15px; color: var(--accent); flex-shrink: 0; }
    }

    /* ── Step 1 fields ── */
    .field-row { display: flex; gap: 12px; }
    .field { display: flex; flex-direction: column; gap: 5px; flex: 1; }
    label { font-size: 10.5px; font-weight: 700; color: var(--t3); text-transform: uppercase; letter-spacing: .4px; }
    .req { color: var(--red); }
    select {
      width: 100%; padding: 9px 12px; border: 1.5px solid var(--border);
      border-radius: 8px; font-size: 13px; font-family: inherit;
      background: var(--surface); color: var(--t1);
    }
    select:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-g); }
    select:disabled { opacity: .5; cursor: not-allowed; }

    .warn-box {
      display: flex; align-items: center; gap: 8px; padding: 10px 14px;
      border-radius: 8px; background: #fef3c7; border: 1px solid #fde68a; color: #92400e;
      font-size: 12.5px; .material-icons-round { font-size: 16px; }
      a { color: #92400e; font-weight: 700; cursor: pointer; text-decoration: underline; }
    }

    /* ── Action cards ── */
    .action-card {
      display: flex; align-items: center; gap: 14px;
      padding: 16px 18px; border-radius: 12px;
      border: 1.5px solid var(--border); background: var(--surface-2);
    }
    .action-card.has-file { border-color: var(--accent); }
    .ac-icon {
      width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      .material-icons-round { font-size: 22px; font-variation-settings: 'FILL' 1; }
    }
    .ac-icon.green { background: var(--green-s); border: 1px solid var(--green-b); .material-icons-round { color: var(--green); } }
    .ac-icon.blue  { background: var(--accent-s); border: 1px solid var(--accent-g); .material-icons-round { color: var(--accent); } }
    .ac-content { flex: 1; min-width: 0; }
    .ac-title { font-size: 13px; font-weight: 700; color: var(--t1); margin-bottom: 3px; }
    .ac-sub { font-size: 12px; color: var(--t3); line-height: 1.5; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }

    .file-name { display: inline-flex; align-items: center; gap: 4px; color: var(--accent); font-size: 12.5px; .material-icons-round { font-size: 14px; } }
    .file-size { color: var(--t5); font-size: 11px; }
    .btn-clear { background: none; border: none; cursor: pointer; color: var(--t4); display: inline-flex; padding: 0; .material-icons-round { font-size: 14px; } }
    .btn-clear:hover { color: var(--red); }

    .btn-download, .btn-upload {
      display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0;
      padding: 9px 16px; border-radius: 8px; font-size: 12.5px; font-weight: 600;
      cursor: pointer; white-space: nowrap;
      .material-icons-round { font-size: 15px; }
    }
    .btn-download { background: var(--green-s); color: var(--green); border: 1px solid var(--green-b); }
    .btn-download:hover:not(:disabled) { background: var(--green); color: #fff; }
    .btn-download:disabled { opacity: .5; cursor: not-allowed; }
    .btn-upload { background: var(--accent-s); color: var(--accent); border: 1px solid var(--accent-g); }
    .btn-upload:hover { background: var(--accent); color: #fff; }

    .err-box {
      display: flex; align-items: center; gap: 8px; padding: 10px 14px;
      border-radius: 8px; background: var(--red-s); border: 1px solid var(--red-b); color: var(--red);
      font-size: 12.5px; .material-icons-round { font-size: 16px; flex-shrink: 0; }
    }

    /* ── Step nav ── */
    .step-nav {
      display: flex; justify-content: space-between; align-items: center;
      padding-top: 10px; border-top: 1px solid var(--border);
      button { display: inline-flex; align-items: center; gap: 6px; .material-icons-round { font-size: 15px; } }
    }

    /* ── Results ── */
    .result-banner {
      display: flex; align-items: center; justify-content: center; gap: 0;
      padding: 16px 20px; border-radius: 12px;
      background: var(--green-s); border: 1px solid var(--green-b);
    }
    .result-banner.has-errors { background: #fef3c7; border-color: #fde68a; }
    .rb-stat { display: flex; align-items: center; gap: 10px; flex: 1; justify-content: center;
      .material-icons-round { font-size: 26px; color: var(--green); font-variation-settings: 'FILL' 1; }
    }
    .rb-stat.fail .material-icons-round { color: var(--red); }
    .rb-stat.total .material-icons-round { color: var(--accent); }
    .rb-num { font-size: 24px; font-weight: 800; color: var(--t1); }
    .rb-lbl { font-size: 11px; color: var(--t3); font-weight: 600; text-transform: uppercase; letter-spacing: .5px; }
    .rb-divider { width: 1px; height: 40px; background: var(--border); }

    .result-table-wrap { border: 1px solid var(--border); border-radius: 10px; overflow: hidden; max-height: 400px; overflow-y: auto; }
    .result-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .result-table thead tr { background: var(--surface-2); border-bottom: 2px solid var(--border); }
    .result-table th { padding: 9px 14px; text-align: left; font-size: 11px; font-weight: 700; color: var(--t3); text-transform: uppercase; letter-spacing: .4px; }
    .result-table td { padding: 9px 14px; border-bottom: 1px solid var(--border); vertical-align: middle; }
    .result-table tr:last-child td { border-bottom: none; }
    .result-table .row-ok { background: #f0fdf4; }
    .result-table .row-fail { background: #fff5f5; }

    .row-num { font-weight: 700; color: var(--t4); font-size: 12px; }
    .row-name { font-weight: 600; color: var(--t1); }
    .badge {
      display: inline-flex; align-items: center; gap: 3px;
      padding: 3px 9px; border-radius: 99px; font-size: 11px; font-weight: 700;
      .material-icons-round { font-size: 12px; }
    }
    .badge.ok   { background: var(--green-s); color: var(--green); border: 1px solid var(--green-b); }
    .badge.fail { background: var(--red-s);   color: var(--red);   border: 1px solid var(--red-b); }
    .adm-no { font-weight: 700; color: var(--accent); font-size: 12.5px; }
    .err-msg { color: var(--red); font-size: 12px; }

    @keyframes spin { to { transform: rotate(360deg); } }
    .spin { animation: spin 0.8s linear infinite; display: inline-block; }
  `]
})
export class ImportStudentsComponent implements OnInit {
  private academicSvc = inject(AcademicService);
  private http        = inject(HttpClient);
  private authSvc     = inject(AuthService);
  router = inject(Router);

  step   = signal(1);
  years  = signal<AcademicYear[]>([]);
  classes = signal<ClassDto[]>([]);

  selectedYearId:  number | null = null;
  selectedClassId: number | null = null;

  downloading  = signal(false);
  selectedFile = signal<File | null>(null);
  importing    = signal(false);
  importError  = signal('');
  importResult = signal<ImportResponse | null>(null);

  ngOnInit() {
    this.academicSvc.getYears().subscribe(y => this.years.set(y));
  }

  onYearChange() {
    this.selectedClassId = null;
    this.classes.set([]);
    if (this.selectedYearId)
      this.academicSvc.getClasses(this.selectedYearId).subscribe(c => this.classes.set(c));
  }

  selectedYearLabel() {
    return this.years().find(y => y.academicYearId === this.selectedYearId)?.yearLabel ?? '';
  }
  selectedClassLabel() {
    const c = this.classes().find(c => c.classId === this.selectedClassId);
    return c ? `${c.className}${c.section ? ' ' + c.section : ''}` : '';
  }

  downloadTemplate() {
    if (!this.selectedYearId || !this.selectedClassId) return;
    this.downloading.set(true);
    const url = `${environment.apiUrl}/students/import/template?academicYearId=${this.selectedYearId}&classId=${this.selectedClassId}`;
    const token = this.authSvc.getToken();
    this.http.get(url, {
      responseType: 'blob',
      headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
    }).subscribe({
      next: blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        const cls = this.selectedClassLabel().replace(/\s+/g, '_');
        const yr  = this.selectedYearLabel().replace(/\s+/g, '_');
        a.download = `StudentImport_${yr}_${cls}.xlsx`;
        a.click();
        URL.revokeObjectURL(a.href);
        this.downloading.set(false);
      },
      error: () => { this.downloading.set(false); }
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0] ?? null;
    if (file && !file.name.endsWith('.xlsx')) {
      this.importError.set('Only .xlsx files are accepted.');
      return;
    }
    this.importError.set('');
    this.selectedFile.set(file);
    input.value = '';
  }

  clearFile() { this.selectedFile.set(null); this.importError.set(''); }

  runImport() {
    const file = this.selectedFile();
    if (!file || !this.selectedYearId || !this.selectedClassId) return;
    this.importing.set(true);
    this.importError.set('');

    const form = new FormData();
    form.append('file', file);

    const url = `${environment.apiUrl}/students/import?academicYearId=${this.selectedYearId}&classId=${this.selectedClassId}`;
    const token = this.authSvc.getToken();
    this.http.post<ImportResponse>(url, form, {
      headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
    }).subscribe({
      next: res => {
        this.importing.set(false);
        this.importResult.set(res);
        this.step.set(3);
      },
      error: err => {
        this.importing.set(false);
        this.importError.set(err?.error?.error ?? 'Import failed. Check the file and try again.');
      }
    });
  }

  resetImport() {
    this.selectedFile.set(null);
    this.importError.set('');
    this.importResult.set(null);
    this.step.set(2);
  }
}
