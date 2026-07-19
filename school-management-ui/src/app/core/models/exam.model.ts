export interface ExamPaperDto {
  examPaperId:      number;
  academicYearId:   number;
  academicYear:     string;
  academicYearName: string;
  classId:          number;
  className:        string;
  subjectId:        number;
  subjectName:      string;
  examType:         string;
  examTypeId:       number;
  classGroup:       string;
  classGroupId:     number;
  title:            string;
  totalMarks:       number;
  passMarks:        number;
  durationMinutes?: number;
  instructions?:   string;
  syllabusNote?:   string;
  isDraft:          boolean;
  isLocked:         boolean;
  scheduledDate?:  string;
  sections:         ExamPaperSectionDto[];
}

export interface ExamPaperSectionDto {
  examPaperSectionId: number;
  sectionName:        string;
  sectionType:        string;
  allocatedMarks:     number;
  totalQuestions?:    number;
  attemptQuestions?:  number;
  marksPerQuestion?:  number;
  sectionNote?:       string;
  sortOrder:          number;
}

export interface ExamScheduleDto {
  examScheduleId:     number;
  examPaperId:        number;
  paperTitle:         string;
  className:          string;
  subjectName:        string;
  examType:           string;
  examDate:           string;
  startTime:          string;
  endTime?:           string;
  roomOrHall?:        string;
  invigilatorName?:   string;
  status:             string;
  remarks?:           string;
}

export interface ExamResultDto {
  examResultId:     number;
  examPaperId:      number;
  studentId:        number;
  studentName:      string;
  rollNumber:       string;
  obtainedMarks:    number;
  totalMarks:       number;
  passMarks:        number;
  isAbsent:         boolean;
  isPass:           boolean;
  grade:            string;
  percentage:       number;
  classRank?:       number;
  remarks?:         string;
}

export interface CreateExamPaperDto {
  academicYearId:   number;
  classId:          number;
  subjectId:        number;
  examType:         string;
  classGroup:       string;
  title:            string;
  totalMarks:       number;
  passMarks:        number;
  durationMinutes?: number;
  instructions?:   string;
  syllabusNote?:   string;
}

export interface CreateExamScheduleDto {
  examPaperId:        number;
  examDate:           string;
  startTime:          string;
  endTime?:           string;
  roomOrHall?:        string;
  invigilatorUserId?: number;
  status:             string;
  remarks?:           string;
}

export interface BulkResultEntryDto {
  examPaperId: number;
  results:     { studentId: number; obtainedMarks: number; isAbsent: boolean; remarks?: string }[];
}

// ── Question types ─────────────────────────────────────────────────────────
export interface ExamQuestionOptionDto {
  examQuestionOptionId: number;
  optionLabel:          string;
  optionText:           string;
  isCorrect:            boolean;
  sortOrder:            number;
}

export interface ExamQuestionDto {
  examQuestionId:      number;
  examPaperId:         number;
  examPaperSectionId?: number;
  sectionName?:        string;
  questionType:        string;   // label
  questionTypeId:      number;   // 1-5
  questionText:        string;
  language:            string;   // en | ur | math
  marks:               number;
  sortOrder:           number;
  correctAnswer?:      string;
  isTrue?:             boolean;
  questionNote?:       string;
  options:             ExamQuestionOptionDto[];
}

export interface CreateExamQuestionOptionDto {
  optionLabel: string;
  optionText:  string;
  isCorrect:   boolean;
  sortOrder:   number;
}

export interface CreateExamQuestionDto {
  examPaperId:        number;
  examPaperSectionId?: number;
  questionType:       number;   // 1=MCQ,2=TF,3=Fill,4=Short,5=Long
  questionText:       string;
  language:           string;
  marks:              number;
  sortOrder:          number;
  correctAnswer?:     string;
  isTrue?:            boolean;
  questionNote?:      string;
  options:            CreateExamQuestionOptionDto[];
}

export interface UpdateExamQuestionDto {
  examPaperSectionId?: number;
  questionText?:       string;
  language?:           string;
  marks?:              number;
  sortOrder?:          number;
  correctAnswer?:      string;
  isTrue?:             boolean;
  questionNote?:       string;
  options?:            CreateExamQuestionOptionDto[];
}

export interface SavePaperQuestionsDto {
  examPaperId: number;
  questions:   CreateExamQuestionDto[];
}

export const QUESTION_TYPES = [
  { value: 1, label: 'Multiple Choice (MCQ)',  icon: 'radio_button_checked' },
  { value: 2, label: 'True / False',            icon: 'check_circle' },
  { value: 3, label: 'Fill in the Blanks',      icon: 'edit' },
  { value: 4, label: 'Short Question',          icon: 'short_text' },
  { value: 5, label: 'Long Question',           icon: 'subject' }
];

export const QUESTION_LANGUAGES = [
  { value: 'en',   label: 'English',    dir: 'ltr', font: 'default' },
  { value: 'ur',   label: 'Urdu (اردو)', dir: 'rtl', font: 'Noto Nastaliq Urdu' },
  { value: 'math', label: 'Mathematics', dir: 'ltr', font: 'monospace' }
];

export const EXAM_TYPES = [
  { value: 1, label: 'Quiz' },
  { value: 2, label: 'Monthly Test' },
  { value: 3, label: 'Mid Term' },
  { value: 4, label: 'Pre Board' },
  { value: 5, label: 'Final Exam' }
];

export const CLASS_GROUPS = [
  { value: 1, label: 'Primary (1–5)' },
  { value: 2, label: 'Middle (6–8)' },
  { value: 3, label: 'Matric (9–10)' },
  { value: 4, label: 'Inter (11–12)' }
];

export const EXAM_STATUSES = ['Scheduled', 'Ongoing', 'Completed', 'Postponed', 'Cancelled'];
