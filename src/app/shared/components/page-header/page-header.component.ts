import { Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MenuService } from '../../../core/services/menu.service';
import { MenuCrumb } from '../../../core/models/menu.model';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="ph" [class.dense]="dense()">
      <div class="ph-copy">
        <nav class="ph-crumbs" aria-label="Breadcrumb">
          @for (c of trail(); track $index; let last = $last; let first = $first) {
            @if (!first) {
              <span class="ph-sep" aria-hidden="true">›</span>
            }
            @if (!last && c.routeUrl) {
              <a class="ph-crumb link" [routerLink]="c.routeUrl">{{ c.title }}</a>
            } @else if (!last) {
              <span class="ph-crumb muted">{{ c.title }}</span>
            } @else {
              <!-- aria-current marks the leaf as the current location. Kept
                   inside the trail so the title stays on the breadcrumb line;
                   relocating the h1 out of the nav landmark is a separate,
                   visual change and is not part of this phase. -->
              <h1 class="ph-title" aria-current="page">{{ c.title }}</h1>
            }
          }
        </nav>
        @if (subtitle()) {
          <p class="ph-sub">{{ subtitle() }}</p>
        }
      </div>
      <div class="ph-actions"><ng-content /></div>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; margin-bottom: 8px; }
    .ph {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      width: 100%;
      margin: 0;
    }
    .ph-copy { min-width: 0; flex: 1; }
    .ph-crumbs {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px;
      min-width: 0;
      line-height: 1.2;
    }
    .ph-sep {
      color: var(--t4, #94a3b8);
      font-size: 11px;
      font-weight: 500;
      line-height: 1;
      user-select: none;
      opacity: 0.8;
    }
    .ph-crumb {
      font-size: 12px;
      font-weight: 500;
      color: var(--t4, #94a3b8);
      white-space: nowrap;
      max-width: 180px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .ph-crumb.muted { color: var(--t4, #94a3b8); }
    .ph-crumb.link {
      color: var(--t4, #94a3b8);
      text-decoration: none;
      border-radius: 4px;
      padding: 0 2px;
      margin: 0 -2px;
      transition: color .12s ease, background .12s ease;
    }
    .ph-crumb.link:hover {
      color: var(--accent);
      background: color-mix(in srgb, var(--accent) 8%, transparent);
    }
    .ph-title {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--t1);
      letter-spacing: -0.4px;
      line-height: 1.2;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .ph-sub {
      margin: 2px 0 0;
      font-size: 12px;
      font-weight: 500;
      color: var(--t3);
      line-height: 1.3;
      max-width: 52ch;
    }
    .ph.dense { margin-bottom: 0; }
    .ph.dense .ph-title {
      font-size: 1.05rem;
      font-weight: 750;
      letter-spacing: -0.25px;
    }
    .ph.dense .ph-crumb { font-size: 11.5px; }
    .ph.dense .ph-sep { font-size: 11px; }
    .ph.dense .ph-sub { display: none; }
    .ph.dense .ph-actions ::ng-deep .p-button {
      border-radius: 9px;
      min-height: 34px;
      padding: 0.4rem 0.9rem;
      font-size: 13px;
    }
    .ph-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
      flex-wrap: wrap;
      padding-top: 0;
    }
    .ph-actions:empty { display: none; }
    .ph-actions ::ng-deep .p-button {
      border-radius: 11px;
      font-weight: 700;
      letter-spacing: -0.01em;
      min-height: 36px;
    }
    .ph-actions ::ng-deep .p-button:not(.p-button-outlined):not(.p-button-text):not(.p-button-secondary) {
      background: linear-gradient(135deg, #5b7cff 0%, #3d5ce5 100%);
      border: none;
      box-shadow:
        0 1px 0 rgba(255,255,255,0.2) inset,
        0 8px 18px rgba(79, 110, 247, 0.28);
    }
    .ph-actions ::ng-deep .p-button:not(.p-button-outlined):not(.p-button-text):not(.p-button-secondary):not(:disabled):hover {
      filter: brightness(1.04);
      transform: translateY(-1px);
      box-shadow:
        0 1px 0 rgba(255,255,255,0.24) inset,
        0 12px 24px rgba(79, 110, 247, 0.34);
    }

    @media (max-width: 640px) {
      .ph {
        flex-direction: column;
        align-items: stretch;
        gap: 10px;
      }
      .ph-crumb { max-width: 140px; }
      .ph-actions { width: 100%; padding-top: 0; }
      .ph-actions ::ng-deep .btn-primary,
      .ph-actions ::ng-deep .btn-secondary,
      .ph-actions ::ng-deep .p-button {
        width: 100%;
        justify-content: center;
        min-height: var(--btn-h-sm, 34px);
      }
    }
  `]
})
export class PageHeaderComponent {
  private menuSvc = inject(MenuService);

  /** Leaf / page title (also used as breadcrumb fallback). */
  title = input('');
  subtitle = input('');
  /** Compact SaaS header — use on dense screens like /timetable/view */
  dense = input(false);
  /**
   * When set, build Academic › … › leaf from the role menu tree.
   * Recomputes when the menu finishes loading.
   */
  routeUrl = input('');
  /** Optional explicit crumbs; wins over routeUrl when non-empty. */
  crumbs = input<MenuCrumb[] | null>(null);

  trail = computed(() => {
    const explicit = this.crumbs();
    if (explicit?.length) return explicit;

    const route = this.routeUrl().trim();
    const title = this.title().trim();
    // Depend on menu signal so the trail upgrades from leaf → full path when menu loads.
    void this.menuSvc.items();

    if (route) {
      const path = this.menuSvc.breadcrumbForRoute(route, title);
      if (!path.length) return title ? [{ title, routeUrl: null }] : [];
      const leaf = path[path.length - 1];
      // Detail screens may pass a richer title (e.g. course name) — append it.
      if (title && leaf.title !== title) {
        return [...path, { title, routeUrl: null }];
      }
      return path;
    }

    return title ? [{ title, routeUrl: null }] : [];
  });
}
