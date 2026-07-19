import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../../../core/services/user.service';

import { UserListDto } from '../../../core/models/user.model';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-teacher-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingComponent, EmptyStateComponent, PageHeaderComponent],
  template: `
    <app-page-header title="Teachers" subtitle="Manage teaching staff and their profiles">
      <button class="btn-primary" (click)="router.navigate(['/teachers/new'])">
        <span class="material-icons-round">person_add</span>
        Add Teacher
      </button>
    </app-page-header>

    <!-- Filter Bar -->
    <div class="filter-bar">
      <div class="search-wrap">
        <span class="material-icons-round search-icon">search</span>
        <input class="search-input" placeholder="Search by name, email or CNIC..." [(ngModel)]="search" />
      </div>
      <select class="filter-select" [(ngModel)]="statusFilter">
        <option value="">All Status</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
    </div>

    <!-- Teacher Cards -->
    @if (loading()) {
      <div class="card"><app-loading /></div>
    } @else if (filtered().length === 0) {
      <div class="card">
        <app-empty-state icon="school" title="No teachers found" message="Add a teacher or adjust your search." />
      </div>
    } @else {
      <div class="teachers-grid">
        @for (t of filtered(); track t.userId) {
          <div class="tc card">
            <div class="tc-body">
              <div class="tc-av" [style.background]="avatarColor(t.fullName)">{{ initials(t.fullName) }}</div>
              <div class="tc-info">
                <div class="tc-name">{{ t.fullName }}</div>
                <div class="tc-email">{{ t.email }}</div>
              </div>
              <span class="badge ml" [class.active]="t.isActive" [class.inactive]="!t.isActive">
                {{ t.isActive ? 'Active' : 'Inactive' }}
              </span>
            </div>
            <div class="tc-chips">
              @if (t.specialization) {
                <span class="chip accent"><span class="material-icons-round">auto_stories</span>{{ t.specialization }}</span>
              }
              @if (t.qualification) {
                <span class="chip"><span class="material-icons-round">school</span>{{ t.qualification }}</span>
              }
              @if (t.phone) {
                <span class="chip"><span class="material-icons-round">call</span>{{ t.phone }}</span>
              }
              @if (t.gender) {
                <span class="chip"><span class="material-icons-round">wc</span>{{ t.gender }}</span>
              }
            </div>
            @if (t.joiningDate) {
              <div class="tc-joining">
                <span class="material-icons-round">event</span>
                Joined {{ t.joiningDate | date:'MMM d, y' }}
              </div>
            }
            <div class="tc-footer">
              <button class="tc-edit-btn" (click)="router.navigate(['/teachers/edit', t.userId])">
                <span class="material-icons-round">edit</span> Edit Profile
              </button>
            </div>
          </div>
        }
      </div>
    }

  `,
  styles: [`
    /* ── Teacher cards grid ── */
    .teachers-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }

    .tc { padding: 0; overflow: hidden; position: relative; }
    .tc-body {
      display: flex; align-items: center; gap: 12px;
      padding: 16px 18px 12px;
    }
    .tc-av {
      width: 46px; height: 46px; border-radius: 13px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; font-weight: 800; color: #fff;
      box-shadow: var(--sh-md);
    }
    .tc-info { flex: 1; min-width: 0; }
    .tc-name { font-size: 14.5px; font-weight: 700; color: var(--t1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .tc-email { font-size: 11.5px; color: var(--t4); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ml { flex-shrink: 0; }

    .tc-chips {
      display: flex; flex-wrap: wrap; gap: 6px;
      padding: 0 18px 10px;
    }
    .chip {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 10px; border-radius: 99px;
      font-size: 11.5px; font-weight: 600; color: var(--t3);
      background: var(--surface-2); border: 1px solid var(--border);
    }
    .chip .material-icons-round { font-size: 13px; }
    .chip.accent { background: var(--accent-s); color: var(--accent); border-color: var(--accent-g); }
    .chip.accent .material-icons-round { color: var(--accent); }

    .tc-joining {
      display: flex; align-items: center; gap: 5px;
      font-size: 11.5px; color: var(--t4);
      padding: 0 18px 10px;
    }
    .tc-joining .material-icons-round { font-size: 14px; }

    .tc-footer {
      padding: 10px 18px 14px;
      border-top: 1px solid var(--border);
    }
    .tc-edit-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 7px 16px; border-radius: 8px; width: 100%; justify-content: center;
      border: 1.5px solid var(--border-2); background: var(--surface-2);
      font-size: 13px; font-weight: 600; color: var(--t2); cursor: pointer;
      transition: all 0.18s;
      .material-icons-round { font-size: 15px; }
    }
    .tc-edit-btn:hover { background: var(--accent-s); border-color: var(--accent); color: var(--accent); }

    @keyframes spin { to { transform: rotate(360deg); } }
    .spin { animation: spin 0.8s linear infinite; display: inline-block; }
  `]
})
export class TeacherListComponent implements OnInit {
  private svc   = inject(UserService);
  router        = inject(Router);

  teachers     = signal<UserListDto[]>([]);
  loading      = signal(true);
  search       = '';
  statusFilter = '';

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.svc.getAll().subscribe({
      next: users => {
        this.teachers.set(users.filter(u => u.roleName.toLowerCase() === 'teacher'));
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  filtered(): UserListDto[] {
    const q = this.search.toLowerCase();
    return this.teachers().filter(t => {
      const matchSearch = !q ||
        t.fullName.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        (t.cnic ?? '').toLowerCase().includes(q);
      const matchStatus = !this.statusFilter ||
        (this.statusFilter === 'active' ? t.isActive : !t.isActive);
      return matchSearch && matchStatus;
    });
  }

  initials(name: string) {
    return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  readonly COLORS = ['#7c3aed','#059669','#0891b2','#d97706','#db2777','#ea580c','#0284c7','#16a34a'];
  avatarColor(name: string) {
    let h = 0;
    for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h);
    return this.COLORS[Math.abs(h) % this.COLORS.length];
  }
}
