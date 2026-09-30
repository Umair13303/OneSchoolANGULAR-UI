import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.getToken() && !authService.getRefreshToken()) {
    router.navigate(['/auth/login']);
    return false;
  }

  // After idle, the access token is often expired while the refresh token is still valid.
  // Refresh once here so the dashboard does not fire a burst of 401s.
  if (!authService.isAccessTokenExpiring(15)) return true;

  if (!authService.getRefreshToken()) {
    authService.logout();
    return false;
  }

  return authService.refreshToken().pipe(
    map(() => true),
    catchError(() => {
      authService.logout();
      return of(false);
    })
  );
};
