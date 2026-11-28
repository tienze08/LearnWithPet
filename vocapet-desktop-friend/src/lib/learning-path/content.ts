// Looks up the content behind Learning Path item ids and builds their questions and exercises.
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { loadGrammarLevel, type GrammarPoint } from "@/data/japanese/grammar";
import { KANJI_N5, type KanjiEntry } from "@/lib/japanese/kanji";
import { getKanaForSection, type KanaScript, type KanaSection } from "@/lib/japanese/kana";
import type { PathItemType, PathVocab } from "@/api/learning-path.api";
import { usePathVocabularyQuery } from "@/hooks/queries/learning-path.queries";
import {
  grammarOrder,
  grammarQuestion,
  kanaQuestion,
  kanjiQuestions,
  kanjiRecognize,
  vocabMatch,
  vocabQuestion,
  type Exercise,
  type KanaItem,
  type Question,
} from "./questions";

export interface PathContent {
  kana: Map<string, KanaItem>;
  grammar: Map<string, GrammarPoint>;
  kanji: Map<string, KanjiEntry>;
  vocab: Map<string, PathVocab>;
  /** Questions to check one item after its lesson or in a review (kanji: meaning and reading). */
  questionsFor: (type: PathItemType, id: string) => Question[];
  /** The single question used for an item in a test. */
  testQuestion: (type: PathItemType, id: string, index: number) => Question | null;
  /** Practice exercises over these items: word matching, sentence order, kanji / kana recognition, particle cloze. */
  practiceFor: (items: { itemType: PathItemType; itemId: string }[]) => Exercise[];
  /** Short text for result lists: what the item is and its answer. */
  describe: (type: PathItemType, id: string) => { title: string; detail: string };
}

const SECTIONS: KanaSection[] = ["basic", "dakuten", "handakuten", "yoon"];
const KANA: KanaItem[] = (["hiragana", "katakana"] as KanaScript[]).flatMap((script) =>
  SECTIONS.flatMap((section) =>
    getKanaForSection(script, section).map((e) => ({
      id: `${script}:${e.kana}`,
      script,
      kana: e.kana,
      romaji: e.romaji,
      section,
    })),
  ),
);

export function usePathContent(): {
  content: PathContent | null;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
} {
  const grammarQuery = useQuery({
    queryKey: ["grammar", "N5"],
    queryFn: () => loadGrammarLevel("N5"),
    staleTime: Infinity,
  });
  const vocabQuery = usePathVocabularyQuery();

  const content = useMemo<PathContent | null>(() => {
    if (!grammarQuery.data || !vocabQuery.data) return null;
    const grammarList = grammarQuery.data;
    const vocabList = vocabQuery.data;
    const kana = new Map(KANA.map((k) => [k.id, k]));
    const grammar = new Map(grammarList.map((g) => [g.id, g]));
    const kanji = new Map(KANJI_N5.map((k) => [k.char, k]));
    const vocab = new Map(vocabList.map((v) => [v.id, v]));

    const questionsFor = (type: PathItemType, id: string): Question[] => {
      const one = (q: Question | null | undefined) => (q ? [q] : []);
      if (type === "KANA") return one(kana.get(id) && kanaQuestion(kana.get(id)!, KANA));
      if (type === "GRAMMAR")
        return one(grammar.get(id) && grammarQuestion(grammar.get(id)!, grammarList));
      if (type === "KANJI") return kanji.get(id) ? kanjiQuestions(kanji.get(id)!, KANJI_N5) : [];
      return one(vocab.get(id) && vocabQuestion(vocab.get(id)!, vocabList));
    };

    return {
      kana,
      grammar,
      kanji,
      vocab,
      questionsFor,
      // Kanji alternate meaning / reading across the test so both are checked.
      testQuestion: (type, id, index) => {
        const qs = questionsFor(type, id);
        return qs.length ? qs[index % qs.length] : null;
      },
      practiceFor: (items) => {
        const out: Exercise[] = [];
        const words: PathVocab[] = [];
        let grammarTurn = 0;
        for (const i of items) {
          if (i.itemType === "VOCAB") {
            const v = vocab.get(i.itemId);
            if (v) words.push(v);
          } else if (i.itemType === "KANA") {
            const k = kana.get(i.itemId);
            const q = k && kanaQuestion(k, KANA, true);
            if (q) out.push(q);
          } else if (i.itemType === "KANJI") {
            const k = kanji.get(i.itemId);
            const q = k && kanjiRecognize(k, KANJI_N5);
            if (q) out.push(q);
          } else {
            const g = grammar.get(i.itemId);
            if (!g) continue;
            // Alternate sentence order and particle cloze between grammar points.
            const order = grammarTurn++ % 2 === 0 ? grammarOrder(g) : null;
            const q = order ?? grammarQuestion(g, grammarList);
            if (q) out.push(q);
          }
        }
        for (let n = 0; n < words.length; n += 4) {
          const group = words.slice(n, n + 4);
          const match = vocabMatch(group);
          if (match && match.pairs.length === group.length) out.push(match);
          else
            group.forEach((w) => {
              const q = vocabQuestion(w, vocabList);
              if (q) out.push(q);
            });
        }
        return out;
      },
      describe: (type, id) => {
        if (type === "KANA") {
          const k = kana.get(id);
          return { title: k?.kana ?? id, detail: k?.romaji ?? "" };
        }
        if (type === "GRAMMAR") {
          const g = grammar.get(id);
          return { title: g?.displayPattern ?? id, detail: g?.meaningVi ?? g?.meaningEn ?? "" };
        }
        if (type === "KANJI") {
          const k = kanji.get(id);
          return {
            title: id,
            detail: k ? `${k.hanViet} · ${k.meaning} · ${[...k.on, ...k.kun].join("、")}` : "",
          };
        }
        const v = vocab.get(id);
        return {
          title: v?.word ?? id,
          detail: v ? `${v.kana !== v.word ? v.kana + " · " : ""}${v.meaning}` : "",
        };
      },
    };
  }, [grammarQuery.data, vocabQuery.data]);

  return {
    content,
    isLoading: grammarQuery.isLoading || vocabQuery.isLoading,
    error: grammarQuery.error ?? vocabQuery.error,
    refetch: () => {
      grammarQuery.refetch();
      vocabQuery.refetch();
    },
  };
}
