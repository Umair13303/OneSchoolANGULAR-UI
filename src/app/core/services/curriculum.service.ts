import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  CoursePlanListDto,
  CoursePlanDetailDto,
  CreateCoursePlanDto,
  UpdateCoursePlanDto,
  CourseChapterDto,
  CourseTopicDto,
  CourseMaterialDto,
  CreateCourseMaterialDto,
  CourseTopicActivityDto,
  CreateCourseTopicActivityDto,
  UpdateTopicProgressDto,
  CreateTeachingLogDto,
  TeachingLogDto,
  LinkHomeworkDto,
  CurriculumProgressSummaryDto
} from '../models/curriculum.model';

@Injectable({ providedIn: 'root' })
export class CurriculumService {
  private url = `${environment.apiUrl}/curriculum`;

  constructor(private http: HttpClient) {}

  getPlans(opts?: { academicYearId?: number | null; classId?: number | null; subjectId?: number | null; status?: string | null }) {
    let params = new HttpParams();
    if (opts?.academicYearId) params = params.set('academicYearId', opts.academicYearId);
    if (opts?.classId) params = params.set('classId', opts.classId);
    if (opts?.subjectId) params = params.set('subjectId', opts.subjectId);
    if (opts?.status) params = params.set('status', opts.status);
    return this.http.get<CoursePlanListDto[]>(`${this.url}/plans`, { params });
  }

  getPlan(id: number) {
    return this.http.get<CoursePlanDetailDto>(`${this.url}/plans/${id}`);
  }

  createPlan(dto: CreateCoursePlanDto) {
    return this.http.post<CoursePlanListDto>(`${this.url}/plans`, dto);
  }

  updatePlan(id: number, dto: UpdateCoursePlanDto) {
    return this.http.put(`${this.url}/plans/${id}`, dto);
  }

  publishPlan(id: number) {
    return this.http.post(`${this.url}/plans/${id}/publish`, {});
  }

  archivePlan(id: number) {
    return this.http.post(`${this.url}/plans/${id}/archive`, {});
  }

  deletePlan(id: number) {
    return this.http.delete(`${this.url}/plans/${id}`);
  }

  createChapter(dto: { coursePlanId: number; title: string; description?: string | null }) {
    return this.http.post<CourseChapterDto>(`${this.url}/chapters`, dto);
  }

  updateChapter(id: number, dto: { title: string; description?: string | null }) {
    return this.http.put(`${this.url}/chapters/${id}`, dto);
  }

  deleteChapter(id: number) {
    return this.http.delete(`${this.url}/chapters/${id}`);
  }

  reorderChapters(planId: number, orderedIds: number[]) {
    return this.http.put(`${this.url}/plans/${planId}/chapters/reorder`, { orderedIds });
  }

  createTopic(dto: { courseChapterId: number; title: string; description?: string | null }) {
    return this.http.post<CourseTopicDto>(`${this.url}/topics`, dto);
  }

  updateTopic(id: number, dto: { title: string; description?: string | null }) {
    return this.http.put(`${this.url}/topics/${id}`, dto);
  }

  deleteTopic(id: number) {
    return this.http.delete(`${this.url}/topics/${id}`);
  }

  reorderTopics(chapterId: number, orderedIds: number[]) {
    return this.http.put(`${this.url}/chapters/${chapterId}/topics/reorder`, { orderedIds });
  }

  getTopic(id: number) {
    return this.http.get<CourseTopicDto>(`${this.url}/topics/${id}`);
  }

  updateProgress(topicId: number, dto: UpdateTopicProgressDto) {
    return this.http.put(`${this.url}/topics/${topicId}/progress`, dto);
  }

  createMaterial(dto: CreateCourseMaterialDto) {
    return this.http.post<CourseMaterialDto>(`${this.url}/materials`, dto);
  }

  deleteMaterial(id: number) {
    return this.http.delete(`${this.url}/materials/${id}`);
  }

  createActivity(dto: CreateCourseTopicActivityDto) {
    return this.http.post<CourseTopicActivityDto>(`${this.url}/activities`, dto);
  }

  updateActivity(id: number, dto: Partial<CreateCourseTopicActivityDto>) {
    return this.http.put(`${this.url}/activities/${id}`, dto);
  }

  deleteActivity(id: number) {
    return this.http.delete(`${this.url}/activities/${id}`);
  }

  reorderActivities(topicId: number, orderedIds: number[]) {
    return this.http.put(`${this.url}/topics/${topicId}/activities/reorder`, { orderedIds });
  }

  getMyCourses() {
    return this.http.get<CoursePlanListDto[]>(`${this.url}/my-courses`);
  }

  getWorkspace(planId: number) {
    return this.http.get<CoursePlanDetailDto>(`${this.url}/workspace/${planId}`);
  }

  createTeaching(dto: CreateTeachingLogDto) {
    return this.http.post<TeachingLogDto>(`${this.url}/teaching`, dto);
  }

  getTeaching(opts: {
    classId?: number | null;
    date?: string | null;
    subjectId?: number | null;
    topicId?: number | null;
    from?: string | null;
    to?: string | null;
  }) {
    let params = new HttpParams();
    if (opts.classId) params = params.set('classId', opts.classId);
    if (opts.date) params = params.set('date', opts.date);
    if (opts.subjectId) params = params.set('subjectId', opts.subjectId);
    if (opts.topicId) params = params.set('topicId', opts.topicId);
    if (opts.from) params = params.set('from', opts.from);
    if (opts.to) params = params.set('to', opts.to);
    return this.http.get<TeachingLogDto[]>(`${this.url}/teaching`, { params });
  }

  linkHomework(teachingLogId: number, dto: LinkHomeworkDto) {
    return this.http.post<TeachingLogDto>(`${this.url}/teaching/${teachingLogId}/homework`, dto);
  }

  getProgressSummaries(opts?: { academicYearId?: number | null; classId?: number | null; subjectId?: number | null }) {
    let params = new HttpParams();
    if (opts?.academicYearId) params = params.set('academicYearId', opts.academicYearId);
    if (opts?.classId) params = params.set('classId', opts.classId);
    if (opts?.subjectId) params = params.set('subjectId', opts.subjectId);
    return this.http.get<CurriculumProgressSummaryDto[]>(`${this.url}/progress`, { params });
  }

  getProgressDetail(planId: number) {
    return this.http.get<CurriculumProgressSummaryDto>(`${this.url}/progress/${planId}`);
  }
}
