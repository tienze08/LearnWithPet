import { apiFetch } from "./client";
import type {
  QuizAnswerRequest,
  QuizAnswerResponse,
  QuizQuestionResponse,
} from "@/types/quiz";

export function getRandomQuiz(deckId: number | undefined = undefined) {
  const params = deckId ? `?deckId=${deckId}` : "";
  return apiFetch<QuizQuestionResponse>(`/api/quiz/random${params}`);
}

export function answerQuiz(body: QuizAnswerRequest) {
  return apiFetch<QuizAnswerResponse>("/api/quiz/answer", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
