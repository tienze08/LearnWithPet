// Looks up the content behind Learning Path item ids and builds their questions.
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { loadGrammarLevel, type GrammarPoint } from "@/data/japanese/grammar";
import { KANJI_N5, type KanjiEntry } from "@/lib/japanese/kanji";
import type { PathItemType, PathVocab } from "@/api/learning-path.api";
import { usePathVocabularyQuery } from "@/hooks/queries/learning-path.queries";
import { grammarQuestion, kanjiQuestions, vocabQuestion, type Question } from "./questions";

export interface PathContent {
  grammar: Map<string, GrammarPoint>;
  kanji: Map<string, KanjiEntry>;
  vocab: Map<string, PathVocab>;
  questionsFor: (type: PathItemType, id: string) => Question[];
}

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
    const grammar = new Map(grammarList.map((g) => [g.id, g]));
    const kanji = new Map(KANJI_N5.map((k) => [k.char, k]));
    const vocab = new Map(vocabList.map((v) => [v.id, v]));
    return {
      grammar,
      kanji,
      vocab,
      questionsFor: (type, id) => {
        if (type === "GRAMMAR") {
          const g = grammar.get(id);
          const q = g && grammarQuestion(g, grammarList);
          return q ? [q] : [];
        }
        if (type === "KANJI") {
          const k = kanji.get(id);
          return k ? kanjiQuestions(k, KANJI_N5) : [];
        }
        const v = vocab.get(id);
        const q = v && vocabQuestion(v, vocabList);
        return q ? [q] : [];
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
