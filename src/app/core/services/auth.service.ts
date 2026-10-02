import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError, finalize, shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, RefreshTokenRequest, UserInfo } from '../models/auth.model';
import { MenuService } from './menu.service';

const TOKEN_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';
const USER_KEY = 'auth_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = environment.apiUrl;
  private menuSvc = inject(MenuService);
  currentUser = signal<UserInfo | null>(this.getStoredUser());
  private refreshInFlight$: Observable<LoginResponse> | null = null;

  constructor(private http: HttpClient, private router: Router) {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') this.refreshIfExpiring();
      });
    }
  }

  login(request: LoginRequest) {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, request).pipe(
      tap(res => {
        // Always drop prior role's menu before storing the new session.
        this.menuSvc.clear();
        this.storeSession(res);
      })
    );
  }

  refreshToken() {
    if (!this.getRefreshToken()) {
      return throwError(() => new Error('No refresh token'));
    }
    if (!this.refreshInFlight$) {
      const body: RefreshTokenRequest = {
        accessToken: this.getToken() ?? '',
        refreshToken: this.getRefreshToken() ?? ''
      };
      this.refreshInFlight$ = this.http.post<LoginResponse>(`${this.apiUrl}/auth/refresh-token`, body).pipe(
        tap(res => this.storeSession(res)),
        catchError(err => throwError(() => err)),
        finalize(() => { this.refreshInFlight$ = null; }),
        shareReplay(1)
      );
    }
    return this.refreshInFlight$;
  }

  /** Refresh when the tab is opened again after the access token has (almost) expired. */
  refreshIfExpiring() {
    if (!this.getRefreshToken() || !this.isAccessTokenExpiring(60)) return;
    this.refreshToken().subscribe({ error: () => {} });
  }

  logout() {
    const refreshToken = this.getRefreshToken();
    if (refreshToken) {
      this.http.post(`${this.apiUrl}/auth/logout`, JSON.stringify(refreshToken), {
        headers: { 'Content-Type': 'application/json' }
      }).subscribe();
    }
    this.clearSession();
    this.router.navigate(['/auth/login']);
  }

  isLoggedIn(): boolean { return !!this.getToken(); }

  isAccessTokenExpiring(bufferSeconds = 0): boolean {
    const exp = this.getAccessTokenExpMs();
    if (exp == null) return true;
    return exp < Date.now() + bufferSeconds * 1000;
  }

  getToken(): string | null { return localStorage.getItem(TOKEN_KEY); }
  getRefreshToken(): string | null { return localStorage.getItem(REFRESH_KEY); }
  getRole(): string { return this.currentUser()?.role ?? ''; }
  hasRole(...roles: string[]): boolean { return roles.includes(this.getRole()); }

  updateCurrentUserBranding(patch: Partial<{ instituteName: string; tagline: string; logoUrl: string; copyrightText: string }>) {
    this.patchCurrentUser(patch);
  }

  /** Merge fields into the stored session user (name, email, photo, branding, …). */
  patchCurrentUser(patch: Partial<UserInfo>) {
    const user = this.currentUser();
    if (!user) return;
    const updated = { ...user, ...patch };
    localStorage.setItem(USER_KEY, JSON.stringify(updated));
    this.currentUser.set(updated);
  }

  private getAccessTokenExpMs(): number | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
    } catch {
      return null;
    }
  }

  private storeSession(res: LoginResponse) {
    localStorage.setItem(TOKEN_KEY, res.accessToken);
    localStorage.setItem(REFRESH_KEY, res.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    this.currentUser.set(res.user);
  }

  private clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUser.set(null);
    this.menuSvc.clear();
  }

  private getStoredUser(): UserInfo | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }
}
