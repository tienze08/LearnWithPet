import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getListeningProgress, submitListeningAttempt } from "@/api/listening.api";
import { loadListeningLevel } from "@/data/japanese/listening";
import type { GrammarLevel } from "@/data/japanese/grammar";

export function useListeningLessonsQuery(level: GrammarLevel) {
  return useQuery({
    queryKey: ["listening", "lessons", level],
    queryFn: () => loadListeningLevel(level),
    staleTime: Infinity,
  });
}

export function useListeningProgressQuery() {
  return useQuery({ queryKey: ["listening", "progress"], queryFn: getListeningProgress });
}

export function useSubmitListeningMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitListeningAttempt,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["listening", "progress"] }),
  });
}
