import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { JLPT_LEVELS, type JlptLevel, type TangoLessonStatus } from "@/api/tango.api";
import {
  useTangoLessonsQuery,
  useTangoLevelsQuery,
  useTangoProgressQuery,
  useTangoSearchQuery,
} from "@/hooks/queries/tango.queries";
import { EmptyBlock, ErrorBlock, LessonStatusBadge, LoadingBlock, ProgressBar } from "@/components/tango/shared";

export const Route = createFileRoute("/app/japanese/tango/")({
  validateSearch: (search: Record<string, unknown>): { level?: JlptLevel } => {
    const level = search.level;
    return { level: JLPT_LEVELS.includes(level as JlptLevel) ? (level as JlptLevel) : undefined };
  },
  component: TangoDashboard,
});

const LESSON_FILTERS: { key: "ALL" | TangoLessonStatus; label: string }[] = [
  { key: "ALL", label: "Tất cả" },
  { key: "NOT_STARTED", label: "Chưa học" },
  { key: "IN_PROGRESS", label: "Đang học" },
  { key: "COMPLETED", label: "Hoàn thành" },
];

function TangoDashboard() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const level: JlptLevel = search.level ?? "N5";
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | TangoLessonStatus>("ALL");
  const trimmed = query.trim();

  const levels = useTangoLevelsQuery();
  const progress = useTangoProgressQuery(level);
  const lessons = useTangoLessonsQuery(level);
  const search_ = useTangoSearchQuery(trimmed, level);

  const setLevel = (next: JlptLevel) => navigate({ to: "/app/japanese/tango", search: { level: next } });

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Tango</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Từ vựng tiếng Nhật</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Học theo cấp độ JLPT, từng bài một. Tiến độ được theo dõi xuyên suốt các bài.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div role="tablist" aria-label="Cấp độ JLPT" className="flex gap-2">
            {JLPT_LEVELS.map((item) => {
              const summary = levels.data?.levels.find((l) => l.level === item);
              const active = item === level;
              return (
                <button
                  key={item}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setLevel(item)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-bold transition-colors ${
                    active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/60"
                  }`}
                >
                  {item}
                  {summary && <span className="ml-1.5 font-normal opacity-70">{summary.lessonCount}</span>}
                </button>
              );
            })}
          </div>
          <div className="relative ml-auto w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Tìm từ vựng hoặc bài học"
              placeholder="Tìm từ, nghĩa hoặc bài học"
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </header>

      {trimmed ? (
        <SearchResults state={search_} query={trimmed} />
      ) : (
        <>
          <section aria-label="Tổng quan học tập" className="grid gap-4 sm:grid-cols-4">
            {progress.isError ? (
              <div className="sm:col-span-4"><ErrorBlock error={progress.error} onRetry={() => progress.refetch()} /></div>
            ) : (
              <>
                <OverviewStat label="Tổng số từ" value={progress.data?.words.total} />
                <OverviewStat label="Đã học" value={progress.data && progress.data.words.total - progress.data.words.new} />
                <OverviewStat label="Đã thuộc" value={progress.data?.words.mastered} />
                <OverviewStat label="Cần ôn" value={progress.data?.words.needReview} />
              </>
            )}
          </section>

          {progress.data?.continueLearning && (
            <Card className="card-pop flex flex-col gap-3 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Tiếp tục học</p>
                <p className="mt-1 font-extrabold">
                  Bài {progress.data.continueLearning.lessonNumber} · {progress.data.continueLearning.title}
                </p>
              </div>
              <Button asChild>
                <Link
                  to="/app/japanese/tango/learn/$lessonId"
                  params={{ lessonId: String(progress.data.continueLearning.lessonId) }}
                >
                  Tiếp tục
                </Link>
              </Button>
            </Card>
          )}

          <section aria-label="Danh sách bài học" className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold">Bài học {level}</h2>
              <Link to="/app/japanese/tango/mistakes" className="text-sm font-bold text-primary hover:underline">
                Từ cần ôn →
              </Link>
            </div>
            {lessons.isPending ? (
              <LoadingBlock rows={4} />
            ) : lessons.isError ? (
              <ErrorBlock error={lessons.error} onRetry={() => lessons.refetch()} />
            ) : lessons.data.lessons.length === 0 ? (
              <EmptyBlock title={`Chưa có bài học cho ${level}`}>Quay lại sau hoặc chọn cấp độ khác.</EmptyBlock>
            ) : (
              <>
              <div role="group" aria-label="Lọc theo trạng thái" className="flex flex-wrap gap-2">
                {LESSON_FILTERS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    aria-pressed={statusFilter === f.key}
                    onClick={() => setStatusFilter(f.key)}
                    className={`rounded-full border px-3 py-1 text-xs font-bold transition-colors ${
                      statusFilter === f.key ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:border-primary/60"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {lessons.data.lessons
                  .filter((lesson) => statusFilter === "ALL" || lesson.status === statusFilter)
                  .map((lesson) => (
                  <Card key={lesson.id} className="card-pop flex flex-col gap-3 rounded-2xl p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-muted-foreground">Bài {lesson.lessonNumber}</p>
                        <p className="font-extrabold">{lesson.title}</p>
                      </div>
                      <LessonStatusBadge status={lesson.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {lesson.viewedCount}/{lesson.requiredCount} từ đã xem · {lesson.vocabularyCount} từ
                    </p>
                    <ProgressBar value={lesson.progressPercent} label={`Tiến độ bài ${lesson.lessonNumber}`} />
                    <Button asChild variant="outline" size="sm" className="mt-auto w-fit">
                      <Link
                        to="/app/japanese/tango/lessons/$lessonId"
                        params={{ lessonId: String(lesson.id) }}
                      >
                        {lesson.status === "NOT_STARTED" ? "Bắt đầu" : lesson.status === "COMPLETED" ? "Ôn lại" : "Tiếp tục"}
                      </Link>
                    </Button>
                  </Card>
                ))}
              </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function OverviewStat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <Card className="card-pop rounded-2xl p-5">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      {value === undefined ? (
        <div className="mt-2 h-7 w-16 animate-pulse rounded bg-muted" />
      ) : (
        <p className="mt-1 text-2xl font-extrabold">{value}</p>
      )}
    </Card>
  );
}

function SearchResults({ state, query }: { state: ReturnType<typeof useTangoSearchQuery>; query: string }) {
  if (state.isPending) return <LoadingBlock rows={3} />;
  if (state.isError) return <ErrorBlock error={state.error} onRetry={() => state.refetch()} />;
  const { lessons, vocabularies } = state.data;
  if (lessons.length === 0 && vocabularies.length === 0) {
    return <EmptyBlock title={`Không tìm thấy "${query}"`}>Thử từ khóa khác hoặc đổi cấp độ.</EmptyBlock>;
  }
  return (
    <div className="space-y-6">
      {lessons.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-extrabold">Bài học</h2>
          {lessons.map((l) => (
            <Link
              key={l.id}
              to="/app/japanese/tango/lessons/$lessonId"
              params={{ lessonId: String(l.id) }}
              className="block rounded-2xl border border-border bg-card p-4 font-bold hover:border-primary/60"
            >
              {l.jlptLevel} · Bài {l.lessonNumber} · {l.title}
            </Link>
          ))}
        </section>
      )}
      {vocabularies.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-extrabold">Từ vựng</h2>
          {vocabularies.map((v) => (
            <Link
              key={v.vocabularyId}
              to="/app/japanese/tango/vocabularies/$vocabularyId"
              params={{ vocabularyId: String(v.vocabularyId) }}
              className="flex items-baseline gap-3 rounded-2xl border border-border bg-card p-4 hover:border-primary/60"
            >
              <span className="text-lg font-bold">{v.expression ?? v.kana}</span>
              <span className="text-sm text-muted-foreground">{v.kana}</span>
              <span className="ml-auto text-sm">{v.primaryMeaning}</span>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
