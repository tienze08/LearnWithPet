import type { GrammarGroupId, GrammarLevel, GrammarPoint } from "@/data/japanese/grammar";
import { fold } from "@/lib/japanese/kanji-map/list";
import { readingOf } from "./furigana";

export type LevelFilter = "ALL" | GrammarLevel;
export type GroupFilter = "ALL" | GrammarGroupId;

const JP = /[぀-ヿ一-鿿]/;
const strip = (s: string) => s.replace(/[〜~（）()・\s]/g, "");
/** Does a Latin/Vietnamese `token` start a word of `text` (both already folded)? Avoids "vi" matching the middle of a word. */
const wordStart = (text: string, token: string) =>
  new RegExp(`(^|[^a-z0-9])${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(text);

type Index = {
  pattern: string;
  kana: string;
  romaji: string;
  vi: string;
  formation: string;
  keywords: string;
  examples: string;
  en: string;
};
const cache = new WeakMap<GrammarPoint, Index>();

function indexOf(g: GrammarPoint): Index {
  let i = cache.get(g);
  if (!i) {
    i = {
      pattern: strip(`${g.pattern}${g.displayPattern}`),
      kana: strip(fold(g.reading ?? "")),
      romaji: fold(g.romaji),
      vi: fold([g.meaningVi, g.explanationVi].filter(Boolean).join(" ")),
      formation: fold(`${g.formationVi} ${g.formation}`),
      keywords: fold(g.tags.join(" ")),
      examples: fold(
        g.examples
          .map((e) => (e.furigana ? readingOf(e.furigana) + e.japanese : e.japanese))
          .join(" "),
      ),
      en: g.meaningEn.toLowerCase(),
    };
    cache.set(g, i);
  }
  return i;
}

/** Score of one query token against one point (0 = no match). Short tokens only match the pattern, so "ni" or "て" do not flood the list. */
function scoreToken(i: Index, raw: string): number {
  const t = fold(raw);
  if (!t) return 0;
  if (JP.test(raw)) {
    const s = strip(t);
    if (i.pattern.includes(strip(raw)) || i.kana.includes(s)) return 100;
    if ([...s].length >= 2 && (i.examples.includes(s) || i.formation.includes(s))) return 25;
    return 0;
  }
  if (t.length < 2) return 0; // one Latin letter matches too much
  let best = 0;
  if (i.romaji.split(/[^a-z]+/).some((w) => w.startsWith(t.replace(/\s/g, ""))))
    best = Math.max(best, 80);
  if (wordStart(i.vi, t)) best = Math.max(best, 60);
  if (t.length >= 3 && wordStart(i.formation, t)) best = Math.max(best, 40);
  if (t.length >= 3 && wordStart(i.keywords, t)) best = Math.max(best, 30);
  if (t.length >= 3 && wordStart(i.en, t)) best = Math.max(best, 10); // English is searchable, never shown
  return best;
}

/** Every token of the query must match; results are ranked by field (pattern > romaji > Vietnamese meaning > formation > keywords > English). */
export function searchGrammar(items: GrammarPoint[], query: string): GrammarPoint[] {
  const tokens = query.replace(/[〜~]/g, " ").trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return items;
  return items
    .map((g, n) => {
      const i = indexOf(g);
      let sum = 0;
      for (const t of tokens) {
        const s = scoreToken(i, t);
        if (!s) return null;
        sum += s;
      }
      // A multi-word query that appears as a phrase (e.g. "ly do") ranks above scattered word matches.
      const phrase = fold(tokens.join(" "));
      if (
        tokens.length > 1 &&
        !JP.test(phrase) &&
        (i.vi.includes(phrase) || i.formation.includes(phrase))
      )
        sum += 50;
      return { g, sum, n };
    })
    .filter((r): r is { g: GrammarPoint; sum: number; n: number } => r !== null)
    .sort((a, b) => b.sum - a.sum || a.n - b.n)
    .map((r) => r.g);
}

/** Other points that share the pattern's core (e.g. 〜に（time） / 〜に（destination）): same form, different use. Derived, not authored. */
export function sameForm(g: GrammarPoint, all: GrammarPoint[]): GrammarPoint[] {
  const base = (p: string) => p.split(/（|\(/)[0].replace(/[〜\s]/g, "");
  return all.filter((o) => o.id !== g.id && base(o.pattern) === base(g.pattern));
}

/** Points that share a topic tag with g (generic tags ignored). A hint computed from the source tags. */
const GENERIC = new Set(["particle", "conjugation", "politeness", "casual", "tense"]);
export function sameTopic(g: GrammarPoint, all: GrammarPoint[], limit = 6): GrammarPoint[] {
  const mine = g.tags.filter((t) => !GENERIC.has(t));
  if (!mine.length) return [];
  return all.filter((o) => o.id !== g.id && o.tags.some((t) => mine.includes(t))).slice(0, limit);
}
