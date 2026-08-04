import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCompanionStateApi, recordCompanionEventApi, updateCompanionPreferencesApi } from "@/api/companion.api";

export function useCompanionStateQuery(enabled = true) {
  return useQuery({ queryKey: ["companion", "state"], queryFn: getCompanionStateApi, enabled });
}

export function useCompanionEventMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: recordCompanionEventApi,
    onSuccess: (state) => queryClient.setQueryData(["companion", "state"], state),
  });
}

export function useCompanionPreferencesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateCompanionPreferencesApi,
    onSuccess: (state) => queryClient.setQueryData(["companion", "state"], state),
  });
}
