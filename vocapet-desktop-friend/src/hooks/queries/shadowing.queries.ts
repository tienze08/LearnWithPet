import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getShadowingProgress, submitShadowingSession } from "@/api/shadowing.api";
import { loadGrammarLevel, type GrammarLevel } from "@/data/japanese/grammar";
import { loadListeningLevel } from "@/data/japanese/listening";
import { buildSentences } from "@/lib/japanese/sentences";
import { grammarUnits, type Unit } from "@/lib/shadowing/session";

/** Listening dialogues plus the Sentence Bank grouped by grammar point. */
export function useShadowingUnitsQuery(level: GrammarLevel) {
  return useQuery({
    queryKey: ["shadowing", "units", level],
    queryFn: async (): Promise<Unit[]> => {
      const [lessons, grammar] = await Promise.all([
        loadListeningLevel(level),
        loadGrammarLevel(level),
      ]);
      return [
        ...lessons.map((l) => ({ ...l, dialogue: true })),
        ...grammarUnits(grammar, buildSentences(grammar)),
      ];
    },
    staleTime: Infinity,
  });
}

export function useShadowingProgressQuery() {
  return useQuery({ queryKey: ["shadowing", "progress"], queryFn: getShadowingProgress });
}

export function useSubmitShadowingMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitShadowingSession,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shadowing", "progress"] }),
  });
}
