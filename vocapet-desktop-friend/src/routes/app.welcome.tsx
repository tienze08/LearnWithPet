import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Pet, PET_VARIANTS } from "@/components/Pet";
import { type PetVariant } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Check } from "lucide-react";
import { useMeQuery, useOnboardingMutation } from "@/hooks/queries/user.queries";
import { isAuthenticated } from "@/lib/auth";
import { getMeApi } from "@/api/user.api";

export const Route = createFileRoute("/app/welcome")({
  beforeLoad: async () => {
    if (!isAuthenticated()) {
      throw redirect({
        to: "/login",
      });
    }

    const me = await getMeApi();

    if (me.onboarded) {
      throw redirect({
        to: "/app",
      });
    }
  },

  component: Welcome,
});

const avatarMap = {
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
} as const;
const AVATARS = Object.keys(avatarMap) as Array<keyof typeof avatarMap>;

function Welcome() {
  const { data: me } = useMeQuery();
  const nav = useNavigate();
  const [step, setStep] = useState<0 | 1>(0);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<keyof typeof avatarMap>("FOX");
  const [variant, setVariant] = useState<PetVariant>("leaf");
  const [petName, setPetName] = useState("Pip");

  const onboardingMutation = useOnboardingMutation();
  async function finish() {
    try {
      await onboardingMutation.mutateAsync({
        avatarType: avatar,
        petName,
        petColor: variant,
      });

      nav({
        to: "/app",
      });
    } catch (error: any) {}
  }

  useEffect(() => {
    if (!me) return;

    if (me.pet?.species) {
      setVariant(me.pet.species as PetVariant);
    }

    if (me.pet?.name) {
      setPetName(me.pet.name);
    }
  }, [me]);

  return (
    <div className="min-h-screen  from-primary/10 via-background to-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-3xl bg-card border-2 border-border rounded-3xl card-pop p-6 md:p-10"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 font-extrabold text-lg">
            <span className="text-2xl">🌱</span> VocaPet
          </div>
          <div className="flex gap-1.5">
            {[0, 1].map((i) => (
              <div
                key={i}
                className={`h-2 w-10 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
        </div>

        {step === 0 ? (
          <div className="grid md:grid-cols-[1fr_auto] gap-8 items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary">Step 1 of 2</p>
              <h1 className="text-3xl md:text-4xl font-extrabold mt-2">
                Welcome! What should we call you?
              </h1>
              <p className="text-muted-foreground mt-2">
                Your name and avatar appear on your profile and progress card.
              </p>

              <label className="block mt-6 text-xs font-bold uppercase text-muted-foreground">
                Display name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex"
                autoFocus
                className="mt-2 w-full px-4 py-3 rounded-xl border-2 border-border bg-background text-lg font-bold outline-none focus:border-primary"
              />

              <p className="mt-5 text-xs font-bold uppercase text-muted-foreground">
                Pick an avatar
              </p>
              <div className="mt-2 grid grid-cols-6 gap-2">
                {AVATARS.map((type) => (
                  <button
                    key={type}
                    onClick={() => setAvatar(type)}
                    className={avatar === type ? "border-primary" : ""}
                  >
                    {avatarMap[type]}
                  </button>
                ))}
              </div>

              <div className="mt-8 flex justify-end">
                <Button
                  onClick={() => setStep(1)}
                  disabled={!name.trim()}
                  size="lg"
                  className="btn-pop h-12 px-6"
                >
                  Next <ArrowRight className="w-5 h-5 ml-1" />
                </Button>
              </div>
            </div>

            <div className="hidden md:flex flex-col items-center gap-3">
              <div className="w-40 h-40 rounded-3xl bg-primary/10 border-2 border-border flex items-center justify-center text-7xl">
                {avatarMap[avatar as keyof typeof avatarMap]}
              </div>
              <p className="font-extrabold text-lg">{name.trim() || "Your name"}</p>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary">Step 2 of 2</p>
            <h1 className="text-3xl md:text-4xl font-extrabold mt-2">Pick your study buddy</h1>
            <p className="text-muted-foreground mt-2">
              This little friend will quiz you, grow with you, and keep your streak alive.
            </p>

            <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-3">
              {PET_VARIANTS.map((v) => {
                const selected = variant === v.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => setVariant(v.id)}
                    className={`relative p-3 rounded-2xl border-2 text-left transition-all ${
                      selected
                        ? "border-primary bg-primary/5 scale-[1.02]"
                        : "border-border bg-background hover:border-primary/40"
                    }`}
                  >
                    {selected && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                    <div className="flex justify-center">
                      <Pet variant={v.id} mood={selected ? "excited" : "happy"} size={84} />
                    </div>
                    <p className="font-extrabold text-center mt-2">{v.name}</p>
                    <p className="text-[11px] text-muted-foreground text-center leading-tight mt-0.5">
                      {v.desc}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="mt-6">
              <label className="block text-xs font-bold uppercase text-muted-foreground">
                Name your pet
              </label>
              <input
                value={petName}
                onChange={(e) => setPetName(e.target.value)}
                placeholder="e.g. Mochi"
                className="mt-2 w-full md:w-72 px-4 py-3 rounded-xl border-2 border-border bg-background text-lg font-bold outline-none focus:border-primary"
              />
            </div>

            <div className="mt-8 flex flex-col-reverse sm:flex-row justify-between gap-3">
              <Button variant="ghost" onClick={() => setStep(0)}>
                Back
              </Button>
              <Button onClick={finish} size="lg" className="btn-pop h-12 px-6">
                <Sparkles className="w-5 h-5 mr-1" /> Start learning
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
