import { apiFetch } from "./client";

export type GeneratedReaderCard = {
  word: string;
  partOfSpeech: string;
  ipa: string;
  cefr: string;
  meaning: string;
  example: string;
  contextSentence: string;
};

export function generateReaderFlashcardsApi(payload: {
  words: string[];
  context: string;
  sourceTitle: string;
}) {
  return apiFetch<{ cards: GeneratedReaderCard[]; companionMessage: string }>(
    "/api/reader/generate-flashcards",
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export function suggestReaderVocabularyApi(payload: { context: string; sourceTitle: string }) {
  return apiFetch<{ companionMessage: string; suggestions: Array<{ word: string; contextSentence: string; reason: string }> }>(
    "/api/reader/suggest-vocabulary",
    { method: "POST", body: JSON.stringify(payload) },
  );
}
