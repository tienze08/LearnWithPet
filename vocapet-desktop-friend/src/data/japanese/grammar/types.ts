// Grammar data model. `source/*.json` is OpenJLPT verbatim (CC BY-SA 4.0); `vi/*.json` is VocaPet editorial Vietnamese.
export type GrammarLevel = "N5" | "N4" | "N3" | "N2" | "N1";
export const GRAMMAR_LEVELS: GrammarLevel[] = ["N5", "N4", "N3", "N2", "N1"];

/** One entry of source/<level>.json, exactly as published by OpenJLPT. */
export type SourceGrammar = {
  id: string;
  pattern: string;
  reading?: string;
  romaji: string;
  level: GrammarLevel;
  meaning: string;
  formation: string;
  examples: { ja: string; furigana?: string; en: string }[];
  tags: string[];
  notes?: string;
};

/** One entry of vi/<level>.json: hand-written Vietnamese keyed by grammar id. draft = not yet reviewed. */
export type ViGrammar = {
  meaningVi: string;
  explanationVi: string;
  notesVi: string;
  examples: string[];
  /** Vietnamese for the source pattern's English parenthetical, e.g. "（time）" -> "thời gian". */
  qualifierVi?: string;
  /** Editorial: related or easily confused points (ids). */
  related?: string[];
  status: "draft" | "reviewed";
};

export type GrammarExample = {
  japanese: string;
  /** OpenJLPT markup, e.g. "{私|わたし}は"; null for kana-only sentences. */
  furigana: string | null;
  /** The source has no per-example romaji. */
  romaji: string | null;
  meaningVi: string | null;
  meaningEn: string;
};

export type GrammarGroupId =
  | "particle"
  | "verb"
  | "adjective"
  | "sentence"
  | "condition"
  | "time"
  | "reason"
  | "comparison"
  | "wish"
  | "rule"
  | "other";

export type GrammarPoint = {
  id: string;
  pattern: string;
  /** Pattern for display: the English qualifier of the source is replaced by its Vietnamese one. */
  displayPattern: string;
  /** Kana reading, only when the source gives one. */
  reading: string | null;
  romaji: string;
  /** Romaji without English qualifiers, for display. */
  romajiDisplay: string;
  level: GrammarLevel;
  meaningVi: string | null;
  meaningEn: string;
  /** Source formation (English tokens) and its Vietnamese rendering via a fixed token table. */
  formation: string;
  formationVi: string;
  explanationVi: string | null;
  examples: GrammarExample[];
  notesVi: string | null;
  notesEn: string | null;
  /** Source tags (English). */
  tags: string[];
  groups: GrammarGroupId[];
  /** Editorial list of related or easily confused points (from vi/*.json). The source has no such field. */
  relatedGrammar: string[];
  /** Status of the Vietnamese layer; null = no Vietnamese yet. */
  translation: "draft" | "reviewed" | null;
};
