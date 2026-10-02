export interface UserListDto {
  userId: number;
  fullName: string;
  email: string;
  roleName: string;
  roleId: number;
  isActive: boolean;
  createdAt: string;
  password?: string;
  phone?: string;
  cnic?: string;
  gender?: string;
  address?: string;
  qualification?: string;
  specialization?: string;
  dateOfBirth?: string;
  joiningDate?: string;
  signatureUrl?: string;
  photoFileId?: number | null;
}

export interface UpdateMyProfileDto {
  fullName: string;
  email: string;
  phone?: string | null;
  gender?: string | null;
  address?: string | null;
  dateOfBirth?: string | null;
  cnic?: string | null;
  qualification?: string | null;
  specialization?: string | null;
}

export interface ChangeMyPasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface CreateUserDto {
  fullName: string;
  email: string;
  password: string;
  roleId: number;
}
