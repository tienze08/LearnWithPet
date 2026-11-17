import { apiFetch } from "./client";

// Types mirror backend TangoResponses / TangoRequests. Content is read from the API, never hardcoded here.

export type JlptLevel = "N5" | "N4" | "N3" | "N2" | "N1";
export const JLPT_LEVELS: JlptLevel[] = ["N5", "N4", "N3", "N2", "N1"];
export type TangoLessonStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
export type TangoWordStatus = "NEW" | "LEARNING" | "MASTERED" | "NEED_REVIEW";
export type TangoQuizMode = "JP_TO_MEANING" | "VI_TO_JP" | "MIXED";
export type TangoQuizScope = "ALL" | "MISTAKES";

export interface TangoLevelSummary {
  level: JlptLevel;
  lessonCount: number;
  vocabularyCount: number;
  userSummary: { new: number; learning: number; mastered: number; needReview: number };
  completedLessons: number;
}

export interface TangoLessonListItem {
  id: number;
  lessonNumber: number;
  title: string;
  vocabularyCount: number;
  requiredCount: number;
  viewedCount: number;
  status: TangoLessonStatus;
  progressPercent: number;
  lastStudiedAt: string | null;
}

export interface TangoLessonDetail {
  id: number;
  jlptLevel: JlptLevel;
  lessonNumber: number;
  title: string;
  description: string | null;
  vocabularyCount: number;
  requiredCount: number;
  status: TangoLessonStatus;
  quizPassed: boolean;
  bestQuizAccuracy: number | null;
  lastPosition: number | null;
  lastStudiedAt: string | null;
}

export interface TangoLessonVocabulary {
  id: number;
  position: number;
  required: boolean;
  expression: string | null;
  kana: string;
  romaji: string;
  partOfSpeech: string;
  primaryMeaning: string | null;
  status: TangoWordStatus;
  viewed: boolean;
  favorite: boolean;
  audioUrl: string | null;
}

export interface TangoVocabularyDetail {
  id: number;
  expression: string | null;
  kana: string;
  romaji: string;
  partOfSpeech: string;
  audioUrl: string | null;
  meanings: { meaning: string; isPrimary: boolean; note: string | null }[];
  examples: { japanese: string; reading: string | null; vietnamese: string }[];
  lessons: { lessonId: number; jlptLevel: JlptLevel; lessonNumber: number }[];
  progress: { status: TangoWordStatus; viewed: boolean; answeredCount: number; accuracy: number | null } | null;
  favorite: boolean;
}

export interface TangoStartResponse {
  lessonId: number;
  status: TangoLessonStatus;
  startedAt: string;
  lastPosition: number | null;
  created: boolean;
}

export interface TangoStudyProgressResponse {
  lessonId: number;
  viewedCount: number;
  requiredCount: number;
  lessonStatus: TangoLessonStatus;
  newlyViewed: number;
}

export interface TangoQuizQuestion {
  vocabularyId: number;
  mode: Exclude<TangoQuizMode, "MIXED">;
  prompt: { text: string; kana: string | null };
  inputType: "TEXT";
}

export interface TangoQuizResponse {
  lessonId: number;
  mode: TangoQuizMode;
  scope: TangoQuizScope;
  totalQuestions: number;
  questions: TangoQuizQuestion[];
}

export interface TangoAttemptAnswer {
  vocabularyId: number;
  mode: Exclude<TangoQuizMode, "MIXED">;
  answer: string;
}

export interface TangoAttemptRequest {
  clientAttemptId: string;
  mode: TangoQuizMode;
  scope: TangoQuizScope;
  durationSeconds?: number;
  answers: TangoAttemptAnswer[];
}

export interface TangoAttemptResult {
  vocabularyId: number;
  mode: Exclude<TangoQuizMode, "MIXED">;
  isCorrect: boolean;
  submittedAnswer: string;
  correctAnswers: string[];
}

export interface TangoAttemptResponse {
  attemptId: number;
  replayed: boolean;
  lessonId: number;
  mode: TangoQuizMode;
  scope: TangoQuizScope;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  accuracy: number;
  passed: boolean;
  lessonStatus: TangoLessonStatus;
  results: TangoAttemptResult[];
  submittedAt: string;
}

export interface TangoProgressResponse {
  level: JlptLevel | null;
  words: { new: number; learning: number; mastered: number; needReview: number; total: number };
  lessons: { notStarted: number; inProgress: number; completed: number; total: number };
  continueLearning: { lessonId: number; lessonNumber: number; title: string; lastPosition: number | null } | null;
  recentAttempts: { attemptId: number; lessonId: number; scope: TangoQuizScope; accuracy: number; submittedAt: string }[];
}

export interface TangoWeakItem {
  vocabularyId: number;
  expression: string | null;
  kana: string;
  primaryMeaning: string | null;
  status: TangoWordStatus;
  answeredCount: number;
  correctCount: number;
  incorrectCount: number;
  accuracy: number;
  lastAnsweredAt: string | null;
}

export interface TangoWordSummary {
  vocabularyId: number;
  expression: string | null;
  kana: string;
  primaryMeaning: string | null;
}

export interface TangoSearchResponse {
  lessons: { id: number; jlptLevel: JlptLevel; lessonNumber: number; title: string }[];
  vocabularies: TangoWordSummary[];
}

const base = "/api/japanese/tango";

export const getTangoLevels = () =>
  apiFetch<{ levels: TangoLevelSummary[] }>(`${base}/levels`);

export const getTangoLessons = (level: JlptLevel) =>
  apiFetch<{ level: JlptLevel; lessons: TangoLessonListItem[] }>(`${base}/lessons?level=${level}`);

export const getTangoLesson = (lessonId: number) =>
  apiFetch<TangoLessonDetail>(`${base}/lessons/${lessonId}`);

export const getTangoLessonVocabularies = (lessonId: number) =>
  apiFetch<{ lessonId: number; vocabularies: TangoLessonVocabulary[] }>(`${base}/lessons/${lessonId}/vocabularies`);

export const getTangoVocabulary = (vocabularyId: number) =>
  apiFetch<TangoVocabularyDetail>(`${base}/vocabularies/${vocabularyId}`);

export const startTangoLesson = (lessonId: number) =>
  apiFetch<TangoStartResponse>(`${base}/lessons/${lessonId}/start`, { method: "POST" });

export const recordStudyProgress = (lessonId: number, vocabularyIds: number[], lastPosition?: number) =>
  apiFetch<TangoStudyProgressResponse>(`${base}/lessons/${lessonId}/study-progress`, {
    method: "POST",
    body: JSON.stringify({ vocabularyIds, lastPosition }),
  });

export const getTangoQuiz = (lessonId: number, mode: TangoQuizMode, scope: TangoQuizScope) =>
  apiFetch<TangoQuizResponse>(`${base}/lessons/${lessonId}/quiz?mode=${mode}&scope=${scope}`);

export const submitTangoAttempt = (lessonId: number, body: TangoAttemptRequest) =>
  apiFetch<TangoAttemptResponse>(`${base}/lessons/${lessonId}/attempts`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const getTangoProgress = (level?: JlptLevel) =>
  apiFetch<TangoProgressResponse>(`${base}/progress${level ? `?level=${level}` : ""}`);

export const getTangoWeakWords = (level?: JlptLevel, limit = 50) => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (level) params.set("level", level);
  return apiFetch<{ items: TangoWeakItem[] }>(`${base}/progress/weak?${params.toString()}`);
};

export const setTangoFavorite = (vocabularyId: number, favorite: boolean) =>
  apiFetch<{ vocabularyId: number; favorite: boolean }>(`${base}/vocabularies/${vocabularyId}/favorite`, {
    method: favorite ? "PUT" : "DELETE",
  });

export const getTangoFavorites = (page = 0, size = 50) =>
  apiFetch<{ items: TangoWordSummary[]; page: number; size: number; total: number }>(
    `${base}/favorites?page=${page}&size=${size}`,
  );

export const searchTango = (q: string, level?: JlptLevel) => {
  const params = new URLSearchParams({ q });
  if (level) params.set("level", level);
  return apiFetch<TangoSearchResponse>(`${base}/search?${params.toString()}`);
};
