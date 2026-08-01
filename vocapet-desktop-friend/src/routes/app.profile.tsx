import { createFileRoute } from "@tanstack/react-router";
import { useGame } from "@/lib/store";
import { PetCard } from "@/components/PetCard";
import { PetSpecies } from "@/components/PetSpecies";
import { Button } from "@/components/ui/button";
import { Trophy, Flame, Zap, Coins, Star, Calendar, Pencil } from "lucide-react";
import { useMeQuery, useUpdateAvatarMutation } from "@/hooks/queries/user.queries";
import { avatarMap } from "@/types/avatar";
import { useMyAchievementsQuery } from "@/hooks/queries/achievement.queries";
import { useUnlockedPetsQuery } from "@/hooks/queries/pet.queries";
import { ACHIEVEMENTS as AWARD_DEFINITIONS, achievementStatus } from "@/lib/achievements";

const PET_EMOJI = { CAT: "🐱", FOX: "🦊", BUNNY: "🐰", PANDA: "🐼", DRAGON: "🐲" } as const;
const ACHIEVEMENT_CODES: Record<string, string> = {
  first: "first-review",
  ten: "reviews-50",
  streak3: "streak-3",
  lvl5: "level-5",
};

export const Route = createFileRoute("/app/profile")({
  component: Profile,
});

const AVATARS = [
  { type: "FOX", emoji: "🦊" },
  { type: "PANDA", emoji: "🐼" },
  { type: "KOALA", emoji: "🐨" },
  { type: "FROG", emoji: "🐸" },
  { type: "MONKEY", emoji: "🐵" },
  { type: "UNICORN", emoji: "🦄" },
  { type: "TIGER", emoji: "🐯" },
  { type: "PENGUIN", emoji: "🐧" },
  { type: "OCTOPUS", emoji: "🐙" },
  { type: "STAR", emoji: "🌟" },
  { type: "ROCKET", emoji: "🚀" },
  { type: "CLOVER", emoji: "🍀" },
];

const ACHIEVEMENTS = [
  { id: "first", label: "First word reviewed", check: (s: any) => s.reviewHistory.length >= 1 },
  { id: "ten", label: "10 reviews", check: (s: any) => s.reviewHistory.length >= 10 },
  { id: "streak3", label: "3-day streak", check: (s: any) => s.streak >= 3 },
  { id: "lvl5", label: "Reach level 5", check: (s: any) => s.level >= 5 },
  {
    id: "master5",
    label: "Master 5 words",
    check: (s: any) => Object.values(s.masteryByWord).filter((m: any) => m >= 4).length >= 5,
  },
];

function Profile() {
  const { state, setState } = useGame();
  const { data: me } = useMeQuery();
  const { data: unlockedPets = [] } = useUnlockedPetsQuery();
  const { data: serverAchievements = [] } = useMyAchievementsQuery();
  const serverAchievementsByCode = new Map(
    serverAchievements.map((achievement) => [achievement.code, achievement]),
  );
  // Keep Profile in sync with the Awards page: backend status takes priority
  // when available, while client-only award definitions still render correctly.
  const awardedAchievements = AWARD_DEFINITIONS.filter((award) => {
    const remote = serverAchievementsByCode.get(award.id);
    return remote ? remote.unlocked : achievementStatus(award, state).unlocked;
  });
  console.log("me", me);
  const accuracy = state.reviewHistory.length
    ? Math.round(
        (state.reviewHistory.filter((r) => r.correct).length / state.reviewHistory.length) * 100,
      )
    : 0;

  const joined = new Date(state.user.joinedAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const updateAvatarMutation = useUpdateAvatarMutation();

  return (
    <div className="space-y-6">
      {/* User card */}
      {me && (
        <div className="rounded-3xl border-2 border-border bg-card p-6 card-pop">
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="w-24 h-24 rounded-3xl bg-primary/10 border-2 border-border flex items-center justify-center text-5xl">
              {avatarMap[me.avatar] ?? "🦊"}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1 justify-center sm:justify-start">
                <Calendar className="w-3 h-3" /> {me.name}
              </p>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1 justify-center sm:justify-start">
                <Calendar className="w-3 h-3" /> {me.email}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Tile
                icon={<Zap className="w-4 h-4 text-xp" />}
                label="Level"
                value={me?.level ?? state.level}
              />
              <Tile
                icon={<Flame className="w-4 h-4 text-streak" />}
                label="Streak"
                value={me?.streak ?? state.streak}
              />
              <Tile
                icon={<Coins className="w-4 h-4 text-coin" />}
                label="Coins"
                value={me?.coin ?? state.coins}
              />
              <Tile
                icon={<Trophy className="w-4 h-4 text-primary" />}
                label="Accuracy"
                value={`${accuracy}%`}
              />
            </div>
          </div>

          <div className="mt-5">
            <p className="text-xs font-bold uppercase text-muted-foreground mb-2">Avatar</p>
            <div className="flex flex-wrap gap-2">
              {AVATARS.map((avatar) => (
                <button
                  key={avatar.type}
                  onClick={() => updateAvatarMutation.mutate(avatar.type)}
                  className={`w-10 h-10 text-xl rounded-xl border-2 flex items-center justify-center transition-transform hover:scale-105 ${
                    me?.avatar === avatar.type
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background"
                  }`}
                >
                  {avatar.emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* RPG Pet card */}
      <PetCard />

      <div>
        <h2 className="text-xl font-extrabold mb-3">Unlocked pets</h2>
        <div className="flex flex-wrap gap-3">
          {unlockedPets.map((pet) => (
            <div key={pet.species} className="rounded-2xl border-2 border-primary bg-primary/5 px-4 py-3 flex items-center gap-2">
              <span className="text-2xl">{PET_EMOJI[pet.species]}</span>
              <div><p className="font-bold capitalize">{pet.species.toLowerCase()}</p><p className="text-xs text-primary">Unlocked</p></div>
            </div>
          ))}
        </div>
      </div>

      <PetSpecies />

      <div>
        <h2 className="text-xl font-extrabold mb-3">Daily goal</h2>
        <div className="flex flex-wrap gap-2">
          {[5, 10, 20, 30].map((g) => (
            <button
              key={g}
              onClick={() => setState((s) => ({ ...s, dailyGoal: g }))}
              className={`px-4 py-2 rounded-xl border-2 text-sm font-bold ${state.dailyGoal === g ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
            >
              {g} words / day
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-extrabold mb-3">Awarded achievements</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {awardedAchievements.map((award) => {
            return (
              <div
                key={award.id}
                className="rounded-2xl border-2 border-primary bg-primary/5 p-4 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center text-xl">{award.icon}</div>
                <div>
                  <p className="font-bold text-sm">{award.title}</p>
                  <p className="text-xs text-primary">Awarded</p>
                </div>
              </div>
            );
          })}
          {awardedAchievements.length === 0 && (
            <p className="text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">No awards yet — keep learning to unlock your first achievement.</p>
          )}
        </div>
      </div>

      <div className="pt-4">
        <Button
          variant="outline"
          className="border-2"
          onClick={() => {
            if (confirm("Reset all progress?")) {
              localStorage.removeItem("vocapet:v1");
              location.reload();
            }
          }}
        >
          Reset progress
        </Button>
      </div>
    </div>
  );
}

function Tile({ icon, label, value }: { icon: React.ReactNode; label: string; value: any }) {
  return (
    <div className="rounded-2xl border-2 border-border bg-card p-3">
      <div className="flex items-center gap-1 text-xs font-bold text-muted-foreground uppercase">
        {icon}
        {label}
      </div>
      <p className="text-2xl font-extrabold mt-1">{value}</p>
    </div>
  );
}
