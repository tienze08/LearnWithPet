import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLearningAttemptMutation, useReviewQueueQuery } from "@/hooks/queries/learning.queries";
import type { LearningRating } from "@/api/learning.api";
import { EmptyBlock, ErrorBlock, LoadingBlock, ProgressBar } from "@/components/tango/shared";

export const Route = createFileRoute("/app/review")({
  component: ReviewCenter,
});

const RATINGS: { rating: LearningRating; label: string; key: string }[] = [
  { rating: "AGAIN", label: "Chưa nhớ", key: "1" },
  { rating: "HARD", label: "Khó", key: "2" },
  { rating: "GOOD", label: "Nhớ", key: "3" },
  { rating: "EASY", label: "Dễ", key: "4" },
];

function ReviewCenter() {
  const queue = useReviewQueueQuery(20);
  const attempt = useLearningAttemptMutation();
  // Rated items are filtered locally so a background refetch cannot skip or repeat a card.
  const [rated, setRated] = useState<Set<number>>(new Set());
  const [revealed, setRevealed] = useState(false);

  const items = (queue.data ?? []).filter((i) => !rated.has(i.progressId));
  const current = items[0];
  const done = rated.size;
  const total = done + items.length;

  const rate = (rating: LearningRating) => {
    if (!current) return;
    const id = current.progressId;
    attempt.mutate(
      { tangoVocabularyId: current.tangoVocabularyId ?? undefined, vocabularyId: current.vocabularyId ?? undefined, rating },
      {
        onSuccess: () => {
          setRated((s) => new Set(s).add(id));
          setRevealed(false);
        },
      },
    );
  };

  // Keyboard: Space reveals, 1–4 rate after reveal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!current || attempt.isPending) return;
      if (e.code === "Space" && !revealed) {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed) {
        const hit = RATINGS.find((r) => r.key === e.key);
        if (hit) rate(hit.rating);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, revealed, attempt.isPending]);

  if (queue.isPending) return <LoadingBlock rows={3} />;
  if (queue.isError) return <ErrorBlock error={queue.error} onRetry={() => queue.refetch()} />;

  if (!current) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <Header />
        <EmptyBlock title={done > 0 ? "Hoàn thành lượt ôn!" : "Không có từ nào cần ôn"}>
          {done > 0 ? `Bạn đã ôn ${done} từ.` : "Quay lại sau, hoặc học thêm bài mới."}
        </EmptyBlock>
        <Button variant="outline" onClick={() => { setRated(new Set()); queue.refetch(); }}>
          Tải lại
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Header />
      <div className="flex items-center justify-between text-sm font-bold">
        <span>{done + 1} / {total}</span>
        <span className="text-muted-foreground">Đã ôn {done}</span>
      </div>
      <ProgressBar value={Math.round((done / Math.max(1, total)) * 100)} label="Tiến độ ôn tập" />

      <Card className="card-pop space-y-5 rounded-3xl p-8 text-center">
        <div>
          <p className="text-5xl font-extrabold tracking-tight">{current.word}</p>
          {current.kana && current.kana !== current.word && (
            <p className="mt-2 text-lg text-muted-foreground">{current.kana}</p>
          )}
        </div>
        {revealed ? (
          <div className="border-t border-border pt-5">
            <p className="text-xl font-bold">{current.meaning || "—"}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Đã gặp {current.timesSeen} lần · đúng {current.correctCount} · sai {current.incorrectCount}
            </p>
          </div>
        ) : (
          <Button size="lg" className="w-full" onClick={() => setRevealed(true)}>
            Hiện nghĩa (Space)
          </Button>
        )}
      </Card>

      {revealed && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {RATINGS.map((r) => (
            <Button
              key={r.rating}
              variant={r.rating === "AGAIN" ? "outline" : "default"}
              disabled={attempt.isPending}
              onClick={() => rate(r.rating)}
            >
              {r.label} <span className="ml-1 opacity-60">({r.key})</span>
            </Button>
          ))}
        </div>
      )}
      {attempt.isError && (
        <p role="alert" className="text-center text-sm text-destructive">Chưa lưu được. Thử lại.</p>
      )}
    </div>
  );
}

function Header() {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Practice</p>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Review Center</h1>
      <p className="mt-2 text-sm text-muted-foreground">Từ đến hạn ôn, từ flashcard và bài học gộp chung.</p>
    </div>
  );
}
