import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ph" [class.dense]="dense">
      <div class="ph-copy">
        <h1 class="ph-title">{{ title }}</h1>
        @if (subtitle) { <p class="ph-sub">{{ subtitle }}</p> }
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
    .ph-title {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      color: var(--t1);
      letter-spacing: -0.3px;
      line-height: 1.2;
    }
    .ph-sub {
      margin: 2px 0 0;
      font-size: 12.5px;
      font-weight: 500;
      color: var(--t3);
      line-height: 1.35;
    }
    .ph.dense .ph-title {
      font-size: 16px;
      font-weight: 700;
    }
    .ph.dense .ph-sub {
      margin-top: 1px;
      font-size: 12px;
    }
    .ph-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
      flex-wrap: wrap;
    }

    @media (max-width: 640px) {
      .ph {
        flex-direction: column;
        align-items: stretch;
        gap: 10px;
      }
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
  @Input() title = '';
  @Input() subtitle = '';
  /** Compact SaaS header — use on dense screens like /timetable/view */
  @Input() dense = false;
}
