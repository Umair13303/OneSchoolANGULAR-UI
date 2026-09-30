import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

function skipRefresh(url: string): boolean {
  return url.includes('/auth/refresh-token')
      || url.includes('/auth/login')
      || url.includes('/auth/logout');
}

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  const token = authService.getToken();
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || skipRefresh(req.url) || !authService.getRefreshToken()) {
        return throwError(() => error);
      }

      // Shared in-flight refresh: after idle, many APIs 401 at once. The server
      // rotates refresh tokens, so parallel refresh calls would log the user out.
      return authService.refreshToken().pipe(
        switchMap(res => next(req.clone({
          setHeaders: { Authorization: `Bearer ${res.accessToken}` }
        }))),
        catchError(refreshError => {
          authService.logout();
          return throwError(() => refreshError);
        })
      );
    })
  );
};
