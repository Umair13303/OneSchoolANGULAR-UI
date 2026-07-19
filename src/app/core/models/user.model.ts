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
}

export interface CreateUserDto {
  fullName: string;
  email: string;
  password: string;
  roleId: number;
}
