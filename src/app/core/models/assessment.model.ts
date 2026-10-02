export interface AssessmentResultLookupDto {
  assessmentResultLookupId: number;
  code: string;
  labelEn: string;
  labelUr: string;
  sortOrder: number;
}

export interface ClassRosterStudentDto {
  studentId: number;
  studentName: string;
  admissionNo: string;
}

export interface ClassAssessmentResultDto {
  classAssessmentResultId: number;
  classAssessmentId: number;
  studentId: number;
  studentName: string;
  admissionNo: string;
  obtainedMarks: number | null;
  status: string | null;
  statusLabelEn?: string | null;
  statusLabelUr?: string | null;
  remarks: string | null;
}

export interface ClassAssessmentDto {
  classAssessmentId: number;
  classId: number;
  className: string;
  section?: string | null;
  subjectId: number;
  subjectName: string;
  academicYearId: number;
  courseTopicId?: number | null;
  topicTitle?: string | null;
  courseTeachingLogId?: number | null;
  teacherId: number;
  teacherName: string;
  assessmentDate: string;
  title: string;
  assessmentType: string;
  totalMarks?: number | null;
  totalQuestions?: number | null;
  notes?: string | null;
  resultCount: number;
  results: ClassAssessmentResultDto[];
}

export interface CreateClassAssessmentDto {
  courseTopicId?: number | null;
  courseTeachingLogId?: number | null;
  classId: number;
  subjectId: number;
  academicYearId: number;
  assessmentDate: string;
  title: string;
  assessmentType: string;
  totalMarks?: number | null;
  totalQuestions?: number | null;
  notes?: string | null;
}

export interface StudentTopicPerformanceDto {
  studentTopicPerformanceId: number;
  studentId: number;
  studentName: string;
  admissionNo: string;
  courseTopicId: number;
  topicTitle: string;
  classId: number;
  subjectId: number;
  subjectName: string;
  academicYearId: number;
  teacherId: number;
  teacherName: string;
  performanceDate: string;
  performanceType: string;
  resultStatus: string;
  resultStatusLabelEn?: string | null;
  resultStatusLabelUr?: string | null;
  remarks?: string | null;
}

export interface TopicAssessmentSummaryDto {
  courseTopicId: number;
  classAssessmentCount: number;
  studentPerformanceCount: number;
  recentAssessments: ClassAssessmentDto[];
  recentPerformances: StudentTopicPerformanceDto[];
}

export interface ExamSyllabusItemDto {
  examSyllabusItemId: number;
  examPaperId: number;
  courseChapterId?: number | null;
  chapterTitle?: string | null;
  courseTopicId?: number | null;
  topicTitle?: string | null;
}

export interface ExamSyllabusDto {
  examPaperId: number;
  coursePlanId?: number | null;
  coursePlanTitle?: string | null;
  syllabusNote?: string | null;
  items: ExamSyllabusItemDto[];
}

export interface QuestionBankItemDto {
  questionBankItemId: number;
  courseTopicId: number;
  topicTitle: string;
  questionType: string;
  questionTypeId: number;
  questionText: string;
  language: string;
  marks: number;
  correctAnswer?: string | null;
  isTrue?: boolean | null;
  questionNote?: string | null;
  isActive: boolean;
  options: { questionBankOptionId: number; optionLabel: string; optionText: string; isCorrect: boolean; sortOrder: number }[];
}
