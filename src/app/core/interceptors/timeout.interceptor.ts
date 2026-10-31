import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { TimeoutError, catchError, retry, throwError, timeout, timer } from 'rxjs';

/** Keep teacher/admin first paint snappy — empty forms shouldn't wait ~1 min. */
const REQUEST_MS = 12_000;

function shouldRetry(err: unknown): boolean {
  // Timeouts already waited REQUEST_MS; retrying doubles the spinner feel.
  if (err instanceof TimeoutError) return false;
  if (err instanceof HttpErrorResponse) {
    return err.status === 0 || err.status === 503;
  }
  return false;
}

export const timeoutInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.body instanceof FormData || req.url.includes('/auth/login')) {
    return next(req);
  }

  return next(req).pipe(
    timeout(REQUEST_MS),
    retry({
      count: 1,
      delay: (err) => shouldRetry(err) ? timer(1500) : throwError(() => err)
    }),
    catchError(err => {
      if (err instanceof TimeoutError) {
        return throwError(() => new HttpErrorResponse({
          status: 0,
          statusText: 'Timeout',
          url: req.url
        }));
      }
      return throwError(() => err);
    })
  );
};
