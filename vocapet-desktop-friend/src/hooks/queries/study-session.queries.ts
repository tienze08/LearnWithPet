import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  finishStudySessionApi,
  getRecentReviewsApi,
  getStudyDashboardStatsApi,
  getNextStudyCardApi,
  reviewStudyCardApi,
  startStudySessionApi,
  type ReviewRequest,
} from "@/api/study-session.api";
import { StartStudySessionRequest } from "@/types/study-session";

export function useStartStudySessionMutation() {
  return useMutation({
    mutationFn: (payload: StartStudySessionRequest) =>
      startStudySessionApi(payload),
  });
}

export function useNextStudyCardQuery(
  sessionId: number | null,
) {
  return useQuery({
    queryKey: ["study-session", sessionId, "next-card"],
    queryFn: () => getNextStudyCardApi(sessionId!),
    enabled: sessionId !== null,
  });
}

export function useReviewStudyCardMutation(
  sessionId: number,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ReviewRequest) =>
      reviewStudyCardApi(sessionId, payload),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["study-session", sessionId, "next-card"],
      });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["study-reviews", "recent"] });
      queryClient.invalidateQueries({ queryKey: ["study-dashboard"] });
    },
  });
}

export function useFinishStudySessionMutation() {
  return useMutation({
    mutationFn: (sessionId: number) =>
      finishStudySessionApi(sessionId),
  });
}

export function useRecentReviewsQuery() {
  return useQuery({
    queryKey: ["study-reviews", "recent"],
    queryFn: getRecentReviewsApi,
  });
}

export function useStudyDashboardStatsQuery() {
  return useQuery({
    queryKey: ["study-dashboard"],
    queryFn: getStudyDashboardStatsApi,
  });
}
