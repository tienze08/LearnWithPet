import { apiFetch } from "./client";

// Types mirror backend TranslationAiService.

export type GradeVerdict = "CORRECT" | "ACCEPTABLE" | "INCORRECT";
export type GradeIssueType = "GRAMMAR" | "VOCABULARY" | "PARTICLE" | "MEANING";

export interface GradeResponse {
  verdict: GradeVerdict;
  issues: { type: GradeIssueType; detail: string }[];
  explanation: string;
  suggestion: string | null;
}

export interface GradeRequest {
  direction: "JA_VI" | "VI_JA" | "COMPOSE";
  /** The sentence to translate, or for COMPOSE the word the learner must use. */
  source: string;
  reference?: string;
  answer: string;
}

export const gradeTranslation = (body: GradeRequest) =>
  apiFetch<GradeResponse>("/api/japanese/translation/grade", {
    method: "POST",
    body: JSON.stringify(body),
  });
