import { Component } from '@angular/core';

@Component({
  selector: 'app-loading',
  standalone: true,
  template: `
    <div class="loader">
      <div class="ring"></div>
      <span>Loading...</span>
    </div>
  `,
  styles: [`
    .loader {
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      gap: 14px; padding: 72px 24px;
      color: var(--t4); font-size: 12.5px; font-weight: 600; letter-spacing: 0.3px;
    }
    .ring {
      width: 38px; height: 38px;
      border: 3px solid var(--border);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.75s cubic-bezier(.4,.1,.2,1) infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class LoadingComponent {}
