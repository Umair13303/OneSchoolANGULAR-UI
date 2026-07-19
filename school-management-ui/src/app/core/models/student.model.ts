export interface StudentListDto {
  studentId: number;
  admissionNo: string;
  fullName: string;
  gender: string | null;
  dateOfBirth: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  admissionDate: string;
  className: string | null;
  section: string | null;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface CreateStudentAdmissionDto {
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  gender: string | null;
  bloodGroup: string | null;
  religion: string | null;
  nationality: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  admissionDate: string;
  customAdmissionNo?: string | null;
  academicYearId: number;
  classId: number;
  photoFileId: number | null;
  guardian: CreateGuardianDto;
}

export interface CreateGuardianDto {
  relation: string;
  fullName: string;
  phone: string;
  cnic: string | null;
  occupation: string | null;
}
