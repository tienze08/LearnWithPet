import { formationVi } from "./formation";
import { groupsOf } from "./tags";
import type { GrammarPoint, SourceGrammar, ViGrammar } from "./types";

/** Source entry + optional Vietnamese layer -> GrammarPoint. Pure, so it also runs in Node checks. */
export function mergeGrammar(s: SourceGrammar, v?: ViGrammar): GrammarPoint {
  return {
    id: s.id,
    pattern: s.pattern,
    displayPattern: v?.qualifierVi ? s.pattern.replace(/[（(][^）)]*[）)]/, `（${v.qualifierVi}）`) : s.pattern,
    reading: s.reading ?? null,
    romaji: s.romaji,
    romajiDisplay: s.romaji.replace(/\s*\([^)]*\)/, ""),
    level: s.level,
    meaningVi: v?.meaningVi ?? null,
    meaningEn: s.meaning,
    formation: s.formation,
    formationVi: formationVi(s.formation),
    explanationVi: v?.explanationVi ?? null,
    examples: s.examples.map((e, i) => ({ japanese: e.ja, furigana: e.furigana ?? null, romaji: null, meaningVi: v?.examples[i] ?? null, meaningEn: e.en })),
    notesVi: v?.notesVi ?? null,
    notesEn: s.notes ?? null,
    tags: s.tags,
    groups: groupsOf(s),
    relatedGrammar: v?.related ?? [],
    translation: v?.status ?? null,
  };
}
