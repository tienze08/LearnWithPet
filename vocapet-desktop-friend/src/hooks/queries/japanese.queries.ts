import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getKanaItems,
  getKanaProgress,
  getWeakKana,
  submitKanaAttempt,
  type KanaAttemptRequest,
} from "@/api/japanese.api";
import type { KanaScript, KanaSection } from "@/lib/japanese/kana";

export function useKanaProgressQuery() {
  return useQuery({
    queryKey: ["kanaProgress"],
    queryFn: getKanaProgress,
  });
}

export function useWeakKanaQuery(script: KanaScript, section?: KanaSection) {
  return useQuery({
    queryKey: ["weakKana", script, section],
    queryFn: () => getWeakKana(script, section),
  });
}

export function useKanaItemsQuery(script: KanaScript) {
  return useQuery({
    queryKey: ["kanaItems", script],
    queryFn: () => getKanaItems(script),
  });
}

export function useSubmitKanaAttemptMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: KanaAttemptRequest) => submitKanaAttempt(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kanaProgress"] });
      queryClient.invalidateQueries({ queryKey: ["weakKana"] });
      queryClient.invalidateQueries({ queryKey: ["kanaItems"] });
    },
  });
}
