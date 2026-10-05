import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MenuService } from '../../core/services/menu.service';
import { environment } from '../../../environments/environment';

/**
 * Dev-only helper that accepts tokens via query params.
 * Disabled in production builds — tokens in URLs leak via history/logs/Referer.
 */
@Component({
  standalone: true,
  template: `<p style="padding:2rem;font-family:sans-serif">{{ msg }}</p>`
})
export class AutoLoginComponent implements OnInit {
  msg = 'Logging in...';
  private menuSvc = inject(MenuService);

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    if (environment.production) {
      this.msg = 'This login helper is disabled.';
      this.router.navigate(['/auth/login']);
      return;
    }

    const p = this.route.snapshot.queryParamMap;
    const token = p.get('t');
    const refresh = p.get('r');
    const user = p.get('u');

    if (token && refresh && user) {
      this.menuSvc.clear();
      localStorage.setItem('access_token', token);
      localStorage.setItem('refresh_token', refresh);
      localStorage.setItem('auth_user', decodeURIComponent(user));
      this.msg = 'Login successful! Redirecting...';
      this.router.navigate(['/dashboard']);
    } else {
      this.msg = 'Missing parameters.';
      this.router.navigate(['/auth/login']);
    }
  }
}
