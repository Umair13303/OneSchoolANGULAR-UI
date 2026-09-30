import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div class="empty">
      <div class="empty-icon">
        <span class="material-icons-round">{{ icon }}</span>
      </div>
      <p class="empty-title">{{ title }}</p>
      <p class="empty-msg">{{ message }}</p>
    </div>
  `,
  styles: [`
    .empty {
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      padding: 56px 24px; text-align: center;
    }
    .empty-icon {
      width: 56px; height: 56px; border-radius: 14px;
      background: var(--accent-s); border: 1px solid var(--accent-g);
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 14px;
    }
    .empty-icon .material-icons-round {
      font-size: 26px; color: var(--accent);
      font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24;
    }
    .empty-title { font-size: 14px; font-weight: 700; color: var(--t1); margin-bottom: 4px; }
    .empty-msg   { font-size: 13px; color: var(--t3); max-width: 280px; line-height: 1.5; }
  `]
})
export class EmptyStateComponent {
  @Input() title = 'Nothing here';
  @Input() message = 'No records found.';
  @Input() icon = 'inbox';
}
