import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { loadAllGrammar } from "@/data/japanese/grammar";
import { buildSentences, usesWord, type BankWord } from "@/lib/japanese/sentences";
import { ExampleSentence } from "./ExampleSentence";
import { PatternTitle } from "./PatternTitle";

const MAX = 3;

/** Up to three Sentence Bank sentences using the word, from different grammar points. Renders nothing without a match. */
export function BankSentences({ word }: { word: BankWord }) {
  const grammar = useQuery({
    queryKey: ["grammar", "all"],
    queryFn: loadAllGrammar,
    staleTime: Infinity,
  }).data;
  const bank = useMemo(() => buildSentences(grammar ?? []), [grammar]);
  const seen = new Set<string>();
  const picked = bank
    .filter((s) => usesWord(s, word) && !seen.has(s.grammarIds[0]) && !!seen.add(s.grammarIds[0]))
    .slice(0, MAX);
  if (picked.length === 0) return null;

  return (
    <section aria-label="Câu dùng từ này" className="space-y-3 rounded-2xl bg-card p-6">
      <h2 className="font-bold">Câu dùng từ này</h2>
      <ul className="space-y-2">
        {picked.map((s) => (
          <ExampleSentence key={s.id} e={s}>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {grammar!
                .filter((g) => s.grammarIds.includes(g.id))
                .map((g) => (
                  <Link
                    key={g.id}
                    to="/app/japanese/grammar/$grammarId"
                    params={{ grammarId: g.id }}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-card px-3 text-sm transition-colors hover:bg-primary-soft"
                  >
                    <span className="text-xs text-muted-foreground">Ngữ pháp</span>
                    <PatternTitle pattern={g.displayPattern} className="font-bold" />
                  </Link>
                ))}
              {s.translation === "draft" && (
                <span className="rounded-full bg-warning/20 px-2 py-0.5 text-[11px] font-bold text-warning-ink">
                  Bản dịch nháp
                </span>
              )}
            </div>
          </ExampleSentence>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        Câu gốc: OpenJLPT (CC BY-SA 4.0). Bản dịch tiếng Việt do VocaPet biên soạn, cùng giấy phép.
      </p>
    </section>
  );
}
