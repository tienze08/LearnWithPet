import { apiFetch } from "./client";
import type { KanaQuizResult, KanaScript, KanaSection } from "@/lib/japanese/kana";

export interface KanaAttemptRequest {
  clientAttemptId?: string;
  script: KanaScript;
  section: KanaSection;
  score: number;
  total: number;
  durationSeconds?: number;
  answers: { kana: string; isCorrect: boolean }[];
}

export interface WeakKanaItem {
  kana: string;
  script: string;
  section: string;
  correctCount: number;
  wrongCount: number;
  totalSeen: number;
  accuracy: number | null;
  mastered: boolean;
  lastSeenAt: string | null;
}

export interface KanaAttemptResponse {
  attemptId: number;
  script: string;
  section: string;
  score: number;
  total: number;
  accuracy: number;
  completedAt: string;
  weakKana: WeakKanaItem[];
  isNew: boolean;
}

export interface KanaSectionProgress {
  script: string;
  section: string;
  totalKana: number;
  seen: number;
  mastered: number;
  needsImprovement: number;
  notYetSeen: number;
  overallAccuracy: number | null;
  lastAttempted: string | null;
}

export interface KanaProgressResponse {
  sections: KanaSectionProgress[];
}

export interface KanaItemProgressItem {
  kana: string;
  script: string;
  section: string;
  correctCount: number;
  wrongCount: number;
  mastered: boolean;
}

export function getKanaItems(script: KanaScript) {
  return apiFetch<KanaItemProgressItem[]>(`/api/japanese/kana/progress/items?script=${script}`, {
    method: "GET",
  });
}

export function submitKanaAttempt(payload: KanaAttemptRequest) {
  return apiFetch<KanaAttemptResponse>("/api/japanese/kana/attempts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getKanaProgress() {
  return apiFetch<KanaProgressResponse>("/api/japanese/kana/progress", {
    method: "GET",
  });
}

export function getWeakKana(script: KanaScript, section?: KanaSection, limit = 20) {
  const params = new URLSearchParams({ script });
  if (section) params.set("section", section);
  params.set("limit", String(limit));
  return apiFetch<WeakKanaItem[]>(`/api/japanese/kana/progress/weak?${params}`, {
    method: "GET",
  });
}
