import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { MenuService } from '../../../core/services/menu.service';
import { MenuItemAdmin, MENU_ROLES } from '../../../core/models/menu.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';

@Component({
  selector: 'app-menu-management',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, LoadingComponent],
  template: `
    <app-page-header
      title="Menu Management"
      subtitle="Configure sidebar items and which roles can see them">
      <button class="btn-primary" type="button" (click)="startCreate()">
        <span class="material-icons-round">add</span> Add Menu Item
      </button>
    </app-page-header>

    @if (loading()) {
      <app-loading />
    } @else {
      <div class="mm-toolbar">
        <div class="search-wrap">
          <span class="material-icons-round">search</span>
          <input type="search" [(ngModel)]="search" placeholder="Search title or route…" />
        </div>
        <span class="mm-count">{{ filtered().length }} items</span>
      </div>

      @if (error()) {
        <div class="mm-alert">
          <span class="material-icons-round">error_outline</span> {{ error() }}
        </div>
      }

      <div class="mm-table-wrap">
        <table class="mm-table">
          <thead>
            <tr>
              <th style="width:48px"></th>
              <th>Title</th>
              <th>Route</th>
              <th style="width:80px">Order</th>
              <th style="width:90px">Status</th>
              <th>Roles</th>
              <th style="width:110px"></th>
            </tr>
          </thead>
          <tbody>
            @for (item of filtered(); track item.menuItemId) {
              <tr [class.inactive]="!item.isActive">
                <td>
                  <span class="mm-icon-chip">
                    <span class="material-icons-round">{{ item.icon || 'circle' }}</span>
                  </span>
                </td>
                <td>
                  <div class="mm-title">{{ item.title }}</div>
                  @if (item.parentId) {
                    <div class="mm-parent">Child of {{ parentTitle(item.parentId) }}</div>
                  } @else {
                    <div class="mm-parent">Top level</div>
                  }
                </td>
                <td>
                  <code class="mm-route">{{ item.routeUrl || '—' }}</code>
                </td>
                <td>{{ item.sortOrder }}</td>
                <td>
                  <span class="mm-badge" [class.on]="item.isActive">
                    {{ item.isActive ? 'Active' : 'Hidden' }}
                  </span>
                </td>
                <td>
                  <div class="mm-roles">
                    @for (r of roleLabels(item.roleIds); track r) {
                      <span class="mm-role">{{ r }}</span>
                    } @empty {
                      <span class="mm-muted">None</span>
                    }
                  </div>
                </td>
                <td class="mm-actions">
                  <button class="icon-btn" type="button" title="Edit" (click)="startEdit(item)">
                    <span class="material-icons-round">edit</span>
                  </button>
                  <button class="icon-btn danger" type="button" title="Delete" (click)="confirmDelete(item)">
                    <span class="material-icons-round">delete</span>
                  </button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="7" class="mm-empty">No menu items match your search.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    @if (drawerOpen()) {
      <div class="mm-backdrop" (click)="closeDrawer()"></div>
      <aside class="mm-drawer" (click)="$event.stopPropagation()">
        <div class="mm-drawer-hd">
          <div>
            <h3>{{ editingId() ? 'Edit Menu Item' : 'New Menu Item' }}</h3>
            <p>Visible in the sidebar for selected roles</p>
          </div>
          <button class="icon-btn" type="button" (click)="closeDrawer()">
            <span class="material-icons-round">close</span>
          </button>
        </div>

        <div class="mm-drawer-body">
          <label class="mm-field">
            <span>Title <em>*</em></span>
            <input [(ngModel)]="form.title" placeholder="e.g. Reports" />
          </label>

          <div class="mm-row">
            <label class="mm-field">
              <span>Icon</span>
              <input [(ngModel)]="form.icon" placeholder="material icon name" />
            </label>
            <label class="mm-field">
              <span>Sort order</span>
              <input type="number" [(ngModel)]="form.sortOrder" />
            </label>
          </div>

          <label class="mm-field">
            <span>Route URL</span>
            <input [(ngModel)]="form.routeUrl" placeholder="/path or leave empty for group" />
          </label>

          <label class="mm-field">
            <span>Parent</span>
            <select [(ngModel)]="form.parentId">
              <option [ngValue]="null">— Top level —</option>
              @for (p of parentOptions(); track p.menuItemId) {
                <option [ngValue]="p.menuItemId">{{ p.title }}</option>
              }
            </select>
          </label>

          <label class="mm-check">
            <input type="checkbox" [(ngModel)]="form.isActive" />
            Active (show in sidebar when role allows)
          </label>

          <div class="mm-roles-block">
            <span class="mm-roles-label">Visible to roles</span>
            <div class="mm-role-grid">
              @for (r of roles; track r.id) {
                <label class="mm-role-check">
                  <input type="checkbox"
                         [checked]="form.roleIds.includes(r.id)"
                         (change)="toggleRole(r.id, $event)" />
                  {{ r.name }}
                </label>
              }
            </div>
          </div>

          @if (formError()) {
            <div class="mm-alert">{{ formError() }}</div>
          }
        </div>

        <div class="mm-drawer-ft">
          <button class="btn-secondary" type="button" (click)="closeDrawer()" [disabled]="saving()">Cancel</button>
          <button class="btn-primary" type="button" (click)="save()" [disabled]="saving() || !form.title.trim()">
            @if (saving()) { Saving… } @else { {{ editingId() ? 'Save Changes' : 'Create' }} }
          </button>
        </div>
      </aside>
    }
  `,
  styles: [`
    .mm-toolbar {
      display: flex; align-items: center; justify-content: space-between;
      gap: 12px; margin: 16px 0 12px;
    }
    .search-wrap {
      display: flex; align-items: center; gap: 8px;
      flex: 1; max-width: 360px;
      height: 40px; padding: 0 12px;
      border: 1.5px solid var(--border); border-radius: 10px;
      background: var(--surface);
    }
    .search-wrap .material-icons-round { font-size: 18px; color: var(--t4); }
    .search-wrap input {
      flex: 1; border: none; background: transparent; outline: none;
      font-size: 13.5px; color: var(--t1); font-family: inherit;
    }
    .mm-count { font-size: 12.5px; font-weight: 600; color: var(--t4); }

    .mm-alert {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 14px; margin-bottom: 12px;
      border-radius: 10px; background: var(--red-s); color: var(--red);
      border: 1px solid var(--red-b); font-size: 13px; font-weight: 600;
    }

    .mm-table-wrap {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 14px; overflow: hidden; box-shadow: var(--sh);
    }
    .mm-table { width: 100%; border-collapse: collapse; }
    .mm-table th {
      text-align: left; padding: 11px 14px;
      font-size: 11px; font-weight: 700; text-transform: uppercase;
      letter-spacing: .45px; color: var(--t4);
      background: var(--surface-2); border-bottom: 1px solid var(--border);
    }
    .mm-table td {
      padding: 12px 14px; border-bottom: 1px solid var(--border);
      vertical-align: middle; font-size: 13px; color: var(--t2);
    }
    .mm-table tr:last-child td { border-bottom: none; }
    .mm-table tr:hover td { background: var(--surface-2); }
    .mm-table tr.inactive td { opacity: .62; }

    .mm-icon-chip {
      width: 34px; height: 34px; border-radius: 9px;
      display: inline-flex; align-items: center; justify-content: center;
      background: var(--accent-s); color: var(--accent);
    }
    .mm-icon-chip .material-icons-round { font-size: 18px; }
    .mm-title { font-weight: 700; color: var(--t1); }
    .mm-parent { font-size: 11.5px; color: var(--t4); margin-top: 2px; }
    .mm-route {
      font-size: 12px; background: var(--surface-2); color: var(--t3);
      padding: 3px 8px; border-radius: 6px;
    }
    .mm-badge {
      display: inline-block; padding: 3px 9px; border-radius: 99px;
      font-size: 11px; font-weight: 700;
      background: var(--surface-3); color: var(--t4);
    }
    .mm-badge.on { background: #dcfce7; color: #166534; }
    .mm-roles { display: flex; flex-wrap: wrap; gap: 4px; }
    .mm-role {
      font-size: 10.5px; font-weight: 700; padding: 2px 7px; border-radius: 99px;
      background: var(--accent-s); color: var(--accent);
    }
    .mm-muted { color: var(--t5); font-size: 12px; }
    .mm-actions { display: flex; gap: 4px; justify-content: flex-end; }
    .mm-empty { text-align: center; padding: 36px !important; color: var(--t4); }

    .icon-btn {
      width: 32px; height: 32px; border-radius: 8px;
      border: 1px solid var(--border); background: var(--surface);
      color: var(--t3); cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center;
    }
    .icon-btn .material-icons-round { font-size: 16px; }
    .icon-btn:hover { background: var(--surface-2); color: var(--t1); }
    .icon-btn.danger:hover { background: var(--red-s); color: var(--red); border-color: var(--red-b); }

    .mm-backdrop {
      position: fixed; inset: 0; background: rgba(15,23,42,.45); z-index: 80;
    }
    .mm-drawer {
      position: fixed; top: 0; right: 0; bottom: 0; width: min(420px, 100vw);
      background: var(--surface); border-left: 1px solid var(--border);
      z-index: 90; display: flex; flex-direction: column;
      box-shadow: -12px 0 40px rgba(0,0,0,.18);
      animation: slideIn .2s ease;
    }
    @keyframes slideIn {
      from { transform: translateX(16px); opacity: .6; }
      to { transform: translateX(0); opacity: 1; }
    }
    .mm-drawer-hd {
      display: flex; align-items: flex-start; justify-content: space-between;
      gap: 12px; padding: 18px 20px; border-bottom: 1px solid var(--border);
    }
    .mm-drawer-hd h3 { margin: 0; font-size: 16px; font-weight: 800; color: var(--t1); }
    .mm-drawer-hd p { margin: 4px 0 0; font-size: 12.5px; color: var(--t4); }
    .mm-drawer-body {
      flex: 1; overflow: auto; padding: 18px 20px;
      display: flex; flex-direction: column; gap: 14px;
    }
    .mm-drawer-ft {
      display: flex; justify-content: flex-end; gap: 8px;
      padding: 14px 20px; border-top: 1px solid var(--border);
    }
    .mm-field { display: flex; flex-direction: column; gap: 6px; flex: 1; }
    .mm-field span { font-size: 11px; font-weight: 700; color: var(--t3); text-transform: uppercase; letter-spacing: .35px; }
    .mm-field em { color: var(--red); font-style: normal; }
    .mm-field input, .mm-field select {
      height: 40px; padding: 0 12px; border: 1.5px solid var(--border);
      border-radius: 9px; background: var(--surface); color: var(--t1);
      font-size: 13.5px; font-family: inherit;
    }
    .mm-field input:focus, .mm-field select:focus {
      outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-g);
    }
    .mm-row { display: grid; grid-template-columns: 1fr 110px; gap: 12px; }
    .mm-check {
      display: flex; align-items: center; gap: 8px;
      font-size: 13px; font-weight: 600; color: var(--t2); cursor: pointer;
    }
    .mm-roles-block { display: flex; flex-direction: column; gap: 10px; }
    .mm-roles-label { font-size: 11px; font-weight: 700; color: var(--t3); text-transform: uppercase; letter-spacing: .35px; }
    .mm-role-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .mm-role-check {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 10px; border: 1px solid var(--border); border-radius: 9px;
      font-size: 12.5px; font-weight: 600; color: var(--t2); cursor: pointer;
    }
    .mm-role-check:has(input:checked) {
      border-color: rgba(var(--accent-rgb), .45); background: var(--accent-s); color: var(--accent);
    }

    @media (max-width: 900px) {
      .mm-table th:nth-child(3), .mm-table td:nth-child(3),
      .mm-table th:nth-child(6), .mm-table td:nth-child(6) { display: none; }
    }
  `]
})
export class MenuManagementComponent implements OnInit {
  private menuSvc = inject(MenuService);

  readonly roles = MENU_ROLES;
  loading = signal(true);
  saving = signal(false);
  error = signal('');
  formError = signal('');
  items = signal<MenuItemAdmin[]>([]);
  search = '';
  drawerOpen = signal(false);
  editingId = signal<number | null>(null);

  form = this.emptyForm();

  filtered = computed(() => {
    const q = this.search.trim().toLowerCase();
    const list = this.items();
    if (!q) return list;
    return list.filter(i =>
      i.title.toLowerCase().includes(q) ||
      (i.routeUrl ?? '').toLowerCase().includes(q) ||
      (i.icon ?? '').toLowerCase().includes(q)
    );
  });

  parentOptions = computed(() =>
    this.items().filter(i => !i.parentId && i.menuItemId !== this.editingId())
  );

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.menuSvc.getAllForAdmin().subscribe({
      next: rows => {
        this.items.set(rows ?? []);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(err?.error?.error || 'Could not load menu items.');
      }
    });
  }

  parentTitle(parentId: number): string {
    return this.items().find(i => i.menuItemId === parentId)?.title ?? `#${parentId}`;
  }

  roleLabels(ids: number[]): string[] {
    return this.roles.filter(r => ids.includes(r.id)).map(r => r.name);
  }

  startCreate() {
    this.editingId.set(null);
    this.form = this.emptyForm();
    this.formError.set('');
    this.drawerOpen.set(true);
  }

  startEdit(item: MenuItemAdmin) {
    this.editingId.set(item.menuItemId);
    this.form = {
      title: item.title,
      icon: item.icon ?? '',
      routeUrl: item.routeUrl ?? '',
      sortOrder: item.sortOrder,
      parentId: item.parentId,
      isActive: item.isActive,
      roleIds: [...(item.roleIds ?? [])],
    };
    this.formError.set('');
    this.drawerOpen.set(true);
  }

  closeDrawer() {
    this.drawerOpen.set(false);
    this.formError.set('');
  }

  toggleRole(id: number, ev: Event) {
    const checked = (ev.target as HTMLInputElement).checked;
    if (checked) {
      if (!this.form.roleIds.includes(id)) this.form.roleIds = [...this.form.roleIds, id];
    } else {
      this.form.roleIds = this.form.roleIds.filter(r => r !== id);
    }
  }

  save() {
    const title = this.form.title.trim();
    if (!title) {
      this.formError.set('Title is required.');
      return;
    }
    this.saving.set(true);
    this.formError.set('');

    const parentId = this.form.parentId || null;
    const icon = this.form.icon.trim() || null;
    const routeUrl = this.form.routeUrl.trim() || null;
    const id = this.editingId();

    if (id == null) {
      this.menuSvc.createItem({
        title,
        icon,
        routeUrl,
        parentId,
        sortOrder: Number(this.form.sortOrder) || 0,
        isActive: this.form.isActive,
        roleIds: this.form.roleIds,
      }).subscribe({
        next: () => this.afterSave(),
        error: err => this.onSaveError(err),
      });
      return;
    }

    forkJoin({
      update: this.menuSvc.updateItem(id, {
        title,
        icon,
        routeUrl,
        parentId,
        sortOrder: Number(this.form.sortOrder) || 0,
        isActive: this.form.isActive,
      }),
      roles: this.menuSvc.assignRoles(id, this.form.roleIds),
    }).subscribe({
      next: () => this.afterSave(),
      error: err => this.onSaveError(err),
    });
  }

  confirmDelete(item: MenuItemAdmin) {
    if (!confirm(`Delete “${item.title}”? Items with children cannot be deleted.`)) return;
    this.menuSvc.deleteItem(item.menuItemId).subscribe({
      next: () => {
        this.menuSvc.clear();
        this.load();
      },
      error: err => {
        this.error.set(err?.error?.error || 'Delete failed.');
      }
    });
  }

  private afterSave() {
    this.saving.set(false);
    this.drawerOpen.set(false);
    this.menuSvc.clear();
    this.load();
  }

  private onSaveError(err: any) {
    this.saving.set(false);
    this.formError.set(err?.error?.error || 'Save failed.');
  }

  private emptyForm() {
    return {
      title: '',
      icon: 'circle',
      routeUrl: '',
      sortOrder: 100,
      parentId: null as number | null,
      isActive: true,
      roleIds: [] as number[],
    };
  }
}
