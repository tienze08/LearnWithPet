import { createFileRoute, Link } from "@tanstack/react-router";
import { stageForLevel, useGame, type PetMood, type PetVariant } from "@/lib/store";
import { Pet } from "@/components/PixiPet/Pet";
import { Button } from "@/components/ui/button";
import { Flame, BookOpen, Trophy, TrendingUp, CalendarClock, Clock3 } from "lucide-react";
import { useMeQuery } from "@/hooks/queries/user.queries";
import { useDecksQuery } from "@/hooks/queries/deck.queries";
import { useRecentReviewsQuery, useStudyDashboardStatsQuery, useTodayStudyPlanQuery } from "@/hooks/queries/study-session.queries";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

function Dashboard() {
  const { state } = useGame();
  const { data: me } = useMeQuery();
  const { data: decks = [], isLoading: decksLoading } = useDecksQuery();
  const { data: recentReviews = [], isLoading: recentReviewsLoading } = useRecentReviewsQuery();
  const { data: studyStats } = useStudyDashboardStatsQuery();
  const { data: todayPlan } = useTodayStudyPlanQuery();

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

  return (
    <div className="space-y-6">
      {/* Hero card */}
      <div className="relative overflow-hidden rounded-[2rem] border border-border/80 bg-card/75 p-7 md:p-8 card-pop flex flex-col md:flex-row gap-7 items-center">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <Pet variant={petVariant} stage={petStage} mood={petMood} size={140} />
        <div className="flex-1 text-center md:text-left">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Today with {petName}</p>
          <h1 className="text-3xl font-extrabold mt-2 tracking-tight md:text-4xl">
            {dueCards ? `${dueCards} words are ready for review.` : "Your review queue is all clear."}
          </h1>
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed max-w-md">
            {dueCards
              ? `${petName} prepared a focused ${todayPlan?.estimatedMinutes ?? 1}-minute session using your shared FSRS schedule.`
              : `${petName} will keep an eye on your schedule and bring back words when they are due.`}
          </p>
          {planWords.length > 0 && (
            <p className="mt-3 text-xs font-semibold text-muted-foreground">
              Revisit first: <span className="text-foreground">{planWords.join(", ")}</span>
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2 justify-center md:justify-start">
            <Button asChild className="btn-pop">
              <Link to="/app/plan">
                <CalendarClock className="w-4 h-4 mr-1" /> {dueCards ? "Start today’s plan" : "View today’s plan"}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/app/decks">
                <BookOpen className="w-4 h-4 mr-1" /> Browse decks
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Stat grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<CalendarClock className="w-5 h-5 text-primary" />}
          label="Due now"
          value={String(dueCards)}
          sub={dueCards ? "ready for recall" : "nothing overdue"}
        />
        <StatCard
          icon={<Clock3 className="w-5 h-5 text-info" />}
          label="Plan time"
          value={dueCards ? `~${todayPlan?.estimatedMinutes ?? 1} min` : "All clear"}
          sub={`${todayPlan?.reviewsToday ?? state.dailyProgress}/${todayPlan?.dailyGoal ?? state.dailyGoal} reviews today`}
        />
        <StatCard
          icon={<Flame className="w-5 h-5 text-streak" />}
          label="Day streak"
          value={`${userStreak}`}
          sub="keep it alive!"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5 text-info" />}
          label="Words learning"
          value={`${learning}`}
          sub={`${mastered} mastered`}
        />
        <StatCard
          icon={<Trophy className="w-5 h-5 text-coin" />}
          label="Recent accuracy"
          value={recentTotal ? `${Math.round((recentCorrect / recentTotal) * 100)}%` : "—"}
          sub={`${recentTotal} reviews`}
        />
      </div>

      {/* Decks shortcut */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-extrabold">Your decks</h2>
          <Link to="/app/decks" className="text-sm font-bold text-primary hover:underline">
            See all →
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
                <p className="text-xs text-muted-foreground">{d.wordCount} words</p>
              </Link>
            );
          })}
          {!decksLoading && decks.length === 0 && (
            <div className="sm:col-span-2 lg:col-span-4 rounded-2xl border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No decks yet. Create a deck to start collecting words.
            </div>
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <h2 className="text-xl font-extrabold mb-3">Recently studied words</h2>
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
              No reviews yet — your pet will quiz you soon!
            </div>
          )}
        </div>
      </div>
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
