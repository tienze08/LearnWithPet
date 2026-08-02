export type Difficulty =
  | "EASY"
  | "MEDIUM"
  | "HARD";

export type PartOfSpeech =
  | "NOUN"
  | "VERB"
  | "ADJECTIVE"
  | "ADVERB";


export interface Vocabulary {
  id: number;

  word: string;

  meaning: string;

  example: string;

  difficulty: Difficulty;

  partOfSpeech: PartOfSpeech;

  deckId: number;

  bookmarked: boolean;
}