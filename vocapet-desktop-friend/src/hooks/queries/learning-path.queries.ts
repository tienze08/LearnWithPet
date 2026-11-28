import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  checkFeasibility,
  getPathProfile,
  getPathReviewQueue,
  getPathStatus,
  getNextUp,
  getPathVocabulary,
  getReviewOverview,
  getRoadmap,
  getToday,
  getUnitLesson,
  getUnits,
  postPathAnswer,
  previewPath,
  savePathProfile,
  setPathPace,
  type AnswerRequest,
  type PathPace,
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

export function useRoadmapQuery() {
  return useQuery({ queryKey: [PATH, "roadmap"], queryFn: getRoadmap });
}

export function useReviewOverviewQuery(enabled = true) {
  return useQuery({ queryKey: [PATH, "review-overview"], queryFn: getReviewOverview, enabled });
}

export function usePathReviewQueueQuery(enabled = true) {
  return useQuery({ queryKey: [PATH, "review-queue"], queryFn: getPathReviewQueue, enabled });
}

/** Read-only projection of a draft profile (POST because the draft is the body). */
export function usePathPreviewQuery(draft: ProfileRequest) {
  return useQuery({ queryKey: [PATH, "preview", draft], queryFn: () => previewPath(draft) });
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

/** Frozen while open: answering changes what is "next", and a running lesson must keep its item list. */
export function useNextUpQuery(enabled = true) {
  return useQuery({
    queryKey: [PATH, "next-up"],
    queryFn: getNextUp,
    enabled,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

/** Lesson states (unlock), shared by Today and the roadmap; refreshed with every ["path"] invalidation. */
export function useUnitsQuery(enabled = true) {
  return useQuery({ queryKey: [PATH, "units"], queryFn: getUnits, enabled });
}

/** Frozen while open, like next-up: a running lesson keeps its item list. */
export function useUnitLessonQuery(id: string | undefined) {
  return useQuery({
    queryKey: [PATH, "unit", id],
    queryFn: () => getUnitLesson(id!),
    enabled: !!id,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

export function useSetPaceMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pace: PathPace) => setPathPace(pace),
    onSuccess: () => qc.invalidateQueries({ queryKey: [PATH] }),
  });
}
