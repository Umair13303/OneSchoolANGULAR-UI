import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { Tag } from 'primeng/tag';
import { Dialog } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
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
  imports: [CommonModule, FormsModule, DatePickerComponent, Button, Select, InputText, Tag, Dialog, TableModule, PaginatorModule, IconField, InputIcon],
  template: `
    <div class="page">
      <div class="page-header mb-6">
        <h1 class="page-title">Activity Logs</h1>
        <p class="page-sub">System-wide audit trail of all user actions</p>
      </div>

      <!-- Filters -->
      <div class="filters-card">
        <div class="filters-grid">
          <div class="filter-field">
            <label>Search</label>
            <p-iconfield>
              <p-inputicon class="pi pi-search" />
              <input pInputText type="text" class="w-full" [(ngModel)]="search" placeholder="User, email, entity…" (keydown.enter)="loadLogs(1)" />
            </p-iconfield>
          </div>
          <div class="filter-field">
            <label>Action</label>
            <p-select class="w-full" [options]="actionOptions" optionLabel="label" optionValue="value"
                      [(ngModel)]="filterAction" appendTo="body" [overlayOptions]="{ baseZIndex: 10050 }" />
          </div>
          <div class="filter-field">
            <label>Role</label>
            <p-select class="w-full" [options]="roleOptions" optionLabel="label" optionValue="value"
                      [(ngModel)]="filterRole" appendTo="body" [overlayOptions]="{ baseZIndex: 10050 }" />
          </div>
          <div class="filter-field">
            <label>Entity</label>
            <input pInputText type="text" class="w-full" [(ngModel)]="filterEntity" placeholder="e.g. Student, User…" />
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
        <div class="flex flex-wrap justify-end gap-2.5">
          <p-button label="Reset" icon="pi pi-times" severity="secondary" [outlined]="true" (onClick)="resetFilters()" />
          <p-button label="Apply" icon="pi pi-filter" (onClick)="loadLogs(1)" />
        </div>
      </div>

      <!-- Table -->
      <div class="table-card">
        <p-table [value]="logs()" dataKey="id" [loading]="loading()" styleClass="p-datatable-sm"
                 [tableStyle]="{ 'min-width': '60rem' }" [scrollable]="true">
          <ng-template #header>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Role</th>
              <th>Action</th>
              <th>Entity</th>
              <th>IP Address</th>
              <th style="width:80px">Details</th>
            </tr>
          </ng-template>
          <ng-template #body let-log>
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
              <td><p-tag [value]="log.userRole" [severity]="roleSeverity(log.userRole)" [rounded]="true" styleClass="capitalize" /></td>
              <td><p-tag [value]="log.action" [severity]="actionSeverity(log.action)" [rounded]="true" /></td>
              <td>
                <span class="entity-name">{{ log.entityName }}</span>
                @if (log.entityId) { <span class="entity-id">#{{ log.entityId }}</span> }
              </td>
              <td class="ip-cell">{{ log.ipAddress || '—' }}</td>
              <td>
                @if (log.newValues || log.oldValues) {
                  <p-button icon="pi pi-info-circle" [text]="true" [rounded]="true" size="small" severity="secondary"
                            ariaLabel="View details" (onClick)="openDetail(log)" />
                } @else {
                  <span class="no-detail">—</span>
                }
              </td>
            </tr>
          </ng-template>
          <ng-template #emptymessage>
            <tr><td colspan="7" class="state-center">
              <i class="pi pi-history empty-icon"></i>
              <p>No activity logs found</p>
            </td></tr>
          </ng-template>
        </p-table>

        @if (total() > 0) {
          <div class="pagination">
            <span class="page-info">
              Showing {{ (currentPage() - 1) * pageSize + 1 }}–{{ min(currentPage() * pageSize, total()) }} of {{ total() }} entries
            </span>
            <p-paginator [first]="(currentPage() - 1) * pageSize" [rows]="pageSize" [totalRecords]="total()"
                         [showCurrentPageReport]="false" (onPageChange)="onPageChange($event)" />
          </div>
        }
      </div>
    </div>

    <!-- Detail Dialog -->
    <p-dialog header="Change Details" [visible]="!!detailLog()" (visibleChange)="$event ? null : detailLog.set(null)"
              [modal]="true" [dismissableMask]="true" [draggable]="false" [style]="{ width: 'min(600px, 95vw)' }" [baseZIndex]="10000">
      @if (detailLog(); as d) {
        <div class="modal-body">
          <div class="detail-meta">
            <p-tag [value]="d.action" [severity]="actionSeverity(d.action)" [rounded]="true" />
            <span class="entity-name">{{ d.entityName }}</span>
            @if (d.entityId) { <span class="entity-id">#{{ d.entityId }}</span> }
          </div>
          @if (d.oldValues) {
            <div class="json-section">
              <div class="json-label old-label">Before</div>
              <pre class="json-block">{{ formatJson(d.oldValues) }}</pre>
            </div>
          }
          @if (d.newValues) {
            <div class="json-section">
              <div class="json-label new-label">After</div>
              <pre class="json-block">{{ formatJson(d.newValues) }}</pre>
            </div>
          }
        </div>
      }
    </p-dialog>
  `,
  styles: [`
    .page { max-width: 1400px; }
    .page-title { font-size: 22px; font-weight: 800; color: var(--t1); margin: 0 0 4px; }
    .page-sub { font-size: 13px; color: var(--t4); margin: 0; }

    .filters-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--r-xl); padding: 20px; margin-bottom: 20px;
    }
    .filters-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 14px;
      margin-bottom: 16px;
    }
    .filter-field label { display: block; font-size: 11px; font-weight: 700; color: var(--t4); text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 6px; }

    .table-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--r-xl); overflow: hidden;
    }
    .ts-cell { color: var(--t4); font-size: 12px; white-space: nowrap; }
    .ip-cell { font-family: monospace; font-size: 12px; color: var(--t4); }

    .user-cell { display: flex; align-items: center; gap: 10px; }
    .user-av {
      width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
      background: linear-gradient(135deg, var(--accent), var(--accent-h));
      color: #fff; display: flex; align-items: center; justify-content: center;
      font-size: 10px; font-weight: 800;
    }
    .user-name { font-size: 13px; font-weight: 600; color: var(--t1); }
    .user-email { font-size: 11px; color: var(--t4); }

    .entity-name { font-size: 13px; font-weight: 600; color: var(--t1); }
    .entity-id { font-size: 11px; color: var(--t4); margin-left: 4px; }
    .no-detail { color: var(--t5); }

    .state-center { text-align: center; padding: 48px 20px; color: var(--t4); }
    .empty-icon { font-size: 40px; color: var(--t5); }

    .pagination {
      display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;
      padding: 8px 20px; border-top: 1px solid var(--border);
    }
    .page-info { font-size: 12px; color: var(--t4); }

    .modal-body { display: flex; flex-direction: column; gap: 16px; }
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

  actionOptions = [
    { label: 'All Actions', value: '' }, { label: 'Login', value: 'Login' }, { label: 'Logout', value: 'Logout' },
    { label: 'Created', value: 'Created' }, { label: 'Updated', value: 'Updated' }, { label: 'Deleted', value: 'Deleted' }
  ];
  roleOptions = [
    { label: 'All Roles', value: '' }, { label: 'Superadmin', value: 'superadmin' }, { label: 'Admin', value: 'admin' },
    { label: 'Principal', value: 'principal' }, { label: 'Teacher', value: 'teacher' },
    { label: 'Parent', value: 'parent' }, { label: 'Staff', value: 'staff' }
  ];

  constructor(private http: HttpClient) {}

  onPageChange(e: PaginatorState) {
    const rows = e.rows ?? this.pageSize;
    this.loadLogs(Math.floor((e.first ?? 0) / rows) + 1);
  }

  roleSeverity(role: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch ((role || '').toLowerCase()) {
      case 'superadmin': return 'contrast';
      case 'admin': return 'info';
      case 'principal': return 'success';
      case 'teacher': return 'warn';
      case 'parent': return 'info';
      default: return 'secondary';
    }
  }

  actionSeverity(action: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch ((action || '').toLowerCase()) {
      case 'login': return 'success';
      case 'created': return 'info';
      case 'updated': return 'warn';
      case 'deleted': return 'danger';
      default: return 'secondary';
    }
  }

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
