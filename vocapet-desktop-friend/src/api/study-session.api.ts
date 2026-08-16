import { StartStudySessionRequest, StartStudySessionResponse, StudyCardResponse } from "@/types/study-session";
import { apiFetch } from "./client";

export type ReviewRequest = {
  vocabularyId: number;
  rating: "AGAIN" | "HARD" | "GOOD" | "EASY";
};

export type ReviewResponse = {
  currentStreak: number;
  longestStreak: number;
  nextReviewTime: string;
  streakUpdated: boolean;
};

export type RecentReview = {
  vocabularyId: number;
  word: string;
  meaning: string;
  rating: "AGAIN" | "HARD" | "GOOD" | "EASY";
  reviewedAt: string;
};

export type StudyDashboardStats = {
  learningWords: number;
  masteredWords: number;
  recentCorrect: number;
  recentReviews: number;
};

export type StudyPlan = {
  dueCards: number;
  estimatedMinutes: number;
  reviewsToday: number;
  dailyGoal: number;
  streak: number;
  suggestedDeckId: number | null;
  suggestedDeckName: string | null;
  dueReasons: Array<{
    code: "RELEARNING" | "OVERDUE" | "SCHEDULED";
    label: string;
    detail: string;
    count: number;
    deckId: number;
    deckName: string;
    words: string[];
  }>;
  upcomingCards: Array<{
    vocabularyId: number;
    word: string;
    deckName: string;
    dueAt: string;
  }>;
};

export function startStudySessionApi(
  payload: StartStudySessionRequest,
) {
  return apiFetch<StartStudySessionResponse>(
    "/api/study-sessions/start",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function getNextStudyCardApi(
  sessionId: number,
) {
  return apiFetch<StudyCardResponse>(
    `/api/study-sessions/${sessionId}/next-card`,
  );
}

export function reviewStudyCardApi(
  sessionId: number,
  payload: ReviewRequest,
) {
  return apiFetch<ReviewResponse>(
    `/api/study-sessions/${sessionId}/review`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function finishStudySessionApi(
  sessionId: number,
) {
  return apiFetch<void>(
    `/api/study-sessions/${sessionId}/finish`,
    {
      method: "POST",
    },
  );
}

export function getRecentReviewsApi() {
  return apiFetch<RecentReview[]>("/api/study-sessions/recent");
}

export function getStudyDashboardStatsApi() {
  return apiFetch<StudyDashboardStats>("/api/study-sessions/dashboard");
}

export function getTodayStudyPlanApi() {
  return apiFetch<StudyPlan>("/api/study-sessions/plan");
}
