import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, RefreshTokenRequest, UserInfo } from '../models/auth.model';

const TOKEN_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';
const USER_KEY = 'auth_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = environment.apiUrl;
  currentUser = signal<UserInfo | null>(this.getStoredUser());

  constructor(private http: HttpClient, private router: Router) {}

  login(request: LoginRequest) {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, request).pipe(
      tap(res => this.storeSession(res))
    );
  }

  refreshToken() {
    const body: RefreshTokenRequest = {
      accessToken: this.getToken() ?? '',
      refreshToken: this.getRefreshToken() ?? ''
    };
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/refresh-token`, body).pipe(
      tap(res => this.storeSession(res))
    );
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
  getToken(): string | null { return localStorage.getItem(TOKEN_KEY); }
  getRefreshToken(): string | null { return localStorage.getItem(REFRESH_KEY); }
  getRole(): string { return this.currentUser()?.role ?? ''; }
  hasRole(...roles: string[]): boolean { return roles.includes(this.getRole()); }

  updateCurrentUserBranding(patch: Partial<{ instituteName: string; tagline: string; logoUrl: string; copyrightText: string }>) {
    const user = this.currentUser();
    if (!user) return;
    const updated = { ...user, ...patch };
    localStorage.setItem('auth_user', JSON.stringify(updated));
    this.currentUser.set(updated);
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
  }

  private getStoredUser(): UserInfo | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }
}
