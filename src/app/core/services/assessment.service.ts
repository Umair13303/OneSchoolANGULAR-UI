import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  AssessmentResultLookupDto,
  ClassAssessmentDto,
  ClassRosterStudentDto,
  CreateClassAssessmentDto,
  ExamSyllabusDto,
  QuestionBankItemDto,
  StudentTopicPerformanceDto,
  TopicAssessmentSummaryDto
} from '../models/assessment.model';

export interface CreateQuestionBankItemRequest {
  courseTopicId: number;
  questionType: number;
  questionText: string;
  language?: string;
  marks: number;
  correctAnswer?: string | null;
  isTrue?: boolean | null;
  questionNote?: string | null;
  options?: { optionLabel: string; optionText: string; isCorrect: boolean; sortOrder: number }[];
}

export interface UpdateQuestionBankItemRequest {
  questionText?: string | null;
  language?: string | null;
  marks?: number | null;
  correctAnswer?: string | null;
  isTrue?: boolean | null;
  questionNote?: string | null;
  isActive?: boolean | null;
  options?: { optionLabel: string; optionText: string; isCorrect: boolean; sortOrder: number }[] | null;
}

@Injectable({ providedIn: 'root' })
export class AssessmentService {
  private base = `${environment.apiUrl}/assessments`;
  private exam = `${environment.apiUrl}/exam`;

  constructor(private http: HttpClient) {}

  getResultLookups() {
    return this.http.get<AssessmentResultLookupDto[]>(`${this.base}/result-lookups`);
  }

  getRoster(classId: number, academicYearId: number) {
    const params = new HttpParams().set('classId', classId).set('academicYearId', academicYearId);
    return this.http.get<ClassRosterStudentDto[]>(`${this.base}/roster`, { params });
  }

  createClassAssessment(dto: CreateClassAssessmentDto) {
    return this.http.post<ClassAssessmentDto>(`${this.base}/class`, dto);
  }

  getClassAssessment(id: number) {
    return this.http.get<ClassAssessmentDto>(`${this.base}/class/${id}`);
  }

  listClassAssessments(opts: { topicId?: number; classId?: number; subjectId?: number }) {
    let params = new HttpParams();
    if (opts.topicId) params = params.set('topicId', opts.topicId);
    if (opts.classId) params = params.set('classId', opts.classId);
    if (opts.subjectId) params = params.set('subjectId', opts.subjectId);
    return this.http.get<ClassAssessmentDto[]>(`${this.base}/class`, { params });
  }

  saveClassResults(assessmentId: number, results: {
    studentId: number; obtainedMarks?: number | null; status?: string | null; remarks?: string | null;
  }[]) {
    return this.http.post<ClassAssessmentDto>(`${this.base}/class/${assessmentId}/results`, { results });
  }

  bulkSabaq(dto: {
    courseTopicId: number;
    performanceDate: string;
    performanceType: string;
    items: { studentId: number; resultStatus: string; remarks?: string | null }[];
  }) {
    return this.http.post<StudentTopicPerformanceDto[]>(`${this.base}/sabaq/bulk`, dto);
  }

  listSabaq(opts: { topicId?: number; studentId?: number; classId?: number }) {
    let params = new HttpParams();
    if (opts.topicId) params = params.set('topicId', opts.topicId);
    if (opts.studentId) params = params.set('studentId', opts.studentId);
    if (opts.classId) params = params.set('classId', opts.classId);
    return this.http.get<StudentTopicPerformanceDto[]>(`${this.base}/sabaq`, { params });
  }

  topicSummary(topicId: number) {
    return this.http.get<TopicAssessmentSummaryDto>(`${this.base}/topics/${topicId}/summary`);
  }

  studentTimeline(studentId: number, academicYearId?: number, subjectId?: number) {
    let params = new HttpParams();
    if (academicYearId) params = params.set('academicYearId', academicYearId);
    if (subjectId) params = params.set('subjectId', subjectId);
    return this.http.get<any[]>(`${this.base}/students/${studentId}/timeline`, { params });
  }

  getExamSyllabus(paperId: number) {
    return this.http.get<ExamSyllabusDto>(`${this.exam}/papers/${paperId}/syllabus`);
  }

  saveExamSyllabus(paperId: number, items: { courseChapterId?: number | null; courseTopicId?: number | null }[]) {
    return this.http.put<ExamSyllabusDto>(`${this.exam}/papers/${paperId}/syllabus`, { items });
  }

  listQuestionBank(opts?: { topicId?: number; search?: string; activeOnly?: boolean | null }) {
    let params = new HttpParams();
    if (opts?.topicId) params = params.set('topicId', opts.topicId);
    if (opts?.search) params = params.set('search', opts.search);
    if (opts?.activeOnly === true) params = params.set('activeOnly', 'true');
    if (opts?.activeOnly === false) params = params.set('activeOnly', 'false');
    return this.http.get<QuestionBankItemDto[]>(`${this.exam}/question-bank`, { params });
  }

  createQuestionBankItem(dto: CreateQuestionBankItemRequest) {
    return this.http.post<QuestionBankItemDto>(`${this.exam}/question-bank`, dto);
  }

  updateQuestionBankItem(id: number, dto: UpdateQuestionBankItemRequest) {
    return this.http.put<{ message: string }>(`${this.exam}/question-bank/${id}`, dto);
  }

  deleteQuestionBankItem(id: number) {
    return this.http.delete<{ message: string }>(`${this.exam}/question-bank/${id}`);
  }

  copyQuestionBankToPaper(examPaperId: number, questionBankItemIds: number[], examPaperSectionId?: number | null) {
    return this.http.post(`${this.exam}/question-bank/copy-to-paper`, {
      examPaperId, questionBankItemIds, examPaperSectionId: examPaperSectionId ?? null
    });
  }
}
