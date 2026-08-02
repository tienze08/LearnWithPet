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
};
