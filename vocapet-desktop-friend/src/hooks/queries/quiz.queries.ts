import { answerQuiz, getRandomQuiz } from "@/api/quiz.api";
import { useMutation } from "@tanstack/react-query";

export function useRandomQuizMutation() {
  return useMutation({
    mutationFn: getRandomQuiz,
  });
}

export function useAnswerQuizMutation() {
  return useMutation({
    mutationFn: answerQuiz,
  });
}