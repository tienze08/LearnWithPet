// Listening content (data/japanese/listening/*.json) and its audio manifest.
import type { GrammarLevel } from "@/data/japanese/grammar/types";

export type Difficulty = "EASY" | "MEDIUM" | "HARD";
export type ExerciseType = "choose" | "fill" | "dictation" | "dialogue";

/** A dialogue line: either a Sentence Bank sentence (`ref`) or text that exists only in this dialogue. */
export interface SourceLine {
  speaker: string;
  ref?: string;
  ja?: string;
  furigana?: string;
  vi?: string;
  /** Grammar ids, for lines written here; bank sentences bring their own. */
  grammar?: string[];
}

interface Linked {
  /** Words (as written) and grammar ids the question tests; they feed the weak-item lists. */
  words?: string[];
  grammar?: string[];
}

export interface ChoiceQuestion extends Linked {
  question: string;
  options: string[];
  answer: string;
  explain: string;
}

export interface Blank {
  /** The missing text, exactly as it appears in the line; the first occurrence is cut out. */
  text: string;
  kind: "word" | "particle" | "verb";
  /** Other spellings to accept besides the text and its reading. */
  accept?: string[];
}

interface Base {
  id: string;
  difficulty: Difficulty;
  hint: string;
}

export type SourceExercise = Base &
  (
    | ({ type: "choose"; line: number } & ChoiceQuestion)
    | ({ type: "fill"; line: number; blanks: Blank[]; explain: string } & Linked)
    | ({ type: "dictation"; line: number; accept?: string[]; explain: string } & Linked)
    | { type: "dialogue"; lines: number[]; questions: (ChoiceQuestion & { id: string })[] }
  );

export interface SourceLesson {
  id: string;
  topic: string;
  title: string;
  /** What the learner is about to hear, without giving answers away. */
  context: string;
  tip: string;
  speakers: Record<string, string>;
  lines: SourceLine[];
  exercises: SourceExercise[];
}

export interface ListeningFile {
  level: GrammarLevel;
  /** "draft" until a Japanese speaker has checked the dialogues. */
  status: "draft" | "reviewed";
  lessons: SourceLesson[];
}

/** A recording. `source` and `license` are required so every file can be traced. */
export interface AudioAsset {
  /** Path served by the app, e.g. "/audio/n5-station.mp3". */
  src: string;
  durationSeconds: number;
  source: string;
  license: string;
  speaker?: string;
}

export interface AudioManifest {
  /** Keyed by bank sentence id, or "<lessonId>:<lineIndex>" for dialogue-only lines. */
  sentences: Record<string, AudioAsset>;
  /** One file for a whole dialogue, keyed by lesson id, with the [start, end] seconds of every line. */
  dialogues: Record<string, AudioAsset & { cues: [number, number][] }>;
}

export interface Line {
  index: number;
  speaker: string;
  japanese: string;
  furigana: string | null;
  meaningVi: string | null;
  grammarIds: string[];
  kanji: string[];
  /** Bank id when the line comes from the Sentence Bank. */
  sentenceId: string | null;
}

export interface Lesson extends Omit<SourceLesson, "lines"> {
  level: GrammarLevel;
  draft: boolean;
  lines: Line[];
}
