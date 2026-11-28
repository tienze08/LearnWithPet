// Auto-generated practice questions for the Learning Path. Built here because grammar and kanji content only
// exists on the frontend; the backend only receives item ids and right/wrong. Deterministic per item, so a
// reported question can be reproduced.
import type { GrammarExample, GrammarPoint } from "@/data/japanese/grammar/types";
import type { KanjiEntry } from "@/lib/japanese/kanji";
import type { PathItemType, PathVocab } from "@/api/learning-path.api";
import { parseFurigana } from "@/lib/japanese/grammar/furigana";
import { usesWord } from "@/lib/japanese/sentences";

export type QuestionKind =
  | "kana-romaji"
  | "kana-recognize"
  | "kanji-recognize"
  | "grammar-cloze"
  | "grammar-meaning"
  | "grammar-sentence"
  | "grammar-verb"
  | "kanji-meaning"
  | "kanji-reading"
  | "vocab-meaning"
  | "vocab-word"
  | "vocab-reading"
  | "vocab-listen"
  | "vocab-cloze";

/** A multiple-choice question (no `type` field; match and order exercises have one). */
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
  /** Furigana markup for texts above that contain kanji, keyed by the plain text. */
  ruby?: Ruby;
  /** Text to read aloud; the card then shows a play button. */
  speak?: string;
}

export type Ruby = Record<string, string>;

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

function build(
  q: Omit<Question, "options">,
  distractors: string[],
  seed = `${q.itemId}:${q.kind}:opts`,
): Question | null {
  if (distractors.length < 3) return null;
  return { ...q, options: shuffle([q.answer, ...distractors], seed) };
}

const JA = /[぀-ヿ㐀-鿿]/;

// ---------- furigana ----------

/** Readings of the kanji used by grammar patterns and the drill verbs; sentences carry their own markup. */
const READINGS: Record<string, string> = Object.fromEntries(
  "上手:じょうず 下手:へた 一番:いちばん 全然:ぜんぜん 前:まえ 後:あと 好:す 嫌:きら 方:ほう 中:なか 何:なに 誰:だれ 書:か 飲:の 読:よ 帰:かえ 待:ま 話:はな 買:か 泳:およ 行:い 食:た 見:み"
    .split(" ")
    .map((pair) => pair.split(":")),
);
const READABLE = new RegExp(Object.keys(READINGS).join("|"), "g");
const annotate = (text: string) => text.replace(READABLE, (k) => `{${k}|${READINGS[k]}}`);
const annotated = (texts: string[]): Ruby => Object.fromEntries(texts.map((t) => [t, annotate(t)]));

/** The sentence's markup with the plain-text range [at, at + length) replaced by the blank. */
function blankMarkup(markup: string, at: number, length: number): string {
  let pos = 0;
  let out = "";
  for (const s of parseFurigana(markup)) {
    const from = pos;
    pos += s.t.length;
    const before = s.t.slice(0, Math.max(0, at - from));
    const after = s.t.slice(Math.max(0, at + length - from));
    if (before === s.t || after === s.t) out += s.r ? `{${s.t}|${s.r}}` : s.t;
    else {
      // A reading cannot be split, so a partly blanked word keeps its remainder without one.
      out += before + (at >= from && at < pos ? BLANK : "") + after;
    }
  }
  return out;
}

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

/** Patterns closest to g first: sharing a tag, then a group, then everything else. */
function neighbours(g: GrammarPoint, all: GrammarPoint[]): GrammarPoint[][] {
  const others = all.filter((o) => o.id !== g.id);
  return [
    others.filter((o) => o.tags.some((t) => g.tags.includes(t))),
    others.filter((o) => o.groups.some((x) => g.groups.includes(x))),
    others,
  ];
}

/** Tokens that would also be a correct answer for a pattern, so they are never offered as wrong ones. */
const ALSO_RIGHT: Record<string, string[]> = {
  "kurai-gurai": ["くらい", "ぐらい"],
  ya: ["と"],
  "to-and": ["や"],
  desu: ["だ"],
  ne: ["よ"],
  yo: ["ね"],
};

/** One example with the pattern's longest token hidden; null when the sentence does not contain the pattern. */
function grammarCloze(
  g: GrammarPoint,
  all: GrammarPoint[],
  e: GrammarExample,
  seed?: string,
): Question | null {
  const tokens = patternTokens(g.pattern).sort((a, b) => b.length - a.length);
  const token = tokens.find((t) => e.japanese.includes(t));
  if (!token) return null;
  const first = (list: GrammarPoint[]) => list.flatMap((o) => patternTokens(o.pattern).slice(0, 1));
  const notInSentence = (list: string[]) => list.filter((t) => !e.japanese.includes(t));
  // Siblings of the same pattern (これ → それ/あれ/どれ) are the closest distractors; the translation disambiguates.
  const tiers = [tokens.filter((t) => t !== token), ...neighbours(g, all).map(first)];
  const stem = blankOut(e.japanese, token);
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
    pickDistractors(token, tiers.map(notInSentence), `${g.id}:cloze`, ALSO_RIGHT[g.id]),
    seed,
  );
  if (!q) return null;
  const markup = blankMarkup(e.furigana ?? e.japanese, stem.indexOf(BLANK), token.length);
  return { ...q, ruby: { ...annotated(q.options), [stem]: markup } };
}

/**
 * Fill in the blank from the first example that contains the pattern; distractors are tokens of neighbouring
 * patterns. Falls back to a meaning question when no example contains the pattern.
 */
export function grammarQuestion(g: GrammarPoint, all: GrammarPoint[]): Question | null {
  for (const e of g.examples) {
    const q = grammarCloze(g, all, e);
    if (q) return q;
  }
  const meaning = (o: GrammarPoint) => o.meaningVi ?? o.meaningEn;
  const q = build(
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
      neighbours(g, all).map((list) => list.map(meaning)),
      `${g.id}:meaning`,
    ),
  );
  return q && { ...q, ruby: annotated([q.stem]) };
}

/** Vietnamese meaning → the Japanese sentence that says it. */
function grammarSentence(g: GrammarPoint, all: GrammarPoint[], e: GrammarExample): Question | null {
  if (!e.meaningVi) return null;
  const texts = (list: GrammarPoint[]) =>
    list.flatMap((o) =>
      o.examples.filter((x) => x.meaningVi !== e.meaningVi).map((x) => x.japanese),
    );
  const seed = `${g.id}:sentence:${e.japanese}`;
  const q = build(
    {
      itemType: "GRAMMAR",
      itemId: g.id,
      kind: "grammar-sentence",
      prompt: "Câu nào đúng với nghĩa này?",
      stem: e.meaningVi,
      stemLang: "vi",
      hint: null,
      optionsLang: "ja",
      answer: e.japanese,
    },
    pickDistractors(e.japanese, [[g], ...neighbours(g, all)].map(texts), seed),
    `${seed}:opts`,
  );
  if (!q) return null;
  const examples = all.flatMap((o) => o.examples);
  const markupOf = (t: string) => examples.find((x) => x.japanese === t)?.furigana ?? t;
  return { ...q, ruby: Object.fromEntries(q.options.map((o) => [o, markupOf(o)])) };
}

// ---------- verb forms ----------

/** N5 verbs: dictionary, ます stem, て, た, ない, Vietnamese. Hand-written, so no conjugation code can get them wrong. */
const VERBS = [
  ["書く", "書き", "書いて", "書いた", "書かない", "viết"],
  ["飲む", "飲み", "飲んで", "飲んだ", "飲まない", "uống"],
  ["読む", "読み", "読んで", "読んだ", "読まない", "đọc"],
  ["帰る", "帰り", "帰って", "帰った", "帰らない", "về"],
  ["待つ", "待ち", "待って", "待った", "待たない", "đợi"],
  ["話す", "話し", "話して", "話した", "話さない", "nói"],
  ["買う", "買い", "買って", "買った", "買わない", "mua"],
  ["泳ぐ", "泳ぎ", "泳いで", "泳いだ", "泳がない", "bơi"],
  ["行く", "行き", "行って", "行った", "行かない", "đi"],
  ["食べる", "食べ", "食べて", "食べた", "食べない", "ăn"],
  ["見る", "見", "見て", "見た", "見ない", "xem"],
  ["する", "し", "して", "した", "しない", "làm"],
];
const FORM_AT: Record<string, number> = { dict: 0, stem: 1, te: 2, ta: 3, nai: 4 };

/** The verb form a pattern attaches to and what follows it, read from the source formation ("Verb-te + もいい"). */
export function verbSlot(g: GrammarPoint): { form: string; suffix: string } | null {
  // 〜だけ accepts several forms (飲むだけ, 飲んだだけ), so it cannot be asked as a single-answer question.
  if (g.id === "dake") return null;
  for (const part of g.formation.split(" / ")) {
    const m = part.match(/^Verb-(dict|stem|te|ta|nai stem|nai)(?: \+ (.+))?$/);
    if (!m) continue;
    const rest = (m[2] ?? "").split(" + ");
    const cut = rest.findIndex((r) => r.startsWith("Verb"));
    const suffix = (cut < 0 ? rest : rest.slice(0, cut)).join("");
    if (!/[A-Za-z]/.test(suffix)) return { form: m[1], suffix };
  }
  return null;
}

function grammarVerbForms(g: GrammarPoint, count: number): Question[] {
  const slot = verbSlot(g);
  if (!slot) return [];
  // 行きに行く is not something anyone says.
  const verbs = VERBS.filter((v) => !(slot.suffix.includes("行く") && v[0] === "行く"));
  const out: Question[] = [];
  for (const v of shuffle(verbs, `${g.id}:verbs`).slice(0, count)) {
    const naiStem = v[4].slice(0, -2);
    const answer = slot.form === "nai stem" ? naiStem : v[FORM_AT[slot.form]];
    const seed = `${g.id}:verb:${v[0]}`;
    const q = build(
      {
        itemType: "GRAMMAR",
        itemId: g.id,
        kind: "grammar-verb",
        prompt: `Chọn dạng động từ đúng cho mẫu ${g.displayPattern}`,
        stem: `${v[0]} → ${BLANK}${slot.suffix}`,
        stemLang: "ja",
        hint: `${v[0]}: ${v[5]}`,
        optionsLang: "ja",
        answer,
      },
      pickDistractors(answer, [[...v.slice(0, 5), naiStem]], seed),
      `${seed}:opts`,
    );
    if (q) out.push({ ...q, ruby: annotated([q.prompt, q.stem, q.hint!, ...q.options]) });
  }
  return out;
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

// ---------- kana ----------

/** One kana of the path: id "hiragana:か". */
export interface KanaItem {
  id: string;
  script: "hiragana" | "katakana";
  kana: string;
  romaji: string;
  /** basic / dakuten / handakuten / yoon: distractors come from the same group first. */
  section: string;
}

/** Kana → romaji, or (reverse, for practice) romaji → kana. Distractors come from the same script. */
export function kanaQuestion(k: KanaItem, all: KanaItem[], reverse = false): Question | null {
  const same = all.filter((o) => o.script === k.script && o.id !== k.id);
  const group = same.filter((o) => o.section === k.section);
  const script = k.script === "hiragana" ? "Hiragana" : "Katakana";
  if (reverse)
    return build(
      {
        itemType: "KANA",
        itemId: k.id,
        kind: "kana-recognize",
        prompt: `Chọn chữ ${script} đọc là`,
        stem: k.romaji,
        stemLang: "vi",
        hint: null,
        optionsLang: "ja",
        answer: k.kana,
      },
      pickDistractors(
        k.kana,
        [group.map((o) => o.kana), same.map((o) => o.kana)],
        `${k.id}:recognize`,
      ),
    );
  return build(
    {
      itemType: "KANA",
      itemId: k.id,
      kind: "kana-romaji",
      prompt: "Chữ này đọc là gì?",
      stem: k.kana,
      stemLang: "ja",
      hint: null,
      optionsLang: "vi",
      answer: k.romaji,
    },
    pickDistractors(
      k.romaji,
      [group.map((o) => o.romaji), same.map((o) => o.romaji)],
      `${k.id}:romaji`,
    ),
  );
}

// ---------- recognition ----------

/** Meaning → kanji: "which kanji means …?". */
export function kanjiRecognize(k: KanjiEntry, all: KanjiEntry[]): Question | null {
  return build(
    {
      itemType: "KANJI",
      itemId: k.char,
      kind: "kanji-recognize",
      prompt: "Chữ Kanji nào có nghĩa là",
      stem: k.meaning,
      stemLang: "vi",
      hint: `Âm Hán Việt: ${k.hanViet}`,
      optionsLang: "ja",
      answer: k.char,
    },
    pickDistractors(
      k.char,
      [all.filter((o) => o.char !== k.char).map((o) => o.char)],
      `${k.char}:recognize`,
    ),
  );
}

// ---------- matching ----------

export interface MatchExercise {
  type: "match";
  kind: "vocab-match";
  /** One pair per word; right sides are shown shuffled. */
  pairs: { itemType: PathItemType; itemId: string; left: string; right: string }[];
}

/** Match 2–4 words with their meanings. Words with the same meaning are not grouped together. */
export function vocabMatch(words: PathVocab[]): MatchExercise | null {
  const seen = new Set<string>();
  const pairs = words.filter((w) => w.meaning && !seen.has(w.meaning) && seen.add(w.meaning));
  if (pairs.length < 2) return null;
  return {
    type: "match",
    kind: "vocab-match",
    pairs: pairs.map((w) => ({ itemType: "VOCAB", itemId: w.id, left: w.word, right: w.meaning })),
  };
}

// ---------- sentence order ----------

export interface OrderExercise {
  type: "order";
  kind: "grammar-order";
  itemType: "GRAMMAR";
  itemId: string;
  /** Pieces in a deterministic shuffled order. */
  chunks: string[];
  answer: string[];
  hint: string | null;
  ruby?: Ruby;
}

/**
 * Put the pieces of an example sentence in order. Pieces come from the furigana markup ("{私|わたし}は{学生|がくせい}です。"
 * → 私 / は / 学生 / です。), so no word segmenter is needed; sentences without markup or with fewer than 3 pieces are skipped.
 */
const PARTICLE_START = /^(は|が|を|に|で|と|も|へ|の|や|か|から|まで|より|ね|よ)/;

const plain = (markup: string) => markup.replace(/\{([^|}]+)\|[^}]*\}/g, "$1");

function orderOf(g: GrammarPoint, e: GrammarExample): OrderExercise | null {
  if (!e.furigana) return null;
  const raw = [...e.furigana.matchAll(/\{([^|}]+)\|[^}]*\}|[^{]+/g)]
    .map((m) => ({ text: m[0].trim(), ruby: m[1] !== undefined })) // pieces keep their markup until the end
    .filter((p) => p.text);
  // A kanji keeps the kana right after it (okurigana, copula: 食べます, 学生です) unless that kana starts with a particle.
  let pieces: string[] = [];
  for (let i = 0; i < raw.length; i++) {
    const next = raw[i + 1];
    if (raw[i].ruby && next && !next.ruby && !PARTICLE_START.test(next.text)) {
      pieces.push(raw[i].text + next.text);
      i++;
    } else pieces.push(raw[i].text);
  }
  // Trailing punctuation joins the last piece; long sentences merge their two shortest neighbours.
  pieces = pieces.reduce<string[]>(
    (acc, p) =>
      /^[。、！？!?」]+$/.test(p) && acc.length
        ? [...acc.slice(0, -1), acc[acc.length - 1] + p]
        : [...acc, p],
    [],
  );
  const size = (i: number) => plain(pieces[i]).length + plain(pieces[i + 1]).length;
  while (pieces.length > 6) {
    let best = 0;
    for (let i = 1; i < pieces.length - 1; i++) if (size(i) < size(best)) best = i;
    pieces = [...pieces.slice(0, best), pieces[best] + pieces[best + 1], ...pieces.slice(best + 2)];
  }
  const ruby: Ruby = Object.fromEntries(pieces.map((p) => [plain(p), p]));
  pieces = pieces.map(plain);
  if (pieces.length < 3 || new Set(pieces).size !== pieces.length) return null;
  let chunks = shuffle(pieces, `${g.id}:order`);
  if (chunks.join("") === pieces.join("")) chunks = [...chunks.slice(1), chunks[0]];
  return {
    type: "order",
    kind: "grammar-order",
    itemType: "GRAMMAR",
    itemId: g.id,
    chunks,
    answer: pieces,
    hint: e.meaningVi ?? e.meaningEn,
    ruby,
  };
}

export function grammarOrder(g: GrammarPoint): OrderExercise | null {
  for (const e of g.examples) {
    const q = orderOf(g, e);
    if (q) return q;
  }
  return null;
}

/** Anything the practice phase can show. */
export type Exercise = Question | MatchExercise | OrderExercise;

/** Items an exercise covers (a match covers several words). */
export function exerciseItems(e: Exercise): { itemType: PathItemType; itemId: string }[] {
  if ("type" in e && e.type === "match")
    return e.pairs.map((p) => ({ itemType: p.itemType, itemId: p.itemId }));
  return [{ itemType: e.itemType, itemId: e.itemId }];
}

// ---------- grammar drill ----------

/** The exercise set of one grammar point: pick the sentence, verb forms, fill the blank, order the pieces. */
export function grammarDrill(g: GrammarPoint, all: GrammarPoint[]): (Question | OrderExercise)[] {
  const take = <T>(list: (T | null)[], n: number) =>
    list.filter((x): x is T => x !== null).slice(0, n);
  return [
    ...take(
      g.examples.map((e) => grammarSentence(g, all, e)),
      2,
    ),
    ...grammarVerbForms(g, 3),
    ...take(
      g.examples.map((e) => {
        // A token that appears twice can be blanked in the wrong place (冷たい水が飲みたい), so skip those.
        const repeated = patternTokens(g.pattern).some((t) => e.japanese.split(t).length > 2);
        return repeated ? null : grammarCloze(g, all, e, `${g.id}:cloze:${e.japanese}`);
      }),
      3,
    ),
    ...take(
      g.examples.map((e) => orderOf(g, e)),
      2,
    ),
  ];
}

// ---------- vocabulary drill ----------

export interface DrillWord {
  id: number;
  expression: string | null;
  kana: string;
  primaryMeaning: string | null;
}

const written = (w: DrillWord) => w.expression ?? w.kana;
const wordMarkup = (w: DrillWord) => (w.expression ? `{${w.expression}|${w.kana}}` : w.kana);
type VocabKind = "vocab-meaning" | "vocab-word" | "vocab-reading" | "vocab-listen" | "vocab-cloze";
const VOCAB_KINDS: VocabKind[] = [
  "vocab-meaning",
  "vocab-reading",
  "vocab-listen",
  "vocab-cloze",
  "vocab-word",
];

/** One question of the given kind, or null when the word cannot be asked that way. */
function vocabAs(
  kind: VocabKind,
  w: DrillWord,
  pool: DrillWord[],
  sentences: GrammarExample[],
): Question | null {
  const meaning = w.primaryMeaning;
  if (!meaning) return null;
  // A word with the same meaning or spelling would be a second right answer.
  const others = pool.filter(
    (o) =>
      o.primaryMeaning &&
      o.primaryMeaning !== meaning &&
      written(o) !== written(w) &&
      o.kana !== w.kana,
  );
  const seed = `tango:${w.id}:${kind}`;
  const base = { itemType: "VOCAB" as const, itemId: `tango:${w.id}`, kind, hint: null };
  const pick = (answer: string, from: (o: DrillWord) => string) =>
    pickDistractors(answer, [others.map(from)], seed);
  const words = (q: Question | null): Question | null => {
    if (!q) return null;
    const markup = [w, ...others].map((o) => [written(o), wordMarkup(o)]);
    return { ...q, ruby: { ...Object.fromEntries(markup), ...q.ruby } };
  };

  if (kind === "vocab-meaning")
    return words(
      build(
        {
          ...base,
          prompt: "Từ này có nghĩa là gì?",
          stem: written(w),
          stemLang: "ja",
          optionsLang: "vi",
          answer: meaning,
        },
        pick(meaning, (o) => o.primaryMeaning!),
        seed,
      ),
    );
  if (kind === "vocab-reading")
    // No furigana here: the reading is the answer.
    return w.expression && w.expression !== w.kana
      ? build(
          {
            ...base,
            prompt: "Từ này đọc là gì?",
            stem: w.expression,
            hint: meaning,
            stemLang: "ja",
            optionsLang: "ja",
            answer: w.kana,
          },
          pick(w.kana, (o) => o.kana),
          seed,
        )
      : null;
  const asWord = { ...base, optionsLang: "ja" as const, answer: written(w) };
  if (kind === "vocab-word" || kind === "vocab-listen") {
    const q = words(
      build(
        kind === "vocab-word"
          ? { ...asWord, prompt: "Từ nào có nghĩa này?", stem: meaning, stemLang: "vi" }
          : { ...asWord, prompt: "Nghe rồi chọn từ đúng", stem: "Bấm để nghe", stemLang: "vi" },
        pick(written(w), written),
        seed,
      ),
    );
    return q && kind === "vocab-listen" ? { ...q, speak: w.kana } : q;
  }
  // Fill in the blank. Verbs appear conjugated, so only words that stand in a sentence as written are asked.
  const e = sentences.find((x) => x.meaningVi && usesWord(x, w) && x.japanese.includes(written(w)));
  if (!e) return null;
  const at = e.japanese.indexOf(written(w));
  const stem = e.japanese.slice(0, at) + BLANK + e.japanese.slice(at + written(w).length);
  const q = words(
    build(
      { ...asWord, prompt: "Chọn từ điền vào chỗ trống", stem, stemLang: "ja", hint: e.meaningVi },
      pick(written(w), written),
      seed,
    ),
  );
  return (
    q && {
      ...q,
      ruby: { ...q.ruby, [stem]: blankMarkup(e.furigana ?? e.japanese, at, written(w).length) },
    }
  );
}

/** Some seed words have kanji in their kana field, so there is no reading to show a beginner. */
const unreadable = (w: DrillWord) => /\p{Script=Han}/u.test(w.kana);

/** One question per word, rotating through the kinds; a kind a word cannot take falls through to the next. */
export function vocabDrill(
  targets: DrillWord[],
  pool: DrillWord[],
  sentences: GrammarExample[],
): Question[] {
  const readable = pool.filter((w) => !unreadable(w));
  return targets
    .filter((w) => !unreadable(w))
    .flatMap((w, i) => {
      for (let k = 0; k < VOCAB_KINDS.length; k++) {
        const q = vocabAs(VOCAB_KINDS[(i + k) % VOCAB_KINDS.length], w, readable, sentences);
        if (q) return [q];
      }
      return [];
    });
}
