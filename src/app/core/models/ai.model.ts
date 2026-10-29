export interface GenerateQuestionsRequest {
  classId: number;
  subjectId: number;
  courseTopicId: number;
  count: 5 | 10 | 20;
  questionType: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  marks: number;
  language: 'en' | 'ur' | 'ur-en';
  instructions?: string | null;
}

export interface GeneratedQuestionOptionDto {
  optionLabel: string;
  optionText: string;
  isCorrect: boolean;
  sortOrder: number;
}

export interface GeneratedQuestionDraftDto {
  clientKey: string;
  courseTopicId: number;
  questionType: number;
  questionTypeId: number;
  questionText: string;
  language: string;
  marks: number;
  correctAnswer?: string | null;
  isTrue?: boolean | null;
  questionNote?: string | null;
  difficulty?: string | null;
  options: GeneratedQuestionOptionDto[];
  /** UI-only */
  selected?: boolean;
  expanded?: boolean;
}

export interface GenerateQuestionsResponse {
  draftId: string;
  generatedAtUtc: string;
  model?: string | null;
  items: GeneratedQuestionDraftDto[];
  warnings: string[];
}

export const AI_COUNTS = [5, 10, 20] as const;
export const AI_DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const;
export const AI_LANGUAGES = [
  { value: 'en' as const, label: 'English' },
  { value: 'ur' as const, label: 'Urdu' },
  { value: 'ur-en' as const, label: 'Urdu + English' }
];
export const AI_QUESTION_TYPES = [
  { value: 1, label: 'Multiple Choice (MCQ)' },
  { value: 2, label: 'True / False' },
  { value: 3, label: 'Fill in the Blank' },
  { value: 4, label: 'Short Answer' }
];
