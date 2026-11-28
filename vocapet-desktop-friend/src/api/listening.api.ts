import { apiFetch } from "./client";
import type { Answer } from "@/lib/listening/session";

export interface ListeningAttemptRequest {
  clientAttemptId: string;
  lessonId: string;
  level: string;
  mode: "FULL" | "REVIEW";
  durationSeconds: number;
  answers: Answer[];
}

export interface ListeningLessonProgress {
  lessonId: string;
  level: string;
  attempts: number;
  lastAccuracy: number | null;
  bestAccuracy: number | null;
  replays: number;
  durationSeconds: number;
  lastCompletedAt: string;
  mistakes: string[];
}

export interface ListeningWeakRef {
  ref: string;
  wrong: number;
  total: number;
}

export interface ListeningProgress {
  lessons: ListeningLessonProgress[];
  weakWords: ListeningWeakRef[];
  weakGrammar: ListeningWeakRef[];
}

export function submitListeningAttempt(payload: ListeningAttemptRequest) {
  return apiFetch<{ attemptId: number }>("/api/japanese/listening/attempts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getListeningProgress() {
  return apiFetch<ListeningProgress>("/api/japanese/listening/progress");
}
