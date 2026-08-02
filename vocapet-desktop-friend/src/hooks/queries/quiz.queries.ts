import { answerQuiz, getRandomQuiz } from "@/api/quiz.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useRandomQuizMutation() {
  return useMutation({
    mutationFn: getRandomQuiz,
  });
}

export function useAnswerQuizMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: answerQuiz,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["study-reviews", "recent"] });
      queryClient.invalidateQueries({ queryKey: ["study-dashboard"] });
    },
  });
}
