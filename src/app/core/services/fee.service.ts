import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  FeeTypeDto, CreateFeeTypeDto,
  FeeStructureDto, CreateFeeStructureDto,
  DiscountPolicyDto, CreateDiscountPolicyDto, UpdateDiscountPolicyDto,
  StudentDiscountDto, AssignStudentDiscountDto,
  FeeGenerationPreviewDto,
  StudentFeeDto, CreateStudentFeeDto, BulkAssignFeeDto,
  FeePaymentDto, RecordPaymentDto,
  FeeReportRowDto
} from '../models/fee.model';

@Injectable({ providedIn: 'root' })
export class FeeService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/fees`;

  // ── Fee Types ──────────────────────────────────────────────────────────────
  getFeeTypes()                                          { return this.http.get<FeeTypeDto[]>(`${this.base}/types`); }
  createFeeType(dto: CreateFeeTypeDto)                   { return this.http.post<FeeTypeDto>(`${this.base}/types`, dto); }
  updateFeeType(id: number, dto: any)                    { return this.http.put<FeeTypeDto>(`${this.base}/types/${id}`, dto); }
  deleteFeeType(id: number)                              { return this.http.delete(`${this.base}/types/${id}`); }

  // ── Fee Structures ─────────────────────────────────────────────────────────
  getFeeStructures(academicYearId?: number, classId?: number) {
    let p = new HttpParams();
    if (academicYearId) p = p.set('academicYearId', academicYearId);
    if (classId)        p = p.set('classId', classId);
    return this.http.get<FeeStructureDto[]>(`${this.base}/structures`, { params: p });
  }
  createFeeStructure(dto: CreateFeeStructureDto)         { return this.http.post<FeeStructureDto>(`${this.base}/structures`, dto); }
  updateFeeStructure(id: number, dto: any)               { return this.http.put<FeeStructureDto>(`${this.base}/structures/${id}`, dto); }
  deleteFeeStructure(id: number)                         { return this.http.delete(`${this.base}/structures/${id}`); }

  // ── Discount Policies ──────────────────────────────────────────────────────
  getDiscountPolicies()                                  { return this.http.get<DiscountPolicyDto[]>(`${this.base}/discount-policies`); }
  createDiscountPolicy(dto: CreateDiscountPolicyDto)     { return this.http.post<DiscountPolicyDto>(`${this.base}/discount-policies`, dto); }
  updateDiscountPolicy(id: number, dto: UpdateDiscountPolicyDto) { return this.http.put<DiscountPolicyDto>(`${this.base}/discount-policies/${id}`, dto); }
  deleteDiscountPolicy(id: number)                       { return this.http.delete(`${this.base}/discount-policies/${id}`); }

  // ── Student Discounts ──────────────────────────────────────────────────────
  getStudentDiscounts(studentId?: number, academicYearId?: number) {
    let p = new HttpParams();
    if (studentId)      p = p.set('studentId', studentId);
    if (academicYearId) p = p.set('academicYearId', academicYearId);
    return this.http.get<StudentDiscountDto[]>(`${this.base}/student-discounts`, { params: p });
  }
  assignStudentDiscount(dto: AssignStudentDiscountDto)   { return this.http.post<StudentDiscountDto>(`${this.base}/student-discounts`, dto); }
  updateStudentDiscount(id: number, dto: any)            { return this.http.put<StudentDiscountDto>(`${this.base}/student-discounts/${id}`, dto); }
  deleteStudentDiscount(id: number)                      { return this.http.delete(`${this.base}/student-discounts/${id}`); }

  // ── Preview ────────────────────────────────────────────────────────────────
  previewStudentFee(studentId: number, feeStructureId: number, academicYearId: number) {
    const p = new HttpParams()
      .set('studentId', studentId).set('feeStructureId', feeStructureId).set('academicYearId', academicYearId);
    return this.http.get<FeeGenerationPreviewDto>(`${this.base}/preview/student`, { params: p });
  }
  previewBulkAssign(feeStructureId: number, classId: number, academicYearId: number) {
    const p = new HttpParams()
      .set('feeStructureId', feeStructureId).set('classId', classId).set('academicYearId', academicYearId);
    return this.http.get<FeeGenerationPreviewDto[]>(`${this.base}/preview/bulk`, { params: p });
  }

  // ── Student Fees ───────────────────────────────────────────────────────────
  getStudentFees(params: { studentId?: number; classId?: number; academicYearId?: number; status?: string; instituteId?: number; campusId?: number }) {
    let p = new HttpParams();
    if (params.instituteId)    p = p.set('instituteId', params.instituteId);
    if (params.campusId)       p = p.set('campusId', params.campusId);
    if (params.studentId)      p = p.set('studentId', params.studentId);
    if (params.classId)        p = p.set('classId', params.classId);
    if (params.academicYearId) p = p.set('academicYearId', params.academicYearId);
    if (params.status)         p = p.set('status', params.status);
    return this.http.get<StudentFeeDto[]>(this.base, { params: p });
  }
  createStudentFee(dto: CreateStudentFeeDto)             { return this.http.post<StudentFeeDto>(this.base, dto); }
  bulkAssign(dto: BulkAssignFeeDto)                      { return this.http.post<{ created: number; skipped: number; assigned: number; fees: StudentFeeDto[] }>(`${this.base}/bulk-assign`, dto); }
  updateStudentFee(id: number, dto: any)                 { return this.http.put<StudentFeeDto>(`${this.base}/${id}`, dto); }
  deleteStudentFee(id: number)                           { return this.http.delete(`${this.base}/${id}`); }

  // ── Payments ───────────────────────────────────────────────────────────────
  getPayments(studentFeeId: number)                      { return this.http.get<FeePaymentDto[]>(`${this.base}/${studentFeeId}/payments`); }
  recordPayment(dto: RecordPaymentDto)                   { return this.http.post<FeePaymentDto>(`${this.base}/payments`, dto); }

  // ── Report ─────────────────────────────────────────────────────────────────
  getFeeReport(academicYearId: number, classId?: number) {
    let p = new HttpParams().set('academicYearId', academicYearId);
    if (classId) p = p.set('classId', classId);
    return this.http.get<FeeReportRowDto[]>(`${this.base}/report`, { params: p });
  }
}
