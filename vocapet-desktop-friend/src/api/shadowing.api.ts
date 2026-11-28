import { apiFetch } from "./client";
import type { Check, Mode, SentenceResult } from "@/lib/shadowing/session";

export interface ShadowingSessionRequest {
  clientSessionId: string;
  unitId: string;
  level: string;
  mode: Mode;
  unitSentences: number;
  durationSeconds: number;
  sentences: SentenceResult[];
}

export interface ShadowingSessionSummary {
  sessionId: number;
  unitId: string;
  level: string;
  mode: Mode;
  sentences: number;
  recordings: number;
  completed: boolean;
  durationSeconds: number;
  completedAt: string;
}

export interface ShadowingProgress {
  sentencesPracticed: number;
  totalRecordings: number;
  totalSeconds: number;
  completedUnits: string[];
  sessions: ShadowingSessionSummary[];
  difficulties: {
    sentenceKey: string;
    unitId: string;
    missed: Check[];
    contentMatch: number | null;
    timesMissed: number;
  }[];
  checks: { check: Check; missed: number; assessed: number }[];
}

export function submitShadowingSession(payload: ShadowingSessionRequest) {
  return apiFetch<{ sessionId: number }>("/api/japanese/shadowing/sessions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getShadowingProgress() {
  return apiFetch<ShadowingProgress>("/api/japanese/shadowing/progress");
}
