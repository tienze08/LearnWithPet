// Data model for the Kanji network. Pure data: no React, no layout.
import type { Part } from "@/data/kanji";
import type { HanVietEntry } from "@/data/kanji-vi";

/** A word split into furigana segments. `hl` marks the target kanji/word to highlight. */
export type RubySegment = { t: string; r?: string; hl?: boolean };

export type KanjiVocab = {
  word: string;
  reading: string;
  meaning: string;
  /** Han Viet of the word's kanji (first reading each), e.g. "HỌC HIỆU". Only kanji with a sourced reading. */
  hanViet?: string;
  /** dataset = KANJI_N5 example, tango = real Tango catalog word, authored = written for the app (needs review). */
  source: "dataset" | "tango" | "authored";
  tangoId?: number;
  /** Kanji in the word that exist in the graph, with their meaning (Han Viet and Vietnamese meaning, never English). */
  composition: { char: string; meaning?: string }[];
  example?: { ja: RubySegment[]; vi: string };
};

export type Sentence = {
  ja: RubySegment[];
  /** Whole-sentence kana reading, when furigana per word is not available (Tango examples). */
  reading?: string;
  vi: string;
  source: "authored" | "tango";
};

/** Hand-written content for one kanji. Anything not provided stays "Chưa có dữ liệu". */
export type Enrichment = {
  radicalName?: string;
  radicalNote?: string;
  mnemonic?: { origin: string | null; tip: string | null; related: { char: string; meaning: string }[] };
  vocab?: KanjiVocab[];
  sentences?: Sentence[];
};

/** Everything the panel shows for one kanji. `null` always means "no data". */
export type KanjiDetail = {
  char: string;
  /** True when VocaPet teaches this kanji (Vietnamese content exists). */
  taught: boolean;
  meaningVi: string | null;
  /** All Han Viet readings, primary first. Not the Vietnamese meaning. */
  hanViet: string[];
  hanVietInfo: HanVietEntry | null;
  /** Other kanji with the same Han Viet reading. */
  sameHanViet: string[];
  meaningEn: string | null;
  on: string[];
  kun: string[];
  strokes: number | null;
  level: string | null;
  jlptOld: number | null;
  grade: number | null;
  radical: { char: string | null; number: number | null; name?: string; note?: string } | null;
  parts: Part[];
  krad: string[] | null;
  usedIn: string[];
  mnemonic: Enrichment["mnemonic"] | null;
  vocab: KanjiVocab[];
  sentences: Sentence[];
};
