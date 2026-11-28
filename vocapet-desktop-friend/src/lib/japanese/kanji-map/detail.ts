import type { KanjiGraphData } from "@/data/kanji";
import { HANVIET, MEANING_VI } from "@/data/kanji-vi";
import { KANJI_N5 } from "../kanji";
import { YUU_EXTRA } from "./data/yuu";
import type { Enrichment, KanjiDetail, KanjiVocab, Sentence } from "./types";

/** Hand-authored enrichment per kanji. Anything not listed is built from KANJI_N5 + KANJIDIC2/KanjiVG/KRADFILE + Tango only. */
const ENRICHMENT: Record<string, Enrichment> = { 夕: YUU_EXTRA };

/** A Tango catalog word that contains the kanji (from the existing search API). */
export type TangoWordRef = { id: number; expression: string; kana: string; meaning: string | null };
/** An example sentence of a Tango word that contains the kanji. */
export type TangoExampleRef = {
  word: string;
  japanese: string;
  reading: string | null;
  vietnamese: string;
};

const VI = new Map(KANJI_N5.map((k) => [k.char, k]));

export type Jlpt = "N5" | "N4" | "N3" | "N2";
// Reference mapping from the OLD 4-level JLPT scale (KANJIDIC2 `jlptOld`), not an official N-level list. N1 has no data.
const OLD_TO_N: Record<number, Jlpt> = { 4: "N5", 3: "N4", 2: "N3", 1: "N2" };

/** Display level: the hand-written N5 wins, else the mapped old level, else null (unclassified, never guessed). */
export const jlptOf = (char: string, jlptOld?: number | null): Jlpt | null =>
  VI.get(char)?.level ?? (jlptOld != null ? (OLD_TO_N[jlptOld] ?? null) : null);

/** Han Viet readings, all of them (first = primary). Empty when we have no sourced reading. */
export const hanVietOf = (char: string): string[] => HANVIET[char]?.hv ?? [];

/** Vietnamese meaning only: hand-written (taught) or manual file. Never derived from English. */
export const meaningViOf = (char: string): string | null =>
  VI.get(char)?.meaning ?? MEANING_VI[char] ?? null;

/**
 * Label for nodes and chips: first Han Viet reading, else Vietnamese meaning, else nothing. Never English.
 * `full` adds the Vietnamese meaning after the Han Viet reading.
 */
export function labelOf(char: string, full = false): string | undefined {
  const hv = hanVietOf(char)[0];
  const mean = meaningViOf(char);
  return (full ? [hv, mean].filter(Boolean).join(" · ") : (hv ?? mean)) || undefined;
}

// Han Viet reading -> kanji that share it, built once.
const BY_READING = new Map<string, string[]>();
for (const [c, e] of Object.entries(HANVIET))
  for (const r of e.hv) BY_READING.set(r, [...(BY_READING.get(r) ?? []), c]);

/** Other kanji with the same Han Viet reading, most frequent first. */
function sameHanViet(char: string, graph: KanjiGraphData): string[] {
  const set = new Set(hanVietOf(char).flatMap((r) => BY_READING.get(r) ?? []));
  set.delete(char);
  return [...set]
    .filter((c) => graph.kanji[c])
    .sort(
      (a, b) => (graph.kanji[a].freq ?? 9999) - (graph.kanji[b].freq ?? 9999) || a.localeCompare(b),
    )
    .slice(0, 12);
}

/**
 * Real data only: KANJI_N5 (taught kanji), KANJIDIC2 / KanjiVG / KRADFILE (graph), Tango words that
 * contain the kanji, plus optional hand-authored enrichment. Missing fields stay null/empty, never guessed.
 */
export function buildDetail(
  char: string,
  graph: KanjiGraphData,
  tangoWords: TangoWordRef[] = [],
  tangoExamples: TangoExampleRef[] = [],
): KanjiDetail | null {
  const g = graph.kanji[char];
  if (!g) return null;
  const vi = VI.get(char) ?? null;
  const enrich = ENRICHMENT[char] ?? {};

  const compositionOf = (word: string): KanjiVocab["composition"] =>
    [...word].filter((c) => graph.kanji[c]).map((c) => ({ char: c, meaning: labelOf(c, true) }));

  const vocab = new Map<string, KanjiVocab>();
  const put = (v: KanjiVocab) => {
    const prev = vocab.get(v.word);
    // Keep the richest entry: an authored example beats a bare dataset word; a Tango id is always kept.
    const hanViet = [...v.word]
      .map((c) => hanVietOf(c)[0])
      .filter(Boolean)
      .join(" ");
    vocab.set(v.word, {
      ...prev,
      ...v,
      hanViet: hanViet || undefined,
      tangoId: v.tangoId ?? prev?.tangoId,
      example: v.example ?? prev?.example,
      composition: compositionOf(v.word),
    });
  };
  vi?.examples.forEach((e) =>
    put({
      word: e.word,
      reading: e.reading,
      meaning: e.meaning,
      source: "dataset",
      composition: [],
    }),
  );
  tangoWords.forEach((t) =>
    put({
      word: t.expression,
      reading: t.kana,
      meaning: t.meaning ?? "",
      source: "tango",
      tangoId: t.id,
      composition: [],
    }),
  );
  (enrich.vocab ?? []).forEach(put);

  const sentences: Sentence[] = [
    ...(enrich.sentences ?? []),
    ...tangoExamples.map(
      (e): Sentence => ({
        ja: [{ t: e.japanese }],
        reading: e.reading ?? undefined,
        vi: e.vietnamese,
        source: "tango",
      }),
    ),
  ];

  return {
    char,
    taught: !!vi,
    meaningVi: meaningViOf(char),
    hanViet: hanVietOf(char),
    hanVietInfo: HANVIET[char] ?? null,
    sameHanViet: sameHanViet(char, graph),
    meaningEn: g.en ?? null,
    on: vi?.on ?? g.on ?? [],
    kun: vi?.kun ?? g.kun ?? [],
    strokes: vi?.strokes ?? g.strokes ?? null,
    level: jlptOf(char, g.jlptOld),
    jlptOld: g.jlptOld ?? null,
    grade: g.grade ?? null,
    radical:
      g.radN != null || g.radC
        ? {
            char: g.radC ?? null,
            number: g.radN ?? null,
            name: enrich.radicalName,
            note: enrich.radicalNote,
          }
        : null,
    parts: g.parts,
    krad: g.krad ?? null,
    usedIn: graph.usedIn[char] ?? [],
    mnemonic: enrich.mnemonic ?? null,
    vocab: [...vocab.values()],
    sentences,
  };
}
