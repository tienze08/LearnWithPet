// Answer checking for the typed exercises. Pure, so it also runs in Node checks.
import { parseFurigana, readingOf } from "@/lib/japanese/grammar/furigana";
import { normalizeJa } from "@/lib/japanese/practice";
import type { Blank, Line } from "./types";

type Spoken = Pick<Line, "japanese" | "furigana">;

/** Replaces the line's kanji words by their reading, so kanji, kana and mixed answers compare alike. */
export function toKana(text: string, line: Spoken): string {
  const ruby = parseFurigana(line.furigana ?? "")
    .filter((s) => s.r)
    .sort((a, b) => b.t.length - a.t.length);
  return ruby.reduce((out, s) => out.replaceAll(s.t, s.r!), text.normalize("NFKC"));
}

const comparable = (text: string, line: Spoken) => normalizeJa(toKana(text, line));

export function gradeBlank(line: Spoken, blank: Blank, answer: string): boolean {
  const given = comparable(answer, line);
  return (
    !!given && [blank.text, ...(blank.accept ?? [])].some((a) => comparable(a, line) === given)
  );
}

export type PartStatus = "ok" | "missing" | "particle" | "spelling" | "wrong";
export interface DictationPart {
  text: string;
  status: PartStatus;
}
export interface DictationResult {
  correct: boolean;
  /** The sentence cut into words, each marked with what went wrong there. */
  parts: DictationPart[];
  /** Characters the learner wrote that the sentence does not have. */
  extra: string;
}

const PARTICLES = new Set([
  "は",
  "が",
  "を",
  "に",
  "で",
  "へ",
  "と",
  "も",
  "の",
  "か",
  "や",
  "ね",
  "よ",
  "から",
  "まで",
  "より",
]);

/** Words of the sentence: furigana groups stay whole, the rest is split by the platform's Japanese segmenter. */
function wordsOf(line: Spoken): { text: string; kana: string }[] {
  const segmenter = new Intl.Segmenter("ja", { granularity: "word" });
  return parseFurigana(line.furigana ?? line.japanese).flatMap((s) =>
    s.r
      ? [{ text: s.t, kana: s.r }]
      : [...segmenter.segment(s.t)]
          .filter((w) => w.isWordLike)
          .map((w) => ({ text: w.segment, kana: w.segment })),
  );
}

/** Edit-distance alignment: how each expected character was answered, and which answered characters are surplus. */
function align(expected: string, given: string) {
  const cost = Array.from({ length: expected.length + 1 }, (_, i) =>
    Array.from({ length: given.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= expected.length; i++)
    for (let j = 1; j <= given.length; j++)
      cost[i][j] = Math.min(
        cost[i - 1][j - 1] + (expected[i - 1] === given[j - 1] ? 0 : 1),
        cost[i - 1][j] + 1,
        cost[i][j - 1] + 1,
      );
  const marks: ("same" | "changed" | "missing")[] = new Array(expected.length);
  /** Surplus characters, by the expected position they were typed before. */
  const surplus: { at: number; ch: string }[] = [];
  let i = expected.length;
  let j = given.length;
  while (i > 0 || j > 0) {
    const same = i > 0 && j > 0 && expected[i - 1] === given[j - 1];
    if (i > 0 && j > 0 && cost[i][j] === cost[i - 1][j - 1] + (same ? 0 : 1)) {
      marks[i - 1] = same ? "same" : "changed";
      i--;
      j--;
    } else if (i > 0 && cost[i][j] === cost[i - 1][j] + 1) {
      marks[--i] = "missing";
    } else surplus.unshift({ at: i, ch: given[--j] });
  }
  return { marks, surplus };
}

export function gradeDictation(
  line: Spoken,
  answer: string,
  accept: string[] = [],
): DictationResult {
  const given = comparable(answer, line);
  const full = line.furigana ? readingOf(line.furigana) : line.japanese;
  const accepted = [line.japanese, full, ...accept].map((a) => comparable(a, line));
  const words = wordsOf(line).map((w) => ({ ...w, kana: normalizeJa(w.kana) }));
  if (given && accepted.includes(given))
    return { correct: true, parts: words.map((w) => ({ text: w.text, status: "ok" })), extra: "" };

  const { marks, surplus } = align(words.map((w) => w.kana).join(""), given);
  let from = 0;
  const parts = words.map((w) => {
    const to = from + w.kana.length;
    const own = marks.slice(from, to);
    // Surplus characters strictly inside the word are a misspelling of it.
    const inside = surplus.some((s) => s.at > from && s.at < to);
    from = to;
    let status: PartStatus = "ok";
    if (inside || own.some((m) => m !== "same")) {
      if (own.every((m) => m === "missing") && !inside) status = "missing";
      else if (PARTICLES.has(w.text)) status = "particle";
      else status = own.some((m) => m === "same") ? "spelling" : "wrong";
    }
    return { text: w.text, status };
  });
  const bounds = new Set([0]);
  words.reduce((at, w) => (bounds.add(at + w.kana.length), at + w.kana.length), 0);
  return {
    correct: false,
    parts,
    extra: surplus
      .filter((s) => bounds.has(s.at))
      .map((s) => s.ch)
      .join(""),
  };
}

/** Easy dictation help: the first character of each word, the rest hidden. */
export const skeleton = (line: Spoken) =>
  wordsOf(line)
    .map((w) => w.kana[0] + "○".repeat(w.kana.length - 1))
    .join("　");

/** How much of the sentence a speech recognizer heard, 0..100. Content matching, not a pronunciation score. */
export function contentMatch(line: Spoken, heard: string) {
  const full = line.furigana ? readingOf(line.furigana) : line.japanese;
  const expected = normalizeJa(full);
  const { marks, surplus } = align(expected, comparable(heard, line));
  const wrong = marks.filter((m) => m !== "same").length + surplus.length;
  const result = gradeDictation(line, heard);
  return {
    percent: result.correct ? 100 : Math.max(0, Math.round((1 - wrong / expected.length) * 100)),
    ...result,
  };
}
