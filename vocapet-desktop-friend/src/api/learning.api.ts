import { apiFetch } from "./client";

// Unified learning API: one review queue and one attempt endpoint for flashcards and Tango words.

export type LearningRating = "AGAIN" | "HARD" | "GOOD" | "EASY";

export interface ReviewItem {
  progressId: number;
  tangoVocabularyId: number | null;
  vocabularyId: number | null;
  word: string;
  kana: string | null;
  romaji: string | null;
  meaning: string;
  nextReviewTime: string;
  timesSeen: number;
  correctCount: number;
  incorrectCount: number;
}

export interface LearningAttemptResponse {
  nextReviewTime: string;
  timesSeen: number;
  correctCount: number;
  incorrectCount: number;
}

const base = "/api/learning";

export const getReviewQueue = (limit = 20) =>
  apiFetch<ReviewItem[]>(`${base}/review/queue?limit=${limit}`);

export const postLearningAttempt = (body: {
  tangoVocabularyId?: number;
  vocabularyId?: number;
  rating: LearningRating;
}) =>
  apiFetch<LearningAttemptResponse>(`${base}/attempts`, {
    method: "POST",
    body: JSON.stringify(body),
  });
