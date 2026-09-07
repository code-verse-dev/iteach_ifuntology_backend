export const IMPORTED_QUIZZES_MODULE = 'Imported Quizzes';
export const IMPORTED_TESTS_MODULE = 'Imported Tests';
export const IMPORTED_EXAMS_MODULE = 'Imported Exams';

export const IMPORTED_ASSESSMENT_MODULE_TITLES = [
  IMPORTED_QUIZZES_MODULE,
  IMPORTED_TESTS_MODULE,
  IMPORTED_EXAMS_MODULE,
] as const;

export const LESSON_TYPES = ['PDF', 'VIDEO', 'QUIZ', 'TEST', 'EXAM'] as const;
export type LessonType = (typeof LESSON_TYPES)[number];

export const QUESTION_LESSON_TYPES = ['QUIZ', 'TEST', 'EXAM'] as const;
export type QuestionLessonType = (typeof QUESTION_LESSON_TYPES)[number];
