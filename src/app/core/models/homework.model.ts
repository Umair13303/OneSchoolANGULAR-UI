export interface HomeworkDto {
  homeworkId: number;
  classId: number;
  className: string;
  section: string | null;
  subjectId: number;
  subjectName: string;
  teacherId: number;
  teacherName: string;
  title: string;
  description: string | null;
  assignedDate: string;
  dueDate: string;
  fileId: number | null;
  submissionCount: number;
  createdAt: string;
}

export interface CreateHomeworkDto {
  classId: number;
  subjectId: number;
  title: string;
  description: string | null;
  assignedDate: string;
  dueDate: string;
  fileId: number | null;
}

export interface SubmissionDto {
  submissionId: number;
  homeworkId: number;
  homeworkTitle: string;
  studentId: number;
  studentName: string;
  admissionNo: string;
  submittedAt: string | null;
  fileId: number | null;
  status: string;
  createdAt: string;
}
