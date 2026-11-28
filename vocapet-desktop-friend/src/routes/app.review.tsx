import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PetNote, Seal } from "@/components/learning-path/studio";
import { ArrowRight, Eye, EyeOff, Volume2 } from "lucide-react";
import { weekdayVi } from "@/lib/learning-path/dates";
import { useLearningAttemptMutation, useReviewQueueQuery } from "@/hooks/queries/learning.queries";
import type { LearningRating, ReviewItem } from "@/api/learning.api";
import { ErrorBlock, LoadingBlock, ProgressBar } from "@/components/tango/shared";
import { usePathStatusQuery, useReviewOverviewQuery } from "@/hooks/queries/learning-path.queries";
import { useTangoProgressQuery, useTangoWeakWordsQuery } from "@/hooks/queries/tango.queries";
import type { PathItemType } from "@/api/learning-path.api";

export const Route = createFileRoute("/app/review")({
  component: ReviewCenter,
});

/** Reads the Japanese aloud with the browser voice; silent where speech synthesis is missing. */
function speakJa(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ja-JP";
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

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
  const [furigana, setFurigana] = useState(true);

  const overview = useOverview();
  const items = (queue.data ?? []).filter((i) => !rated.has(i.progressId));
  const current = items[0];
  const done = rated.size;
  const total = done + items.length;

  const rate = (rating: LearningRating) => {
    if (!current) return;
    const id = current.progressId;
    attempt.mutate(
      {
        tangoVocabularyId: current.tangoVocabularyId ?? undefined,
        vocabularyId: current.vocabularyId ?? undefined,
        rating,
      },
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

  if (queue.isPending)
    return (
      <div className="mx-auto max-w-[1120px]">
        <LoadingBlock rows={3} />
      </div>
    );
  if (queue.isError)
    return (
      <div className="mx-auto max-w-[1120px]">
        <ErrorBlock error={queue.error} onRetry={() => queue.refetch()} />
      </div>
    );

  return (
    <div className="mx-auto grid max-w-[1120px] gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] lg:gap-16">
      <div className="min-w-0 space-y-10">
        <Header wordItems={items} />
        {current ? (
          <section id="flashcard" aria-labelledby="card-title" className="scroll-mt-8 space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="space-y-1">
                <h2 id="card-title" className="studio-head text-3xl">
                  Thẻ học: Từ vựng
                </h2>
                <p className="text-sm studio-muted">Luyện tập để ghi nhớ lâu hơn nhé!</p>
              </div>
              <div className="flex w-52 items-center gap-3">
                <div className="flex-1">
                  <ProgressBar
                    value={Math.round((done / Math.max(1, total)) * 100)}
                    label="Tiến độ ôn tập"
                  />
                </div>
                <span className="text-sm font-semibold tabular-nums">
                  {done + 1} / {total}
                </span>
              </div>
            </div>
            <div className="ref-card ref-scene grid justify-items-center gap-4 px-6 pb-20 pt-12 text-center">
              <p lang="ja" className="studio-jp text-5xl sm:text-6xl">
                {revealed && furigana && current.kana && current.kana !== current.word ? (
                  <ruby>
                    {current.word}
                    <rt className="text-base">{current.kana}</rt>
                  </ruby>
                ) : (
                  current.word
                )}
              </p>
              {revealed && (
                <div className="studio-rise grid w-full max-w-md justify-items-center gap-2">
                  {current.romaji && <p className="text-sm studio-muted">({current.romaji})</p>}
                  <button
                    type="button"
                    onClick={() => speakJa(current.kana ?? current.word)}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 hover:bg-primary-soft"
                    aria-label={`Nghe phát âm ${current.word}`}
                  >
                    <Volume2 aria-hidden className="h-5 w-5 text-primary" />
                    <span className="studio-head text-2xl">{current.meaning || "—"}</span>
                  </button>
                  <p className="text-xs studio-muted">
                    Đã gặp {current.timesSeen} lần · đúng {current.correctCount} · sai{" "}
                    {current.incorrectCount}
                  </p>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                aria-pressed={!furigana}
                onClick={() => setFurigana((v) => !v)}
                className="ref-chip min-h-12 gap-2 px-5"
              >
                {furigana ? <EyeOff aria-hidden className="h-4 w-4" /> : <Eye aria-hidden className="h-4 w-4" />}
                {furigana ? "Ẩn furigana" : "Hiện furigana"}
              </button>
              {!revealed && (
                <button type="button" onClick={() => setRevealed(true)} className="studio-btn min-h-12 px-6">
                  Lật thẻ
                  <ArrowRight aria-hidden className="h-4 w-4" />
                </button>
              )}
            </div>
            {revealed && (
              <div
                className="grid grid-cols-2 gap-2 sm:grid-cols-4"
                role="group"
                aria-label="Mức độ nhớ"
              >
                {RATINGS.map((r) => (
                  <button
                    key={r.rating}
                    type="button"
                    disabled={attempt.isPending}
                    onClick={() => rate(r.rating)}
                    className={`flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius)] border text-sm transition-colors disabled:opacity-50 ${
                      r.rating === "AGAIN"
                        ? "border-seal bg-sheet text-seal-ink hover:bg-background"
                        : r.rating === "GOOD"
                          ? "border-primary bg-primary text-primary-foreground hover:brightness-110"
                          : "border-border bg-sheet hover:bg-primary-soft"
                    }`}
                  >
                    {r.label}
                    <kbd aria-hidden className="hidden font-sans text-xs opacity-60 sm:inline">
                      {r.key}
                    </kbd>
                  </button>
                ))}
              </div>
            )}
            {attempt.isError && (
              <p role="alert" className="text-sm text-destructive">
                Chưa lưu được. Thử lại.
              </p>
            )}
          </section>
        ) : (
          <AllCaughtUp
            reviewedNow={done}
            onRecheck={() => {
              setRated(new Set());
              queue.refetch();
            }}
          />
        )}
      </div>
      <SideColumn due={items.length + (overview.data?.due ?? 0)} />
    </div>
  );
}

const TYPE_LABEL: Record<PathItemType, string> = {
  KANA: "kana",
  GRAMMAR: "ngữ pháp",
  VOCAB: "từ vựng",
  KANJI: "kanji",
};

function useOverview() {
  const status = usePathStatusQuery();
  return useReviewOverviewQuery(status.data?.enabled === true && status.data.onboarded);
}

/** What is due now, split into its two queues. Only real numbers; a queue with nothing due is left out. */
const TYPE_GLYPH: Record<PathItemType, string> = {
  VOCAB: "語",
  KANJI: "字",
  KANA: "か",
  GRAMMAR: "文",
};

/**
 * What needs attention, as a row of large counts by kind (words from the card queue, the rest from the path's own
 * schedule), one recommendation, and the two real ways to start: the card session below, or the path's due session.
 */
function Header({ wordItems }: { wordItems: ReviewItem[] }) {
  const ov = useOverview().data;
  const pathTypes = ov
    ? (Object.entries(ov.dueByType) as [PathItemType, number][]).filter(([, n]) => n > 0)
    : [];
  const wordsDue = wordItems.length;
  const pathDue = ov?.due ?? 0;
  const total = wordsDue + pathDue;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const wordsOverdue = wordItems.filter((i) => new Date(i.nextReviewTime) < startOfToday).length;
  const overdue = wordsOverdue + (ov?.overdue ?? 0);
  const counts: { key: string; glyph: string; n: number; label: string }[] = [
    ...(wordsDue > 0 ? [{ key: "cards", glyph: "札", n: wordsDue, label: "thẻ từ vựng" }] : []),
    ...pathTypes.map(([t, n]) => ({
      key: t,
      glyph: TYPE_GLYPH[t],
      n,
      label: `${TYPE_LABEL[t]} lộ trình`,
    })),
  ];
  return (
    <header className="space-y-7">
      <div className="space-y-3">
        <p className="studio-kicker">Ôn tập</p>
        <h1 className="studio-head text-4xl leading-[1.1] sm:text-5xl">
          {total > 0 ? `${total} nội dung cần ôn` : "Không còn gì đến hạn"}
        </h1>
        {total > 0 && (
          <p className="max-w-[60ch] text-[0.9375rem] studio-muted">
            {overdue > 0
              ? `Bắt đầu với ${overdue} nội dung quá hạn: ôn muộn thêm sẽ dễ quên hơn.`
              : "Ôn đúng hạn giúp nhớ lâu mà tốn ít thời gian nhất."}
          </p>
        )}
      </div>
      {counts.length > 0 && (
        <dl className="studio-rule-t studio-rule-b grid grid-cols-2 gap-x-6 gap-y-5 py-5 sm:grid-cols-4">
          {counts.map((c) => (
            <div key={c.key} className="flex items-baseline gap-3">
              <span lang="ja" aria-hidden className="studio-jp text-2xl studio-muted">
                {c.glyph}
              </span>
              <span className="flex flex-col-reverse">
                <dt className="text-xs studio-muted">{c.label}</dt>
                <dd className="studio-head text-4xl tabular-nums">{c.n}</dd>
              </span>
            </div>
          ))}
        </dl>
      )}
      {total > 0 && (
        <div className="flex flex-wrap gap-3">
          {wordsDue > 0 && (
            <a href="#flashcard" className="studio-btn">
              Ôn {wordsDue} thẻ từ vựng
            </a>
          )}
          {pathDue > 0 && (
            <Link
              to="/app/path/study"
              search={{ phase: "DUE" }}
              className={`studio-btn ${wordsDue > 0 ? "studio-btn-quiet" : ""}`}
            >
              Ôn {pathDue} nội dung lộ trình
            </Link>
          )}
        </div>
      )}
    </header>
  );
}

/** Where the learner's words stand in memory, from the Tango progress endpoint. */
function MemoryState() {
  const progress = useTangoProgressQuery("N5");
  const w = progress.data?.words;
  if (!w || w.total === 0) return null;
  const parts = [
    { key: "m", label: "Đã thuộc", n: w.mastered, cls: "bg-primary" },
    { key: "l", label: "Đang học", n: w.learning, cls: "bg-sage" },
    { key: "r", label: "Cần ôn", n: w.needReview, cls: "bg-butter" },
    { key: "n", label: "Chưa học", n: w.new, cls: "bg-surface-2" },
  ];
  return (
    <section aria-labelledby="memory" className="space-y-3">
      <h2 id="memory" className="studio-kicker studio-kicker-muted">
        Trạng thái ghi nhớ · {w.total} từ
      </h2>
      <div
        role="img"
        aria-label={parts.map((p) => `${p.label} ${p.n}`).join(", ")}
        className="flex h-2.5 overflow-hidden rounded-[2px] bg-surface-2"
      >
        {parts
          .filter((p) => p.n > 0)
          .map((p) => (
            <span key={p.key} className={p.cls} style={{ flex: p.n }} />
          ))}
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        {parts.map((p) => (
          <div key={p.key} className="flex items-center gap-2">
            <span
              aria-hidden
              className={`h-2.5 w-2.5 rounded-[1px] ${p.cls} ${p.key === "n" ? "border border-border" : ""}`}
            />
            <dt className="studio-muted">{p.label}</dt>
            <dd className="ml-auto tabular-nums">{p.n}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Companion, the coming week's load, the words most often missed and recent accuracy: all real data. */
function SideColumn({ due }: { due: number }) {
  const ov = useOverview().data;
  const weak = useTangoWeakWordsQuery("N5");
  const weakItems = (weak.data?.items ?? []).slice(0, 5);
  const week = ov?.upcoming.slice(0, 7) ?? [];
  const max = Math.max(1, ...week.map((u) => u.count));
  return (
    <aside className="min-w-0 space-y-10 lg:pt-2" aria-label="Lịch ôn">
      <PetNote mood={due > 0 ? "happy" : "sleepy"}>
        {due > 0
          ? "Ôn một chút mỗi ngày, mình nhắc bạn đúng lúc sắp quên."
          : "Hôm nay không còn gì để ôn. Mình nghỉ một chút nhé."}
      </PetNote>
      <MemoryState />
      {week.length > 0 && (
        <section aria-labelledby="up" className="space-y-2">
          <h2 id="up" className="studio-kicker studio-kicker-muted">
            Sắp đến hạn
          </h2>
          <ol className="flex h-28 items-end gap-2 border-b border-border" aria-hidden>
            {week.map((u) => (
              <li
                key={u.date}
                className="flex h-full max-w-12 flex-1 flex-col items-center justify-end gap-1"
              >
                <span className="text-xs tabular-nums">{u.count}</span>
                <span
                  className="w-full rounded-t-[2px] bg-sage"
                  style={{ height: `${Math.max(4, (u.count / max) * 70)}%` }}
                />
              </li>
            ))}
          </ol>
          <ol className="flex gap-2 text-center text-[11px] studio-muted" aria-hidden>
            {week.map((u) => (
              <li key={u.date} className="flex-1 truncate">
                {weekdayVi(u.date).split(",")[0]}
              </li>
            ))}
          </ol>
          <p className="sr-only">
            {week.map((u) => `${weekdayVi(u.date)}: ${u.count} nội dung`).join("; ")}
          </p>
        </section>
      )}
      {weakItems.length > 0 && (
        <section aria-labelledby="weak" className="space-y-2">
          <h2 id="weak" className="studio-kicker studio-kicker-muted">
            Hay nhầm
          </h2>
          <ul className="studio-rule-t">
            {weakItems.map((w) => (
              <li key={w.vocabularyId}>
                <Link
                  to="/app/japanese/tango/vocabularies/$vocabularyId"
                  params={{ vocabularyId: String(w.vocabularyId) }}
                  className="studio-row studio-rule-b flex min-h-11 items-baseline gap-3 px-2 py-2.5 text-sm"
                >
                  <span lang="ja" className="studio-jp min-w-14 text-lg">
                    {w.expression ?? w.kana}
                  </span>
                  <span className="min-w-0 flex-1 truncate studio-muted">{w.primaryMeaning}</span>
                  <span className="shrink-0 text-xs tabular-nums text-ochre">
                    sai {w.incorrectCount}/{w.answeredCount}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link to="/app/japanese/tango/mistakes" className="studio-link text-sm">
            Xem tất cả từ hay sai
          </Link>
        </section>
      )}
      {ov && ov.history.length > 0 && (
        <section aria-labelledby="hist" className="space-y-2">
          <h2 id="hist" className="studio-kicker studio-kicker-muted">
            Những lần ôn gần đây
          </h2>
          <ul className="studio-rule-t text-sm">
            {[...ov.history]
              .reverse()
              .slice(0, 7)
              .map((h) => (
                <li key={h.date} className="studio-rule-b flex justify-between px-2 py-2">
                  <span>{weekdayVi(h.date)}</span>
                  <span className="tabular-nums studio-muted">
                    {h.answered} lượt · đúng {Math.round((h.correct / h.answered) * 100)}%
                  </span>
                </li>
              ))}
          </ul>
        </section>
      )}
    </aside>
  );
}

/** Nothing to review: stamp it, say when the next review is (only if the schedule has one), point back to lessons. */
function AllCaughtUp({ reviewedNow, onRecheck }: { reviewedNow: number; onRecheck: () => void }) {
  const ov = useOverview().data;
  const next = ov?.nextReviewAt ? new Date(ov.nextReviewAt) : null;
  const nextText = next
    ? `${next.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "numeric" })} lúc ${next.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`
    : null;
  return (
    <section className="space-y-5">
      <div className="flex items-center gap-4">
        <Seal state="done" size={3} stamp={reviewedNow > 0} label="Đã ôn xong" />
        <p className="text-[0.9375rem]">
          {reviewedNow > 0
            ? `Bạn đã hoàn thành lượt ôn hôm nay: ${reviewedNow} từ.`
            : "Bạn đã hoàn thành lượt ôn hôm nay."}
          {nextText && (
            <>
              {" "}
              Lần ôn tiếp theo: <b>{nextText}</b>.
            </>
          )}
        </p>
      </div>
      <p className="text-sm studio-muted">Từ mới học xong sẽ tự xếp vào lịch ôn.</p>
      <div className="flex flex-wrap gap-3">
        <Link to="/app" className="studio-btn">
          Về bài hôm nay
        </Link>
        {reviewedNow > 0 && (
          <button type="button" className="studio-btn studio-btn-quiet" onClick={onRecheck}>
            Kiểm tra lại
          </button>
        )}
      </div>
    </section>
  );
}
