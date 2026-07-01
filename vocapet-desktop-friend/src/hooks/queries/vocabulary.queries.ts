import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  createVocabularyApi,
  deleteVocabularyApi,
  getVocabulariesApi,
  updateVocabularyApi,
  type VocabularyRequest,
} from "@/api/vocabulary.api";

import type { VocabularyResponse } from "@/api/vocabulary.api";


export function useVocabulariesQuery(deckId:number){

 return useQuery<VocabularyResponse[]>({
    queryKey:["vocabularies",deckId],
    queryFn:()=>getVocabulariesApi(deckId),
    enabled:!!deckId
 });

}

export function useCreateVocabularyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      deckId,
      payload,
    }: {
      deckId: number;
      payload: VocabularyRequest;
    }) => createVocabularyApi(deckId, payload),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["vocabularies", variables.deckId],
      });

      queryClient.invalidateQueries({
        queryKey: ["decks"],
      });
    },
  });
}

export function useUpdateVocabularyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      deckId,
      vocabularyId,
      payload,
    }: {
      deckId: number;
      vocabularyId: number;
      payload: VocabularyRequest;
    }) =>
      updateVocabularyApi(
        deckId,
        vocabularyId,
        payload,
      ),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["vocabularies", variables.deckId],
      });
    },
  });
}

export function useDeleteVocabularyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      deckId,
      vocabularyId,
    }: {
      deckId: number;
      vocabularyId: number;
    }) =>
      deleteVocabularyApi(
        deckId,
        vocabularyId,
      ),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["vocabularies", variables.deckId],
      });

      queryClient.invalidateQueries({
        queryKey: ["decks"],
      });
    },
  });
}