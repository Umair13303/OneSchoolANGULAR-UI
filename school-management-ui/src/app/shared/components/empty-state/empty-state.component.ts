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
      padding: 80px 24px; text-align: center;
    }
    .empty-icon {
      width: 68px; height: 68px; border-radius: 20px;
      background: var(--accent-s); border: 1px solid var(--accent-g);
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 20px;
    }
    .empty-icon .material-icons-round {
      font-size: 30px; color: var(--accent);
      font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 32;
    }
    .empty-title { font-size: 15px; font-weight: 700; color: var(--t1); margin-bottom: 6px; }
    .empty-msg   { font-size: 13px; color: var(--t4); max-width: 260px; line-height: 1.6; }
  `]
})
export class EmptyStateComponent {
  @Input() title = 'Nothing here';
  @Input() message = 'No records found.';
  @Input() icon = 'inbox';
}
