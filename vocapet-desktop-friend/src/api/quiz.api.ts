import { apiFetch } from "./client";
import type {
  QuizAnswerRequest,
  QuizAnswerResponse,
  QuizQuestionResponse,
} from "@/types/quiz";

export function getRandomQuiz() {
  return apiFetch<QuizQuestionResponse>("/api/quiz/random");
}

export function answerQuiz(body: QuizAnswerRequest) {
  return apiFetch<QuizAnswerResponse>("/api/quiz/answer", {
    method: "POST",
    body: JSON.stringify(body),
  });
}