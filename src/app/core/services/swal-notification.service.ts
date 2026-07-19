import { Injectable, signal } from '@angular/core';
import Swal, { SweetAlertOptions } from 'sweetalert2';

const PREF_KEY = 'swal_alerts_enabled';

/** Base options shared by every toast — no backdrop, no blur */
const TOAST_BASE: SweetAlertOptions = {
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  backdrop: false,
  customClass: { popup: 'swal-toast-popup' }
};

@Injectable({ providedIn: 'root' })
export class SwalNotificationService {
  /** Persisted in localStorage. Default ON. */
  enabled = signal<boolean>(localStorage.getItem(PREF_KEY) !== 'false');

  toggle() {
    const next = !this.enabled();
    this.enabled.set(next);
    localStorage.setItem(PREF_KEY, String(next));
    // Tiny confirmation toast (always fires regardless of enabled state)
    Swal.fire({
      ...TOAST_BASE,
      timer: 2500,
      title: next ? '🔔 Notifications enabled' : '🔕 Notifications muted',
      background: next ? '#22c55e' : '#64748b',
      color: '#ffffff'
    });
  }

  /** Green welcome banner after login */
  loginToast(fullName: string, role: string) {
    if (!this.enabled()) return;
    Swal.fire({
      ...TOAST_BASE,
      timer: 4500,
      timerProgressBar: true,
      icon: 'success',
      title: `Welcome back, ${fullName}!`,
      text: `Signed in as ${role}`
    });
  }

  /**
   * Chat message toast.
   * onOpen() is called when the user clicks the toast body.
   */
  chatToast(senderName: string, preview: string, onOpen: () => void) {
    if (!this.enabled()) return;

    // If another Swal is already open, close it first so toasts don't stack weirdly
    if (Swal.isVisible()) Swal.close();

    Swal.fire({
      ...TOAST_BASE,
      timer: 6000,
      timerProgressBar: true,
      showCloseButton: true,
      customClass: { popup: 'swal-toast-popup swal-chat-toast' },
      html: `
        <div id="swal-chat-body"
             style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:2px 0">
          <div style="width:36px;height:36px;border-radius:50%;background:#6366f1;
                      display:flex;align-items:center;justify-content:center;
                      color:#fff;font-weight:700;font-size:15px;flex-shrink:0">
            ${senderName.charAt(0).toUpperCase()}
          </div>
          <div style="text-align:left;min-width:0;flex:1">
            <div style="font-weight:600;font-size:13px;margin-bottom:1px">
              ${senderName}
            </div>
            <div style="font-size:12px;opacity:.7;overflow:hidden;
                        text-overflow:ellipsis;white-space:nowrap;max-width:210px">
              ${preview}
            </div>
          </div>
          <span style="font-size:9px;opacity:.5;flex-shrink:0">tap to open</span>
        </div>`,
      didOpen: popup => {
        popup.querySelector('#swal-chat-body')?.addEventListener('click', () => {
          Swal.close();
          onOpen();
        });
      }
    });
  }

  /** Green success toast for form saves (teacher added, student updated, etc.) */
  successToast(title: string, text?: string) {
    if (!this.enabled()) return;
    Swal.fire({
      ...TOAST_BASE,
      timer: 4000,
      timerProgressBar: true,
      icon: 'success',
      title,
      text
    });
  }

  /** Plain error dialog (uses backdrop, no blur) */
  error(title: string, text?: string) {
    Swal.fire({
      icon: 'error',
      title,
      text,
      confirmButtonColor: '#6366f1',
      backdrop: 'rgba(0,0,0,0.25)'
    });
  }
}
