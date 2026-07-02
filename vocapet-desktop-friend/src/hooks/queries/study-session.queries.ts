import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  finishStudySessionApi,
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
    },
  });
}

export function useFinishStudySessionMutation() {
  return useMutation({
    mutationFn: (sessionId: number) =>
      finishStudySessionApi(sessionId),
  });
}