import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Headphones } from "lucide-react";
import { Related } from "@/components/listening/Results";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/tango/shared";
import { Button } from "@/components/ui/button";
import { GRAMMAR_LEVELS, loadAllGrammar, type GrammarLevel } from "@/data/japanese/grammar";
import {
  useListeningLessonsQuery,
  useListeningProgressQuery,
} from "@/hooks/queries/listening.queries";
import { useTangoLevelWordsQuery } from "@/hooks/queries/tango.queries";
import { questionCount, recommend } from "@/lib/listening/session";

export const Route = createFileRoute("/app/listening/")({
  validateSearch: (search: Record<string, unknown>): { level?: GrammarLevel } => ({
    level: GRAMMAR_LEVELS.find((l) => l === search.level),
  }),
  component: ListeningHome,
});

const percent = (v: number) => `${Math.round(v * 100)}%`;

function ListeningHome() {
  const level = Route.useSearch().level ?? "N5";
  const navigate = Route.useNavigate();
  const lessons = useListeningLessonsQuery(level);
  const progress = useListeningProgressQuery();
  const grammar =
    useQuery({ queryKey: ["grammar", "all"], queryFn: loadAllGrammar, staleTime: Infinity }).data ??
    [];
  const vocabulary = useTangoLevelWordsQuery("N5").data ?? [];

  const records = progress.data?.lessons ?? [];
  const weakWords = progress.data?.weakWords.map((w) => w.ref) ?? [];
  const weakGrammar = progress.data?.weakGrammar.map((w) => w.ref) ?? [];
  const next = progress.data && lessons.data ? recommend(lessons.data, records, weakWords) : null;
  const topics = [...new Set(lessons.data?.map((l) => l.topic))];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="space-y-1">
        <h1 className="studio-head flex items-center gap-3 text-3xl">
          <Headphones aria-hidden className="h-7 w-7 text-primary" /> Luyện nghe
        </h1>
        <p className="text-sm text-muted-foreground">
          Chọn cấp độ, chọn bài rồi nghe và làm bài. Không ảnh hưởng tiến độ từ vựng, ngữ pháp hay
          Learning Path.
        </p>
      </header>

      <div role="group" aria-label="Cấp độ JLPT" className="flex flex-wrap gap-2">
        {GRAMMAR_LEVELS.map((l) => (
          <button
            key={l}
            type="button"
            className="ref-chip !min-h-11"
            aria-pressed={level === l}
            onClick={() => navigate({ search: { level: l } })}
          >
            {l}
          </button>
        ))}
      </div>

      {progress.isError && <ErrorBlock error={progress.error} onRetry={() => progress.refetch()} />}

      {next && (
        <section aria-label="Gợi ý" className="ref-card flex flex-wrap items-center gap-3 p-4">
          <div className="min-w-0 flex-1">
            <p className="studio-kicker">Nên luyện tiếp</p>
            <p className="font-bold">{next.lesson.title}</p>
            <p className="text-sm text-muted-foreground">{next.reason}</p>
          </div>
          <Button asChild className="h-11 rounded-full">
            <Link
              to="/app/listening/$lessonId"
              params={{ lessonId: next.lesson.id }}
              search={{ review: next.review || undefined }}
            >
              {next.review ? "Ôn câu sai" : "Nghe ngay"}
            </Link>
          </Button>
        </section>
      )}

      {lessons.isPending ? (
        <LoadingBlock rows={4} label="Đang tải bài nghe" />
      ) : lessons.isError ? (
        <ErrorBlock error={lessons.error} onRetry={() => lessons.refetch()} />
      ) : lessons.data.length === 0 ? (
        <EmptyBlock title={`Chưa có bài nghe ${level}`}>Hiện chỉ có nội dung N5.</EmptyBlock>
      ) : (
        topics.map((topic) => (
          <section key={topic} aria-label={topic} className="space-y-2">
            <h2 className="font-bold">{topic}</h2>
            <ul className="space-y-2">
              {lessons.data
                .filter((l) => l.topic === topic)
                .map((l) => {
                  const done = records.find((r) => r.lessonId === l.id);
                  return (
                    <li key={l.id} className="ref-card flex flex-wrap items-center gap-3 p-4">
                      <div className="min-w-0 flex-1">
                        <Link
                          to="/app/listening/$lessonId"
                          params={{ lessonId: l.id }}
                          className="inline-flex min-h-11 items-center font-semibold hover:text-primary"
                        >
                          {l.title}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {l.lines.length} câu thoại · {questionCount(l)} câu hỏi
                          {done?.lastAccuracy != null &&
                            ` · lần gần nhất ${percent(done.lastAccuracy)}, cao nhất ${percent(done.bestAccuracy!)} (${done.attempts} lượt)`}
                        </p>
                      </div>
                      {!!done?.mistakes.length && (
                        <Button asChild variant="outline" className="h-11 rounded-full">
                          <Link
                            to="/app/listening/$lessonId"
                            params={{ lessonId: l.id }}
                            search={{ review: true }}
                          >
                            Ôn {done.mistakes.length} câu sai
                          </Link>
                        </Button>
                      )}
                      <Button asChild className="h-11 rounded-full">
                        <Link to="/app/listening/$lessonId" params={{ lessonId: l.id }}>
                          {done ? "Nghe lại" : "Bắt đầu"}
                        </Link>
                      </Button>
                    </li>
                  );
                })}
            </ul>
          </section>
        ))
      )}

      {(weakWords.length > 0 || weakGrammar.length > 0) && (
        <section aria-label="Hay nghe nhầm" className="ref-card space-y-2 p-4">
          <h2 className="font-bold">Hay nghe nhầm</h2>
          <Related
            grammarIds={weakGrammar}
            words={weakWords}
            grammar={grammar}
            vocabulary={vocabulary}
          />
        </section>
      )}
    </div>
  );
}
