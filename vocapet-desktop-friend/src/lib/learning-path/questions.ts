// Auto-generated practice questions for the Learning Path. Built here because grammar and kanji content only
// exists on the frontend; the backend only receives item ids and right/wrong. Deterministic per item, so a
// reported question can be reproduced.
import type { GrammarPoint } from "@/data/japanese/grammar";
import type { KanjiEntry } from "@/lib/japanese/kanji";
import type { PathItemType, PathVocab } from "@/api/learning-path.api";

export type QuestionKind =
  | "grammar-cloze"
  | "grammar-meaning"
  | "kanji-meaning"
  | "kanji-reading"
  | "vocab-meaning";

export interface Question {
  itemType: PathItemType;
  itemId: string;
  kind: QuestionKind;
  /** Instruction, Vietnamese. */
  prompt: string;
  /** What is asked about: a sentence with a blank, a kanji, a word or a pattern. */
  stem: string;
  stemLang: "ja" | "vi";
  /** Extra context, e.g. the sentence's Vietnamese translation. */
  hint: string | null;
  options: string[];
  optionsLang: "ja" | "vi";
  answer: string;
}

export const BLANK = "＿＿";

/** Small deterministic PRNG (mulberry32) seeded from a string. */
function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    const t = (h ^= h >>> 16) >>> 0;
    return t / 4294967296;
  };
}

function shuffle<T>(list: T[], seed: string): T[] {
  const r = rng(seed);
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Up to 3 distinct distractors, never equal to the answer. `tiers` are in preference order (closest first);
 * each tier is shuffled deterministically so the same item does not always show the same neighbours.
 */
function pickDistractors(
  answer: string,
  tiers: string[][],
  seed: string,
  avoid: string[] = [],
): string[] {
  const seen = new Set([answer, ...avoid]);
  const out: string[] = [];
  tiers.forEach((tier, i) => {
    for (const c of shuffle(tier, `${seed}:${i}`)) {
      const v = c.trim();
      if (out.length >= 3 || !v || seen.has(v)) continue;
      seen.add(v);
      out.push(v);
    }
  });
  return out;
}

function build(q: Omit<Question, "options">, distractors: string[]): Question | null {
  if (distractors.length < 3) return null;
  return { ...q, options: shuffle([q.answer, ...distractors], `${q.itemId}:${q.kind}:opts`) };
}

const JA = /[぀-ヿ㐀-鿿]/;

/** Japanese pieces of a pattern: "〜ではありません / 〜じゃない" → ["ではありません", "じゃない"]. */
export function patternTokens(pattern: string): string[] {
  return pattern
    .replace(/[（(][^）)]*[）)]/g, " ")
    .split(/[〜~／/、\s]+/)
    .map((t) => t.trim())
    .filter((t) => t && JA.test(t));
}

/**
 * Hides one occurrence of token. Prefers one right before punctuation or the end (sentence-final か/ね/よ),
 * so "これはかばんですか。" blanks the final か, not the one inside かばん.
 * shortcut: no word segmentation; a particle inside a longer word can still be picked. Reports catch the rest.
 */
function blankOut(sentence: string, token: string): string {
  let at = sentence.indexOf(token);
  for (let i = at; i >= 0; i = sentence.indexOf(token, i + 1)) {
    const after = sentence[i + token.length];
    if (after === undefined || /[。、？！?!」）\s]/.test(after)) {
      at = i;
      break;
    }
  }
  return sentence.slice(0, at) + BLANK + sentence.slice(at + token.length);
}

// ---------- grammar ----------

/**
 * Fill in the blank: one example sentence with the pattern's longest token hidden; distractors are tokens of
 * patterns sharing a tag (then a group). Falls back to a meaning question when no example contains the pattern.
 */
export function grammarQuestion(g: GrammarPoint, all: GrammarPoint[]): Question | null {
  const tokens = patternTokens(g.pattern).sort((a, b) => b.length - a.length);
  const others = all.filter((o) => o.id !== g.id);
  const sameTag = others.filter((o) => o.tags.some((t) => g.tags.includes(t)));
  const sameGroup = others.filter((o) => o.groups.some((x) => g.groups.includes(x)));
  for (const e of g.examples) {
    const token = tokens.find((t) => e.japanese.includes(t));
    if (!token) continue;
    const stem = blankOut(e.japanese, token);
    const first = (list: GrammarPoint[]) =>
      list.flatMap((o) => patternTokens(o.pattern).slice(0, 1));
    const notInSentence = (list: string[]) => list.filter((t) => !e.japanese.includes(t));
    // Siblings of the same pattern (これ → それ/あれ/どれ) are the closest distractors; the translation disambiguates.
    const siblings = tokens.filter((t) => t !== token);
    const q = build(
      {
        itemType: "GRAMMAR",
        itemId: g.id,
        kind: "grammar-cloze",
        prompt: "Chọn phần điền vào chỗ trống để câu có nghĩa như bản dịch",
        stem,
        stemLang: "ja",
        hint: e.meaningVi ?? e.meaningEn,
        optionsLang: "ja",
        answer: token,
      },
      pickDistractors(
        token,
        [
          notInSentence(siblings),
          notInSentence(first(sameTag)),
          notInSentence(first(sameGroup)),
          notInSentence(first(others)),
        ],
        `${g.id}:cloze`,
      ),
    );
    if (q) return q;
  }
  const meaning = (o: GrammarPoint) => o.meaningVi ?? o.meaningEn;
  return build(
    {
      itemType: "GRAMMAR",
      itemId: g.id,
      kind: "grammar-meaning",
      prompt: "Mẫu ngữ pháp này có nghĩa là gì?",
      stem: g.displayPattern,
      stemLang: "ja",
      hint: null,
      optionsLang: "vi",
      answer: meaning(g),
    },
    pickDistractors(
      meaning(g),
      [sameTag.map(meaning), sameGroup.map(meaning), others.map(meaning)],
      `${g.id}:meaning`,
    ),
  );
}

// ---------- kanji ----------

const readingOf = (k: KanjiEntry) => k.on[0] ?? k.kun[0] ?? "";

/** Two questions per kanji: its meaning and its reading. The item counts as correct only if both are. */
export function kanjiQuestions(k: KanjiEntry, all: KanjiEntry[]): Question[] {
  const others = all.filter((o) => o.char !== k.char);
  const sameScript = (o: KanjiEntry) => (k.on.length ? o.on[0] : o.kun[0]) ?? "";
  const meaning = build(
    {
      itemType: "KANJI",
      itemId: k.char,
      kind: "kanji-meaning",
      prompt: "Chữ Kanji này có nghĩa là gì?",
      stem: k.char,
      stemLang: "ja",
      hint: null,
      optionsLang: "vi",
      answer: k.meaning,
    },
    pickDistractors(k.meaning, [others.map((o) => o.meaning)], `${k.char}:meaning`),
  );
  const reading = build(
    {
      itemType: "KANJI",
      itemId: k.char,
      kind: "kanji-reading",
      prompt: k.on.length ? "Âm On của chữ này là gì?" : "Âm Kun của chữ này là gì?",
      stem: k.char,
      stemLang: "ja",
      hint: null,
      optionsLang: "ja",
      answer: readingOf(k),
    },
    pickDistractors(readingOf(k), [others.map(sameScript)], `${k.char}:reading`, [
      ...k.on,
      ...k.kun,
    ]),
  );
  return [meaning, reading].filter((q): q is Question => q !== null);
}

// ---------- vocabulary ----------

export function vocabQuestion(v: PathVocab, all: PathVocab[]): Question | null {
  const others = all.filter((o) => o.id !== v.id);
  const sameLesson = others.filter((o) => o.lesson === v.lesson);
  return build(
    {
      itemType: "VOCAB",
      itemId: v.id,
      kind: "vocab-meaning",
      prompt: "Từ này có nghĩa là gì?",
      stem: v.word,
      stemLang: "ja",
      hint: v.word !== v.kana ? v.kana : null,
      optionsLang: "vi",
      answer: v.meaning,
    },
    pickDistractors(
      v.meaning,
      [sameLesson.map((o) => o.meaning), others.map((o) => o.meaning)],
      `${v.id}:meaning`,
    ),
  );
}
