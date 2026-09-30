import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap, catchError, of, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MenuItemTree } from '../models/menu.model';

@Injectable({ providedIn: 'root' })
export class MenuService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/menu`;
  private load$?: ReturnType<MenuService['fetch']>;

  /** Cached menu tree from the API (shared across layout + pages). */
  readonly items = signal<MenuItemTree[]>([]);

  getMenu() {
    return this.ensureLoaded();
  }

  /** Load once and share; safe to call from layout and feature pages. */
  ensureLoaded() {
    if (!this.load$) {
      this.load$ = this.fetch().pipe(shareReplay(1));
    }
    return this.load$;
  }

  /**
   * Resolve the leaf menu title for a route (e.g. `/timetable/view` → `View Timetable`).
   * Falls back when the route is not present in the menu.
   */
  titleForRoute(routeUrl: string, fallback = ''): string {
    const match = this.findByRoute(routeUrl);
    return match?.title?.trim() || fallback;
  }

  findByRoute(routeUrl: string): MenuItemTree | null {
    const target = this.normalize(routeUrl);
    if (!target) return null;
    return this.walk(this.items(), target);
  }

  private fetch() {
    return this.http.get<MenuItemTree[]>(this.url).pipe(
      tap(m => this.items.set(m ?? [])),
      catchError(() => {
        this.items.set([]);
        return of([] as MenuItemTree[]);
      })
    );
  }

  private walk(nodes: MenuItemTree[], target: string): MenuItemTree | null {
    for (const node of nodes) {
      if (node.routeUrl && this.normalize(node.routeUrl) === target) {
        return node;
      }
      const child = this.walk(node.children ?? [], target);
      if (child) return child;
    }
    return null;
  }

  private normalize(url: string): string {
    if (!url) return '';
    const path = url.split('?')[0].split('#')[0].trim();
    if (!path || path === '/') return '/';
    return path.endsWith('/') ? path.slice(0, -1) : path;
  }
}
