import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  ExamPaperDto, ExamScheduleDto, ExamResultDto,
  CreateExamPaperDto, CreateExamScheduleDto, BulkResultEntryDto,
  ExamQuestionDto, CreateExamQuestionDto, UpdateExamQuestionDto, SavePaperQuestionsDto
} from '../models/exam.model';

@Injectable({ providedIn: 'root' })
export class ExamService {
  private base = `${environment.apiUrl}/exam`;
  constructor(private http: HttpClient) {}

  // Papers
  getPapers(classId?: number, subjectId?: number, academicYearId?: number, examType?: string) {
    let p = new HttpParams();
    if (classId)        p = p.set('classId', String(classId));
    if (subjectId)      p = p.set('subjectId', String(subjectId));
    if (academicYearId) p = p.set('academicYearId', String(academicYearId));
    if (examType)       p = p.set('examType', examType);
    return this.http.get<ExamPaperDto[]>(`${this.base}/papers`, { params: p });
  }
  getPaper(id: number)                        { return this.http.get<ExamPaperDto>(`${this.base}/papers/${id}`); }
  createPaper(dto: CreateExamPaperDto)        { return this.http.post<ExamPaperDto>(`${this.base}/papers`, dto); }
  updatePaper(id: number, dto: any)           { return this.http.put<void>(`${this.base}/papers/${id}`, dto); }
  deletePaper(id: number)                     { return this.http.delete<void>(`${this.base}/papers/${id}`); }
  publishPaper(id: number)                    { return this.http.post<void>(`${this.base}/papers/${id}/publish`, {}); }

  // Schedules
  getSchedules(classId?: number, from?: string, to?: string) {
    let p = new HttpParams();
    if (classId) p = p.set('classId', String(classId));
    if (from)    p = p.set('from', from);
    if (to)      p = p.set('to', to);
    return this.http.get<ExamScheduleDto[]>(`${this.base}/schedules`, { params: p });
  }
  createSchedule(dto: CreateExamScheduleDto) { return this.http.post<ExamScheduleDto>(`${this.base}/schedules`, dto); }
  updateSchedule(id: number, dto: any)       { return this.http.put<void>(`${this.base}/schedules/${id}`, dto); }
  deleteSchedule(id: number)                 { return this.http.delete<void>(`${this.base}/schedules/${id}`); }

  // Results
  getResultSummary(paperId: number)          { return this.http.get<ExamResultDto[]>(`${this.base}/results/${paperId}/summary`); }
  getStudentResults(studentId: number)       { return this.http.get<any>(`${this.base}/results/student/${studentId}`); }
  getStudentCard(studentId: number)          { return this.http.get<any>(`${this.base}/results/student/${studentId}/card`); }
  enterBulkResults(dto: BulkResultEntryDto)  { return this.http.post<void>(`${this.base}/results/bulk`, dto); }
  recalculateRanks(paperId: number)          { return this.http.post<void>(`${this.base}/results/${paperId}/recalculate-ranks`, {}); }

  // Questions
  getQuestions(paperId: number)                              { return this.http.get<ExamQuestionDto[]>(`${this.base}/papers/${paperId}/questions`); }
  addQuestion(dto: CreateExamQuestionDto)                    { return this.http.post<ExamQuestionDto>(`${this.base}/questions`, dto); }
  updateQuestion(id: number, dto: UpdateExamQuestionDto)     { return this.http.put<void>(`${this.base}/questions/${id}`, dto); }
  deleteQuestion(id: number)                                 { return this.http.delete<void>(`${this.base}/questions/${id}`); }
  saveAllQuestions(paperId: number, dto: SavePaperQuestionsDto) { return this.http.post<ExamQuestionDto[]>(`${this.base}/papers/${paperId}/questions/save-all`, dto); }
}
