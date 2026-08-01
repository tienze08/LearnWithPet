export type BasketItem = { id: string; word: string; checked: boolean; sentence: string };

export type VocabularySuggestion = {
  word: string;
  contextSentence: string;
  reason: string;
};
