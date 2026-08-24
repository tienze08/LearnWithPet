import { apiFetch, apiFetchBlob } from "./client";

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

export type ReaderDocument = {
  id: number;
  title: string;
  contentType: string;
  sizeBytes: number;
  extractedText: string;
  basketJson: string;
  highlightsJson: string;
  updatedAt: string;
};

export function uploadReaderPdfApi(file: File, extractedText: string) {
  const form = new FormData();
  form.append("file", file);
  form.append("extractedText", extractedText);
  return apiFetch<ReaderDocument>("/api/reader/documents", { method: "POST", body: form });
}

export function getLatestReaderPdfApi() {
  return apiFetch<ReaderDocument | null>("/api/reader/documents/latest");
}

export function getLatestReaderPdfFileApi() {
  return apiFetchBlob("/api/reader/documents/latest/file");
}

export function updateReaderPdfStateApi(payload: { basketJson: string; highlightsJson: string }) {
  return apiFetch<ReaderDocument>("/api/reader/documents/latest/state", {
    method: "PUT", body: JSON.stringify(payload),
  });
}
