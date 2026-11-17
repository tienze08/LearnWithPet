// Kana data for VocaPet. Covers Basic (46), Dakuten (20), Handakuten (5), Yoon (33) per script.
export type KanaEntry = { kana: string; romaji: string };

export type KanaScript = "hiragana" | "katakana";
export type KanaSection = "basic" | "dakuten" | "handakuten" | "yoon";

/** Per-answer result for backend submission. */
export type KanaQuizResult = { kana: string; romaji: string; isCorrect: boolean };

// Rows of the gojūon chart. `null` marks an empty cell (keeps the 5-column grid aligned).
type Row = (KanaEntry | null)[];

const HIRAGANA_ROWS: Row[] = [
  [{ kana: "あ", romaji: "a" }, { kana: "い", romaji: "i" }, { kana: "う", romaji: "u" }, { kana: "え", romaji: "e" }, { kana: "お", romaji: "o" }],
  [{ kana: "か", romaji: "ka" }, { kana: "き", romaji: "ki" }, { kana: "く", romaji: "ku" }, { kana: "け", romaji: "ke" }, { kana: "こ", romaji: "ko" }],
  [{ kana: "さ", romaji: "sa" }, { kana: "し", romaji: "shi" }, { kana: "す", romaji: "su" }, { kana: "せ", romaji: "se" }, { kana: "そ", romaji: "so" }],
  [{ kana: "た", romaji: "ta" }, { kana: "ち", romaji: "chi" }, { kana: "つ", romaji: "tsu" }, { kana: "て", romaji: "te" }, { kana: "と", romaji: "to" }],
  [{ kana: "な", romaji: "na" }, { kana: "に", romaji: "ni" }, { kana: "ぬ", romaji: "nu" }, { kana: "ね", romaji: "ne" }, { kana: "の", romaji: "no" }],
  [{ kana: "は", romaji: "ha" }, { kana: "ひ", romaji: "hi" }, { kana: "ふ", romaji: "fu" }, { kana: "へ", romaji: "he" }, { kana: "ほ", romaji: "ho" }],
  [{ kana: "ま", romaji: "ma" }, { kana: "み", romaji: "mi" }, { kana: "む", romaji: "mu" }, { kana: "め", romaji: "me" }, { kana: "も", romaji: "mo" }],
  [{ kana: "や", romaji: "ya" }, null, { kana: "ゆ", romaji: "yu" }, null, { kana: "よ", romaji: "yo" }],
  [{ kana: "ら", romaji: "ra" }, { kana: "り", romaji: "ri" }, { kana: "る", romaji: "ru" }, { kana: "れ", romaji: "re" }, { kana: "ろ", romaji: "ro" }],
  [{ kana: "わ", romaji: "wa" }, null, null, null, { kana: "を", romaji: "wo" }],
  [null, null, { kana: "ん", romaji: "n" }, null, null],
];

const KATAKANA_ROWS: Row[] = [
  [{ kana: "ア", romaji: "a" }, { kana: "イ", romaji: "i" }, { kana: "ウ", romaji: "u" }, { kana: "エ", romaji: "e" }, { kana: "オ", romaji: "o" }],
  [{ kana: "カ", romaji: "ka" }, { kana: "キ", romaji: "ki" }, { kana: "ク", romaji: "ku" }, { kana: "ケ", romaji: "ke" }, { kana: "コ", romaji: "ko" }],
  [{ kana: "サ", romaji: "sa" }, { kana: "シ", romaji: "shi" }, { kana: "ス", romaji: "su" }, { kana: "セ", romaji: "se" }, { kana: "ソ", romaji: "so" }],
  [{ kana: "タ", romaji: "ta" }, { kana: "チ", romaji: "chi" }, { kana: "ツ", romaji: "tsu" }, { kana: "テ", romaji: "te" }, { kana: "ト", romaji: "to" }],
  [{ kana: "ナ", romaji: "na" }, { kana: "ニ", romaji: "ni" }, { kana: "ヌ", romaji: "nu" }, { kana: "ネ", romaji: "ne" }, { kana: "ノ", romaji: "no" }],
  [{ kana: "ハ", romaji: "ha" }, { kana: "ヒ", romaji: "hi" }, { kana: "フ", romaji: "fu" }, { kana: "ヘ", romaji: "he" }, { kana: "ホ", romaji: "ho" }],
  [{ kana: "マ", romaji: "ma" }, { kana: "ミ", romaji: "mi" }, { kana: "ム", romaji: "mu" }, { kana: "メ", romaji: "me" }, { kana: "モ", romaji: "mo" }],
  [{ kana: "ヤ", romaji: "ya" }, null, { kana: "ユ", romaji: "yu" }, null, { kana: "ヨ", romaji: "yo" }],
  [{ kana: "ラ", romaji: "ra" }, { kana: "リ", romaji: "ri" }, { kana: "ル", romaji: "ru" }, { kana: "レ", romaji: "re" }, { kana: "ロ", romaji: "ro" }],
  [{ kana: "ワ", romaji: "wa" }, null, null, null, { kana: "ヲ", romaji: "wo" }],
  [null, null, { kana: "ン", romaji: "n" }, null, null],
];

export const KANA_CHART: Record<KanaScript, Row[]> = {
  hiragana: HIRAGANA_ROWS,
  katakana: KATAKANA_ROWS,
};

// ── Dakuten (20 per script) ──────────────────────────────────────────────────

const HIRAGANA_DAKUTEN: KanaEntry[] = [
  { kana: "が", romaji: "ga" }, { kana: "ぎ", romaji: "gi" }, { kana: "ぐ", romaji: "gu" }, { kana: "げ", romaji: "ge" }, { kana: "ご", romaji: "go" },
  { kana: "ざ", romaji: "za" }, { kana: "じ", romaji: "ji" }, { kana: "ず", romaji: "zu" }, { kana: "ぜ", romaji: "ze" }, { kana: "ぞ", romaji: "zo" },
  { kana: "だ", romaji: "da" }, { kana: "ぢ", romaji: "di" }, { kana: "づ", romaji: "du" }, { kana: "で", romaji: "de" }, { kana: "ど", romaji: "do" },
  { kana: "ば", romaji: "ba" }, { kana: "び", romaji: "bi" }, { kana: "ぶ", romaji: "bu" }, { kana: "べ", romaji: "be" }, { kana: "ぼ", romaji: "bo" },
];

const KATAKANA_DAKUTEN: KanaEntry[] = [
  { kana: "ガ", romaji: "ga" }, { kana: "ギ", romaji: "gi" }, { kana: "グ", romaji: "gu" }, { kana: "ゲ", romaji: "ge" }, { kana: "ゴ", romaji: "go" },
  { kana: "ザ", romaji: "za" }, { kana: "ジ", romaji: "ji" }, { kana: "ズ", romaji: "zu" }, { kana: "ゼ", romaji: "ze" }, { kana: "ゾ", romaji: "zo" },
  { kana: "ダ", romaji: "da" }, { kana: "ヂ", romaji: "di" }, { kana: "ヅ", romaji: "du" }, { kana: "デ", romaji: "de" }, { kana: "ド", romaji: "do" },
  { kana: "バ", romaji: "ba" }, { kana: "ビ", romaji: "bi" }, { kana: "ブ", romaji: "bu" }, { kana: "ベ", romaji: "be" }, { kana: "ボ", romaji: "bo" },
];

export const DAKUTEN_CHART: Record<KanaScript, KanaEntry[]> = {
  hiragana: HIRAGANA_DAKUTEN,
  katakana: KATAKANA_DAKUTEN,
};

// ── Handakuten (5 per script) ────────────────────────────────────────────────

const HIRAGANA_HANDAKUTEN: KanaEntry[] = [
  { kana: "ぱ", romaji: "pa" }, { kana: "ぴ", romaji: "pi" }, { kana: "ぷ", romaji: "pu" }, { kana: "ぺ", romaji: "pe" }, { kana: "ぽ", romaji: "po" },
];

const KATAKANA_HANDAKUTEN: KanaEntry[] = [
  { kana: "パ", romaji: "pa" }, { kana: "ピ", romaji: "pi" }, { kana: "プ", romaji: "pu" }, { kana: "ペ", romaji: "pe" }, { kana: "ポ", romaji: "po" },
];

export const HANDAKUTEN_CHART: Record<KanaScript, KanaEntry[]> = {
  hiragana: HIRAGANA_HANDAKUTEN,
  katakana: KATAKANA_HANDAKUTEN,
};

// ── Yoon / 拗音 (33 per script) ──────────────────────────────────────────────
// 11 bases × 3 combos (ya/yu/yo). Rows: [base+ya, base+yu, base+yo]

const HIRAGANA_YOON: KanaEntry[] = [
  { kana: "きゃ", romaji: "kya" }, { kana: "きゅ", romaji: "kyu" }, { kana: "きょ", romaji: "kyo" },
  { kana: "しゃ", romaji: "sha" }, { kana: "しゅ", romaji: "shu" }, { kana: "しょ", romaji: "sho" },
  { kana: "ちゃ", romaji: "cha" }, { kana: "ちゅ", romaji: "chu" }, { kana: "ちょ", romaji: "cho" },
  { kana: "にゃ", romaji: "nya" }, { kana: "にゅ", romaji: "nyu" }, { kana: "にょ", romaji: "nyo" },
  { kana: "ひゃ", romaji: "hya" }, { kana: "ひゅ", romaji: "hyu" }, { kana: "ひょ", romaji: "hyo" },
  { kana: "みゃ", romaji: "mya" }, { kana: "みゅ", romaji: "myu" }, { kana: "みょ", romaji: "myo" },
  { kana: "りゃ", romaji: "rya" }, { kana: "りゅ", romaji: "ryu" }, { kana: "りょ", romaji: "ryo" },
  { kana: "ぎゃ", romaji: "gya" }, { kana: "ぎゅ", romaji: "gyu" }, { kana: "ぎょ", romaji: "gyo" },
  { kana: "じゃ", romaji: "ja"  }, { kana: "じゅ", romaji: "ju"  }, { kana: "じょ", romaji: "jo"  },
  { kana: "びゃ", romaji: "bya" }, { kana: "びゅ", romaji: "byu" }, { kana: "びょ", romaji: "byo" },
  { kana: "ぴゃ", romaji: "pya" }, { kana: "ぴゅ", romaji: "pyu" }, { kana: "ぴょ", romaji: "pyo" },
];

const KATAKANA_YOON: KanaEntry[] = [
  { kana: "キャ", romaji: "kya" }, { kana: "キュ", romaji: "kyu" }, { kana: "キョ", romaji: "kyo" },
  { kana: "シャ", romaji: "sha" }, { kana: "シュ", romaji: "shu" }, { kana: "ショ", romaji: "sho" },
  { kana: "チャ", romaji: "cha" }, { kana: "チュ", romaji: "chu" }, { kana: "チョ", romaji: "cho" },
  { kana: "ニャ", romaji: "nya" }, { kana: "ニュ", romaji: "nyu" }, { kana: "ニョ", romaji: "nyo" },
  { kana: "ヒャ", romaji: "hya" }, { kana: "ヒュ", romaji: "hyu" }, { kana: "ヒョ", romaji: "hyo" },
  { kana: "ミャ", romaji: "mya" }, { kana: "ミュ", romaji: "myu" }, { kana: "ミョ", romaji: "myo" },
  { kana: "リャ", romaji: "rya" }, { kana: "リュ", romaji: "ryu" }, { kana: "リョ", romaji: "ryo" },
  { kana: "ギャ", romaji: "gya" }, { kana: "ギュ", romaji: "gyu" }, { kana: "ギョ", romaji: "gyo" },
  { kana: "ジャ", romaji: "ja"  }, { kana: "ジュ", romaji: "ju"  }, { kana: "ジョ", romaji: "jo"  },
  { kana: "ビャ", romaji: "bya" }, { kana: "ビュ", romaji: "byu" }, { kana: "ビョ", romaji: "byo" },
  { kana: "ピャ", romaji: "pya" }, { kana: "ピュ", romaji: "pyu" }, { kana: "ピョ", romaji: "pyo" },
];

export const YOON_CHART: Record<KanaScript, KanaEntry[]> = {
  hiragana: HIRAGANA_YOON,
  katakana: KATAKANA_YOON,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** All kana for a given script + section. */
export function getKanaForSection(script: KanaScript, section: KanaSection): KanaEntry[] {
  switch (section) {
    case "basic":       return KANA_CHART[script].flat().filter((e): e is KanaEntry => e !== null);
    case "dakuten":     return DAKUTEN_CHART[script];
    case "handakuten":  return HANDAKUTEN_CHART[script];
    case "yoon":        return YOON_CHART[script];
  }
}

/** Flat list of all basic kana in a script (empty cells removed). */
export function allKana(script: KanaScript): KanaEntry[] {
  return getKanaForSection(script, "basic");
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export type KanaQuestion = { target: KanaEntry; options: string[] };

/** Build quiz: show a kana, pick its romaji from 4 options. Section defaults to "basic". */
export function buildKanaQuiz(script: KanaScript, count = 10, section: KanaSection = "basic"): KanaQuestion[] {
  const pool = getKanaForSection(script, section);
  return shuffle(pool)
    .slice(0, Math.min(count, pool.length))
    .map((target) => {
      const distractors = shuffle(pool.filter((e) => e.romaji !== target.romaji))
        .slice(0, 3)
        .map((e) => e.romaji);
      return { target, options: shuffle([target.romaji, ...distractors]) };
    });
}

/** Returns which section a kana character belongs to (for a given script). */
export function getSectionForKana(script: KanaScript, kana: string): KanaSection | null {
  for (const section of ["basic", "dakuten", "handakuten", "yoon"] as KanaSection[]) {
    if (getKanaForSection(script, section).some((e) => e.kana === kana)) return section;
  }
  return null;
}

/** Accepted alternate romanizations for canonical forms. */
export const ROMAJI_VARIANTS: Record<string, string[]> = {
  shi: ["si"],
  chi: ["ti"],
  tsu: ["tu"],
  fu:  ["hu"],
  ji:  ["zi"],
  sha: ["sya"],
  shu: ["syu"],
  sho: ["syo"],
  cha: ["tya", "cya"],
  chu: ["tyu", "cyu"],
  cho: ["tyo", "cyo"],
  ja:  ["jya", "zya"],
  ju:  ["jyu", "zyu"],
  jo:  ["jyo", "zyo"],
};

export function normalizeRomaji(input: string): string {
  return input.toLowerCase().trim();
}

/** True if the input matches the canonical romaji or any accepted variant. */
export function checkRomaji(input: string, canonical: string): boolean {
  const n = normalizeRomaji(input);
  return n === canonical || (ROMAJI_VARIANTS[canonical] ?? []).includes(n);
}

/** Speak a kana with the browser's Japanese voice when available. */
export function speakKana(text: string): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ja-JP";
  window.speechSynthesis.speak(utterance);
}
