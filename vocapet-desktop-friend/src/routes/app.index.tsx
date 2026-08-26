import { createFileRoute, Link } from "@tanstack/react-router";
import { stageForLevel, useGame, type PetMood, type PetVariant } from "@/lib/store";
import { Pet } from "@/components/PixiPet/Pet";
import { Button } from "@/components/ui/button";
import { Flame, BookOpen, Trophy, TrendingUp, CalendarClock, Clock3, Brain, CircleAlert, HeartHandshake, History } from "lucide-react";
import { useMeQuery } from "@/hooks/queries/user.queries";
import { useDecksQuery } from "@/hooks/queries/deck.queries";
import { useActiveStudySessionQuery, useRecentReviewsQuery, useStartStudySessionMutation, useStudyDashboardStatsQuery, useTodayStudyPlanQuery } from "@/hooks/queries/study-session.queries";
import { useCompanionStateQuery } from "@/hooks/queries/companion.queries";
import { useTranslation } from "@/lib/i18n";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

function Dashboard() {
  const { t: tr } = useTranslation();
  const { state } = useGame();
  const { data: me } = useMeQuery();
  const { data: decks = [], isLoading: decksLoading } = useDecksQuery();
  const { data: recentReviews = [], isLoading: recentReviewsLoading } = useRecentReviewsQuery();
  const { data: studyStats } = useStudyDashboardStatsQuery();
  const { data: todayPlan } = useTodayStudyPlanQuery();
  const { data: activeSession } = useActiveStudySessionQuery();
  const { data: companionState } = useCompanionStateQuery(Boolean(me?.pet));
  const recoveryMutation = useStartStudySessionMutation();

  const companion = me?.pet;
  const petName = companion?.name?.trim() || state.petName;
  const petVariant = toPetVariant(companion?.species) ?? state.petVariant;
  const petMood = toPetMood(companion?.mood) ?? state.petMood;
  const petStage = stageForLevel(companion?.level ?? state.petLevel);
  const userName = me?.name?.trim() || state.user.displayName || "there";
  const userLevel = me?.level ?? state.level;
  const userStreak = me?.streak ?? state.streak;
  const mastered = studyStats?.masteredWords ?? 0;
  const learning = studyStats?.learningWords ?? 0;
  const recentCorrect = studyStats?.recentCorrect ?? 0;
  const recentTotal = studyStats?.recentReviews ?? 0;
  const dueCards = todayPlan?.dueCards ?? 0;
  const planWords = todayPlan?.dueReasons.flatMap((reason) => reason.words).slice(0, 3) ?? [];
  const relearning = todayPlan?.dueReasons.find((reason) => reason.code === "RELEARNING");
  const overdue = todayPlan?.dueReasons.find((reason) => reason.code === "OVERDUE");
  const weakDeckId = companionState?.learningProfile?.weakestDeckId ?? null;
  const weakTopic = companionState?.learningProfile?.weakestTopic ?? null;
  const recoveryDeckId = relearning?.deckId ?? overdue?.deckId ?? weakDeckId;
  const hasNeedsAttention = Boolean(relearning || overdue || weakTopic);
  const tomorrow = todayPlan?.tomorrowPreview;

  async function startRecoverySession() {
    if (!recoveryDeckId || activeSession) return;
    try {
      await recoveryMutation.mutateAsync({ deckId: recoveryDeckId, reviewLimit: 10 });
      window.location.assign(`/app/decks/${recoveryDeckId}?recovery=1`);
    } catch (error) {
      console.error("Could not start recovery session", error);
    }
  }

  return (
    <div className="space-y-6">
      {/* Hero card */}
      <div className="relative overflow-hidden rounded-[2rem] border border-border/80 bg-card/75 p-7 md:p-8 card-pop flex flex-col md:flex-row gap-7 items-center">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <Pet variant={petVariant} stage={petStage} mood={petMood} size={140} />
        <div className="flex-1 text-center md:text-left">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{tr("home.todayWith", { name: petName })}</p>
          <h1 className="text-3xl font-extrabold mt-2 tracking-tight md:text-4xl">
            {dueCards ? tr("home.wordsReady", { count: dueCards }) : tr("home.queueClear")}
          </h1>
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed max-w-md">
            {dueCards
              ? tr("home.sessionReady", { name: petName, minutes: todayPlan?.estimatedMinutes ?? 1 })
              : tr("home.queueClearDetail", { name: petName })}
          </p>
          {planWords.length > 0 && (
            <p className="mt-3 text-xs font-semibold text-muted-foreground">
              {tr("home.revisitFirst")} <span className="text-foreground">{planWords.join(", ")}</span>
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2 justify-center md:justify-start">
            {activeSession && (
              <Button asChild variant="outline" className="border-primary/40 text-primary">
                <Link to="/app/decks/$deckId" params={{ deckId: String(activeSession.deckId) }}>
                  <Clock3 className="w-4 h-4 mr-1" /> {tr("home.resume")}
                </Link>
              </Button>
            )}
            <Button asChild className="btn-pop">
              <Link to="/app/plan">
                <CalendarClock className="w-4 h-4 mr-1" /> {dueCards ? tr("home.startPlan") : tr("home.viewPlan")}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/app/decks">
                <BookOpen className="w-4 h-4 mr-1" /> {tr("home.browse")}
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Stat grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<CalendarClock className="w-5 h-5 text-primary" />}
          label={tr("home.dueNow")}
          value={String(dueCards)}
          sub={dueCards ? tr("home.readyRecall") : tr("home.nothingOverdue")}
        />
        <StatCard
          icon={<Clock3 className="w-5 h-5 text-info" />}
          label={tr("home.planTime")}
          value={dueCards ? `~${todayPlan?.estimatedMinutes ?? 1} min` : tr("home.allClear")}
          sub={tr("home.reviewsToday", { done: todayPlan?.reviewsToday ?? state.dailyProgress, goal: todayPlan?.dailyGoal ?? state.dailyGoal })}
        />
        <StatCard
          icon={<Flame className="w-5 h-5 text-streak" />}
          label={tr("home.dayStreak")}
          value={`${userStreak}`}
          sub={tr("home.keepAlive")}
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5 text-info" />}
          label={tr("home.wordsLearning")}
          value={`${learning}`}
          sub={tr("home.mastered", { count: mastered })}
        />
        <StatCard
          icon={<Trophy className="w-5 h-5 text-coin" />}
          label={tr("home.recentAccuracy")}
          value={recentTotal ? `${Math.round((recentCorrect / recentTotal) * 100)}%` : "—"}
          sub={tr("home.reviews", { count: recentTotal })}
        />
      </div>

      <section className="rounded-[2rem] border border-primary/20 bg-card/80 p-6 card-pop">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{tr("home.tomorrowWith", { name: petName })}</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight">
              {tomorrow?.cardCount
                ? tr("home.tomorrowPrepared", { name: petName, count: tomorrow.cardCount, cards: tr("plan.words", { count: tomorrow.cardCount }) })
                : tr("home.tomorrowNew", { name: petName })}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {tomorrow?.cardCount
                ? tr("home.tomorrowSession", { minutes: tomorrow.estimatedMinutes })
                : tr("home.tomorrowAnswers")}
            </p>
          </div>
          {tomorrow?.cardCount ? <div className="rounded-2xl bg-primary/10 px-4 py-3 text-right"><p className="text-xs font-bold text-primary">~{tomorrow.estimatedMinutes} min</p><p className="mt-1 text-xs text-muted-foreground">{tr("home.readyTomorrow")}</p></div> : null}
        </div>
        {tomorrow?.words?.length ? <p className="mt-4 text-sm text-muted-foreground">{tr("home.saved", { name: petName })} <span className="font-semibold text-foreground">{tomorrow.words.join(", ")}</span></p> : null}
      </section>

      {hasNeedsAttention && (
        <section className="rounded-[2rem] border border-amber-500/25 bg-card/80 p-6 card-pop">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <Brain className="h-5 w-5" />
                <p className="text-xs font-bold uppercase tracking-[0.14em]">{tr("home.needsAttention")}</p>
              </div>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight">{tr("home.resetHeading")}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {tr("home.resetDetail", { name: petName })}
              </p>
            </div>
            {activeSession ? (
              <Button asChild variant="outline" className="shrink-0 border-primary/40 text-primary">
                <Link to="/app/decks/$deckId" params={{ deckId: String(activeSession.deckId) }}>
                  <Clock3 className="mr-1 h-4 w-4" /> {tr("home.resume")}
                </Link>
              </Button>
            ) : recoveryDeckId ? (
              <Button className="btn-pop shrink-0" onClick={startRecoverySession} disabled={recoveryMutation.isPending}>
                <Clock3 className="mr-1 h-4 w-4" />
                {recoveryMutation.isPending ? tr("home.preparing") : tr("home.startRecovery")}
              </Button>
            ) : null}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {relearning && (
              <AttentionItem
                icon={<CircleAlert className="h-4 w-4 text-rose-500" />}
                title={tr("home.meetAgain", { count: relearning.count, words: tr("plan.words", { count: relearning.count }) })}
                detail={tr("home.markedAgain", { words: relearning.words.slice(0, 3).join(", ") })}
              />
            )}
            {overdue && (
              <AttentionItem
                icon={<CalendarClock className="h-4 w-4 text-amber-500" />}
                title={tr("home.overdue", { count: overdue.count, reviews: tr("home.reviews", { count: overdue.count }) })}
                detail={tr("home.waitingCatchup", { deck: overdue.deckName })}
              />
            )}
            {weakTopic && (
              <AttentionItem
                icon={<TrendingUp className="h-4 w-4 text-violet-500" />}
                title={tr("home.needsPractice", { topic: weakTopic })}
                detail={companionState?.learningProfile?.averageQuizScore
                  ? tr("home.accuracyTopic", { score: companionState.learningProfile.averageQuizScore })
                  : tr("home.gentleReview")}
              />
            )}
          </div>
        </section>
      )}

      {companionState && (
        <section className="rounded-[2rem] border border-primary/20 bg-primary/[0.035] p-6 card-pop">
          <div className="flex items-center gap-2 text-primary">
            <HeartHandshake className="h-5 w-5" />
            <p className="text-xs font-bold uppercase tracking-[0.14em]">{tr("home.story")}</p>
          </div>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight">{tr("home.remembers", { name: petName })}</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {companionState.yesterdayWords > 0 && (
              <MemoryItem
                icon={<History className="h-4 w-4 text-primary" />}
                title={tr("home.yesterdayStudied", { count: companionState.yesterdayWords, words: tr("plan.words", { count: companionState.yesterdayWords }) })}
                detail={tr("home.quickRecall")}
              />
            )}
            {companionState.learningProfile?.weakestTopic && (
              <MemoryItem
                icon={<Brain className="h-4 w-4 text-violet-500" />}
                title={tr("home.wordsCare", { topic: companionState.learningProfile.weakestTopic })}
                detail={companionState.frequentlyWrongWord
                  ? tr("home.revisitTogether", { word: companionState.frequentlyWrongWord })
                  : tr("home.includeSession", { name: petName })}
              />
            )}
            {companionState.closeToUsualStudyTime && (
              <MemoryItem
                icon={<Clock3 className="h-4 w-4 text-amber-500" />}
                title={tr("home.usualTime")}
                detail={tr("home.smallSession")}
              />
            )}
            {companionState.relationshipMilestone && (
              <MemoryItem
                icon={<HeartHandshake className="h-4 w-4 text-rose-500" />}
                title={tr("home.milestone", { milestone: companionState.relationshipMilestone })}
                detail={tr("home.focusedSessions", { name: petName, count: companionState.totalSessionsTogether, sessions: tr("home.reviews", { count: companionState.totalSessionsTogether }) })}
              />
            )}
            {!companionState.yesterdayWords && !companionState.learningProfile?.weakestTopic
              && !companionState.closeToUsualStudyTime && !companionState.relationshipMilestone && (
              <MemoryItem
                icon={<HeartHandshake className="h-4 w-4 text-primary" />}
                title={tr("home.buildingRhythm", { name: petName })}
                detail={tr("home.completeFocused")}
              />
            )}
          </div>
        </section>
      )}

      {/* Decks shortcut */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-extrabold">{tr("home.yourDecks")}</h2>
          <Link to="/app/decks" className="text-sm font-bold text-primary hover:underline">
            {tr("home.seeAll")}
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {decks.slice(0, 4).map((d) => {
            return (
              <Link
                key={d.id}
                to="/app/decks/$deckId"
                params={{ deckId: String(d.id) }}
            className="rounded-2xl border border-border bg-card/80 p-5 card-pop transition-all hover:-translate-y-0.5 hover:border-primary/50"
              >
                <div
                  className={`w-12 h-12 rounded-xl ${d.color} flex items-center justify-center text-2xl`}
                >
                  {d.emoji}
                </div>
                <p className="font-extrabold mt-3">{d.name}</p>
                <p className="text-xs text-muted-foreground">{tr("home.words", { count: d.wordCount })}</p>
              </Link>
            );
          })}
          {!decksLoading && decks.length === 0 && (
            <div className="sm:col-span-2 lg:col-span-4 rounded-2xl border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              {tr("home.noDecks")}
            </div>
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <h2 className="text-xl font-extrabold mb-3">{tr("home.recentWords")}</h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-card/80 card-pop divide-y">
          {recentReviews.map((review, i) => {
            const w = { word: review.word, meaning: review.meaning };
            const r = { correct: review.rating !== "AGAIN" };
            return (
              <div key={i} className="flex items-center justify-between p-3 text-sm">
                <div>
                  <span className="font-bold">{w?.word ?? r.wordId}</span>
                  <span className="text-muted-foreground"> · {w?.meaning.slice(0, 60)}…</span>
                </div>
                <span
                  className={r.correct ? "text-success font-bold" : "text-destructive font-bold"}
                >
                  {r.correct ? "✓" : "✗"}
                </span>
              </div>
            );
          })}
          {!recentReviewsLoading && recentReviews.length === 0 && (
            <div className="p-6 text-sm text-muted-foreground text-center">
              {tr("home.noReviews")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AttentionItem({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-border/80 bg-background/50 p-4">
      <div className="flex items-center gap-2 font-bold text-sm">{icon}{title}</div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{detail}</p>
    </div>
  );
}

function MemoryItem({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-primary/15 bg-card/70 p-4">
      <div className="flex items-start gap-2 text-sm font-bold leading-snug">{icon}<span>{title}</span></div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{detail}</p>
    </div>
  );
}

const PET_VARIANTS: PetVariant[] = ["CAT", "FOX", "BUNNY", "PANDA", "DRAGON"];
const PET_MOODS: PetMood[] = ["happy", "sad", "sleepy", "excited", "waiting", "crying"];

function toPetVariant(species?: string): PetVariant | undefined {
  const variant = species?.toUpperCase() as PetVariant | undefined;
  return variant && PET_VARIANTS.includes(variant) ? variant : undefined;
}

function toPetMood(mood?: string): PetMood | undefined {
  const normalizedMood = mood?.toLowerCase() as PetMood | undefined;
  return normalizedMood && PET_MOODS.includes(normalizedMood) ? normalizedMood : undefined;
}

function StatCard({
  icon,
  label,
  value,
  sub,
  progress,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  progress?: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/80 p-5 card-pop">
      <div className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="text-3xl font-extrabold mt-2">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      {progress !== undefined && (
        <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}
