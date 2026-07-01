import { createFileRoute, Link } from "@tanstack/react-router";
import { Pet, PET_VARIANTS } from "@/components/Pet";
import { useGame } from "@/lib/store";
import type { GameState, PetVariant } from "@/lib/store";
import { Lock, Check, Sparkles, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

type Unlock = {
  id: PetVariant;
  title: string;
  requirement: string;
  goal: number;
  progress: (s: GameState) => number;
};

const masteredCount = (s: GameState) => Object.values(s.masteryByWord).filter((m) => m >= 4).length;

export const PET_UNLOCKS: Unlock[] = [
  {
    id: "CAT",
    title: "Starter Companion",
    requirement: "Available from day one",
    goal: 1,
    progress: () => 1,
  },
  {
    id: "FOX",
    title: "Sharp Learner",
    requirement: "Reach Level 3",
    goal: 3,
    progress: (s) => s.level,
  },
  {
    id: "BUNNY",
    title: "Streak Hopper",
    requirement: "Maintain a 5-day streak",
    goal: 5,
    progress: (s) => s.streak,
  },
  {
    id: "PANDA",
    title: "Focused Scholar",
    requirement: "Reach Level 5",
    goal: 5,
    progress: (s) => s.level,
  },
  {
    id: "DRAGON",
    title: "Vocabulary Master",
    requirement: "Master 10 words (mastery ≥ 4)",
    goal: 10,
    progress: masteredCount,
  },
];

export const Route = createFileRoute("/app/pets")({
  component: PetsPage,
});

function PetsPage() {
  const { state, setState } = useGame();
  const unlockedIds = PET_UNLOCKS.filter((u) => u.progress(state) >= u.goal).map((u) => u.id);

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-extrabold flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-primary" /> Pet Collection
          </h1>
          <p className="text-muted-foreground">
            Five companions to discover. Keep learning to unlock them all.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-primary/10 text-primary px-4 py-2 font-bold">
          <Trophy className="w-4 h-4" />
          {unlockedIds.length} / {PET_UNLOCKS.length} unlocked
        </div>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {PET_UNLOCKS.map((u) => {
          const meta = PET_VARIANTS.find((v) => v.id === u.id)!;
          const progress = Math.min(u.goal, u.progress(state));
          const unlocked = progress >= u.goal;
          const active = state.petVariant === u.id;
          const pct = Math.round((progress / u.goal) * 100);

          return (
            <article
              key={u.id}
              className={`relative rounded-3xl border-2 p-5 card-pop transition-all ${
                active
                  ? "border-primary bg-primary/5"
                  : unlocked
                    ? "border-border bg-card hover:-translate-y-0.5"
                    : "border-dashed border-border bg-muted/30"
              }`}
            >
              {active && (
                <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-xs font-bold bg-primary text-primary-foreground rounded-full px-2 py-1">
                  <Check className="w-3 h-3" /> Active
                </span>
              )}

              <div className="flex items-center justify-center h-32 relative">
                <div className={unlocked ? "" : "grayscale opacity-50"}>
                  <Pet
                    variant={u.id}
                    stage={3}
                    mood={active ? state.petMood : "happy"}
                    size={128}
                  />
                </div>
                {!unlocked && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-background/80 border-2 border-border flex items-center justify-center">
                      <Lock className="w-6 h-6 text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-3 text-center">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {u.title}
                </p>
                <h2 className="text-xl font-extrabold flex items-center justify-center gap-2">
                  <span>{meta.emoji}</span>
                  <span>{meta.name}</span>
                </h2>
                <p className="text-sm text-muted-foreground mt-1 ">{meta.desc}</p>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className={unlocked ? "text-primary" : "text-muted-foreground"}>
                    {u.requirement}
                  </span>
                  <span className="text-muted-foreground">
                    {progress}/{u.goal}
                  </span>
                </div>
                <div className="mt-1.5 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${unlocked ? "bg-primary" : "bg-streak"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              <div className="mt-4">
                {unlocked ? (
                  <Button
                    className="w-full"
                    variant={active ? "secondary" : "default"}
                    onClick={() => setState((s) => ({ ...s, petVariant: u.id }))}
                    disabled={active}
                  >
                    {active ? "Currently Active" : "Set as Companion"}
                  </Button>
                ) : (
                  <Button asChild className="w-full" variant="outline">
                    <Link to="/app/decks">Train to unlock</Link>
                  </Button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
