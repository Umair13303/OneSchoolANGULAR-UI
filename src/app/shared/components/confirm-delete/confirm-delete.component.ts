import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmDeleteService } from './confirm-delete.service';

@Component({
  selector: 'app-confirm-delete',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (svc.state(); as s) {
      @if (s.open) {
        <div class="cd-overlay" (click)="svc.cancel()">
          <div class="cd-modal" (click)="$event.stopPropagation()">
            <div class="cd-icon">
              <span class="material-icons-round">delete_outline</span>
            </div>
            <h3 class="cd-title">{{ s.title }}</h3>
            <p class="cd-message" [innerHTML]="s.message"></p>
            @if (s.error) {
              <p class="cd-error">{{ s.error }}</p>
            }
            <div class="cd-actions">
              <button class="cd-btn-cancel" (click)="svc.cancel()" [disabled]="s.loading">
                Cancel
              </button>
              <button class="cd-btn-delete" (click)="svc.confirm()" [disabled]="s.loading">
                @if (s.loading) { Deleting... } @else { {{ s.confirmText ?? 'Delete' }} }
              </button>
            </div>
          </div>
        </div>
      }
    }
  `,
  styles: [`
    .cd-overlay {
      position: fixed; inset: 0; z-index: 1000;
      background: rgba(0,0,0,.45); backdrop-filter: blur(2px);
      display: flex; align-items: center; justify-content: center;
      animation: cd-fade-in .15s ease;
    }
    .cd-modal {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 18px; padding: 32px 28px 24px;
      width: 100%; max-width: 400px; box-shadow: 0 20px 60px rgba(0,0,0,.25);
      display: flex; flex-direction: column; align-items: center; gap: 12px;
      animation: cd-slide-up .2s ease;
    }
    .cd-icon {
      width: 64px; height: 64px; border-radius: 20px;
      background: var(--red-s, #fee2e2);
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 4px;
    }
    .cd-icon .material-icons-round {
      font-size: 30px; color: var(--red, #dc2626);
      font-variation-settings: 'FILL' 1;
    }
    .cd-title {
      font-size: 17px; font-weight: 800; color: var(--t1); text-align: center; margin: 0;
    }
    .cd-message {
      font-size: 13.5px; color: var(--t3); text-align: center;
      line-height: 1.6; margin: 0;
    }
    .cd-error {
      font-size: 13px; color: var(--red, #dc2626);
      background: var(--red-s, #fee2e2); border-radius: 8px;
      padding: 8px 12px; width: 100%; text-align: center; margin: 0;
    }
    .cd-actions {
      display: flex; gap: 10px; width: 100%; margin-top: 8px;
    }
    .cd-btn-cancel, .cd-btn-delete {
      flex: 1; padding: 10px 16px; border-radius: 10px;
      font-size: 14px; font-weight: 600; cursor: pointer;
      border: none; font-family: inherit; transition: opacity .15s;
    }
    .cd-btn-cancel:disabled, .cd-btn-delete:disabled { opacity: .6; cursor: not-allowed; }
    .cd-btn-cancel {
      background: var(--surface-2); color: var(--t2);
      border: 1px solid var(--border);
    }
    .cd-btn-cancel:hover:not(:disabled) { background: var(--border); }
    .cd-btn-delete {
      background: #dc2626; color: #fff;
    }
    .cd-btn-delete:hover:not(:disabled) { background: #b91c1c; }

    @keyframes cd-fade-in  { from { opacity: 0 } to { opacity: 1 } }
    @keyframes cd-slide-up { from { transform: translateY(20px); opacity: 0 } to { transform: none; opacity: 1 } }
  `]
})
export class ConfirmDeleteComponent {
  svc = inject(ConfirmDeleteService);
}
