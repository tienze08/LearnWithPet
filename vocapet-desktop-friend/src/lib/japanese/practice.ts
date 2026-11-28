// Translation practice and session building. Pure, so it also runs in Node checks.
import { parseFurigana, readingOf } from "./grammar/furigana";
import { usesWord, type BankWord, type Sentence } from "./sentences";

export type Direction = "ja-vi" | "vi-ja";

export interface TranslateItem {
  type: "translate";
  kind: "translate";
  direction: Direction;
  sentence: Sentence;
}

/** Progress key of one sentence in one direction. */
export const translateKey = (t: Pick<TranslateItem, "sentence" | "direction">) =>
  `${t.sentence.id}:${t.direction}`;

const readingIn = (s: Sentence) => (s.furigana ? readingOf(s.furigana) : s.japanese);

/**
 * 1 short, 2 medium, 3 long or multi-clause.
 * shortcut: judged by length only; replace with an authored level once the content has one.
 */
export function levelOf(s: Sentence): 1 | 2 | 3 {
  const length = readingIn(s).length;
  const level = (length <= 12 ? 1 : length <= 20 ? 2 : 3) + (s.japanese.includes("、") ? 1 : 0);
  return Math.min(level, 3) as 1 | 2 | 3;
}

/** Both directions of the translated sentences, easiest first, one direction after the other. */
export function translateItems(sentences: Sentence[], directions: Direction[]): TranslateItem[] {
  const usable = sentences.filter((s) => s.meaningVi).sort((a, b) => levelOf(a) - levelOf(b));
  return directions.flatMap((direction) =>
    usable.map((sentence) => ({ type: "translate", kind: "translate", direction, sentence })),
  );
}

export const normalizeJa =(text: string) =>
  text.normalize("NFKC").replace(/[\s。、，．！？!?「」『』・,.]/g, "");

/**
 * Exact match against the sentence in kanji or kana; a leading 私は may be left out. A miss does not mean wrong:
 * the learner (or the AI) judges other phrasings.
 */
export function matchesJapanese(answer: string, s: Sentence): boolean {
  const given = normalizeJa(answer);
  if (!given) return false;
  return [s.japanese, readingIn(s)]
    .map(normalizeJa)
    .flatMap((t) => [t, t.replace(/^(私|わたし)は/, "")])
    .includes(given);
}

export interface Hint {
  word: string;
  reading: string | null;
  meaning: string | null;
}

/** Vocabulary hints: the Tango words the sentence uses, then readings of its other kanji words. */
export function hintsFor(
  s: Pick<Sentence, "japanese" | "furigana">,
  words: (BankWord & { primaryMeaning: string | null })[],
): Hint[] {
  const used: Hint[] = words
    .filter((w) => usesWord(s, w))
    .map((w) => ({
      word: w.expression ?? w.kana,
      reading: w.expression ? w.kana : null,
      meaning: w.primaryMeaning,
    }));
  const rest: Hint[] = parseFurigana(s.furigana ?? "")
    .filter((p) => p.r && !used.some((u) => u.word.includes(p.t)))
    .map((p) => ({ word: p.t, reading: p.r!, meaning: null }));
  return [...used, ...rest];
}

/** Up to n items in random order. */
export function sample<T>(list: T[], n = list.length): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}
