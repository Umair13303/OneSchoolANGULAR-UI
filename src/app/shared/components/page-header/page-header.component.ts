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
    :host { display: block; width: 100%; }
    .ph {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      width: 100%;
      margin: 0;
    }
    .ph-copy { min-width: 0; flex: 1; }
    .ph-crumbs {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
      min-width: 0;
      line-height: 1.25;
    }
    .ph-sep {
      color: var(--t4, #94a3b8);
      font-size: 13px;
      font-weight: 500;
      line-height: 1;
      user-select: none;
    }
    .ph-crumb {
      font-size: 13.5px;
      font-weight: 500;
      color: var(--t3, #64748b);
      white-space: nowrap;
      max-width: 220px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .ph-crumb.muted { color: var(--t3, #64748b); }
    .ph-crumb.link {
      color: var(--t3, #64748b);
      text-decoration: none;
      border-radius: 4px;
      transition: color .12s ease, background .12s ease;
    }
    /* Was var(--brand, #2563eb). --brand was never defined anywhere, so the
       fallback always won and the most-seen hover in the app (52 pages) painted
       a blue that is not the product accent. Now uses the accent token directly;
       --brand is also defined as an alias in styles.scss for any other caller. */
    .ph-crumb.link:hover {
      color: var(--accent);
      background: color-mix(in srgb, var(--accent) 8%, transparent);
    }
    .ph-title {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      color: var(--t1);
      letter-spacing: -0.3px;
      line-height: 1.2;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .ph-sub {
      margin: 4px 0 0;
      font-size: 12.5px;
      font-weight: 500;
      color: var(--t3);
      line-height: 1.35;
    }
    .ph.dense .ph-title {
      font-size: 16px;
      font-weight: 700;
    }
    .ph.dense .ph-crumb { font-size: 12.5px; }
    .ph.dense .ph-sep { font-size: 12px; }
    .ph.dense .ph-sub {
      margin-top: 2px;
      font-size: 12px;
    }
    .ph-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
      flex-wrap: wrap;
    }
    /* About half the pages project no actions. The wrapper still rendered,
       so the column layout below added its row gap under the title for
       nothing. Comment nodes do not defeat :empty, so this is safe. */
    .ph-actions:empty { display: none; }

    @media (max-width: 640px) {
      .ph {
        flex-direction: column;
        align-items: stretch;
        gap: 10px;
      }
      .ph-crumb { max-width: 140px; }
      .ph-actions { width: 100%; }
      .ph-actions ::ng-deep .btn-primary,
      .ph-actions ::ng-deep .btn-secondary {
        width: 100%;
        justify-content: center;
        min-height: var(--btn-h-sm, 36px);
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
