import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getReviewQueue, postLearningAttempt, type LearningRating } from "@/api/learning.api";

export function useReviewQueueQuery(limit = 20) {
  return useQuery({ queryKey: ["learning", "review-queue", limit], queryFn: () => getReviewQueue(limit) });
}

// Every rated attempt updates the shared progress, so refresh review, Tango and dashboard data together.
export function useLearningAttemptMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { tangoVocabularyId?: number; vocabularyId?: number; rating: LearningRating }) =>
      postLearningAttempt(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["learning"] });
      qc.invalidateQueries({ queryKey: ["tango"] });
    },
  });
}
