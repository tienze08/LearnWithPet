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