export type StartStudySessionRequest = {
  deckId: number;
};

export type StartStudySessionResponse = {
  sessionId: number;
};

export type StudyCardResponse = {
  progressId: number | null;
  vocabularyId: number;
  word: string;
  meaning: string;
  example: string;
  difficulty: string;
  partOfSpeech: string;
  // Set only for cards linked to a Tango word; null for English cards.
  kana?: string | null;
  romaji?: string | null;
  lessonId?: number | null;
  lessonNumber?: number | null;
  jlptLevel?: string | null;
};
