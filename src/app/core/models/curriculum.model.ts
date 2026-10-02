export type CoursePlanStatus = 'Draft' | 'Published' | 'Archived';
export type TopicProgressStatus = 'NotStarted' | 'InProgress' | 'Completed';
export type TeachingType = 'NewTopic' | 'Revision' | 'Practice' | 'Assessment';
export type MaterialType = 'Pdf' | 'Booklet' | 'Worksheet' | 'Notes' | 'Image' | 'Link' | 'Other';

export interface CoursePlanListDto {
  coursePlanId: number;
  academicYearId: number;
  yearLabel: string;
  classId: number;
  className: string;
  section?: string | null;
  subjectId: number;
  subjectName: string;
  title: string;
  description?: string | null;
  status: CoursePlanStatus | string;
  publishedAt?: string | null;
  chapterCount: number;
  topicCount: number;
  completedTopicCount: number;
}

export interface CoursePlanDetailDto extends CoursePlanListDto {
  chapters: CourseChapterDto[];
}

export interface CreateCoursePlanDto {
  academicYearId: number;
  classId: number;
  subjectId: number;
  title: string;
  description?: string | null;
}

export interface UpdateCoursePlanDto {
  title: string;
  description?: string | null;
}

export interface CourseChapterDto {
  courseChapterId: number;
  coursePlanId: number;
  title: string;
  description?: string | null;
  sortOrder: number;
  topics: CourseTopicDto[];
  materials: CourseMaterialDto[];
}

export interface CourseTopicDto {
  courseTopicId: number;
  courseChapterId: number;
  coursePlanId?: number | null;
  classId?: number | null;
  subjectId?: number | null;
  academicYearId?: number | null;
  className?: string | null;
  subjectName?: string | null;
  title: string;
  description?: string | null;
  sortOrder: number;
  progressStatus: TopicProgressStatus | string;
  completedAt?: string | null;
  completedByTeacherId?: number | null;
  completedByTeacherName?: string | null;
  materials: CourseMaterialDto[];
  activities: CourseTopicActivityDto[];
}

export type CourseActivityType =
  | 'Drawing'
  | 'Coloring'
  | 'Tracing'
  | 'Matching'
  | 'ConnectDots'
  | 'ShapeIdentification'
  | 'PictureIdentification'
  | 'DragArrange'
  | 'FillBlanks'
  | 'CircleSelect'
  | 'ImageQuestion'
  | 'Worksheet';

export interface CourseTopicActivityDto {
  courseTopicActivityId: number;
  courseTopicId: number;
  activityType: CourseActivityType | string;
  title: string;
  instructionText?: string | null;
  referenceImageFileId?: number | null;
  referenceImageName?: string | null;
  exampleImageFileId?: number | null;
  exampleImageName?: string | null;
  worksheetFileId?: number | null;
  worksheetFileName?: string | null;
  configJson?: string | null;
  sortOrder: number;
  canvasEnabled: boolean;
}

export interface CreateCourseTopicActivityDto {
  courseTopicId: number;
  activityType: CourseActivityType | string;
  title: string;
  instructionText?: string | null;
  referenceImageFileId?: number | null;
  exampleImageFileId?: number | null;
  worksheetFileId?: number | null;
  configJson?: string | null;
  canvasEnabled?: boolean;
}

export interface CourseMaterialDto {
  courseMaterialId: number;
  courseChapterId?: number | null;
  courseTopicId?: number | null;
  title: string;
  materialType: MaterialType | string;
  content?: string | null;
  url?: string | null;
  fileStoreId?: number | null;
  fileName?: string | null;
  sortOrder: number;
}

export interface CreateCourseMaterialDto {
  courseChapterId?: number | null;
  courseTopicId?: number | null;
  title: string;
  materialType: MaterialType | string;
  content?: string | null;
  url?: string | null;
  fileStoreId?: number | null;
}

export interface UpdateTopicProgressDto {
  status: TopicProgressStatus | string;
}

export interface CreateTeachingLogDto {
  teachingDate: string; // yyyy-MM-dd
  courseTopicId: number;
  teachingType: TeachingType | string;
  remarks?: string | null;
  extraNotes?: string | null;
}

export interface TeachingLogDto {
  courseTeachingLogId: number;
  teachingDate: string;
  teacherId: number;
  teacherName: string;
  classId: number;
  className: string;
  section?: string | null;
  subjectId: number;
  subjectName: string;
  academicYearId: number;
  courseTopicId: number;
  topicTitle: string;
  chapterTitle?: string | null;
  teachingType: string;
  remarks?: string | null;
  extraNotes?: string | null;
  homeworkId?: number | null;
  homeworkTitle?: string | null;
}

export interface LinkHomeworkDto {
  title: string;
  description?: string | null;
  assignedDate: string;
  dueDate: string;
  fileId?: number | null;
}

export interface CurriculumProgressSummaryDto {
  coursePlanId: number;
  title: string;
  yearLabel: string;
  className: string;
  section?: string | null;
  subjectName: string;
  status: string;
  topicCount: number;
  completedTopicCount: number;
  inProgressTopicCount: number;
  remainingTopicCount: number;
  chapters: ChapterProgressDto[];
}

export interface ChapterProgressDto {
  courseChapterId: number;
  title: string;
  sortOrder: number;
  topicCount: number;
  completedTopicCount: number;
  topics: TopicProgressDto[];
}

export interface TopicProgressDto {
  courseTopicId: number;
  title: string;
  sortOrder: number;
  status: string;
  completedAt?: string | null;
  completedByTeacherId?: number | null;
  completedByTeacherName?: string | null;
}
