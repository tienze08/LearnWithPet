import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMeApi, onboardingApi } from "@/api/user.api";

export function useMeQuery() {
  return useQuery({
    queryKey: ["me"],
    queryFn: getMeApi,
  });
}

export function useOnboardingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: onboardingApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });

    },
  });
}