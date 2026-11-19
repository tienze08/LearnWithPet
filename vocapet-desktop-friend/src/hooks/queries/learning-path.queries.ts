import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  checkFeasibility,
  getPathProfile,
  getPathReviewQueue,
  getPathStatus,
  getPathVocabulary,
  getToday,
  postPathAnswer,
  savePathProfile,
  type AnswerRequest,
  type ProfileRequest,
} from "@/api/learning-path.api";

// Keys: ["path", ...]. Answers also touch word progress, so they refresh the shared review and Tango data too.
// Path queries are refreshed when a block ends (not per answer), so a running block keeps a stable item list.
const PATH = "path" as const;

export function usePathStatusQuery() {
  return useQuery({ queryKey: [PATH, "status"], queryFn: getPathStatus, staleTime: 60_000 });
}

export function usePathProfileQuery(enabled = true) {
  return useQuery({ queryKey: [PATH, "profile"], queryFn: getPathProfile, enabled });
}

export function useTodayQuery(enabled = true) {
  return useQuery({ queryKey: [PATH, "today"], queryFn: getToday, enabled });
}

export function usePathVocabularyQuery(enabled = true) {
  return useQuery({
    queryKey: [PATH, "vocabulary"],
    queryFn: getPathVocabulary,
    staleTime: Infinity,
    enabled,
  });
}

export function usePathReviewQueueQuery(enabled = true) {
  return useQuery({ queryKey: [PATH, "review-queue"], queryFn: getPathReviewQueue, enabled });
}

export function useFeasibilityMutation() {
  return useMutation({ mutationFn: (body: ProfileRequest) => checkFeasibility(body) });
}

export function useSaveProfileMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ProfileRequest) => savePathProfile(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [PATH] }),
  });
}

export function usePathAnswerMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AnswerRequest) => postPathAnswer(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["learning"] });
      qc.invalidateQueries({ queryKey: ["tango"] });
    },
  });
}
