export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export type PartOfSpeech = "NOUN" | "VERB" | "ADJECTIVE" | "ADVERB";

export interface Vocabulary {
  id: number;

  word: string;

  meaning: string;

  example: string;

  difficulty: Difficulty;

  partOfSpeech: PartOfSpeech;

  deckId: number;

  bookmarked: boolean;

  // Set only for cards linked to a Tango word; null for English cards.
  kana?: string | null;

  romaji?: string | null;

  lessonId?: number | null;

  lessonNumber?: number | null;

  jlptLevel?: string | null;
}
