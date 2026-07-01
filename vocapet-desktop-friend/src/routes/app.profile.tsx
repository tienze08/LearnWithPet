import { createFileRoute } from "@tanstack/react-router";
<<<<<<< HEAD
import { useGame } from "@/lib/store";

import { PetSpecies } from "@/components/PetSpecies";
import { Button } from "@/components/ui/button";
import { Trophy, Flame, Zap, Coins, Star, Calendar, Pencil } from "lucide-react";
import { useMeQuery } from "@/hooks/queries/user.queries";
import { PetCard } from "@/components/PetCard";
=======
import { Button } from "@/components/ui/button";
import { Trophy, Zap, Calendar } from "lucide-react";
import { useMeQuery } from "@/hooks/queries/user.queries";
>>>>>>> 40376e2 (UI of choose pet)

export const Route = createFileRoute("/app/profile")({
  component: Profile,
});

<<<<<<< HEAD
const AVATARS = ["🦊", "🐼", "🐨", "🐸", "🐵", "🦄", "🐯", "🐧", "🐙", "🌟", "🚀", "🍀"];

=======
>>>>>>> 40376e2 (UI of choose pet)
const avatarMap: Record<string, string> = {
  FOX: "🦊",
  PANDA: "🐼",
  KOALA: "🐨",
  FROG: "🐸",
  MONKEY: "🐵",
  UNICORN: "🦄",
  TIGER: "🐯",
  PENGUIN: "🐧",
  OCTOPUS: "🐙",
  STAR: "🌟",
  ROCKET: "🚀",
  CLOVER: "🍀",
};

<<<<<<< HEAD
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
  const { data: me, isLoading } = useMeQuery();
  console.log(me);
  const { state, setState } = useGame();
  if (isLoading || !me) {
    return <div>Loading...</div>;
  }

  const accuracy = state.reviewHistory.length
    ? Math.round(
        (state.reviewHistory.filter((r) => r.correct).length / state.reviewHistory.length) * 100,
      )
    : 0;
=======
const AVATARS = Object.keys(avatarMap);

function Profile() {
  const { data: me, isLoading } = useMeQuery();

  if (isLoading) {
    return <div className="flex items-center justify-center py-20">Loading...</div>;
  }

  if (!me) {
    return <div className="flex items-center justify-center py-20">Cannot load profile</div>;
  }
>>>>>>> 40376e2 (UI of choose pet)

  const joined = new Date(state.user.joinedAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
<<<<<<< HEAD
      {/* User card */}
      <div className="rounded-3xl border-2 border-border bg-card p-6 card-pop">
=======
      {/* USER CARD */}
      <div className="rounded-3xl border-2 border-border bg-card p-6">
>>>>>>> 40376e2 (UI of choose pet)
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <div className="w-24 h-24 rounded-3xl bg-primary/10 border-2 border-border flex items-center justify-center text-5xl">
            {avatarMap[me.avatarType] ?? "🦊"}
          </div>
<<<<<<< HEAD
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-3xl font-extrabold">{me.name}</h2>
            <p className="text-muted-foreground">{me.email}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Tile icon={<Zap className="w-4 h-4 text-xp" />} label="Level" value={me.level} />
            <Tile
              icon={<Flame className="w-4 h-4 text-streak" />}
              label="Streak"
              value={state.streak}
            />
            <Tile
              icon={<Coins className="w-4 h-4 text-coin" />}
              label="Coins"
              value={state.coins}
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
            {AVATARS.map((emo) => (
              <button
                key={emo}
                onClick={() => setState((s) => ({ ...s, user: { ...s.user, avatarEmoji: emo } }))}
                className={`w-10 h-10 text-xl rounded-xl border-2 flex items-center justify-center transition-transform hover:scale-105 ${
                  state.user.avatarEmoji === emo
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background"
                }`}
              >
                {emo}
              </button>
            ))}
=======

          <div className="flex-1 text-center sm:text-left">
            <p className="text-xs font-bold uppercase text-muted-foreground">User</p>

            <h2 className="text-3xl font-extrabold">{me.name}</h2>

            <p className="text-muted-foreground">{me.email}</p>

            <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Member
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Tile icon={<Zap className="w-4 h-4" />} label="Level" value={me.level} />

            <Tile icon={<Trophy className="w-4 h-4" />} label="XP" value={me.xp} />
>>>>>>> 40376e2 (UI of choose pet)
          </div>
        </div>
      </div>

<<<<<<< HEAD
      {/* RPG Pet card */}
      <PetCard />

      <div className="rounded-2xl border-2 border-border bg-card p-4">
        <label className="text-xs font-bold uppercase text-muted-foreground">Pet name</label>
        <input
          value={state.petName}
          onChange={(e) => setState((s) => ({ ...s, petName: e.target.value }))}
          className="block mt-1 text-2xl font-extrabold bg-transparent outline-none border-b-2 border-transparent focus:border-primary w-full"
        />
      </div>

      <PetSpecies />

      <div>
        <h2 className="text-xl font-extrabold mb-3">Daily goal</h2>
=======
      {/* AVATAR CARD */}
      <div className="rounded-3xl border-2 border-border bg-card p-6">
        <h2 className="text-xl font-extrabold mb-4">Avatar</h2>

>>>>>>> 40376e2 (UI of choose pet)
        <div className="flex flex-wrap gap-2">
          {AVATARS.map((avatar) => (
            <div
              key={avatar}
              className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center text-2xl ${
                me.avatarType === avatar ? "border-primary bg-primary/10" : "border-border"
              }`}
            >
              {avatarMap[avatar]}
            </div>
          ))}
        </div>
      </div>

<<<<<<< HEAD
      <div>
        <h2 className="text-xl font-extrabold mb-3">Achievements</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ACHIEVEMENTS.map((a) => {
            const got = a.check(state);
            return (
              <div
                key={a.id}
                className={`rounded-2xl border-2 p-4 flex items-center gap-3 ${got ? "border-primary bg-primary/5" : "border-border bg-card opacity-60"}`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${got ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                >
                  <Star className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">{a.label}</p>
                  <p className="text-xs text-muted-foreground">{got ? "Unlocked" : "Locked"}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
=======
      {/* PET CARD */}
      {me.pet && (
        <div className="rounded-3xl border-2 border-border bg-card p-6">
          <h2 className="text-xl font-extrabold mb-4">My Pet</h2>
>>>>>>> 40376e2 (UI of choose pet)

          <div className="space-y-2">
            <p>
              <strong>Name:</strong> {me.pet.name}
            </p>

            <p>
              <strong>Species:</strong> {me.pet.species}
            </p>

            <p>
              <strong>Level:</strong> {me.pet.level}
            </p>

            <p>
              <strong>EXP:</strong> {me.pet.exp}
            </p>

            <p>
              <strong>Stage:</strong> {me.pet.stage}
            </p>

            <p>
              <strong>Energy:</strong> {me.pet.energy}
            </p>

            <p>
              <strong>Happiness:</strong> {me.pet.happiness}
            </p>
          </div>
        </div>
      )}

      <Button variant="outline">Edit Profile</Button>
    </div>
  );
}

function Tile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
<<<<<<< HEAD
    <div className="rounded-2xl border-2 border-border bg-card p-3 ]">
      <div className="flex items-center gap-1 text-xs font-bold text-muted-foreground uppercase">
        {icon}
        {label}
      </div>
=======
    <div className="rounded-2xl border-2 border-border bg-card p-3">
      <div className="flex items-center gap-1 text-xs font-bold uppercase text-muted-foreground">
        {icon}
        {label}
      </div>

>>>>>>> 40376e2 (UI of choose pet)
      <p className="text-2xl font-extrabold mt-1">{value}</p>
    </div>
  );
}
