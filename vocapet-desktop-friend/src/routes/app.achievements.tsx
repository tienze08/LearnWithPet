import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useGame } from "@/lib/store";
import { useMyAchievementsQuery } from "@/hooks/queries/achievement.queries";

import { Trophy, Lock, Check } from "lucide-react";
import {
  Achievement,
  ACHIEVEMENTS,
  achievementStatus,
  AchievementTier,
  TIER_LABEL,
} from "@/lib/achievements";

export const Route = createFileRoute("/app/achievements")({
  component: AchievementsPage,
});

const TIER_CLASSES: Record<AchievementTier, string> = {
  bronze: "text-coin border-coin/40 bg-coin/10",
  silver: "text-muted-foreground border-border bg-muted",
  gold: "text-xp border-xp/40 bg-xp/10",
  legendary: "text-primary border-primary/40 bg-primary/10",
};

const FILTERS = ["All", "Unlocked", "In progress"] as const;

function AchievementsPage() {
  const { state } = useGame();
  const { data: serverAchievements = [] } = useMyAchievementsQuery();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");

  const rows = useMemo(
    () => {
      const serverByCode = new Map(serverAchievements.map((item) => [item.code, item]));
      return ACHIEVEMENTS.map((a) => {
        const local = achievementStatus(a, state);
        const remote = serverByCode.get(a.id);
        return remote
          ? { a, value: Math.min(a.target, remote.progress), pct: Math.round((Math.min(a.target, remote.progress) / a.target) * 100), unlocked: remote.unlocked }
          : { a, ...local };
      });
    },
    [serverAchievements, state],
  );
  const unlocked = rows.filter((r) => r.unlocked).length;
  const overall = Math.round((unlocked / rows.length) * 100);

  const visible = rows.filter((r) =>
    filter === "All" ? true : filter === "Unlocked" ? r.unlocked : !r.unlocked,
  );

  const categories = Array.from(new Set(visible.map((r) => r.a.category)));

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border-2 border-border bg-card p-6 card-pop">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border-2 border-border flex items-center justify-center">
            <Trophy className="w-8 h-8 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-extrabold">Achievements</h1>
            <p className="text-sm text-muted-foreground">
              {unlocked} of {rows.length} unlocked — keep studying to collect them all.
            </p>
            <div className="mt-3 flex items-center gap-3">
              <div
                className="h-3.5 flex-1 overflow-hidden rounded-full border border-border bg-muted p-0.5 shadow-inner"
                role="progressbar"
                aria-label="Overall achievement progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={overall}
              >
                <div
                  className="h-full rounded-full bg-linear-to-r from-primary via-emerald-400 to-xp transition-[width] duration-700 ease-out"
                  style={{ width: `${overall}%` }}
                />
              </div>
              <span className="text-xs font-extrabold text-muted-foreground">{unlocked}/{rows.length}</span>
            </div>
          </div>
          <div className="text-4xl font-extrabold text-primary">{overall}%</div>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl border-2 text-sm font-bold transition-colors ${
              filter === f
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:border-primary"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {visible.length === 0 && (
        <p className="text-center text-muted-foreground py-12 font-bold">
          Nothing here yet — go review some words!
        </p>
      )}

      {categories.map((cat) => (
        <section key={cat}>
          <h2 className="text-xl font-extrabold mb-3">{cat}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visible
              .filter((r) => r.a.category === cat)
              .map(({ a, value, pct, unlocked: got }) => (
                <Card key={a.id} a={a} value={value} pct={pct} unlocked={got} />
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Card({
  a,
  value,
  pct,
  unlocked,
}: {
  a: Achievement;
  value: number;
  pct: number;
  unlocked: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border-2 p-4 transition-all ${
        unlocked ? "border-primary bg-primary/5 card-pop" : "border-border bg-card"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center text-2xl shrink-0 ${
            unlocked
              ? "border-primary bg-primary/10"
              : "border-border bg-muted grayscale opacity-60"
          }`}
        >
          {a.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-extrabold truncate">{a.title}</p>
            {unlocked ? (
              <Check className="w-4 h-4 text-primary shrink-0" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground">{a.description}</p>
          <span
            className={`inline-block mt-2 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase ${TIER_CLASSES[a.tier]}`}
          >
            {TIER_LABEL[a.tier]}
          </span>
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-border bg-muted/45 p-2.5">
        <div className="mb-2 flex items-center justify-between text-[11px] font-extrabold">
          <span className={unlocked ? "text-primary" : "text-muted-foreground"}>
            {unlocked ? "Completed" : "In progress"}
          </span>
          <span className="text-muted-foreground">{pct}%</span>
        </div>
        <div
          className="h-2.5 overflow-hidden rounded-full bg-background ring-1 ring-border/70"
          role="progressbar"
          aria-label={`${a.title} progress`}
          aria-valuemin={0}
          aria-valuemax={a.target}
          aria-valuenow={value}
        >
          <div
            className={`h-full rounded-full transition-[width] duration-700 ease-out ${unlocked ? "bg-linear-to-r from-primary to-emerald-400" : "bg-linear-to-r from-xp/70 to-xp"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] font-bold text-muted-foreground">
          {value} / {a.target}
        </p>
      </div>
    </div>
  );
}
