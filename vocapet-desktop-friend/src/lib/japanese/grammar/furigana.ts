import type { RubySegment } from "@/lib/japanese/kanji-map/types";

/** OpenJLPT markup "{私|わたし}は" -> ruby segments. Text outside braces has no reading. */
export function parseFurigana(markup: string): RubySegment[] {
  const out: RubySegment[] = [];
  const re = /\{([^|}]+)\|([^}]+)\}/g;
  let last = 0;
  for (let m = re.exec(markup); m; m = re.exec(markup)) {
    if (m.index > last) out.push({ t: markup.slice(last, m.index) });
    out.push({ t: m[1], r: m[2] });
    last = re.lastIndex;
  }
  if (last < markup.length) out.push({ t: markup.slice(last) });
  return out;
}

/** The whole sentence in kana (reading where there is one, else the text itself). */
export const readingOf = (markup: string) => parseFurigana(markup).map((s) => s.r ?? s.t).join("");
