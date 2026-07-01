import { apiFetch } from "./client";

import type { Vocabulary } from "@/types/vocabulary";


export interface VocabularyRequest {

  word: string;

  meaning: string;

  example: string;

  difficulty:
    | "EASY"
    | "MEDIUM"
    | "HARD";

  partOfSpeech:
    | "NOUN"
    | "VERB"
    | "ADJECTIVE"
    | "ADVERB";
}


export type VocabularyResponse = Vocabulary;



export function getVocabulariesApi(deckId:number) {

  return apiFetch<VocabularyResponse[]>(
    `/api/decks/${deckId}/vocabularies`,
    {
      method:"GET",
    }
  );
}


export function createVocabularyApi(
  deckId:number,
  payload:VocabularyRequest
){

  return apiFetch<VocabularyResponse>(
    `/api/decks/${deckId}/vocabularies`,
    {
      method:"POST",
      body:JSON.stringify(payload),
    }
  );
}


export function updateVocabularyApi(
  deckId:number,
  vocabularyId:number,
  payload:VocabularyRequest
){

  return apiFetch<VocabularyResponse>(
    `/api/decks/${deckId}/vocabularies/${vocabularyId}`,
    {
      method:"PUT",
      body:JSON.stringify(payload),
    }
  );
}


export function deleteVocabularyApi(
  deckId:number,
  vocabularyId:number
){

  return apiFetch<void>(
    `/api/decks/${deckId}/vocabularies/${vocabularyId}`,
    {
      method:"DELETE",
    }
  );
}