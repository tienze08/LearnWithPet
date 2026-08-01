import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMeApi, onboardingApi, unlockPetApi, updateAvatarApi } from "@/api/user.api";
import type { UserResponse } from "@/types/user";

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

export function useUpdateAvatarMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateAvatarApi,
    onSuccess: (_, avatar) => {
      queryClient.setQueryData(["me"], (oldData: UserResponse | undefined) => {
        if (!oldData) return oldData;
        return { ...oldData, avatar };
      });
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function useUnlockPetMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: unlockPetApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["pets", "unlocked"] });
    },
  });
}
