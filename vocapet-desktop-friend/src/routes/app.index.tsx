import { createFileRoute, Link } from "@tanstack/react-router";
import { useGame } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, ChevronRight, Flame, Layers, Target, X } from "lucide-react";
import { useMeQuery } from "@/hooks/queries/user.queries";
import { useRecentReviewsQuery, useStudyDashboardStatsQuery } from "@/hooks/queries/study-session.queries";
import { useTangoProgressQuery, useTangoLessonsQuery } from "@/hooks/queries/tango.queries";
import { Enso, JpText, LessonStatusBadge, LevelStamp, ProgressRing } from "@/components/tango/shared";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

// Current JLPT level is not stored on the user yet; N5 is the default until Phase 3.
const CURRENT_LEVEL = "N5" as const;

function Dashboard() {
  const { state } = useGame();
  const { data: me } = useMeQuery();
  const { data: studyStats } = useStudyDashboardStatsQuery();
  const { data: recentReviews = [], isLoading: recentLoading } = useRecentReviewsQuery();
  const tangoProgress = useTangoProgressQuery(CURRENT_LEVEL);
  const lessons = useTangoLessonsQuery(CURRENT_LEVEL);

  const name = me?.name?.trim() || state.user.displayName || "there";
  const streak = me?.streak ?? state.streak;
  const goalPct = Math.min(100, (state.dailyProgress / Math.max(1, state.dailyGoal)) * 100);
  const dueCount = studyStats?.learningWords ?? 0;
  const words = tangoProgress.data?.words;
  const continueLesson = tangoProgress.data?.continueLearning;
  const recentLessons = (lessons.data?.lessons ?? []).filter((l) => l.status !== "NOT_STARTED").slice(0, 3);

  const vocabPct = words && words.total > 0 ? Math.round(((words.total - words.new) / words.total) * 100) : 0;
  const mix = words
    ? [
        { key: "mastered", label: "Mastered", n: words.mastered, color: "var(--primary)" },
        { key: "learning", label: "Learning", n: words.learning, color: "var(--info)" },
        { key: "review", label: "Needs review", n: words.needReview, color: "var(--warning)" },
        { key: "new", label: "New", n: words.new, color: "var(--border)" },
      ]
    : [];

  const modules = [
    { label: "Alphabet", to: "/app/japanese/alphabet", status: "Hiragana & Katakana" },
    { label: "Vocabulary", to: "/app/japanese/tango", status: words ? `${CURRENT_LEVEL} · ${vocabPct}%` : `${CURRENT_LEVEL} lessons` },
    { label: "Kanji", status: "Soon" },
    { label: "Grammar", status: "Soon" },
    { label: "Listening", status: "Soon" },
    { label: "JLPT Practice", status: "Soon" },
  ] as const;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{name}, let's learn</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-surface-2 px-3 text-sm font-semibold">
            <Flame aria-hidden className="h-4 w-4 text-streak" /> {streak} day streak
          </span>
          <LevelStamp level={CURRENT_LEVEL} />
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="lift relative flex min-h-60 flex-col justify-between gap-5 overflow-hidden rounded-[20px] bg-primary-soft p-6 sm:p-8 lg:col-span-2">
          <Enso className="-right-8 -top-8 h-64 w-64" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary-ink">Continue learning</p>
            <JpText serif as="p" className="mt-2 text-5xl text-primary-ink sm:text-7xl">
              {continueLesson ? `第${continueLesson.lessonNumber}課` : "はじめ"}
            </JpText>
            <h2 className="mt-2 text-xl font-bold">
              {continueLesson ? `Lesson ${continueLesson.lessonNumber} · ${continueLesson.title}` : "Start your first lesson"}
            </h2>
          </div>
          <div className="relative flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link
                to={continueLesson ? "/app/japanese/tango/learn/$lessonId" : "/app/japanese/tango"}
                params={continueLesson ? { lessonId: String(continueLesson.lessonId) } : undefined}
              >
                {continueLesson ? "Continue lesson" : "Open vocabulary"} <ArrowRight aria-hidden className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="bg-card/60 hover:bg-card">
              <Link to="/app/decks">
                <Layers aria-hidden className="mr-1 h-4 w-4" /> Flashcards
              </Link>
            </Button>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 rounded-[20px] bg-card p-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Daily goal</p>
          <ProgressRing
            size={96}
            value={goalPct}
            text={`${state.dailyProgress}/${state.dailyGoal}`}
            label={`Daily goal ${state.dailyProgress} of ${state.dailyGoal}`}
          />
          <div className="mt-auto text-sm text-muted-foreground">Words in learning</div>
          <Link to="/app/decks" className="min-h-6 font-bold text-primary hover:underline">
            {dueCount} →
          </Link>
        </div>

        <ol aria-label="Learning path" className="flex divide-x divide-border overflow-x-auto rounded-2xl bg-surface-2 lg:col-span-3">
          {modules.map((m) => {
            const inner = (
              <>
                <span className="font-semibold">{m.label}</span>
                <span className="text-sm text-muted-foreground">{m.status}</span>
              </>
            );
            return (
              <li key={m.label} className="min-w-36 flex-1">
                {"to" in m ? (
                  <Link to={m.to} className="flex h-full flex-col gap-0.5 rounded-2xl px-4 py-3.5 transition-colors hover:bg-primary-soft">
                    {inner}
                  </Link>
                ) : (
                  <div aria-disabled="true" className="flex h-full flex-col gap-0.5 px-4 py-3.5 text-muted-foreground">
                    {inner}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <div className="grid gap-4 lg:grid-cols-12">
        <section aria-label="Recent lessons" className="rounded-2xl bg-surface-2 p-2 lg:col-span-7">
          <div className="flex items-center justify-between px-3 py-2">
            <h2 className="font-bold">In progress</h2>
            <Link to="/app/japanese/tango" className="text-sm font-semibold text-primary hover:underline">
              All lessons →
            </Link>
          </div>
          {recentLessons.length === 0 ? (
            <Link to="/app/japanese/tango" className="block rounded-xl px-3 py-4 text-sm font-semibold text-primary hover:bg-card">
              Pick your first lesson →
            </Link>
          ) : (
            <ul>
              {recentLessons.map((l) => (
                <li key={l.id}>
                  <Link
                    to="/app/japanese/tango/lessons/$lessonId"
                    params={{ lessonId: String(l.id) }}
                    className="flex min-h-16 items-center gap-3 rounded-xl p-3 transition-colors hover:bg-card"
                  >
                    <ProgressRing size={40} value={l.progressPercent} label={`Progress for ${l.title}`} />
                    <p className="min-w-0 flex-1 truncate font-semibold">
                      {l.lessonNumber}. {l.title}
                    </p>
                    <LessonStatusBadge status={l.status} />
                    <ChevronRight aria-hidden className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="Vocabulary progress" className="space-y-4 rounded-2xl bg-surface-2 p-4 lg:col-span-5">
          <h2 className="font-bold">Word mix</h2>
          {words ? (
            <>
              <div
                role="img"
                aria-label={mix.map((m) => `${m.label} ${m.n}`).join(", ")}
                className="flex h-3 gap-0.5 overflow-hidden rounded-full"
              >
                {mix.filter((m) => m.n > 0).map((m) => (
                  <span key={m.key} style={{ flex: m.n, background: m.color }} />
                ))}
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {mix.map((m) => (
                  <div key={m.key} className="flex items-center gap-2">
                    <span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ background: m.color }} />
                    <dt className="text-muted-foreground">{m.label}</dt>
                    <dd className="ml-auto font-bold tabular-nums">{m.n}</dd>
                  </div>
                ))}
              </dl>
            </>
          ) : (
            <div className="h-16 animate-pulse rounded-xl bg-card/60" />
          )}

          <h2 className="pt-2 font-bold">Recently studied</h2>
          <ul className="divide-y divide-border overflow-hidden rounded-xl bg-card">
            {recentReviews.slice(0, 5).map((review, i) => {
              const wrong = review.rating === "AGAIN";
              return (
                <li key={i} className="flex min-h-11 items-center justify-between gap-3 px-3 text-sm">
                  <div className="min-w-0 truncate">
                    <span className="font-semibold">{review.word}</span>
                    <span className="text-muted-foreground"> · {review.meaning}</span>
                  </div>
                  {wrong ? <X aria-hidden className="h-4 w-4 text-destructive" /> : <Check aria-hidden className="h-4 w-4 text-primary" />}
                  <span className="sr-only">{wrong ? "Wrong" : "Correct"}</span>
                </li>
              );
            })}
            {!recentLoading && recentReviews.length === 0 && (
              <li className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                <Target aria-hidden className="h-4 w-4" /> No flashcard reviews yet.
              </li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
