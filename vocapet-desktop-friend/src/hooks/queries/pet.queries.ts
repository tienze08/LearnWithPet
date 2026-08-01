import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getUnlockedPetsApi, selectPetApi } from "@/api/pet.api";

export function useUnlockedPetsQuery() {
  return useQuery({ queryKey: ["pets", "unlocked"], queryFn: getUnlockedPetsApi });
}

export function useSelectPetMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: selectPetApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
  });
}
