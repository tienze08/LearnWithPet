import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import { speak } from "./speak";
import { speakKana } from "@/lib/japanese/kana";

import {
  useFinishStudySessionMutation,
  useActiveStudySessionQuery,
  useNextStudyCardQuery,
  useReviewStudyCardMutation,
  useStartStudySessionMutation,
} from "@/hooks/queries/study-session.queries";
import StreakPopup from "./StreakPopup";
import { petEvents } from "@/lib/pet/events";
import { LoadingBlock } from "@/components/tango/shared";
import { PetNote, Seal } from "@/components/learning-path/studio";

interface Props {
  deckId: number;
}

type Rating = "AGAIN" | "HARD" | "GOOD" | "EASY";

function scheduleMessage(rating: Rating, nextReviewTime: string) {
  if (rating === "AGAIN") return "Thẻ này sẽ quay lại sau khoảng 10 phút.";
  const next = new Date(nextReviewTime);
  return `Lần ôn tiếp: ${next.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "numeric" })}.`;
}

const RATINGS: { label: string; value: Rating; key: string; className: string }[] = [
  {
    label: "Chưa nhớ",
    value: "AGAIN",
    key: "1",
    className: "border-seal bg-sheet text-seal-ink hover:bg-background",
  },
  {
    label: "Khó",
    value: "HARD",
    key: "2",
    className: "border-border bg-sheet hover:bg-primary-soft",
  },
  {
    label: "Nhớ",
    value: "GOOD",
    key: "3",
    className: "border-primary bg-primary text-primary-foreground hover:brightness-110",
  },
  {
    label: "Dễ",
    value: "EASY",
    key: "4",
    className: "border-border bg-sheet hover:bg-primary-soft",
  },
];

/** A deck's FSRS session: one card at a time, flip, rate 1–4; ends with a stamp and the count reviewed. */
export default function StudySessionFlashcards({ deckId }: Props) {
  const [started, setStarted] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [showStreak, setShowStreak] = useState(false);
  const [streak, setStreak] = useState(0);
  const [scheduleNotice, setScheduleNotice] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [earnedXp, setEarnedXp] = useState(0);
  const [againWords, setAgainWords] = useState<string[]>([]);
  const { data: activeSession } = useActiveStudySessionQuery();
  const recoveryRequested =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("recovery") === "1";

  const startMutation = useStartStudySessionMutation();
  const finishMutation = useFinishStudySessionMutation();
  const [finished, setFinished] = useState(false);

  const { data, isLoading } = useNextStudyCardQuery(sessionId);

  const reviewMutation = useReviewStudyCardMutation(sessionId ?? 0);

  useEffect(() => {
    if (started && sessionId && !isLoading && data === null && !finished) {
      finishMutation.mutate(sessionId);
      setFinished(true);
      petEvents.emit({ type: "SESSION_FINISHED" });
    }
  }, [started, sessionId, isLoading, data, finished, finishMutation]);

  useEffect(() => {
    setFlipped(false);
  }, [data]);

  // Keyboard: Space flips, 1–4 rate once the answer shows (same keys as the Review Center).
  useEffect(() => {
    if (!started || finished || !data) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (flipped && !reviewMutation.isPending) {
        const hit = RATINGS.find((r) => r.key === e.key);
        if (hit) review(hit.value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, finished, data, flipped, reviewMutation.isPending]);

  async function startSession() {
    const session = await startMutation.mutateAsync({
      deckId,
      reviewLimit: recoveryRequested ? 10 : undefined,
    });
    setSessionId(session.sessionId);
    setStartedAt(Date.now());
    setReviewed(0);
    setCorrect(0);
    setEarnedXp(0);
    setAgainWords([]);
    setStarted(true);
    petEvents.emit({ type: "SESSION_STARTED" });
  }

  function resumeSession() {
    if (!activeSession || activeSession.deckId !== deckId) return;
    setSessionId(activeSession.sessionId);
    setStartedAt(new Date(activeSession.startedAt).getTime());
    setReviewed(activeSession.reviewed);
    setCorrect(activeSession.correct);
    setStarted(true);
    petEvents.emit({ type: "SESSION_STARTED" });
  }

  // Coming from "recovery" on the plan page: continue the waiting session.
  useEffect(() => {
    if (!recoveryRequested || started || !activeSession || activeSession.deckId !== deckId) return;
    resumeSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recoveryRequested, started, activeSession, deckId]);

  async function review(rating: Rating) {
    if (!data) return;
    const result = await reviewMutation.mutateAsync({ vocabularyId: data.vocabularyId, rating });
    setReviewed((n) => n + 1);
    setEarnedXp((xp) => xp + result.xp);
    if (rating === "AGAIN") {
      setAgainWords((words) => (words.includes(data.word) ? words : [...words, data.word]));
    } else {
      setCorrect((n) => n + 1);
    }
    setScheduleNotice(scheduleMessage(rating, result.nextReviewTime));
    if (result.streakUpdated) {
      setStreak(result.currentStreak);
      setShowStreak(true);
      petEvents.emit({ type: "STREAK_UPDATED", detail: { streak: result.currentStreak } });
    }
    petEvents.emit({ type: "CARD_REVIEWED" });
  }

  const streakPopup = (
    <StreakPopup open={showStreak} streak={streak} onClose={() => setShowStreak(false)} />
  );

  if (!started) {
    return (
      <section className="grid justify-items-center gap-4 border-y border-border py-12 text-center">
        <p className="studio-kicker">Ôn theo lịch FSRS</p>
        <h2 className="studio-head text-3xl">Ôn các thẻ đến hạn của bộ này</h2>
        <p className="max-w-md text-sm studio-muted">
          Mỗi lần một thẻ. Lật thẻ, rồi cho biết bạn nhớ đến đâu để lịch ôn tự điều chỉnh.
        </p>
        {recoveryRequested && <p className="text-sm">Phiên ngắn để ôn lại: tối đa 10 lượt.</p>}
        {activeSession?.deckId === deckId && (
          <div className="grid justify-items-center gap-2">
            <p className="text-sm">
              Bạn còn một phiên đang dở: đã ôn {activeSession.reviewed} lượt
              {activeSession.currentWord ? `, thẻ tiếp theo: ${activeSession.currentWord}` : ""}.
            </p>
            <Button variant="outline" onClick={resumeSession}>
              Học tiếp phiên đang dở
            </Button>
          </div>
        )}
        <Button size="lg" onClick={startSession} disabled={startMutation.isPending}>
          {startMutation.isPending ? "Đang bắt đầu…" : "Bắt đầu ôn"}
        </Button>
        {startMutation.isError && (
          <p role="alert" className="text-sm text-destructive">
            Chưa bắt đầu được. Thử lại.
          </p>
        )}
      </section>
    );
  }

  if (finished) {
    return (
      <>
        {streakPopup}
        <section className="grid justify-items-center gap-5 border-y border-border py-12 text-center">
          <Seal state="done" size={4} stamp label="Đã ôn xong" />
          <h2 className="studio-head text-3xl">
            {reviewed > 0 ? `Xong ${reviewed} thẻ` : "Không có thẻ nào đến hạn"}
          </h2>
          <PetNote mood={reviewed > 0 ? "excited" : "sleepy"} size={48}>
            {reviewed > 0
              ? "Giỏi lắm! Mình sẽ nhắc lại đúng lúc bạn sắp quên."
              : "Bộ này chưa có thẻ cần ôn. Quay lại sau nhé."}
          </PetNote>
          {reviewed > 0 && (
            <>
              <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                {[
                  ["Độ chính xác", `${Math.round((correct / reviewed) * 100)}%`],
                  ["XP nhận được", `+${earnedXp}`],
                  [
                    "Thời gian",
                    `${Math.max(1, Math.round((Date.now() - (startedAt ?? Date.now())) / 60000))} phút`,
                  ],
                  ["Chuỗi ngày", streak || "✓"],
                ].map(([label, value]) => (
                  <div key={label} className="flex flex-col-reverse">
                    <dt className="text-xs studio-muted">{label}</dt>
                    <dd className="studio-head text-2xl">{value}</dd>
                  </div>
                ))}
              </dl>
              {againWords.length > 0 && (
                <p className="text-sm studio-muted">Sẽ gặp lại sớm: {againWords.join(", ")}</p>
              )}
            </>
          )}
        </section>
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        {streakPopup}
        <LoadingBlock rows={2} label="Đang lấy thẻ tiếp theo…" />
      </>
    );
  }

  if (!data) return null;

  return (
    <>
      {streakPopup}
      <section aria-label="Phiên ôn thẻ" className="space-y-5">
        <div className="flex items-center justify-between text-sm">
          <span className="studio-kicker studio-kicker-muted">Ôn theo lịch</span>
          <span className="tabular-nums studio-muted">Đã ôn {reviewed} thẻ</span>
        </div>

        <div
          role="button"
          tabIndex={0}
          aria-label={flipped ? "Mặt sau, bấm để lật lại" : "Mặt trước, bấm để lật"}
          onClick={() => setFlipped((f) => !f)}
          onKeyDown={(e) => {
            if (e.key === "Enter") setFlipped((f) => !f);
          }}
          className="cursor-pointer"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={data.vocabularyId + (flipped ? "-back" : "-front")}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="grid min-h-[340px] content-center justify-items-center gap-3 rounded-lg border border-border bg-sheet px-6 py-10 text-center"
            >
              {!flipped ? (
                <>
                  {data.lessonId ? (
                    <Link
                      to="/app/japanese/tango/lessons/$lessonId"
                      params={{ lessonId: String(data.lessonId) }}
                      onClick={(e) => e.stopPropagation()}
                      className="studio-kicker studio-kicker-muted hover:text-primary"
                    >
                      Minna · Bài {data.lessonNumber}
                    </Link>
                  ) : (
                    data.partOfSpeech && (
                      <p className="studio-kicker studio-kicker-muted">{data.partOfSpeech}</p>
                    )
                  )}
                  {data.kana ? (
                    <h2 lang="ja" className="studio-jp text-5xl leading-tight md:text-6xl">
                      {data.kana !== data.word ? (
                        <ruby>
                          {data.word}
                          <rt className="text-base">{data.kana}</rt>
                        </ruby>
                      ) : (
                        data.word
                      )}
                    </h2>
                  ) : (
                    <h2 className="studio-head text-5xl">{data.word}</h2>
                  )}
                  {data.romaji && <p className="text-sm studio-muted">{data.romaji}</p>}
                  <button
                    type="button"
                    aria-label={`Nghe cách đọc ${data.word}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (data.kana) speakKana(data.kana);
                      else speak(data.word);
                    }}
                    className="grid h-11 w-11 place-items-center rounded-[var(--radius)] hover:bg-primary-soft"
                  >
                    <Volume2 aria-hidden className="h-5 w-5" />
                  </button>
                </>
              ) : (
                <>
                  <p lang={data.kana ? "ja" : undefined} className="text-lg studio-muted">
                    {data.word}
                  </p>
                  <h2 className="studio-head text-3xl sm:text-4xl">{data.meaning}</h2>
                  {data.example && (
                    <p className="max-w-md border-t border-border pt-4 text-sm studio-muted">
                      {data.example}
                    </p>
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {flipped ? (
          <div
            className="grid grid-cols-2 gap-2 sm:grid-cols-4"
            role="group"
            aria-label="Mức độ nhớ"
          >
            {RATINGS.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => review(r.value)}
                disabled={reviewMutation.isPending}
                className={`flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius)] border text-sm transition-colors disabled:opacity-50 ${r.className}`}
              >
                {r.label}
                <kbd aria-hidden className="hidden font-sans text-xs opacity-60 sm:inline">
                  {r.key}
                </kbd>
              </button>
            ))}
          </div>
        ) : (
          <Button size="lg" className="w-full" onClick={() => setFlipped(true)}>
            Lật thẻ <span className="hidden text-xs opacity-70 sm:inline">Space</span>
          </Button>
        )}
        {scheduleNotice && (
          <p className="studio-rise text-center text-sm studio-muted" aria-live="polite">
            {scheduleNotice}
          </p>
        )}
        {reviewMutation.isError && (
          <p role="alert" className="text-center text-sm text-destructive">
            Chưa lưu được đánh giá. Thử lại.
          </p>
        )}
      </section>
    </>
  );
}
