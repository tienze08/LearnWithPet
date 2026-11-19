// Grammar data loader. Each level is its own chunk, loaded only when requested; levels without a source file have no data.
import meta from "./meta.json";
import { mergeGrammar as merge } from "./merge";
import type { GrammarLevel, GrammarPoint, SourceGrammar, ViGrammar } from "./types";
import { GRAMMAR_LEVELS } from "./types";

export * from "./types";
export { GROUP_LABEL } from "./tags";
export const GRAMMAR_META = meta;

const SOURCE = import.meta.glob("./source/*.json", { import: "default" }) as Record<string, () => Promise<SourceGrammar[]>>;
const VI = import.meta.glob("./vi/*.json", { import: "default" }) as Record<string, () => Promise<Record<string, ViGrammar>>>;

const levelOf = (path: string) => path.match(/\/(n\d)\.json$/)![1].toUpperCase() as GrammarLevel;

/** Levels that have a source file. Others show "chưa có dữ liệu". */
export const AVAILABLE_LEVELS: GrammarLevel[] = GRAMMAR_LEVELS.filter((l) => Object.keys(SOURCE).some((p) => levelOf(p) === l));

const cache = new Map<GrammarLevel, Promise<GrammarPoint[]>>();

export function loadGrammarLevel(level: GrammarLevel): Promise<GrammarPoint[]> {
  if (!AVAILABLE_LEVELS.includes(level)) return Promise.resolve([]);
  let p = cache.get(level);
  if (!p) {
    const file = level.toLowerCase();
    p = Promise.all([SOURCE[`./source/${file}.json`](), VI[`./vi/${file}.json`]?.() ?? Promise.resolve({})]).then(([src, vi]) => src.map((s) => merge(s, vi[s.id])));
    p.catch(() => cache.delete(level)); // allow a retry after a failed load
    cache.set(level, p);
  }
  return p;
}

/** All levels that have data, in N5 -> N1 order. */
export const loadAllGrammar = async () => (await Promise.all(AVAILABLE_LEVELS.map(loadGrammarLevel))).flat();

export async function findGrammar(id: string): Promise<GrammarPoint | null> {
  return (await loadAllGrammar()).find((g) => g.id === id) ?? null;
}
