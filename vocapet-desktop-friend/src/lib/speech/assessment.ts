// Contract for a future pronunciation assessment service. Nothing implements it today, so no screen shows any of these
// metrics; a score may only appear when a service returned it.

export interface PronunciationScores {
  /** Each 0..100, present only when the service measured it. */
  pronunciation?: number;
  fluency?: number;
  rhythm?: number;
  intonation?: number;
  phonemes?: { symbol: string; score: number }[];
}

export interface PronunciationAssessor {
  /** Shown to the learner together with where the audio is sent. */
  name: string;
  assess(recording: Blob, expectedJapanese: string): Promise<PronunciationScores>;
}
