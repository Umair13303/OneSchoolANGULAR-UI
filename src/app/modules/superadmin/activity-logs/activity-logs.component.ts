import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';

interface ActivityLogDto {
  id: number;
  userId: number | null;
  userName: string;
  userEmail: string;
  userRole: string;
  action: string;
  entityName: string;
  entityId: string | null;
  oldValues: string | null;
  newValues: string | null;
  ipAddress: string | null;
  timestamp: string;
  instituteId: number | null;
}

interface PagedResult {
  total: number;
  page: number;
  pageSize: number;
  items: ActivityLogDto[];
}

@Component({
  selector: 'app-activity-logs',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePickerComponent],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Activity Logs</h1>
          <p class="page-sub">System-wide audit trail of all user actions</p>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-card">
        <div class="filters-grid">
          <div class="filter-field">
            <label>Search</label>
            <div class="input-icon">
              <span class="material-icons-round">search</span>
              <input type="text" [(ngModel)]="search" placeholder="User, email, entity…" (keydown.enter)="loadLogs(1)" />
            </div>
          </div>
          <div class="filter-field">
            <label>Action</label>
            <select [(ngModel)]="filterAction">
              <option value="">All Actions</option>
              <option value="Login">Login</option>
              <option value="Logout">Logout</option>
              <option value="Created">Created</option>
              <option value="Updated">Updated</option>
              <option value="Deleted">Deleted</option>
            </select>
          </div>
          <div class="filter-field">
            <label>Role</label>
            <select [(ngModel)]="filterRole">
              <option value="">All Roles</option>
              <option value="superadmin">Superadmin</option>
              <option value="admin">Admin</option>
              <option value="principal">Principal</option>
              <option value="teacher">Teacher</option>
              <option value="parent">Parent</option>
              <option value="staff">Staff</option>
            </select>
          </div>
          <div class="filter-field">
            <label>Entity</label>
            <input type="text" [(ngModel)]="filterEntity" placeholder="e.g. Student, User…" />
          </div>
          <div class="filter-field">
            <label>From</label>
            <app-date-picker [(ngModel)]="filterFrom"/>
          </div>
          <div class="filter-field">
            <label>To</label>
            <app-date-picker [(ngModel)]="filterTo"/>
          </div>
        </div>
        <div class="filter-actions">
          <button class="btn-secondary" (click)="resetFilters()">
            <span class="material-icons-round">clear</span> Reset
          </button>
          <button class="btn-primary" (click)="loadLogs(1)">
            <span class="material-icons-round">filter_list</span> Apply
          </button>
        </div>
      </div>

      <!-- Table -->
      <div class="table-card">
        @if (loading()) {
          <div class="state-center">
            <div class="spinner"></div>
            <p>Loading logs…</p>
          </div>
        } @else if (logs().length === 0) {
          <div class="state-center">
            <span class="material-icons-round empty-icon">manage_history</span>
            <p>No activity logs found</p>
          </div>
        } @else {
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Role</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>IP Address</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                @for (log of logs(); track log.id) {
                  <tr>
                    <td class="ts-cell">{{ log.timestamp | date:'dd MMM yyyy, HH:mm:ss' }}</td>
                    <td>
                      <div class="user-cell">
                        <span class="user-av">{{ initials(log.userName) }}</span>
                        <div>
                          <div class="user-name">{{ log.userName }}</div>
                          <div class="user-email">{{ log.userEmail }}</div>
                        </div>
                      </div>
                    </td>
                    <td><span class="role-badge role-{{ log.userRole }}">{{ log.userRole }}</span></td>
                    <td><span class="action-badge action-{{ log.action.toLowerCase() }}">{{ log.action }}</span></td>
                    <td>
                      <span class="entity-name">{{ log.entityName }}</span>
                      @if (log.entityId) { <span class="entity-id">#{{ log.entityId }}</span> }
                    </td>
                    <td class="ip-cell">{{ log.ipAddress || '—' }}</td>
                    <td>
                      @if (log.newValues || log.oldValues) {
                        <button class="detail-btn" (click)="openDetail(log)">
                          <span class="material-icons-round">info</span>
                        </button>
                      } @else {
                        <span class="no-detail">—</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div class="pagination">
            <span class="page-info">
              Showing {{ (currentPage() - 1) * pageSize + 1 }}–{{ min(currentPage() * pageSize, total()) }} of {{ total() }} entries
            </span>
            <div class="page-btns">
              <button [disabled]="currentPage() === 1" (click)="loadLogs(currentPage() - 1)">
                <span class="material-icons-round">chevron_left</span>
              </button>
              @for (p of pageNumbers(); track p) {
                <button [class.active]="p === currentPage()" (click)="loadLogs(p)">{{ p }}</button>
              }
              <button [disabled]="currentPage() === totalPages()" (click)="loadLogs(currentPage() + 1)">
                <span class="material-icons-round">chevron_right</span>
              </button>
            </div>
          </div>
        }
      </div>
    </div>

    <!-- Detail Modal -->
    @if (detailLog()) {
      <div class="modal-backdrop" (click)="detailLog.set(null)">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Change Details</h3>
            <button class="modal-close" (click)="detailLog.set(null)">
              <span class="material-icons-round">close</span>
            </button>
          </div>
          <div class="modal-body">
            <div class="detail-meta">
              <span class="action-badge action-{{ detailLog()!.action.toLowerCase() }}">{{ detailLog()!.action }}</span>
              <span class="entity-name">{{ detailLog()!.entityName }}</span>
              @if (detailLog()!.entityId) { <span class="entity-id">#{{ detailLog()!.entityId }}</span> }
            </div>
            @if (detailLog()!.oldValues) {
              <div class="json-section">
                <div class="json-label old-label">Before</div>
                <pre class="json-block">{{ formatJson(detailLog()!.oldValues) }}</pre>
              </div>
            }
            @if (detailLog()!.newValues) {
              <div class="json-section">
                <div class="json-label new-label">After</div>
                <pre class="json-block">{{ formatJson(detailLog()!.newValues) }}</pre>
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .page { max-width: 1400px; }
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; }
    .page-title { font-size: 22px; font-weight: 800; color: var(--t1); margin: 0 0 4px; }
    .page-sub { font-size: 13px; color: var(--t4); margin: 0; }

    /* Filters */
    .filters-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--r-xl); padding: 20px; margin-bottom: 20px;
    }
    .filters-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 14px;
      margin-bottom: 16px;
    }
    .filter-field label { display: block; font-size: 11px; font-weight: 700; color: var(--t4); text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 6px; }
    .filter-field input, .filter-field select {
      width: 100%; padding: 8px 10px; border: 1px solid var(--border);
      background: var(--bg); color: var(--t1); border-radius: 8px;
      font-size: 13px; font-family: inherit; box-sizing: border-box;
    }
    .filter-field input:focus, .filter-field select:focus { outline: none; border-color: var(--accent); }
    .input-icon { position: relative; }
    .input-icon .material-icons-round { position: absolute; left: 8px; top: 50%; transform: translateY(-50%); font-size: 16px; color: var(--t4); pointer-events: none; }
    .input-icon input { padding-left: 30px; }
    .filter-actions { display: flex; gap: 10px; justify-content: flex-end; }

    /* Buttons */
    .btn-primary, .btn-secondary {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600;
      cursor: pointer; border: none; font-family: inherit; transition: all 0.15s;
    }
    .btn-primary { background: var(--accent); color: #fff; }
    .btn-primary:hover { background: var(--accent-h); }
    .btn-secondary { background: var(--surface-2); color: var(--t2); border: 1px solid var(--border); }
    .btn-secondary:hover { background: var(--surface); color: var(--t1); }
    .btn-primary .material-icons-round, .btn-secondary .material-icons-round { font-size: 16px; }

    /* Table card */
    .table-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--r-xl); overflow: hidden;
    }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; white-space: nowrap; }
    thead tr { background: var(--surface-2); border-bottom: 1px solid var(--border); }
    th { padding: 11px 16px; font-size: 11px; font-weight: 700; color: var(--t4); text-transform: uppercase; letter-spacing: 0.6px; text-align: left; }
    td { padding: 13px 16px; font-size: 13px; color: var(--t2); border-bottom: 1px solid var(--border); }
    tbody tr:last-child td { border-bottom: none; }
    tbody tr:hover { background: var(--surface-2); }

    .ts-cell { color: var(--t4); font-size: 12px; white-space: nowrap; }
    .ip-cell { font-family: monospace; font-size: 12px; color: var(--t4); }

    /* User cell */
    .user-cell { display: flex; align-items: center; gap: 10px; }
    .user-av {
      width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
      background: linear-gradient(135deg, var(--accent), var(--accent-h));
      color: #fff; display: flex; align-items: center; justify-content: center;
      font-size: 10px; font-weight: 800;
    }
    .user-name { font-size: 13px; font-weight: 600; color: var(--t1); }
    .user-email { font-size: 11px; color: var(--t4); }

    /* Badges */
    .role-badge, .action-badge {
      display: inline-block; padding: 2px 9px; border-radius: 99px;
      font-size: 11px; font-weight: 700; text-transform: capitalize;
    }
    .role-superadmin { background: #7c3aed22; color: #7c3aed; }
    .role-admin      { background: #2563eb22; color: #2563eb; }
    .role-principal  { background: #059669aa; color: #059669; }
    .role-teacher    { background: #d9770622; color: #d97706; }
    .role-parent     { background: #0891b222; color: #0891b2; }
    .role-staff      { background: #6b728022; color: #6b7280; }

    .action-login   { background: #05966922; color: #059669; }
    .action-logout  { background: #6b728022; color: #6b7280; }
    .action-created { background: #2563eb22; color: #2563eb; }
    .action-updated { background: #d9770622; color: #d97706; }
    .action-deleted { background: #dc262622; color: #dc2626; }

    .entity-name { font-size: 13px; font-weight: 600; color: var(--t1); }
    .entity-id { font-size: 11px; color: var(--t4); margin-left: 4px; }

    .detail-btn {
      width: 28px; height: 28px; border: 1px solid var(--border);
      background: var(--surface-2); border-radius: 6px; cursor: pointer;
      display: flex; align-items: center; justify-content: center; color: var(--t3);
      transition: all 0.15s;
    }
    .detail-btn:hover { background: var(--accent-s); color: var(--accent); border-color: var(--accent-s); }
    .detail-btn .material-icons-round { font-size: 15px; }
    .no-detail { color: var(--t5); }

    /* States */
    .state-center { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; color: var(--t4); gap: 12px; }
    .empty-icon { font-size: 48px; color: var(--t5); }
    .spinner { width: 32px; height: 32px; border: 3px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Pagination */
    .pagination {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 20px; border-top: 1px solid var(--border);
    }
    .page-info { font-size: 12px; color: var(--t4); }
    .page-btns { display: flex; gap: 4px; align-items: center; }
    .page-btns button {
      min-width: 32px; height: 32px; padding: 0 8px;
      border: 1px solid var(--border); background: var(--surface);
      color: var(--t3); border-radius: 7px; cursor: pointer;
      font-size: 13px; font-weight: 600; font-family: inherit;
      display: flex; align-items: center; justify-content: center; transition: all 0.15s;
    }
    .page-btns button:hover:not([disabled]):not(.active) { background: var(--surface-2); color: var(--t1); }
    .page-btns button.active { background: var(--accent); color: #fff; border-color: var(--accent); }
    .page-btns button[disabled] { opacity: 0.4; cursor: not-allowed; }
    .page-btns .material-icons-round { font-size: 16px; }

    /* Modal */
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.5);
      backdrop-filter: blur(3px); z-index: 500;
      display: flex; align-items: center; justify-content: center; padding: 20px;
    }
    .modal {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--r-xl); width: 100%; max-width: 600px;
      max-height: 80vh; display: flex; flex-direction: column;
      box-shadow: var(--sh-xl);
    }
    .modal-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 18px 20px; border-bottom: 1px solid var(--border);
    }
    .modal-header h3 { font-size: 16px; font-weight: 700; color: var(--t1); margin: 0; }
    .modal-close {
      width: 32px; height: 32px; border: none; background: none; cursor: pointer;
      color: var(--t4); border-radius: 8px; display: flex; align-items: center; justify-content: center;
      transition: all 0.15s;
    }
    .modal-close:hover { background: var(--surface-2); color: var(--t1); }
    .modal-body { padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
    .detail-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .json-section { display: flex; flex-direction: column; gap: 6px; }
    .json-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; padding: 3px 8px; border-radius: 5px; width: fit-content; }
    .old-label { background: #dc262622; color: #dc2626; }
    .new-label { background: #05966922; color: #059669; }
    .json-block {
      background: var(--surface-2); border: 1px solid var(--border);
      border-radius: 8px; padding: 12px; font-size: 12px; font-family: monospace;
      color: var(--t2); overflow-x: auto; margin: 0; white-space: pre-wrap; word-break: break-all;
    }
  `]
})
export class ActivityLogsComponent implements OnInit {
  private apiUrl = environment.apiUrl;

  logs = signal<ActivityLogDto[]>([]);
  loading = signal(false);
  total = signal(0);
  currentPage = signal(1);
  pageSize = 50;

  detailLog = signal<ActivityLogDto | null>(null);

  search = '';
  filterAction = '';
  filterRole = '';
  filterEntity = '';
  filterFrom = '';
  filterTo = '';

  constructor(private http: HttpClient) {}

  ngOnInit() { this.loadLogs(1); }

  loadLogs(page: number) {
    this.loading.set(true);
    this.currentPage.set(page);

    let params = new HttpParams()
      .set('page', page)
      .set('pageSize', this.pageSize);

    if (this.search.trim()) params = params.set('search', this.search.trim());
    if (this.filterAction) params = params.set('action', this.filterAction);
    if (this.filterRole) params = params.set('userRole', this.filterRole);
    if (this.filterEntity.trim()) params = params.set('entityName', this.filterEntity.trim());
    if (this.filterFrom) params = params.set('from', this.filterFrom);
    if (this.filterTo) params = params.set('to', this.filterTo);

    this.http.get<PagedResult>(`${this.apiUrl}/activity-logs`, { params }).subscribe({
      next: res => {
        this.logs.set(res.items);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  resetFilters() {
    this.search = '';
    this.filterAction = '';
    this.filterRole = '';
    this.filterEntity = '';
    this.filterFrom = '';
    this.filterTo = '';
    this.loadLogs(1);
  }

  totalPages(): number { return Math.ceil(this.total() / this.pageSize); }

  pageNumbers(): number[] {
    const tp = this.totalPages();
    const cp = this.currentPage();
    const delta = 2;
    const range: number[] = [];
    for (let i = Math.max(1, cp - delta); i <= Math.min(tp, cp + delta); i++) range.push(i);
    return range;
  }

  min(a: number, b: number): number { return Math.min(a, b); }

  initials(name: string): string {
    return name.split(' ').filter(w => w.length > 0).map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  formatJson(json: string | null): string {
    if (!json) return '';
    try { return JSON.stringify(JSON.parse(json), null, 2); }
    catch { return json; }
  }

  openDetail(log: ActivityLogDto) { this.detailLog.set(log); }
}
