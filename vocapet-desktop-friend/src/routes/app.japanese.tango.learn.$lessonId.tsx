import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ChevronLeft, ChevronRight, Volume2 } from "lucide-react";
import { speakKana } from "@/lib/japanese/kana";
import { useTangoLessonQuery, useTangoLessonVocabulariesQuery, useTangoVocabularyQuery, useStudyProgressMutation } from "@/hooks/queries/tango.queries";
import { useLearningAttemptMutation } from "@/hooks/queries/learning.queries";
import { ErrorBlock, LoadingBlock, ProgressBar, WordStatusBadge } from "@/components/tango/shared";

export const Route = createFileRoute("/app/japanese/tango/learn/$lessonId")({
  component: TangoLearningMode,
});

type LearnMode = "guided" | "flashcard";

function TangoLearningMode() {
  const { lessonId } = Route.useParams();
  const id = Number(lessonId);
  const lesson = useTangoLessonQuery(id);
  const words = useTangoLessonVocabulariesQuery(id);
  const study = useStudyProgressMutation(id);
  const attempt = useLearningAttemptMutation();
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<LearnMode>("guided");
  const [revealed, setRevealed] = useState(false);
  const [rated, setRated] = useState<Record<number, "known" | "unknown">>({});

  const list = useMemo(() => words.data?.vocabularies ?? [], [words.data]);
  const current = list[index];

  // Mark the visible word as viewed (backend keeps the first view only, so repeats are harmless).
  useEffect(() => {
    if (!current || current.viewed) return;
    study.mutate({ vocabularyIds: [current.id], lastPosition: current.position });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  // Reset the reveal when the card changes.
  useEffect(() => setRevealed(false), [index, mode]);

  const go = (delta: number) => setIndex((i) => Math.min(list.length - 1, Math.max(0, i + delta)));

  // Both modes write to the same word progress through the unified learning endpoint.
  const record = (known: boolean) => {
    if (!current) return;
    attempt.mutate(
      { tangoVocabularyId: current.id, rating: known ? "GOOD" : "AGAIN" },
      { onSuccess: () => setRated((r) => ({ ...r, [current.id]: known ? "known" : "unknown" })) },
    );
  };

  // Keyboard: ←/→ move, Space reveals (flashcard), 1 = unknown, 2 = known.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
      else if (e.code === "Space" && mode === "flashcard" && !revealed) {
        e.preventDefault();
        setRevealed(true);
      } else if ((e.key === "1" || e.key === "2") && current && (mode === "guided" || revealed)) {
        record(e.key === "2");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, mode, revealed, list.length]);

  if (lesson.isPending || words.isPending) return <LoadingBlock rows={2} />;
  if (lesson.isError || words.isError) {
    return <ErrorBlock error={lesson.error ?? words.error} onRetry={() => { lesson.refetch(); words.refetch(); }} />;
  }
  if (list.length === 0) {
    return (
      <div className="space-y-4">
        <BackLink lessonId={lessonId} />
        <p className="text-sm text-muted-foreground">Bài học này chưa có từ nào.</p>
      </div>
    );
  }

  const viewed = list.filter((w) => w.viewed || (current && w.id === current.id)).length;
  const required = list.filter((w) => w.required).length;
  const percent = required === 0 ? 0 : Math.round((viewed / required) * 100);
  const allViewed = viewed >= required;
  const showMeaning = mode === "guided" || revealed;
  const currentRating = current ? rated[current.id] : undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <BackLink lessonId={lessonId} />
        <p className="text-sm font-bold">
          {index + 1} / {list.length}
        </p>
      </div>

      <div role="group" aria-label="Chế độ học" className="flex justify-center gap-2">
        {(["guided", "flashcard"] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
            className={`rounded-full border px-4 py-1.5 text-sm font-bold transition-colors ${
              mode === m ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/60"
            }`}
          >
            {m === "guided" ? "Học có hướng dẫn" : "Flashcard"}
          </button>
        ))}
      </div>

      <ProgressBar value={percent} label="Tiến độ học" />

      {current && (
        <Card className="card-pop space-y-5 rounded-3xl p-8 text-center">
          <div className="flex items-center justify-center gap-3">
            <WordStatusBadge status={current.status} />
            {current.partOfSpeech && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">
                {current.partOfSpeech}
              </span>
            )}
          </div>
          <div>
            <p className="text-5xl font-extrabold tracking-tight">{current.expression ?? current.kana}</p>
            {current.expression && <p className="mt-2 text-lg text-muted-foreground">{current.kana}</p>}
            {showMeaning && <p className="mt-1 text-sm text-muted-foreground">{current.romaji}</p>}
          </div>
          <Button variant="outline" size="sm" onClick={() => speakKana(current.kana)} aria-label="Phát âm">
            <Volume2 className="mr-2 h-4 w-4" /> Nghe
          </Button>

          {showMeaning ? (
            <>
              <div className="border-t border-border pt-5">
                <p className="text-xl font-bold">{current.primaryMeaning ?? "—"}</p>
              </div>
              <WordExamples vocabularyId={current.id} />
            </>
          ) : (
            <Button className="w-full" onClick={() => setRevealed(true)}>
              Hiện nghĩa (Space)
            </Button>
          )}

          {showMeaning && (
            <div className="flex flex-col items-center gap-2 border-t border-border pt-5">
              {currentRating ? (
                <p className="text-sm font-bold text-muted-foreground">
                  {currentRating === "known" ? "Đã đánh dấu: Đã biết" : "Đã đánh dấu: Chưa biết"}
                </p>
              ) : null}
              <div className="flex gap-3">
                <Button variant="outline" disabled={attempt.isPending} onClick={() => record(false)}>
                  Chưa biết (1)
                </Button>
                <Button disabled={attempt.isPending} onClick={() => record(true)}>
                  Đã biết (2)
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => go(-1)} disabled={index === 0}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Trước
        </Button>
        {index === list.length - 1 && allViewed ? (
          <Button asChild>
            <Link to="/app/japanese/tango/practice/$lessonId" params={{ lessonId }} search={{ mode: "MIXED", scope: "ALL" }}>
              Làm bài kiểm tra
            </Link>
          </Button>
        ) : (
          <Button onClick={() => go(1)} disabled={index === list.length - 1}>
            Tiếp <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
      {attempt.isError && (
        <p role="alert" className="text-center text-sm text-destructive">Chưa ghi nhận được. Thử lại.</p>
      )}
      {study.isError && (
        <p role="alert" className="text-center text-sm text-destructive">
          Chưa lưu được tiến độ. Tiến độ sẽ được gửi lại khi bạn chuyển từ.
        </p>
      )}
      {lesson.data && <p className="sr-only">{lesson.data.title}</p>}
    </div>
  );
}

function WordExamples({ vocabularyId }: { vocabularyId: number }) {
  const detail = useTangoVocabularyQuery(vocabularyId);
  if (detail.isPending) return <div className="h-10 animate-pulse rounded bg-muted" />;
  if (detail.isError) return null;
  const examples = detail.data.examples;
  if (examples.length === 0) return null;
  return (
    <div className="space-y-2 rounded-2xl bg-muted/50 p-4 text-left">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Ví dụ</p>
      {examples.map((e, i) => (
        <div key={i}>
          <p className="font-bold">{e.japanese}</p>
          {e.reading && <p className="text-sm text-muted-foreground">{e.reading}</p>}
          <p className="text-sm">{e.vietnamese}</p>
        </div>
      ))}
    </div>
  );
}

function BackLink({ lessonId }: { lessonId: string }) {
  return (
    <Link
      to="/app/japanese/tango/lessons/$lessonId"
      params={{ lessonId }}
      className="inline-flex items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" /> Bài học
    </Link>
  );
}
