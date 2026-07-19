import { Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';

export interface ConfirmDeleteState {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  loading: boolean;
  error: string;
}

@Injectable({ providedIn: 'root' })
export class ConfirmDeleteService {
  state = signal<ConfirmDeleteState>({
    open: false, title: '', message: '', loading: false, error: ''
  });

  private _resolve: ((confirmed: boolean) => void) | null = null;
  private _deleteFn: (() => Observable<any>) | null = null;
  private _onSuccess: (() => void) | null = null;

  /**
   * Open the delete modal.
   * @param title     Modal heading, e.g. "Delete Class?"
   * @param message   Body text (HTML allowed), e.g. "This will remove <strong>Maths</strong>."
   * @param deleteFn  RxJS Observable factory that performs the actual delete call
   * @param onSuccess Callback run after the delete succeeds
   * @param confirmText  Label for the confirm button (default: "Delete")
   */
  open(
    title: string,
    message: string,
    deleteFn: () => Observable<any>,
    onSuccess: () => void,
    confirmText = 'Delete'
  ): void {
    this._deleteFn  = deleteFn;
    this._onSuccess = onSuccess;
    this.state.set({ open: true, title, message, confirmText, loading: false, error: '' });
  }

  confirm(): void {
    if (!this._deleteFn) return;
    this.state.update(s => ({ ...s, loading: true, error: '' }));
    this._deleteFn().subscribe({
      next: () => {
        this._onSuccess?.();
        this.close();
      },
      error: (e: any) => {
        const msg = e?.error?.error ?? e?.message ?? 'Something went wrong. Please try again.';
        this.state.update(s => ({ ...s, loading: false, error: msg }));
      }
    });
  }

  cancel(): void {
    if (this.state().loading) return;
    this.close();
  }

  private close(): void {
    this._deleteFn  = null;
    this._onSuccess = null;
    this.state.set({ open: false, title: '', message: '', loading: false, error: '' });
  }
}
