import type { KanjiGraphData } from "@/data/kanji";
import { KANJI_N5 } from "../kanji";
import { hanVietOf, jlptOf, meaningViOf, type Jlpt } from "./detail";

/** One row of the kanji list / search. `en` is searchable but never shown by default. */
export type KanjiItem = {
  char: string;
  /** Reference JLPT level mapped from the old scale (hand-written N5 wins); null = unclassified. */
  level: Jlpt | null;
  /** True for the kanji VocaPet teaches (hand-written). */
  taught: boolean;
  hanViet: string[];
  meaningVi: string | null;
  on: string[];
  kun: string[];
  en: string | null;
};

export type LevelFilter = "ALL" | "N5" | "N4" | "N3" | "N2" | "N1" | "UNKNOWN";
export const LEVEL_FILTERS: { id: LevelFilter; label: string }[] = [
  { id: "ALL", label: "Tất cả" },
  { id: "N5", label: "N5" },
  { id: "N4", label: "N4" },
  { id: "N3", label: "N3" },
  { id: "N2", label: "N2" },
  { id: "N1", label: "N1" },
  { id: "UNKNOWN", label: "Chưa xếp cấp" },
];

/** Taught kanji first (in lesson order), then the rest by grade and frequency. */
export function buildItems(graph: KanjiGraphData): KanjiItem[] {
  const taught = new Set(KANJI_N5.map((k) => k.char));
  const item = (c: string): KanjiItem => {
    const g = graph.kanji[c];
    return {
      char: c,
      level: jlptOf(c, g?.jlptOld),
      taught: taught.has(c),
      hanViet: hanVietOf(c),
      meaningVi: meaningViOf(c),
      on: g?.on ?? [],
      kun: g?.kun ?? [],
      en: g?.en ?? null,
    };
  };
  const rest = Object.keys(graph.kanji)
    .filter((c) => !taught.has(c))
    .sort((a, b) => {
      const x = graph.kanji[a],
        y = graph.kanji[b];
      return (
        (x.grade ?? 99) - (y.grade ?? 99) ||
        (x.freq ?? 9999) - (y.freq ?? 9999) ||
        a.localeCompare(b)
      );
    });
  return [...KANJI_N5.map((k) => item(k.char)), ...rest.map(item)];
}

export const matchesLevel = (k: KanjiItem, f: LevelFilter) =>
  f === "ALL" || (f === "UNKNOWN" ? k.level === null : k.level === f);

/** Lowercase, no diacritics (đ -> d), katakana -> hiragana, so "nhat", "NHẬT" and "にち"/"ニチ" all match. */
export const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .trim()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

/** Search by character, Han Viet (with or without marks), Vietnamese meaning, on/kun reading, or English meaning. */
export function searchItems(query: string, items: KanjiItem[]): KanjiItem[] {
  const raw = query.trim();
  const q = fold(raw);
  if (!q) return items;
  const reading = q.replace(/[().-]/g, "");
  return items.filter(
    (k) =>
      raw.includes(k.char) ||
      k.hanViet.some((h) => fold(h).includes(q)) ||
      (k.meaningVi && fold(k.meaningVi).includes(q)) ||
      [...k.on, ...k.kun].some((r) =>
        fold(r)
          .replace(/[().-]/g, "")
          .includes(reading),
      ) ||
      (k.en && k.en.toLowerCase().includes(raw.toLowerCase())),
  );
}
