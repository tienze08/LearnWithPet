import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import { speak } from "./speak";

import {
  useFinishStudySessionMutation,
  useActiveStudySessionQuery,
  useNextStudyCardQuery,
  useReviewStudyCardMutation,
  useStartStudySessionMutation,
} from "@/hooks/queries/study-session.queries";
import StreakPopup from "./StreakPopup";
import { petEvents } from "@/lib/pet/events";
import { useAnswerQuizMutation, useRandomQuizMutation } from "@/hooks/queries/quiz.queries";
import type { QuizAnswerResponse, QuizQuestionResponse } from "@/types/quiz";
import { speakPet } from "@/hooks/stores/petSpeech";
import { useTranslation, type TranslationKey } from "@/lib/i18n";

interface Props {
  deckId: number;
  journeyRequested?: boolean;
}

type Translator = (key: TranslationKey, values?: Record<string, string | number>) => string;

function scheduleMessage(rating: "AGAIN" | "HARD" | "GOOD" | "EASY", nextReviewTime: string, locale: "en" | "vi", tr: Translator) {
  if (rating === "AGAIN") return tr("review.againNotice");
  const next = new Date(nextReviewTime);
  const date = next.toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", { month: "short", day: "numeric" });
  return tr("review.nextReview", { date });
}

const RATINGS = [
  {
    label: "review.again",
    value: "AGAIN" as const,
    className: "bg-red-500 hover:bg-red-600 text-white",
  },
  {
    label: "review.hard",
    value: "HARD" as const,
    className: "bg-orange-500 hover:bg-orange-600 text-white",
  },
  {
    label: "review.good",
    value: "GOOD" as const,
    className: "bg-primary text-primary-foreground",
  },
  {
    label: "review.easy",
    value: "EASY" as const,
    className: "bg-sky-500 hover:bg-sky-600 text-white",
  },
];

export default function StudySessionFlashcards({ deckId, journeyRequested = false }: Props) {
  const { locale, t: tr } = useTranslation();
  const [started, setStarted] = useState(false);

  const [sessionId, setSessionId] = useState<number | null>(null);

  const [flipped, setFlipped] = useState(false);
  const [showStreak, setShowStreak] = useState(false);
  const [streak, setStreak] = useState(0);
  const [scheduleNotice, setScheduleNotice] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [reviewed, setReviewed] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [earnedXp, setEarnedXp] = useState(0);
  const [againWords, setAgainWords] = useState<string[]>([]);
  const [journeyComplete, setJourneyComplete] = useState(false);
  const [quickQuiz, setQuickQuiz] = useState<QuizQuestionResponse | null>(null);
  const [quickQuizResult, setQuickQuizResult] = useState<QuizAnswerResponse | null>(null);

  const startMutation = useStartStudySessionMutation();
  const { data: activeSession } = useActiveStudySessionQuery();
  const finishMutation = useFinishStudySessionMutation();
  const { mutateAsync: getQuickQuiz, isPending: isPreparingQuickQuiz } = useRandomQuizMutation();
  const { mutateAsync: answerQuickQuiz, isPending: isAnsweringQuickQuiz } = useAnswerQuizMutation();
  const [finished, setFinished] = useState(false);
  const recoveryRequested = typeof window !== "undefined"
    && new URLSearchParams(window.location.search).get("recovery") === "1";

  const { data, isLoading } = useNextStudyCardQuery(sessionId);

  const reviewMutation = useReviewStudyCardMutation(sessionId ?? 0);

  useEffect(() => {
    if (started && sessionId && !isLoading && data === null && !finished) {
      setFinished(true);
    }
  }, [started, sessionId, isLoading, data, finished, finishMutation]);

  useEffect(() => {
    setFlipped(false);
  }, [data]);

  useEffect(() => {
    if (!recoveryRequested || started || !activeSession || activeSession.deckId !== deckId) return;
    resumeSession();
  }, [recoveryRequested, started, activeSession, deckId]);

  if (!started) {
    return (
      <div className="max-w-xl mx-auto rounded-[2rem] border border-border bg-card/85 p-8 md:p-10 text-center card-pop">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{tr("review.focused")}</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight">{tr("review.ready")}</h2>

        <p className="mt-3 text-muted-foreground">
          {recoveryRequested ? tr("review.recoveryIntro") : journeyRequested ? tr("review.journeyIntro") : tr("review.defaultIntro")}
        </p>

        {activeSession?.deckId === deckId && (
          <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-left">
            <p className="text-sm font-bold">{tr("review.previous")}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {tr("review.completedReviews", { count: activeSession.reviewed })}{activeSession.currentWord ? ` · ${tr("review.next", { word: activeSession.currentWord })}` : ""}
            </p>
            <Button className="mt-3 w-full" variant="outline" onClick={resumeSession}>
              {tr("review.resume")}
            </Button>
          </div>
        )}

        <Button
          className="mt-5 w-full h-12"
          onClick={startSession}
          disabled={startMutation.isPending}
        >
          {startMutation.isPending ? tr("review.starting") : tr("review.start")}
        </Button>
      </div>
    );
  }

  const streakPopup = (
    <StreakPopup open={showStreak} streak={streak} onClose={() => setShowStreak(false)} />
  );

  if (finished) {
    const minutes = Math.max(1, Math.round(((Date.now() - (startedAt ?? Date.now())) / 1000) / 60));
    const accuracy = reviewed ? Math.round((correct / reviewed) * 100) : 0;
    return (
      <>
        {streakPopup}
        <div className="max-w-xl mx-auto rounded-[2rem] border border-border bg-card/85 p-8 text-center card-pop">
          <div className="text-6xl">🎉</div>

          <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-primary">
            {journeyComplete ? tr("review.journeyComplete") : tr("review.complete")}
          </p>
          <h2 className="mt-1 text-3xl font-extrabold">{journeyComplete ? tr("review.wonderful") : tr("review.smallStep")}</h2>

          <div className="mt-5 grid grid-cols-2 gap-3 text-left sm:grid-cols-5">
            <SessionStat label={tr("review.reviewed")} value={String(reviewed)} />
            <SessionStat label={tr("review.accuracy")} value={`${accuracy}%`} />
            <SessionStat label={tr("review.xp")} value={`+${earnedXp}`} />
            <SessionStat label={tr("review.time")} value={`${minutes} min`} />
            <SessionStat label={tr("review.streak")} value={`${streak || "✓"}`} />
          </div>
          <p className="mt-5 text-sm text-muted-foreground">
            {againWords.length
              ? <>{tr("review.meetAgain", { words: againWords.join(", ") })}</>
              : tr("review.greatRecall")}
          </p>
          {!journeyComplete && !quickQuiz && (
            <div className="mt-7 grid gap-2 sm:grid-cols-2">
              <Button className="h-12" onClick={startQuickQuiz} disabled={isPreparingQuickQuiz}>
                {isPreparingQuickQuiz ? tr("review.quizChoosing") : tr("review.quickQuiz")}
              </Button>
              <Button variant="outline" className="h-12" onClick={completeJourney} disabled={finishMutation.isPending}>
                {tr("review.finishToday")}
              </Button>
            </div>
          )}
          {quickQuiz && !journeyComplete && (
            <div className="mt-7 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-left">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">{tr("review.quizTitle")}</p>
              <p className="mt-2 text-center text-2xl font-extrabold">{quickQuiz.word}</p>
              <p className="mt-1 text-center text-xs italic text-muted-foreground">{quickQuiz.partOfSpeech}</p>
              <div className="mt-4 grid gap-2">
                {quickQuiz.options.map((option) => (
                  <Button key={option} variant="outline" className="h-auto min-h-10 whitespace-normal py-2 text-left" disabled={isAnsweringQuickQuiz || !!quickQuizResult} onClick={() => answerJourneyQuiz(option)}>{option}</Button>
                ))}
              </div>
              {quickQuizResult && <p className={`mt-3 text-center text-sm font-bold ${quickQuizResult.correct ? "text-primary" : "text-destructive"}`}>{quickQuizResult.correct ? tr("review.correct", { xp: quickQuizResult.xp }) : tr("review.incorrect")}</p>}
              {quickQuizResult && <Button className="mt-4 h-11 w-full" onClick={completeJourney} disabled={finishMutation.isPending}>{tr("review.completeJourney")}</Button>}
            </div>
          )}
          {journeyComplete && <Button variant="outline" className="mt-8 w-full h-12" onClick={() => {
            setStarted(false);
            setFinished(false);
            setJourneyComplete(false);
            setQuickQuiz(null);
            setQuickQuizResult(null);
            setSessionId(null);
          }}>{tr("deck.back")}</Button>}
        </div>
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        {streakPopup}
        <div className="text-center py-12">{tr("review.loading")}</div>
      </>
    );
  }

  if (!data) {
    return null;
  }

  async function startSession() {
    const session = await startMutation.mutateAsync({
      deckId,
      reviewLimit: recoveryRequested || journeyRequested ? 10 : undefined,
    });

    setSessionId(session.sessionId);
    setStartedAt(Date.now());
    setReviewed(0);
    setCorrect(0);
    setEarnedXp(0);
    setAgainWords([]);
    setJourneyComplete(false);
    setQuickQuiz(null);
    setQuickQuizResult(null);
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

  async function review(rating: "AGAIN" | "HARD" | "GOOD" | "EASY") {
    if (!data) return;

    const result = await reviewMutation.mutateAsync({
      vocabularyId: data.vocabularyId,
      rating,
    });

    setScheduleNotice(scheduleMessage(rating, result.nextReviewTime, locale, tr));
    setReviewed((count) => count + 1);
    setEarnedXp((xp) => xp + result.xp);
    if (rating === "AGAIN") {
      setAgainWords((words) => words.includes(data.word) ? words : [...words, data.word]);
    } else {
      setCorrect((count) => count + 1);
    }

    if (result.streakUpdated) {
      setStreak(result.currentStreak);
      setShowStreak(true);
      petEvents.emit({ type: "STREAK_UPDATED", detail: { streak: result.currentStreak } });
    }
    if (result.companionReaction?.message) {
      speakPet(result.companionReaction.message, result.companionReaction.priority, result.companionReaction.duration);
    }
    petEvents.emit({ type: "CARD_REVIEWED" });
  }

  async function startQuickQuiz() {
    try {
      setQuickQuizResult(null);
      setQuickQuiz(await getQuickQuiz(undefined));
    } catch {
      // A user may have no additional eligible card. The review session is
      // still valid, so let them complete the journey without a fake quiz.
      await completeJourney();
    }
  }

  async function answerJourneyQuiz(answer: string) {
    if (!quickQuiz || quickQuizResult) return;
    const result = await answerQuickQuiz({ vocabularyId: quickQuiz.vocabularyId, answer });
    setQuickQuizResult(result);
    setEarnedXp((current) => current + result.xp);
    setReviewed((current) => current + 1);
    if (result.correct) setCorrect((current) => current + 1);
    else setAgainWords((words) => words.includes(quickQuiz.word) ? words : [...words, quickQuiz.word]);
  }

  async function completeJourney() {
    if (!sessionId || journeyComplete) return;
    await finishMutation.mutateAsync(sessionId);
    setJourneyComplete(true);
    const tomorrowLine = againWords.length
      ? tr("review.tomorrowAgain", {
        word: againWords[0],
        others: againWords.length > 1 ? tr("review.tomorrowOther", { count: againWords.length - 1, words: tr("plan.words", { count: againWords.length - 1 }) }) : "",
      })
      : tr("review.tomorrowNew");
    const accuracy = reviewed ? Math.round((correct / reviewed) * 100) : 0;
    const cardLabel = locale === "vi"
      ? `${reviewed} thẻ`
      : `${reviewed} ${reviewed === 1 ? "card" : "cards"}`;
    const summaryLine = locale === "vi"
      ? `Bạn đã hoàn thành ${cardLabel} với độ chính xác ${accuracy}%.`
      : `You finished ${cardLabel} with ${accuracy}% accuracy.`;
    speakPet(`${summaryLine} ${tomorrowLine}`, 3, 8);
    petEvents.emit({ type: "SESSION_FINISHED" });
  }

  return (
    <>
      <StreakPopup open={showStreak} streak={streak} onClose={() => setShowStreak(false)} />

      <div className="max-w-xl mx-auto space-y-5">
        <div className="flex items-center justify-between px-1 text-xs font-semibold text-muted-foreground">
          <span>{tr("review.studySession")}</span>
          <span>{tr("review.tapReveal")}</span>
        </div>
        {scheduleNotice && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-center text-sm text-muted-foreground"
          >
            {scheduleNotice}
          </motion.p>
        )}
        <div onClick={() => setFlipped((f) => !f)} className="cursor-pointer">
          <AnimatePresence mode="wait">
            <motion.div
              key={data.vocabularyId + (flipped ? "-back" : "-front")}
              initial={{
                opacity: 0,
                y: 12,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                y: -12,
              }}
              className="
            relative
            rounded-[2rem]
            border
            border-border
            bg-card
            p-8 md:p-10
            aspect-4/3
            min-h-420px
            card-pop
            flex
            flex-col
            items-center
            justify-center
            text-center
            "
            >
              {!flipped ? (
                <>
                  <p className="text-xs italic text-muted-foreground">{data.partOfSpeech}</p>

                  <h2 className="text-4xl font-extrabold mt-2 tracking-tight md:text-5xl">{data.word}</h2>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      speak(data.word);
                    }}
                    className="mt-4"
                  >
                    <Volume2 className="h-6 w-6" />
                  </button>

                  <p className="mt-5 text-xs text-muted-foreground">{tr("review.clickReveal")}</p>
                </>
              ) : (
                <>
                  <h2 className="text-3xl font-bold">{data.meaning}</h2>

                  <p className="mt-4 italic text-muted-foreground">"{data.example}"</p>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {flipped ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {RATINGS.map((rating) => (
              <Button
                key={rating.value}
                onClick={() => review(rating.value)}
                disabled={reviewMutation.isPending}
                className={rating.className}
              >
                {tr(rating.label as TranslationKey)}
              </Button>
            ))}
          </div>
        ) : (
          <Button className="w-full" onClick={() => setFlipped(true)}>
            {tr("review.showAnswer")}
          </Button>
        )}
      </div>
    </>
  );
}

function SessionStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-border bg-background/70 px-3 py-2"><p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-lg font-extrabold">{value}</p></div>;
}
