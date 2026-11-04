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
  /** Effective roles including derived parent when children are linked. */
  roles?: string[];
  isAlsoParent?: boolean;
  instituteId?: number;
  campusId?: number;
  instituteName?: string;
  tagline?: string;
  logoUrl?: string;
  copyrightText?: string;
  photoFileId?: number | null;
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
