// Shadowing logic: units, practice tips, self-assessment, saved results and recommendations. Pure, so it also runs in
// Node checks.
import type { GrammarPoint } from "@/data/japanese/grammar/types";
import { readingOf } from "@/lib/japanese/grammar/furigana";
import type { Sentence } from "@/lib/japanese/sentences";
import type { Lesson, Line } from "@/lib/listening/types";

export type Mode = "REPEAT" | "IMMEDIATE" | "CONTINUOUS";
export type Check = "WORDS" | "LONG_VOWEL" | "SMALL_TSU" | "RHYTHM" | "CLEAR";

export const MODES: Record<Mode, { title: string; level: string; about: string }> = {
  REPEAT: {
    title: "Nghe và nhắc lại",
    level: "Cơ bản",
    about: "Nghe từng câu, audio tự dừng, bạn nhắc lại rồi mới sang câu sau.",
  },
  IMMEDIATE: {
    title: "Shadowing ngay",
    level: "Trung cấp",
    about: "Nghe một câu và nói theo ngay khi vừa dứt. Thử nhiều lần rồi so sánh.",
  },
  CONTINUOUS: {
    title: "Shadowing liên tục",
    level: "Nâng cao",
    about: "Nói đuổi theo cả đoạn, ghi một lần cho cả bài, sau đó xem lại từng câu.",
  },
};

export const CHECKS: [Check, string][] = [
  ["WORDS", "Tôi đã đọc đủ các từ"],
  ["LONG_VOWEL", "Tôi đọc đúng trường âm"],
  ["SMALL_TSU", "Tôi đọc đúng âm ngắt っ"],
  ["RHYTHM", "Tôi giữ được nhịp tự nhiên"],
  ["CLEAR", "Tôi nói rõ ràng"],
];

// ---------- units ----------

/** What can be shadowed: a listening dialogue, or the example sentences of one grammar point. */
export interface Unit extends Pick<
  Lesson,
  "id" | "level" | "topic" | "title" | "context" | "speakers" | "lines" | "draft"
> {
  dialogue: boolean;
}

export const GRAMMAR_TOPIC = "Câu mẫu theo ngữ pháp";

/** Sentence Bank sentences grouped by grammar point, referenced by their ids (nothing is copied into content). */
export function grammarUnits(grammar: GrammarPoint[], bank: Sentence[]): Unit[] {
  return grammar.flatMap((g) => {
    const sentences = bank.filter((s) => s.grammarIds.includes(g.id));
    if (!sentences.length) return [];
    return [
      {
        id: `${g.level.toLowerCase()}-g-${g.id}`,
        level: g.level,
        topic: GRAMMAR_TOPIC,
        title: g.displayPattern,
        context: g.meaningVi ?? "Các câu ví dụ của mẫu ngữ pháp này.",
        speakers: {},
        draft: g.translation === "draft",
        dialogue: false,
        lines: sentences.map(
          (s, index): Line => ({
            index,
            speaker: "",
            japanese: s.japanese,
            furigana: s.furigana,
            meaningVi: s.meaningVi,
            grammarIds: s.grammarIds,
            kanji: s.kanji,
            sentenceId: s.id,
          }),
        ),
      },
    ];
  });
}

/** The same key the audio manifest uses: the bank id, else "<unit>:<line>". */
export const sentenceKey = (unit: Pick<Unit, "id">, line: Pick<Line, "index" | "sentenceId">) =>
  line.sentenceId ?? `${unit.id}:${line.index}`;

// ---------- tips ----------

const kana = (line: Pick<Line, "japanese" | "furigana">) =>
  (line.furigana ? readingOf(line.furigana) : line.japanese).normalize("NFKC");

const LONG =
  /ー|[おこそとのほもよろごぞどぼぽょ]う|[えけせてねへめれげぜでべぺ]い|ああ|いい|うう|ええ|おお|[かさたなはまやらわが]あ|[きしちにひみりぎじびぴ]い|[くすつぬふむゆるぐずぶぷゅ]う/;

export const soundsIn = (line: Pick<Line, "japanese" | "furigana">) => {
  const text = kana(line);
  return {
    longVowel: LONG.test(text),
    smallTsu: /[っッ]/.test(text),
    contracted: /[ゃゅょャュョ]/.test(text),
  };
};

export function tipsFor(line: Pick<Line, "japanese" | "furigana" | "grammarIds">): string[] {
  const s = soundsIn(line);
  const tips = [
    s.longVowel && "Chú ý trường âm: kéo dài đủ một nhịp.",
    s.smallTsu && "Chú ý âm ngắt っ: ngừng một nhịp trước phụ âm sau.",
    s.contracted && "Âm ghép (きゃ, しゅ, ちょ…) đọc gọn trong một nhịp.",
    line.grammarIds.includes("wa") && "Trợ từ は đọc là “wa”.",
    line.grammarIds.includes("e") && "Trợ từ へ đọc là “e”.",
    /か[。？?]?$/.test(line.japanese) &&
      "Câu hỏi: nghe cách giọng thay đổi ở cuối câu và bắt chước.",
    line.japanese.includes("、") && "Ngắt hơi nhẹ ở dấu 、.",
  ].filter((t): t is string => !!t);
  return [...tips, "Bắt chước nhịp và ngữ điệu của mẫu, không cần đọc nhanh."].slice(0, 4);
}

/** Checklist for a sentence (or a whole run): sound items only when the sound is there. */
export function checksFor(lines: Pick<Line, "japanese" | "furigana">[]) {
  const sounds = lines.map(soundsIn);
  return CHECKS.filter(([id]) =>
    id === "LONG_VOWEL"
      ? sounds.some((s) => s.longVowel)
      : id === "SMALL_TSU"
        ? sounds.some((s) => s.smallTsu)
        : true,
  );
}

// ---------- results ----------

export interface SentenceResult {
  sentenceKey: string;
  recordings: number;
  passed: Check[];
  missed: Check[];
  contentMatch: number | null;
}

/** Self-assessment answers as the saved lists. */
export function assessed(
  answers: Partial<Record<Check, boolean>>,
): Pick<SentenceResult, "passed" | "missed"> {
  const ids = CHECKS.map(([id]) => id).filter((id) => answers[id] !== undefined);
  return { passed: ids.filter((id) => answers[id]), missed: ids.filter((id) => !answers[id]) };
}

// ---------- recommendation ----------

export interface Recommendation {
  unit: Unit;
  reason: string;
}

/** A unit with open difficulties, else the next dialogue not yet completed, else the next grammar set. */
export function recommend(
  units: Unit[],
  difficulties: { unitId: string }[],
  completed: string[],
  skip?: string,
): Recommendation | null {
  const pool = units.filter((u) => u.id !== skip);
  const hard = difficulties.map((d) => pool.find((u) => u.id === d.unitId)).find((u) => !!u);
  if (hard) return { unit: hard, reason: "Có câu bạn tự đánh giá là chưa ổn." };
  const fresh =
    pool.find((u) => u.dialogue && !completed.includes(u.id)) ??
    pool.find((u) => !completed.includes(u.id));
  return fresh ? { unit: fresh, reason: "Bài bạn chưa hoàn thành." } : null;
}

/** Sessions per local calendar day for the last `days` days, oldest first. */
export function frequency(completedAt: string[], now: Date, days = 14) {
  const key = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  const counts = new Map<string, number>();
  for (const at of completedAt)
    counts.set(key(new Date(at)), (counts.get(key(new Date(at))) ?? 0) + 1);
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1 - i));
    return { day: `${d.getDate()}/${d.getMonth() + 1}`, count: counts.get(key(d)) ?? 0 };
  });
}

/** Topics by number of sentences practised. */
export function topTopics(
  units: Unit[],
  sessions: { unitId: string; sentences: number }[],
  limit = 3,
) {
  const counts = new Map<string, number>();
  for (const s of sessions) {
    const unit = units.find((u) => u.id === s.unitId);
    if (unit) counts.set(unit.topic, (counts.get(unit.topic) ?? 0) + s.sentences);
  }
  return [...counts].sort((a, b) => b[1] - a[1]).slice(0, limit);
}
