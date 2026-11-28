import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AddToDeckButton } from "@/components/tango/AddToDeckButton";
import { Search } from "lucide-react";
import { JLPT_LEVELS, type JlptLevel, type TangoLessonStatus } from "@/api/tango.api";
import {
  useTangoLessonsQuery,
  useTangoLevelsQuery,
  useTangoProgressQuery,
  useTangoSearchQuery,
} from "@/hooks/queries/tango.queries";
import {
  EmptyBlock,
  ErrorBlock,
  JpText,
  LessonStatusBadge,
  LevelStamp,
  LoadingBlock,
  ProgressRing,
} from "@/components/tango/shared";

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

  const setLevel = (next: JlptLevel) =>
    navigate({ to: "/app/japanese/tango", search: { level: next } });

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Từ vựng tiếng Nhật</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Học theo cấp độ JLPT, từng bài một. Tiến độ được theo dõi xuyên suốt các bài.
            </p>
          </div>
          <LevelStamp level={level} />
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
                  className={`min-h-10 rounded-full px-4 text-sm font-semibold transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface-2 hover:bg-primary-soft"
                  }`}
                >
                  {item}
                  {summary && (
                    <span className="ml-1.5 font-normal opacity-70">{summary.lessonCount}</span>
                  )}
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
          {progress.isError ? (
            <ErrorBlock error={progress.error} onRetry={() => progress.refetch()} />
          ) : (
            <section
              aria-label="Tổng quan học tập"
              className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-border sm:grid-cols-4"
            >
              <OverviewStat label="Tổng số từ" value={progress.data?.words.total} />
              <OverviewStat
                label="Đã học"
                value={progress.data && progress.data.words.total - progress.data.words.new}
              />
              <OverviewStat label="Đã thuộc" value={progress.data?.words.mastered} />
              <OverviewStat label="Cần ôn" value={progress.data?.words.needReview} />
            </section>
          )}

          {progress.data?.continueLearning && (
            <div className="flex flex-col gap-3 rounded-2xl bg-primary-soft p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary-ink">
                  Tiếp tục học
                </p>
                <p className="mt-1 font-bold">
                  Bài {progress.data.continueLearning.lessonNumber} ·{" "}
                  {progress.data.continueLearning.title}
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
            </div>
          )}

          <section aria-label="Danh sách bài học" className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold">Bài học {level}</h2>
              <Link
                to="/app/japanese/tango/mistakes"
                className="text-sm font-bold text-primary hover:underline"
              >
                Từ cần ôn →
              </Link>
            </div>
            {lessons.isPending ? (
              <LoadingBlock rows={4} />
            ) : lessons.isError ? (
              <ErrorBlock error={lessons.error} onRetry={() => lessons.refetch()} />
            ) : lessons.data.lessons.length === 0 ? (
              <EmptyBlock title={`Chưa có bài học cho ${level}`}>
                Quay lại sau hoặc chọn cấp độ khác.
              </EmptyBlock>
            ) : (
              <>
                <div role="group" aria-label="Lọc theo trạng thái" className="flex flex-wrap gap-2">
                  {LESSON_FILTERS.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      aria-pressed={statusFilter === f.key}
                      onClick={() => setStatusFilter(f.key)}
                      className={`min-h-9 rounded-full px-3.5 text-sm font-semibold transition-colors ${
                        statusFilter === f.key
                          ? "bg-primary-soft text-primary-ink"
                          : "bg-surface-2 hover:bg-primary-soft"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {lessons.data.lessons
                    .filter((lesson) => statusFilter === "ALL" || lesson.status === statusFilter)
                    .map((lesson) => {
                      const tone =
                        lesson.status === "COMPLETED"
                          ? "bg-primary-soft"
                          : lesson.status === "IN_PROGRESS"
                            ? "bg-card lift"
                            : "bg-surface-2";
                      return (
                        <div
                          key={lesson.id}
                          className={`group pointer-events-none relative flex min-h-36 flex-col justify-end gap-1 overflow-hidden rounded-2xl p-4 transition-transform duration-200 hover:-translate-y-0.5 ${tone}`}
                        >
                          <Link
                            to="/app/japanese/tango/lessons/$lessonId"
                            params={{ lessonId: String(lesson.id) }}
                            aria-label={`Bài ${lesson.lessonNumber} · ${lesson.title}`}
                            className="pointer-events-auto absolute inset-0 rounded-2xl"
                          />
                          <span
                            aria-hidden
                            lang="ja"
                            className="jp-serif absolute right-3 top-1 text-6xl leading-none opacity-[0.12]"
                          >
                            {lesson.lessonNumber}
                          </span>
                          {lesson.status === "IN_PROGRESS" && (
                            <div className="absolute right-4 top-4">
                              <ProgressRing
                                size={40}
                                value={lesson.progressPercent}
                                label={`Tiến độ bài ${lesson.lessonNumber}`}
                              />
                            </div>
                          )}
                          <p className="max-w-[75%] font-bold">
                            <span className="text-muted-foreground">
                              Bài {lesson.lessonNumber} ·{" "}
                            </span>
                            {lesson.title}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {lesson.viewedCount}/{lesson.requiredCount} từ đã xem ·{" "}
                            {lesson.vocabularyCount} từ
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <LessonStatusBadge status={lesson.status} />
                            <AddToDeckButton
                              lessonId={lesson.id}
                              compact
                              className="pointer-events-auto relative z-10"
                            />
                            <span className="ml-auto text-sm font-semibold text-primary">
                              {lesson.status === "NOT_STARTED"
                                ? "Bắt đầu"
                                : lesson.status === "COMPLETED"
                                  ? "Ôn lại"
                                  : "Tiếp tục"}{" "}
                              →
                            </span>
                          </div>
                        </div>
                      );
                    })}
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
    <div className="bg-card px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      {value === undefined ? (
        <div className="mt-2 h-7 w-16 animate-pulse rounded bg-surface-2" />
      ) : (
        <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      )}
    </div>
  );
}

function SearchResults({
  state,
  query,
}: {
  state: ReturnType<typeof useTangoSearchQuery>;
  query: string;
}) {
  if (state.isPending) return <LoadingBlock rows={3} />;
  if (state.isError) return <ErrorBlock error={state.error} onRetry={() => state.refetch()} />;
  const { lessons, vocabularies } = state.data;
  if (lessons.length === 0 && vocabularies.length === 0) {
    return (
      <EmptyBlock title={`Không tìm thấy "${query}"`}>Thử từ khóa khác hoặc đổi cấp độ.</EmptyBlock>
    );
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
              className="block rounded-2xl bg-surface-2 p-4 font-semibold transition-colors hover:bg-primary-soft"
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
              className="flex items-baseline gap-3 rounded-2xl bg-surface-2 p-4 transition-colors hover:bg-primary-soft"
            >
              <JpText serif className="text-xl">
                {v.expression ?? v.kana}
              </JpText>
              <JpText className="text-sm text-muted-foreground">{v.kana}</JpText>
              <span className="ml-auto text-sm">{v.primaryMeaning}</span>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
