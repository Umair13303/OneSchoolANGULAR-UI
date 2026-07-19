import { Injectable, signal, effect } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'edu-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  mode = signal<ThemeMode>((localStorage.getItem(STORAGE_KEY) as ThemeMode) ?? 'light');

  constructor() {
    effect(() => {
      const m = this.mode();
      localStorage.setItem(STORAGE_KEY, m);
      this.apply(m);
    });

    this.systemQuery().addEventListener('change', () => {
      if (this.mode() === 'system') this.apply('system');
    });
  }

  setMode(m: ThemeMode) { this.mode.set(m); }

  isDark(): boolean {
    const m = this.mode();
    if (m === 'dark') return true;
    if (m === 'system') return this.systemQuery().matches;
    return false;
  }

  private apply(m: ThemeMode) {
    const dark = m === 'dark' || (m === 'system' && this.systemQuery().matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }

  private systemQuery() {
    return window.matchMedia('(prefers-color-scheme: dark)');
  }
}
