import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  getDecksApi,
  createDeckApi,
  updateDeckApi,
  deleteDeckApi,
  type DeckRequest,
} from "@/api/deck.api";

export function useDecksQuery() {
  return useQuery({
    queryKey: ["decks"],
    queryFn: getDecksApi,
  });
}

export function useCreateDeckMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createDeckApi,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["decks"],
      });
    },
  });
}

export function useUpdateDeckMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: DeckRequest;
    }) => updateDeckApi(id, payload),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["decks"],
      });
    },
  });
}

export function useDeleteDeckMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteDeckApi,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["decks"],
      });
    },
  });
}