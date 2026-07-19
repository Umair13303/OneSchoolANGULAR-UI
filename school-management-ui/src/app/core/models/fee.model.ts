export type FeeCategory = 'Recurring' | 'OneTime' | 'OnDemand' | 'RefundableDeposit';

export const FEE_CATEGORIES: { value: FeeCategory; label: string; description: string }[] = [
  { value: 'Recurring',          label: 'Recurring',           description: 'Charged every month/quarter automatically (e.g. Tuition Fee)' },
  { value: 'OneTime',            label: 'One-Time',            description: 'Charged once per student ever (e.g. Admission Fee)' },
  { value: 'OnDemand',           label: 'On-Demand',           description: 'Generated manually when needed (e.g. Exam Fee)' },
  { value: 'RefundableDeposit',  label: 'Refundable Deposit',  description: 'Collected on admission, refunded on leaving (e.g. Security Fee)' },
];

export interface FeeTypeDto {
  feeTypeId: number;
  name: string;
  description?: string;
  feeCategory: FeeCategory;
  isActive: boolean;
}

export interface CreateFeeTypeDto {
  name: string;
  description?: string;
  feeCategory: FeeCategory;
}

export interface FeeStructureDto {
  feeStructureId: number;
  feeTypeId: number;
  feeTypeName: string;
  feeCategory: FeeCategory;
  classId: number;
  className: string;
  campusName?: string;
  academicYearId: number;
  yearLabel: string;
  amount: number;
  dueDay: string;
  isActive: boolean;
}

export interface CreateFeeStructureDto {
  feeTypeId: number;
  classId: number;
  academicYearId: number;
  amount: number;
  dueDay: string;
}

// ── Discount Policies ──────────────────────────────────────────────────────

export const DISCOUNT_TYPES = [
  { value: 'Sibling',      label: 'Sibling / Kinship' },
  { value: 'TeacherChild', label: "Teacher's Child" },
  { value: 'Merit',        label: 'Merit / Academic' },
  { value: 'NeedBased',    label: 'Need-Based' },
  { value: 'FullWaiver',   label: 'Full Fee Waiver' },
  { value: 'EarlyPayment', label: 'Early Payment' },
  { value: 'Custom',       label: 'Custom / One-off' },
];

export const VALUE_TYPES = [
  { value: 'Percentage',   label: 'Percentage (%)' },
  { value: 'FixedAmount',  label: 'Fixed Amount (PKR)' },
];

export interface DiscountPolicyDto {
  discountPolicyId: number;
  name: string;
  discountType: string;
  description: string;
  valueType: string;
  value: number;
  maxSiblingOrder?: number;
  isActive: boolean;
}

export interface CreateDiscountPolicyDto {
  name: string;
  discountType: string;
  description: string;
  valueType: string;
  value: number;
  maxSiblingOrder?: number;
}

export interface UpdateDiscountPolicyDto extends CreateDiscountPolicyDto {
  isActive: boolean;
}

export interface StudentDiscountDto {
  studentDiscountId: number;
  studentId: number;
  studentName: string;
  admissionNo: string;
  discountPolicyId: number;
  policyName: string;
  discountType: string;
  valueType: string;
  policyValue: number;
  overrideValue?: number;
  effectiveValue: number;
  academicYearId: number;
  yearLabel: string;
  remarks?: string;
  isActive: boolean;
}

export interface AssignStudentDiscountDto {
  studentId: number;
  discountPolicyId: number;
  academicYearId: number;
  overrideValue?: number;
  remarks?: string;
}

export interface DiscountLineDto {
  policyName: string;
  discountType: string;
  valueType: string;
  value: number;
  discountAmount: number;
}

export interface FeeGenerationPreviewDto {
  studentId: number;
  studentName: string;
  admissionNo: string;
  baseFee: number;
  totalDiscount: number;
  netPayable: number;
  discountLines: DiscountLineDto[];
  alreadyAssigned: boolean;
}

// ── Student Fees ───────────────────────────────────────────────────────────

export interface StudentFeeDto {
  studentFeeId: number;
  studentId: number;
  studentName: string;
  admissionNo: string;
  className: string;
  feeStructureId: number;
  feeTypeName: string;
  academicYearId: number;
  yearLabel: string;
  amountDue: number;
  amountPaid: number;
  discount: number;
  balance: number;
  dueDate: string;
  feeMonth?: number;
  status: string;
  remarks?: string;
  instituteId?: number;
}

export interface CreateStudentFeeDto {
  studentId: number;
  feeStructureId: number;
  academicYearId: number;
  amountDue: number;
  discount?: number;
  dueDate: string;
  remarks?: string;
}

export interface BulkAssignFeeDto {
  feeStructureId: number;
  classId: number;
  academicYearId: number;
  dueDate: string;
  month?: number;   // billing month 1-12; recurring fees dedupe per month
}

export interface FeePaymentDto {
  feePaymentId: number;
  studentFeeId: number;
  amountPaid: number;
  paymentDate: string;
  method: string;
  receiptNo?: string;
  remarks?: string;
  collectedByName: string;
}

export interface RecordPaymentDto {
  studentFeeId: number;
  amountPaid: number;
  paymentDate: string;
  method: string;
  receiptNo?: string;
  remarks?: string;
}

export interface FeeReportRowDto {
  studentId: number;
  studentName: string;
  admissionNo: string;
  className: string;
  totalDue: number;
  totalPaid: number;
  totalDiscount: number;
  balance: number;
  unpaidCount: number;
  paidCount: number;
  partialCount: number;
}
