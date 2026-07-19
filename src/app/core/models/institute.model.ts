export interface InstituteDto {
  instituteId: number;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  isActive: boolean;
  licenseValidUntil?: string | null;
  moduleAttendance: boolean;
  moduleFees: boolean;
  moduleHomework: boolean;
  moduleExams: boolean;
  moduleTimetable: boolean;
  moduleHR: boolean;
  moduleReports: boolean;
  campusCount: number;
  challanTemplate: string;
  schoolStampUrl?: string;
  createdAt: string;
}

export interface CreateInstituteDto {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  licenseValidUntil?: string | null;
  moduleAttendance: boolean;
  moduleFees: boolean;
  moduleHomework: boolean;
  moduleExams: boolean;
  moduleTimetable: boolean;
  moduleHR: boolean;
  moduleReports: boolean;
}

export interface CampusDto {
  campusId: number;
  instituteId: number;
  name: string;
  address?: string;
  phone?: string;
  isActive: boolean;
  userCount: number;
  createdAt: string;
}

export interface CreateCampusDto {
  name: string;
  address?: string;
  phone?: string;
}

export interface CreateCampusAdminDto {
  fullName: string;
  email: string;
  password: string;
  campusId?: number;
}

export interface CampusAdminDto {
  userId: number;
  fullName: string;
  email: string;
  isActive: boolean;
  role: string;
}
