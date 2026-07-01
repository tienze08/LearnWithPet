import { createFileRoute, Link } from "@tanstack/react-router";
import { useGame } from "@/lib/store";
import { Pet } from "@/components/Pet";
import { Button } from "@/components/ui/button";
import { Flame, Target, BookOpen, Trophy, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

function Dashboard() {
  const { state } = useGame();
  const goalPct = Math.min(100, (state.dailyProgress / state.dailyGoal) * 100);
  const mastered = Object.values(state.masteryByWord).filter((m) => m >= 4).length;
  const learning = Object.values(state.masteryByWord).filter((m) => m > 0 && m < 4).length;
  const recentCorrect = state.reviewHistory.slice(0, 20).filter((r) => r.correct).length;
  const recentTotal = Math.min(20, state.reviewHistory.length);

  return (
    <div className="space-y-6">
      {/* Hero card */}
      <div className="rounded-3xl border-2 border-border from-primary/15 via-accent to-secondary p-6 card-pop flex flex-col md:flex-row gap-6 items-center">
        <Pet mood={state.petMood} size={140} />
        <div className="flex-1 text-center md:text-left">
          <p className="text-xs font-bold uppercase text-primary">Good to see you</p>
          <h1 className="text-3xl font-extrabold mt-1">
            {state.petName} is feeling <span className="capitalize">{state.petMood}</span>
          </h1>
          <p className="text-muted-foreground mt-1 text-sm max-w-md">
            Your desktop companion reacts to your learning momentum. It will pop up every{" "}
            {state.popupIntervalMin} min with a quick review or mini quiz.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 justify-center md:justify-start">
            <Button asChild className="btn-pop">
              <Link to="/app/decks">
                <BookOpen className="w-4 h-4 mr-1" /> Start studying
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Stat grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Target className="w-5 h-5 text-primary" />}
          label="Daily goal"
          value={`${state.dailyProgress} / ${state.dailyGoal}`}
          progress={goalPct}
        />
        <StatCard
          icon={<Flame className="w-5 h-5 text-streak" />}
          label="Day streak"
          value={`${state.streak}`}
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
          {state.decks.slice(0, 4).map((d) => {
            const wordCount = state.words.filter((w) => w.deckId === d.id).length;
            return (
              <Link
                key={d.id}
                to="/app/decks/$deckId"
                params={{ deckId: d.id }}
                className="rounded-2xl border-2 border-border bg-card p-4 card-pop hover:border-primary transition-colors"
              >
                <div
                  className={`w-12 h-12 rounded-xl ${d.color} flex items-center justify-center text-2xl`}
                >
                  {d.emoji}
                </div>
                <p className="font-extrabold mt-3">{d.name}</p>
                <p className="text-xs text-muted-foreground">{wordCount} words</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <h2 className="text-xl font-extrabold mb-3">Recent reviews</h2>
        <div className="rounded-2xl border-2 border-border bg-card card-pop divide-y">
          {state.reviewHistory.slice(0, 6).map((r, i) => {
            const w = state.words.find((x) => x.id === r.wordId);
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
          {state.reviewHistory.length === 0 && (
            <div className="p-6 text-sm text-muted-foreground text-center">
              No reviews yet — your pet will quiz you soon!
            </div>
          )}
        </div>
      </div>
    </div>
  );
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
    <div className="rounded-2xl border-2 border-border bg-card p-4 card-pop">
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
