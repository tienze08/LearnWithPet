import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  ErrorBlock,
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
  const practicePath = { to: "/app/japanese/tango/practice/$lessonId" as const, params: { lessonId } };
  const percent = data.status === "COMPLETED" ? 100 : data.requiredCount === 0 ? 0 : Math.round(
    ((vocabularies.data?.vocabularies.filter((w) => w.required && w.viewed).length ?? 0) / data.requiredCount) * 100,
  );

  const startLearning = () => {
    start.mutate(id, { onSuccess: () => navigate(learnPath) });
  };

  return (
    <div className="space-y-6">
      <BackLink />

      <Card className="card-pop rounded-2xl p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
              {data.jlptLevel} · Bài {data.lessonNumber}
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight">{data.title}</h1>
            {data.description && <p className="mt-2 text-sm text-muted-foreground">{data.description}</p>}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <LessonStatusBadge status={data.status} />
          </div>
        </div>
        <div className="mt-5 space-y-2">
          <ProgressBar value={percent} label="Tiến độ bài học" />
          <p className="text-xs text-muted-foreground">
            {data.requiredCount} từ bắt buộc
            {data.bestQuizAccuracy !== null && ` · Điểm kiểm tra tốt nhất ${Math.round(data.bestQuizAccuracy * 100)}%`}
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
            <Link {...practicePath}>Làm bài kiểm tra</Link>
          </Button>
          <Button asChild variant="outline">
            <Link {...practicePath} search={{ mode: "MIXED", scope: "MISTAKES" }}>
              Ôn từ sai
            </Link>
          </Button>
        </div>
        {start.isError && <p className="mt-3 text-sm text-destructive">{start.error.message}</p>}
      </Card>

      <section aria-label="Danh sách từ vựng" className="space-y-3">
        <div role="tablist" aria-label="Lọc từ vựng" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              role="tab"
              aria-selected={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full border px-3 py-1 text-sm font-bold ${
                filter === f.key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
              }`}
            >
              {f.label}
            </button>
          ))}
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
}: {
  words: TangoLessonVocabulary[];
  onToggleFavorite: (word: TangoLessonVocabulary) => void;
  favoritePending: boolean;
}) {
  if (words.length === 0) {
    return <EmptyBlock title="Không có từ nào trong bộ lọc này." />;
  }
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
      {words.map((word) => (
        <li key={word.id} className="flex items-center gap-3 p-4">
          <span className="w-6 shrink-0 text-xs text-muted-foreground">{word.position}</span>
          <div className="min-w-0 flex-1">
            <Link
              to="/app/japanese/tango/vocabularies/$vocabularyId"
              params={{ vocabularyId: String(word.id) }}
              className="flex flex-wrap items-baseline gap-x-3"
            >
              <span className="text-lg font-bold">{word.expression ?? word.kana}</span>
              {word.expression && <span className="text-sm text-muted-foreground">{word.kana}</span>}
              <span className="text-xs text-muted-foreground">{word.romaji}</span>
            </Link>
            <p className="truncate text-sm">{word.primaryMeaning}</p>
          </div>
          <WordStatusBadge status={word.status} />
          <button
            type="button"
            aria-label={word.favorite ? "Bỏ yêu thích" : "Yêu thích"}
            aria-pressed={word.favorite}
            disabled={favoritePending}
            onClick={() => onToggleFavorite(word)}
            className="rounded-full p-2 hover:bg-muted"
          >
            <Heart className={`h-4 w-4 ${word.favorite ? "fill-current text-destructive" : ""}`} />
          </button>
          <button
            type="button"
            aria-label={`Phát âm ${word.kana}`}
            onClick={() => speakKana(word.kana)}
            className="rounded-full p-2 hover:bg-muted"
          >
            <Volume2 className="h-4 w-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}

function BackLink() {
  return (
    <Link to="/app/japanese/tango" className="inline-flex items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-4 w-4" /> Tango
    </Link>
  );
}
