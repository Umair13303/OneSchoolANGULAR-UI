export interface StaffDto {
  staffId: number;
  fullName: string;
  cnic?: string;
  gender?: string;
  dateOfBirth?: string;
  phone?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  designation: string;
  department?: string;
  joiningDate?: string;
  employmentType: string;
  status: string;
  photoFileId?: number;
  userId?: number;
  userEmail?: string;
}

export interface CreateStaffDto {
  fullName: string;
  cnic?: string;
  gender?: string;
  dateOfBirth?: string;
  phone?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  designation: string;
  department?: string;
  joiningDate?: string;
  employmentType: string;
  status: string;
  photoFileId?: number | null;
}

export interface CreateStaffLoginDto {
  email: string;
  password: string;
}

export interface StaffDocumentDto {
  fileId: number;
  label: string;
  originalName: string;
  fileType?: string;
  sizeBytes?: number;
  uploadedAt: string;
  fileUrl: string;
}

export interface TagStaffDocumentDto {
  fileId: number;
  label: string;
}

export const EMPLOYMENT_TYPES = ['Permanent', 'Contract', 'DailyWage'];
export const STAFF_STATUSES   = ['Active', 'OnLeave', 'Terminated'];
export const DEPARTMENTS       = ['Administration', 'Accounts', 'Transport', 'Lab', 'Library', 'Security', 'Maintenance', 'Other'];
