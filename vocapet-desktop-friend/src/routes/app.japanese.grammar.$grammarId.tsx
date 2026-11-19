import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { loadAllGrammar } from "@/data/japanese/grammar";
import { GrammarDetail } from "@/components/grammar/GrammarDetail";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/tango/shared";
import { sameForm, sameTopic } from "@/lib/japanese/grammar/search";

export const Route = createFileRoute("/app/japanese/grammar/$grammarId")({ component: GrammarDetailPage });

function GrammarDetailPage() {
  const { grammarId } = Route.useParams();
  const query = useQuery({ queryKey: ["grammar", "all"], queryFn: loadAllGrammar, staleTime: Infinity });
  const all = query.data;
  const g = useMemo(() => all?.find((x) => x.id === grammarId) ?? null, [all, grammarId]);

  if (query.isLoading) return <div className="mx-auto max-w-2xl"><LoadingBlock rows={4} /></div>;
  if (query.isError) return <div className="mx-auto max-w-2xl"><ErrorBlock error={query.error} onRetry={() => query.refetch()} /></div>;
  if (!g || !all)
    return (
      <div className="mx-auto max-w-2xl space-y-3">
        <EmptyBlock title="Không tìm thấy mẫu ngữ pháp này">Có thể đường dẫn đã cũ hoặc mẫu chưa có trong dữ liệu.</EmptyBlock>
        <Link to="/app/japanese/grammar" className="text-sm font-semibold text-primary hover:underline">← Về danh sách ngữ pháp</Link>
      </div>
    );
  const sameLevel = all.filter((x) => x.level === g.level);
  const at = sameLevel.findIndex((x) => x.id === g.id);
  const related = g.relatedGrammar.map((id) => all.find((x) => x.id === id)).filter((x): x is NonNullable<typeof x> => !!x);
  return <GrammarDetail g={g} related={related} sameForm={sameForm(g, all).filter((o) => !g.relatedGrammar.includes(o.id))} sameTopic={sameTopic(g, all).filter((o) => !g.relatedGrammar.includes(o.id))} prev={sameLevel[at - 1] ?? null} next={sameLevel[at + 1] ?? null} />;
}
