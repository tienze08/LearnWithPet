import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  getDailyMissionsApi,
  claimMissionApi,
} from "@/api/mission.api";

export function useDailyMissionsQuery() {
  return useQuery({
    queryKey: ["missions"],
    queryFn: getDailyMissionsApi,
  });
}

export function useClaimMissionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (missionId: number) =>
      claimMissionApi(missionId),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["missions"],
      });

      queryClient.invalidateQueries({
        queryKey: ["me"],
      });
    },
  });
}