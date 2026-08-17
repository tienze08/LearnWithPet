import { Pet, PET_VARIANTS } from "@/components/PixiPet/Pet";
import { useGame } from "@/lib/store";
import type { GameState, PetVariant } from "@/lib/store";
import { Lock, Check } from "lucide-react";
import { useMeQuery } from "@/hooks/queries/user.queries";
import { useSelectPetMutation, useUnlockedPetsQuery } from "@/hooks/queries/pet.queries";

const SPECIES_STYLE: Record<PetVariant, { emoji: string; tint: string }> = {
  CAT: { emoji: "🐱", tint: "from-slate-100 to-slate-200" },
  FOX: { emoji: "🦊", tint: "from-orange-100 to-amber-100" },
  BUNNY: { emoji: "🐰", tint: "from-pink-100 to-rose-100" },
  PANDA: { emoji: "🐼", tint: "from-zinc-100 to-slate-100" },
  DRAGON: { emoji: "🐲", tint: "from-violet-100 to-purple-100" },
  PUPU: { emoji: "🐱", tint: "from-amber-100 to-yellow-100" },
};

export type PetSpeciesUnlock = {
  id: PetVariant;
  requirement: string;
  isUnlocked: (s: GameState) => boolean;
};

export const PET_UNLOCKS: PetSpeciesUnlock[] = [
  { id: "CAT", requirement: "Starter companion", isUnlocked: () => true },
  { id: "FOX", requirement: "Reach level 3", isUnlocked: (s) => s.level >= 3 },
  { id: "BUNNY", requirement: "Maintain a 5-day streak", isUnlocked: (s) => s.streak >= 5 },
  { id: "PANDA", requirement: "Reach level 5", isUnlocked: (s) => s.level >= 5 },
  {
    id: "DRAGON",
    requirement: "Master 10 words",
    isUnlocked: (s) => Object.values(s.masteryByWord).filter((m) => m >= 4).length >= 10,
  },
  { id: "PUPU", requirement: "Reach level 2", isUnlocked: (s) => s.level >= 2 },
];

export function PetSpecies() {
  const { state, setState } = useGame();
  const { data: me } = useMeQuery();
  const { data: unlockedPets = [] } = useUnlockedPetsQuery();
  const selectPetMutation = useSelectPetMutation();
  const unlockedSpecies = new Set(unlockedPets.map((pet) => pet.species));
  // CAT is the starter pet. The rest must come from the user's own unlock records,
  // rather than from locally cached XP/streak data shared by the browser.
  unlockedSpecies.add("CAT");
  const unlockedCount = unlockedSpecies.size;
  const activeSpecies = me?.pet?.species ?? state.petVariant;

  const selectPet = (species: PetVariant) => {
    if (!unlockedSpecies.has(species) || selectPetMutation.isPending) return;

    selectPetMutation.mutate(species, {
      onSuccess: () => setState((current) => ({ ...current, petVariant: species })),
    });
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-3">
        <div>
          <h2 className="text-xl font-extrabold">Pet collection</h2>
          <p className="text-sm text-muted-foreground">Unlock new species as you learn.</p>
        </div>
        <p className="text-sm font-bold text-muted-foreground">
          {unlockedCount} / {PET_UNLOCKS.length}
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {PET_UNLOCKS.map((u) => {
          const meta = PET_VARIANTS.find((v) => v.id === u.id)!;
          const unlocked = unlockedSpecies.has(u.id);
          const active = activeSpecies === u.id;
          const style = SPECIES_STYLE[u.id];
          return (
            <button
              key={u.id}
              disabled={!unlocked}
              onClick={() => selectPet(u.id)}
              className={`relative rounded-2xl border-2 p-3 flex flex-col items-center text-center transition-transform ${
                unlocked ? "hover:scale-[1.03] cursor-pointer" : "cursor-not-allowed opacity-60"
              } ${active ? "border-primary bg-primary/10" : "border-border bg-card"}`}
            >
              {active && (
                <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <Check className="w-3.5 h-3.5" />
                </span>
              )}
              <div className={`relative rounded-2xl bg-linear-to-br ${style.tint} p-1`}>
                <Pet variant={u.id} size={72} />
                <span className="absolute -top-2 -left-2 rounded-full border-2 border-border bg-card px-1.5 py-0.5 text-sm">
                  {style.emoji}
                </span>
                {!unlocked && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-full">
                    <Lock className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
              </div>
              <p className="font-extrabold mt-2">{meta.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{meta.desc}</p>
              <p
                className={`text-[11px] font-bold mt-2 px-2 py-0.5 rounded-full ${
                  unlocked ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                }`}
              >
                {unlocked ? "Unlocked" : u.requirement}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
