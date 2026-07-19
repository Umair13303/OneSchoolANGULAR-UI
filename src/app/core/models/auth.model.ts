export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserInfo {
  userId: number;
  fullName: string;
  email: string;
  role: string;
  roleId: number;
  instituteId?: number;
  campusId?: number;
  instituteName?: string;
  tagline?: string;
  logoUrl?: string;
  copyrightText?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: UserInfo;
}

export interface RefreshTokenRequest {
  accessToken: string;
  refreshToken: string;
}
