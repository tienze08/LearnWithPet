import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AddToDeckButton } from "@/components/tango/AddToDeckButton";
import { ArrowLeft, Heart, Volume2 } from "lucide-react";
import { speakKana } from "@/lib/japanese/kana";
import type { TangoLessonVocabulary } from "@/api/tango.api";
import {
  useSetTangoFavoriteMutation,
  useStartTangoLessonMutation,
  useTangoLessonQuery,
  useTangoLessonVocabulariesQuery,
} from "@/hooks/queries/tango.queries";
import {
  EmptyBlock,
  Enso,
  ErrorBlock,
  JpText,
  LessonStatusBadge,
  LoadingBlock,
  ProgressBar,
  WordStatusBadge,
} from "@/components/tango/shared";

export const Route = createFileRoute("/app/japanese/tango/lessons/$lessonId")({
  component: TangoLessonDetail,
});

type Filter = "all" | "unviewed" | "viewed" | "needReview";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "unviewed", label: "Chưa học" },
  { key: "viewed", label: "Đã học" },
  { key: "needReview", label: "Cần ôn" },
];

function matches(word: TangoLessonVocabulary, filter: Filter): boolean {
  switch (filter) {
    case "unviewed":
      return !word.viewed;
    case "viewed":
      return word.viewed;
    case "needReview":
      return word.status === "NEED_REVIEW";
    default:
      return true;
  }
}

function TangoLessonDetail() {
  const { lessonId } = Route.useParams();
  const id = Number(lessonId);
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>("all");
  const [view, setView] = useState<"rows" | "tiles">(() => {
    try {
      return localStorage.getItem("tango-word-view") === "tiles" ? "tiles" : "rows";
    } catch {
      return "rows";
    }
  });
  const changeView = (v: "rows" | "tiles") => {
    setView(v);
    try {
      localStorage.setItem("tango-word-view", v);
    } catch {
      /* storage unavailable: view just isn't remembered */
    }
  };

  const lesson = useTangoLessonQuery(id);
  const vocabularies = useTangoLessonVocabulariesQuery(id);
  const start = useStartTangoLessonMutation();
  const favorite = useSetTangoFavoriteMutation();

  if (lesson.isPending) return <LoadingBlock rows={5} />;
  if (lesson.isError) {
    return (
      <div className="space-y-4">
        <BackLink />
        <ErrorBlock error={lesson.error} onRetry={() => lesson.refetch()} />
      </div>
    );
  }

  const data = lesson.data;
  const learnPath = { to: "/app/japanese/tango/learn/$lessonId" as const, params: { lessonId } };
  const practicePath = {
    to: "/app/japanese/tango/practice/$lessonId" as const,
    params: { lessonId },
  };
  const percent =
    data.status === "COMPLETED"
      ? 100
      : data.requiredCount === 0
        ? 0
        : Math.round(
            ((vocabularies.data?.vocabularies.filter((w) => w.required && w.viewed).length ?? 0) /
              data.requiredCount) *
              100,
          );

  const startLearning = () => {
    start.mutate(id, { onSuccess: () => navigate(learnPath) });
  };

  return (
    <div className="space-y-6">
      <BackLink />

      <div className="relative overflow-hidden rounded-2xl bg-primary-soft p-6">
        <Enso className="-right-6 -top-6 h-44 w-44" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary-ink">
              {data.jlptLevel} · Bài {data.lessonNumber}
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">{data.title}</h1>
            {data.description && (
              <p className="mt-2 text-sm text-muted-foreground">{data.description}</p>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <LessonStatusBadge status={data.status} />
          </div>
        </div>
        <div className="mt-5 space-y-2">
          <ProgressBar value={percent} label="Tiến độ bài học" />
          <p className="text-xs text-muted-foreground">
            {data.requiredCount} từ bắt buộc
            {data.bestQuizAccuracy !== null &&
              ` · Điểm kiểm tra tốt nhất ${Math.round(data.bestQuizAccuracy * 100)}%`}
            {data.quizPassed && " · Đã đạt kiểm tra"}
          </p>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          {data.status === "NOT_STARTED" ? (
            <Button onClick={startLearning} disabled={start.isPending}>
              Bắt đầu học
            </Button>
          ) : (
            <Button asChild>
              <Link {...learnPath}>{data.lastPosition ? "Tiếp tục học" : "Học bài này"}</Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link to="/app/practice" search={{ mode: "vocab", lesson: data.id }}>
              Luyện tập từ vựng
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link {...practicePath}>Làm bài kiểm tra</Link>
          </Button>
          <Button asChild variant="outline">
            <Link {...practicePath} search={{ mode: "MIXED", scope: "MISTAKES" }}>
              Ôn từ sai
            </Link>
          </Button>
          <AddToDeckButton lessonId={id} />
        </div>
        {start.isError && (
          <p className="relative mt-3 text-sm text-destructive">{start.error.message}</p>
        )}
      </div>

      <section aria-label="Danh sách từ vựng" className="space-y-3">
        <div role="tablist" aria-label="Lọc từ vựng" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              role="tab"
              aria-selected={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={`min-h-10 rounded-full px-4 text-sm font-semibold transition-colors ${
                filter === f.key
                  ? "bg-primary-soft text-primary-ink"
                  : "bg-surface-2 hover:bg-primary-soft"
              }`}
            >
              {f.label}
            </button>
          ))}
          <div
            role="group"
            aria-label="Kiểu hiển thị"
            className="ml-auto flex gap-1 rounded-full bg-surface-2 p-1"
          >
            {(["rows", "tiles"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => changeView(v)}
                className={`min-h-8 rounded-full px-3 text-sm font-semibold ${view === v ? "bg-card shadow-sm" : "text-muted-foreground"}`}
              >
                {v === "rows" ? "Danh sách" : "Thẻ"}
              </button>
            ))}
          </div>
        </div>

        {vocabularies.isPending ? (
          <LoadingBlock rows={6} />
        ) : vocabularies.isError ? (
          <ErrorBlock error={vocabularies.error} onRetry={() => vocabularies.refetch()} />
        ) : vocabularies.data.vocabularies.length === 0 ? (
          <EmptyBlock title="Bài học này chưa có từ nào." />
        ) : (
          <WordList
            words={vocabularies.data.vocabularies.filter((w) => matches(w, filter))}
            onToggleFavorite={(word) =>
              favorite.mutate({ vocabularyId: word.id, favorite: !word.favorite })
            }
            favoritePending={favorite.isPending}
            view={view}
          />
        )}
      </section>
    </div>
  );
}

function WordList({
  words,
  onToggleFavorite,
  favoritePending,
  view,
}: {
  words: TangoLessonVocabulary[];
  onToggleFavorite: (word: TangoLessonVocabulary) => void;
  favoritePending: boolean;
  view: "rows" | "tiles";
}) {
  if (words.length === 0) {
    return <EmptyBlock title="Không có từ nào trong bộ lọc này." />;
  }
  const actions = (word: TangoLessonVocabulary) => (
    <>
      <button
        type="button"
        aria-label={word.favorite ? "Bỏ yêu thích" : "Yêu thích"}
        aria-pressed={word.favorite}
        disabled={favoritePending}
        onClick={() => onToggleFavorite(word)}
        className="grid h-11 w-11 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-surface-2"
      >
        <Heart className={`h-5 w-5 ${word.favorite ? "fill-current text-seal-ink" : ""}`} />
      </button>
      <button
        type="button"
        aria-label={`Phát âm ${word.kana}`}
        onClick={() => speakKana(word.kana)}
        className="grid h-11 w-11 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-surface-2"
      >
        <Volume2 className="h-5 w-5" />
      </button>
    </>
  );

  if (view === "tiles") {
    return (
      <ul className="grid grid-cols-2 gap-3 rounded-2xl bg-surface-2 p-3 sm:grid-cols-3 lg:grid-cols-4">
        {words.map((word) => (
          <li
            key={word.id}
            className="flex flex-col items-center gap-1 rounded-2xl bg-card p-4 text-center transition-transform duration-200 hover:-translate-y-0.5"
          >
            <Link
              to="/app/japanese/tango/vocabularies/$vocabularyId"
              params={{ vocabularyId: String(word.id) }}
              className="flex flex-col items-center"
            >
              <JpText serif className="text-3xl">
                {word.expression ?? word.kana}
              </JpText>
              {word.expression && (
                <JpText className="text-sm text-muted-foreground">{word.kana}</JpText>
              )}
              <span className="mt-1 text-sm">{word.primaryMeaning}</span>
            </Link>
            <div className="mt-2">
              <WordStatusBadge status={word.status} />
            </div>
            <div className="flex">{actions(word)}</div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-card">
      {words.map((word) => (
        <li key={word.id} className="flex min-h-16 items-center gap-3 py-2 pl-4 pr-1">
          <span className="w-6 shrink-0 text-xs tabular-nums text-muted-foreground">
            {word.position}
          </span>
          <div className="min-w-0 flex-1">
            <Link
              to="/app/japanese/tango/vocabularies/$vocabularyId"
              params={{ vocabularyId: String(word.id) }}
              className="flex flex-wrap items-baseline gap-x-3"
            >
              <JpText serif className="text-2xl">
                {word.expression ?? word.kana}
              </JpText>
              {word.expression && (
                <JpText className="text-sm text-muted-foreground">{word.kana}</JpText>
              )}
              <span className="hidden text-xs text-muted-foreground sm:inline">{word.romaji}</span>
            </Link>
            <p className="text-[15px]">{word.primaryMeaning}</p>
            <span className="mt-1 inline-block sm:hidden">
              <WordStatusBadge status={word.status} />
            </span>
          </div>
          <span className="hidden sm:block">
            <WordStatusBadge status={word.status} />
          </span>
          {actions(word)}
        </li>
      ))}
    </ul>
  );
}

function BackLink() {
  return (
    <Link
      to="/app/japanese/tango"
      className="inline-flex items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" /> Tango
    </Link>
  );
}
