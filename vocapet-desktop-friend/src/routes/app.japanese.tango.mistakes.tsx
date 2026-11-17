import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { JLPT_LEVELS, type JlptLevel } from "@/api/tango.api";
import { useTangoWeakWordsQuery } from "@/hooks/queries/tango.queries";
import { EmptyBlock, ErrorBlock, LoadingBlock, WordStatusBadge } from "@/components/tango/shared";
import { useState } from "react";

export const Route = createFileRoute("/app/japanese/tango/mistakes")({
  component: TangoMistakes,
});

function TangoMistakes() {
  const [level, setLevel] = useState<JlptLevel | undefined>(undefined);
  const weak = useTangoWeakWordsQuery(level);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/app/japanese/tango" className="inline-flex items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Tango
      </Link>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Ôn tập</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Từ cần ôn</h1>
        <p className="mt-2 text-sm text-muted-foreground">Sắp xếp từ yếu nhất lên đầu. Vào bài học để làm bài ôn từ sai.</p>
      </div>

      <div role="tablist" aria-label="Lọc theo cấp độ" className="flex flex-wrap gap-2">
        {[undefined, ...JLPT_LEVELS].map((item) => (
          <button
            key={item ?? "all"}
            role="tab"
            aria-selected={level === item}
            onClick={() => setLevel(item)}
            className={`rounded-full border px-3 py-1 text-sm font-bold ${
              level === item ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
            }`}
          >
            {item ?? "Tất cả"}
          </button>
        ))}
      </div>

      {weak.isPending ? (
        <LoadingBlock rows={4} />
      ) : weak.isError ? (
        <ErrorBlock error={weak.error} onRetry={() => weak.refetch()} />
      ) : weak.data.items.length === 0 ? (
        <EmptyBlock title="Chưa có từ nào cần ôn.">Làm một bài kiểm tra để bắt đầu.</EmptyBlock>
      ) : (
        <ul className="space-y-3">
          {weak.data.items.map((item) => (
            <li key={item.vocabularyId}>
              <Card className="card-pop flex flex-wrap items-center gap-3 rounded-2xl p-4">
                <Link
                  to="/app/japanese/tango/vocabularies/$vocabularyId"
                  params={{ vocabularyId: String(item.vocabularyId) }}
                  className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3"
                >
                  <span className="text-lg font-bold">{item.expression ?? item.kana}</span>
                  <span className="text-sm text-muted-foreground">{item.kana}</span>
                  <span className="w-full truncate text-sm">{item.primaryMeaning}</span>
                </Link>
                <WordStatusBadge status={item.status} />
                <p className="text-xs text-muted-foreground">
                  {item.correctCount}/{item.answeredCount} đúng · {Math.round(item.accuracy * 100)}%
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
