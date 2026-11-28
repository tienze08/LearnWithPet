// Sentence Bank: every example sentence once, linked to the grammar, words and kanji it uses. Derived from the
// content files, so there is no second copy of any sentence. Pure, so it also runs in Node checks.
import type { GrammarExample, GrammarLevel, GrammarPoint } from "@/data/japanese/grammar/types";
import { parseFurigana } from "./grammar/furigana";

export type Sentence = GrammarExample & {
  /** `<grammarId>:<index>`; stable while the source keeps its example order. */
  id: string;
  level: GrammarLevel;
  grammarIds: string[];
  kanji: string[];
  /** Status of the Vietnamese translation; only "reviewed" is safe to grade against. */
  translation: GrammarPoint["translation"];
};

export type BankWord = { expression: string | null; kana: string };

export function buildSentences(grammar: GrammarPoint[]): Sentence[] {
  const byText = new Map<string, Sentence>();
  for (const g of grammar) {
    g.examples.forEach((e, i) => {
      const seen = byText.get(e.japanese);
      if (seen) {
        if (!seen.grammarIds.includes(g.id)) seen.grammarIds.push(g.id);
        return;
      }
      const kanji = [...new Set(e.japanese.match(/\p{Script=Han}/gu) ?? [])];
      byText.set(e.japanese, {
        ...e,
        id: `${g.id}:${i}`,
        level: g.level,
        grammarIds: [g.id],
        kanji,
        translation: g.translation,
      });
    });
  }
  return [...byText.values()];
}

// What may stand right before / after a hiragana-only word. Without this, いつ matches いつも and そう matches そうじ.
const BEFORE = /(^|[はのにでとがをへもか、。「」？！])$/;
const AFTER = /^($|です|[はのにでとがをへか、。「」？！])/;
const KATAKANA = /[ァ-ヺー]/;

/**
 * Whether the sentence uses the word. Kanji words must line up with whole furigana segments and read the same, so
 * 本 does not match 日本 and 家（うち） does not match 家（いえ）. Verbs match on their kanji stem, covering conjugations.
 * shortcut: no morphological analysis, so kana-only verbs and words next to unlisted kana are missed; add per-sentence
 * word links to the content if recall matters.
 */
export function usesWord(
  s: Pick<Sentence, "japanese" | "furigana">,
  { expression, kana }: BankWord,
): boolean {
  const word = expression ?? kana;
  const verb = word.endsWith("ます");
  const stem = verb ? (word.match(/^.*\p{Script=Han}/u)?.[0] ?? null) : word;
  if (!stem) return false;
  const reading = verb ? kana.slice(0, kana.length - (word.length - stem.length)) : kana;
  const hasKanji = /\p{Script=Han}/u.test(stem);

  const segments = parseFurigana(s.furigana ?? s.japanese);
  for (let at = s.japanese.indexOf(stem); at >= 0; at = s.japanese.indexOf(stem, at + 1)) {
    const end = at + stem.length;
    if (hasKanji) {
      let pos = 0;
      let read = "";
      let cut = false;
      for (const seg of segments) {
        const from = pos;
        pos += seg.t.length;
        if (pos <= at || from >= end) continue;
        // A ruby segment cannot be split; plain text can.
        if (seg.r && (from < at || pos > end)) cut = true;
        else read += seg.r ?? seg.t.slice(Math.max(0, at - from), end - from);
      }
      if (!cut && read === reading) return true;
    } else if (KATAKANA.test(stem[0])) {
      if (!KATAKANA.test(s.japanese[at - 1] ?? "") && !KATAKANA.test(s.japanese[end] ?? ""))
        return true;
    } else if (BEFORE.test(s.japanese.slice(0, at)) && AFTER.test(s.japanese.slice(end)))
      return true;
  }
  return false;
}
