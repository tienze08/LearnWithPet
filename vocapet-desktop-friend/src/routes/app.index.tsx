import { createFileRoute, Link } from "@tanstack/react-router";
import { useGame } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, Flame, Layers, Target } from "lucide-react";
import { useMeQuery } from "@/hooks/queries/user.queries";
import { useRecentReviewsQuery, useStudyDashboardStatsQuery } from "@/hooks/queries/study-session.queries";
import { useTangoProgressQuery, useTangoLessonsQuery } from "@/hooks/queries/tango.queries";
import { ProgressBar, LessonStatusBadge } from "@/components/tango/shared";

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

  const modules = [
    { label: "Alphabet", to: "/app/japanese/alphabet", status: "Hiragana & Katakana" },
    { label: "Vocabulary", to: "/app/japanese/tango", status: `${CURRENT_LEVEL} lessons` },
    { label: "Kanji", status: "Coming soon" },
    { label: "Grammar", status: "Coming soon" },
    { label: "Listening", status: "Coming soon" },
    { label: "JLPT Practice", status: "Coming soon" },
  ] as const;

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{name}, let's learn</h1>
        </div>
        <div className="flex gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/70 px-3 py-1 text-sm font-bold">
            <Flame className="h-4 w-4 text-streak" /> {streak} day streak
          </span>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">{CURRENT_LEVEL}</span>
        </div>
      </header>

      {/* Primary actions */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card-pop flex flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-6 lg:col-span-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Continue learning</p>
            {continueLesson ? (
              <>
                <h2 className="mt-2 text-xl font-extrabold">
                  Lesson {continueLesson.lessonNumber} · {continueLesson.title}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">Pick up where you left off.</p>
              </>
            ) : (
              <>
                <h2 className="mt-2 text-xl font-extrabold">Start your first lesson</h2>
                <p className="mt-1 text-sm text-muted-foreground">Vocabulary is organised by JLPT lesson.</p>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link
                to={continueLesson ? "/app/japanese/tango/learn/$lessonId" : "/app/japanese/tango"}
                params={continueLesson ? { lessonId: String(continueLesson.lessonId) } : undefined}
              >
                {continueLesson ? "Continue" : "Open vocabulary"} <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/app/decks">
                <Layers className="mr-1 h-4 w-4" /> Flashcards
              </Link>
            </Button>
          </div>
        </div>

        <div className="card-pop flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Daily goal</p>
            <p className="mt-2 text-2xl font-extrabold">
              {state.dailyProgress} / {state.dailyGoal}
            </p>
          </div>
          <ProgressBar value={goalPct} label="Daily goal progress" />
          <div className="mt-auto flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Words in learning</span>
            <Link to="/app/decks" className="font-bold text-primary hover:underline">
              {dueCount} →
            </Link>
          </div>
        </div>
      </section>

      {/* Modules */}
      <section aria-label="Learning modules" className="space-y-3">
        <h2 className="text-lg font-extrabold">Learning modules</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {modules.map((m) =>
            "to" in m ? (
              <Link
                key={m.label}
                to={m.to}
                className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/60"
              >
                <BookOpen className="h-5 w-5 text-primary" />
                <p className="mt-3 font-bold">{m.label}</p>
                <p className="text-xs text-muted-foreground">{m.status}</p>
              </Link>
            ) : (
              <div key={m.label} className="rounded-2xl bg-muted/40 p-4 opacity-70">
                <BookOpen className="h-5 w-5 text-muted-foreground" />
                <p className="mt-3 font-bold">{m.label}</p>
                <p className="text-xs text-muted-foreground">{m.status}</p>
              </div>
            ),
          )}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent lessons */}
        <section aria-label="Recent lessons" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold">Recent lessons</h2>
            <Link to="/app/japanese/tango" className="text-sm font-bold text-primary hover:underline">
              All lessons →
            </Link>
          </div>
          {recentLessons.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
              No lessons started yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {recentLessons.map((l) => (
                <li key={l.id}>
                  <Link
                    to="/app/japanese/tango/lessons/$lessonId"
                    params={{ lessonId: String(l.id) }}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 hover:border-primary/60"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">
                        {l.lessonNumber}. {l.title}
                      </p>
                      <div className="mt-2">
                        <ProgressBar value={l.progressPercent} label={`Progress for ${l.title}`} />
                      </div>
                    </div>
                    <LessonStatusBadge status={l.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Vocabulary progress */}
        <section aria-label="Vocabulary progress" className="space-y-3">
          <h2 className="text-lg font-extrabold">Vocabulary progress</h2>
          <div className="card-pop rounded-2xl border border-border bg-card p-5">
            {words ? (
              <div className="grid grid-cols-2 gap-4 text-center sm:grid-cols-4">
                <Stat label="Total" value={words.total} />
                <Stat label="Learning" value={words.total - words.new} />
                <Stat label="Mastered" value={words.mastered} />
                <Stat label="Needs review" value={words.needReview} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Loading progress…</p>
            )}
          </div>

          <h2 className="pt-2 text-lg font-extrabold">Recently studied</h2>
          <div className="divide-y overflow-hidden rounded-2xl border border-border bg-card">
            {recentReviews.slice(0, 5).map((review, i) => (
              <div key={i} className="flex items-center justify-between gap-3 p-3 text-sm">
                <div className="min-w-0 truncate">
                  <span className="font-bold">{review.word}</span>
                  <span className="text-muted-foreground"> · {review.meaning}</span>
                </div>
                <span className={review.rating === "AGAIN" ? "font-bold text-destructive" : "font-bold text-success"}>
                  {review.rating === "AGAIN" ? "✗" : "✓"}
                </span>
              </div>
            ))}
            {!recentLoading && recentReviews.length === 0 && (
              <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                <Target className="h-4 w-4" /> No flashcard reviews yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-2xl font-extrabold">{value}</p>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}
