import { Injectable } from '@angular/core';

/**
 * Opt-in accessibility helpers for forms.
 *
 * Both methods are assistive-only: they read the DOM and move focus, and
 * never touch control state, validators, validity or submit behaviour. A
 * caller's existing validation flow is unchanged — call these *after* the
 * page has done whatever it already does (markAllAsTouched, etc.).
 *
 * Why a service rather than markup: the app has no shared form-field
 * component yet, so per-field attributes (aria-invalid, aria-describedby,
 * label/for pairing) still belong to each page's own template. These two
 * behaviours are the part that can be fixed centrally today, and they are
 * the two that were missing everywhere — there was exactly one focus() call
 * in the whole modules tree, and no live region at all.
 */
@Injectable({ providedIn: 'root' })
export class FormA11yService {
  private liveRegion: HTMLElement | null = null;

  /**
   * Selectors covering the invalid-state conventions already in use across
   * the app, so a page can adopt this without first reworking its markup.
   */
  private static readonly INVALID_SELECTOR = [
    '[aria-invalid="true"]',
    '.ng-invalid[formControlName]',
    '.ng-invalid[formControl]',
    '.ng-invalid[ngModel]',
    '.field.invalid input',
    '.field.invalid select',
    '.field.invalid textarea',
    '.inp-err',
    '.input-error'
  ].join(', ');

  /**
   * Scrolls the first invalid control in `root` into view and focuses it.
   * Returns true if a control was focused.
   *
   * Does not mark anything as touched — the caller decides when fields
   * should start showing errors.
   */
  focusFirstInvalid(root: HTMLElement | null | undefined): boolean {
    if (!root) return false;

    const found = root.querySelector<HTMLElement>(FormA11yService.INVALID_SELECTOR);
    if (!found) return false;

    // The match may be a wrapper (e.g. `.inp-err` on a div), and focus() on a
    // non-focusable element silently does nothing — so fall back to the first
    // focusable descendant.
    const target = this.isFocusable(found)
      ? found
      : found.querySelector<HTMLElement>('input, select, textarea, button, [tabindex]');

    if (!target) return false;

    target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    target.focus({ preventScroll: true });
    return true;
  }

  /**
   * Announces a message to screen readers without any visual change, via a
   * single shared polite live region. Use for validation summaries such as
   * "3 fields need attention" — inline error text stays where it is.
   */
  announce(message: string): void {
    const region = this.ensureLiveRegion();
    // Clear first: re-setting identical text is not re-announced.
    region.textContent = '';
    region.textContent = message;
  }

  private ensureLiveRegion(): HTMLElement {
    if (this.liveRegion?.isConnected) return this.liveRegion;

    const region = document.createElement('div');
    region.className = 'sr-only';
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    document.body.appendChild(region);

    this.liveRegion = region;
    return region;
  }

  private isFocusable(el: HTMLElement): boolean {
    return (
      el instanceof HTMLInputElement ||
      el instanceof HTMLSelectElement ||
      el instanceof HTMLTextAreaElement ||
      el instanceof HTMLButtonElement ||
      el.hasAttribute('tabindex')
    );
  }
}
