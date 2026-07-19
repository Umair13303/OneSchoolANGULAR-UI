import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ph">
      <div>
        <h2 class="ph-title">{{ title }}</h2>
        @if (subtitle) { <p class="ph-sub">{{ subtitle }}</p> }
      </div>
      <div class="ph-actions"><ng-content /></div>
    </div>
  `,
  styles: [`
    .ph { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; gap: 16px; }
    .ph-title { font-size: 21px; font-weight: 800; color: var(--t1); letter-spacing: -0.4px; }
    .ph-sub   { font-size: 13px; color: var(--t4); margin-top: 3px; }
    .ph-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
  `]
})
export class PageHeaderComponent {
  @Input() title = '';
  @Input() subtitle = '';
}
