import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import { Checkbox } from 'primeng/checkbox';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { Tag } from 'primeng/tag';
import { Drawer } from 'primeng/drawer';
import { TableModule } from 'primeng/table';
import { Tooltip } from 'primeng/tooltip';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { MenuService } from '../../../core/services/menu.service';
import { MenuItemAdmin, MENU_ROLES } from '../../../core/models/menu.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';

@Component({
  selector: 'app-menu-management',
  standalone: true,
  imports: [
    CommonModule, FormsModule, PageHeaderComponent, LoadingComponent,
    Button, Select, InputText, InputNumber, Checkbox, ToggleSwitch, Tag, Drawer, TableModule, Tooltip, IconField, InputIcon
  ],
  template: `
    <app-page-header
      title="Menu Management"
      subtitle="Configure sidebar items and which roles can see them">
      <p-button label="Add Menu Item" icon="pi pi-plus" (onClick)="startCreate()" />
    </app-page-header>

    @if (loading()) {
      <app-loading />
    } @else {
      <div class="mt-4 mb-3 flex flex-wrap items-center justify-between gap-3">
        <p-iconfield class="min-w-[220px] max-w-sm flex-1">
          <p-inputicon class="pi pi-search" />
          <input pInputText type="search" class="w-full" [(ngModel)]="search" placeholder="Search title or route…" />
        </p-iconfield>
        <span class="mm-count">{{ filtered().length }} items</span>
      </div>

      @if (error()) {
        <div class="mm-alert">
          <i class="pi pi-exclamation-circle"></i> {{ error() }}
        </div>
      }

      <div class="mm-table-wrap">
        <p-table [value]="filtered()" dataKey="menuItemId" styleClass="p-datatable-sm mm-table" [tableStyle]="{ 'min-width': '52rem' }" [scrollable]="true">
          <ng-template #header>
            <tr>
              <th style="width:48px"></th>
              <th>Title</th>
              <th>Route</th>
              <th style="width:80px">Order</th>
              <th style="width:90px">Status</th>
              <th>Roles</th>
              <th style="width:110px"></th>
            </tr>
          </ng-template>
          <ng-template #body let-item>
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
              <td><code class="mm-route">{{ item.routeUrl || '—' }}</code></td>
              <td>{{ item.sortOrder }}</td>
              <td><p-tag [value]="item.isActive ? 'Active' : 'Hidden'" [severity]="item.isActive ? 'success' : 'secondary'" [rounded]="true" /></td>
              <td>
                <div class="flex flex-wrap gap-1">
                  @for (r of roleLabels(item.roleIds); track r) {
                    <p-tag [value]="r" severity="info" [rounded]="true" />
                  } @empty {
                    <span class="mm-muted">None</span>
                  }
                </div>
              </td>
              <td>
                <div class="flex items-center justify-end gap-1 whitespace-nowrap">
                  <p-button icon="pi pi-pencil" [text]="true" [rounded]="true" size="small" severity="secondary" ariaLabel="Edit" pTooltip="Edit" (onClick)="startEdit(item)" />
                  <p-button icon="pi pi-trash" [text]="true" [rounded]="true" size="small" severity="danger" ariaLabel="Delete" pTooltip="Delete" (onClick)="confirmDelete(item)" />
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template #emptymessage>
            <tr><td colspan="7" class="mm-empty">No menu items match your search.</td></tr>
          </ng-template>
        </p-table>
      </div>
    }

    <p-drawer
      [visible]="drawerOpen()"
      (visibleChange)="$event ? null : closeDrawer()"
      position="right"
      [modal]="true"
      [dismissible]="true"
      [style]="{ width: 'min(26rem, 100vw)' }">
      <ng-template #header>
        <div>
          <h3 class="mm-drawer-title">{{ editingId() ? 'Edit Menu Item' : 'New Menu Item' }}</h3>
          <p class="mm-drawer-sub">Visible in the sidebar for selected roles</p>
        </div>
      </ng-template>

      <div class="flex flex-col gap-3.5">
        <div class="mm-field">
          <label for="mm-title">Title <em>*</em></label>
          <input pInputText id="mm-title" class="w-full" [(ngModel)]="form.title" placeholder="e.g. Reports" />
        </div>

        <div class="grid grid-cols-[1fr_7rem] gap-3">
          <div class="mm-field">
            <label for="mm-icon">Icon</label>
            <input pInputText id="mm-icon" class="w-full" [(ngModel)]="form.icon" placeholder="material icon name" />
          </div>
          <div class="mm-field">
            <label for="mm-sort">Sort order</label>
            <p-inputnumber inputId="mm-sort" styleClass="w-full" inputStyleClass="w-full" [useGrouping]="false" [(ngModel)]="form.sortOrder" />
          </div>
        </div>

        <div class="mm-field">
          <label for="mm-route">Route URL</label>
          <input pInputText id="mm-route" class="w-full" [(ngModel)]="form.routeUrl" placeholder="/path or leave empty for group" />
        </div>

        <div class="mm-field">
          <label>Parent</label>
          <p-select class="w-full" [options]="parentOptions()" optionLabel="label" optionValue="value"
                    [(ngModel)]="form.parentId" appendTo="body" [overlayOptions]="{ baseZIndex: 10050 }" />
        </div>

        <label class="mm-check" for="mm-active">
          <p-toggleswitch inputId="mm-active" [(ngModel)]="form.isActive" />
          Active (show in sidebar when role allows)
        </label>

        <div class="flex flex-col gap-2.5">
          <span class="mm-roles-label">Visible to roles</span>
          <div class="grid grid-cols-2 gap-2">
            @for (r of roles; track r.id) {
              <label class="mm-role-check" [class.checked]="form.roleIds.includes(r.id)" [for]="'mm-role-' + r.id">
                <p-checkbox [inputId]="'mm-role-' + r.id" [binary]="true"
                            [ngModel]="form.roleIds.includes(r.id)"
                            (ngModelChange)="toggleRole(r.id, $event)" />
                {{ r.name }}
              </label>
            }
          </div>
        </div>

        @if (formError()) {
          <div class="mm-alert">{{ formError() }}</div>
        }
      </div>

      <ng-template #footer>
        <div class="flex justify-end gap-2">
          <p-button label="Cancel" severity="secondary" [outlined]="true" [disabled]="saving()" (onClick)="closeDrawer()" />
          <p-button [label]="saving() ? 'Saving…' : (editingId() ? 'Save Changes' : 'Create')" icon="pi pi-check"
                    [loading]="saving()" [disabled]="saving() || !form.title.trim()" (onClick)="save()" />
        </div>
      </ng-template>
    </p-drawer>
  `,
  styles: [`
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
    tr.inactive td { opacity: .62; }

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
    .mm-muted { color: var(--t5); font-size: 12px; }
    .mm-empty { text-align: center; padding: 36px !important; color: var(--t4); }

    .mm-drawer-title { margin: 0; font-size: 16px; font-weight: 800; color: var(--t1); }
    .mm-drawer-sub { margin: 4px 0 0; font-size: 12.5px; color: var(--t4); }
    .mm-field { display: flex; flex-direction: column; gap: 6px; flex: 1; }
    .mm-field > label { font-size: 11px; font-weight: 700; color: var(--t3); text-transform: uppercase; letter-spacing: .35px; }
    .mm-field em { color: var(--red); font-style: normal; }
    .mm-check {
      display: flex; align-items: center; gap: 10px;
      font-size: 13px; font-weight: 600; color: var(--t2); cursor: pointer;
    }
    .mm-roles-label { font-size: 11px; font-weight: 700; color: var(--t3); text-transform: uppercase; letter-spacing: .35px; }
    .mm-role-check {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 10px; border: 1px solid var(--border); border-radius: 9px;
      font-size: 12.5px; font-weight: 600; color: var(--t2); cursor: pointer;
    }
    .mm-role-check.checked {
      border-color: rgba(var(--accent-rgb), .45); background: var(--accent-s); color: var(--accent);
    }

    @media (max-width: 900px) {
      :host ::ng-deep .mm-table th:nth-child(3), :host ::ng-deep .mm-table td:nth-child(3),
      :host ::ng-deep .mm-table th:nth-child(6), :host ::ng-deep .mm-table td:nth-child(6) { display: none; }
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
