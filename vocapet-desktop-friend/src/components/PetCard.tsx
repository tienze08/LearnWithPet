import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Pet, getStageName } from "./Pet";
import { useGame, stageForLevel } from "@/lib/store";
import { Sparkles, Star, Zap } from "lucide-react";
import PetCanvas from "./PixiPet/PixiPet";

const CONFETTI_COLORS = [
  "#22c55e",
  "#f59e0b",
  "#3b82f6",
  "#ef4444",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
];

function Confetti() {
  const pieces = Array.from({ length: 32 });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.3;
        const dur = 1.4 + Math.random() * 0.9;
        const rot = Math.random() * 360;
        const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
        return (
          <motion.span
            key={i}
            initial={{ y: -20, x: `${left}%`, rotate: 0, opacity: 1 }}
            animate={{ y: 260, rotate: rot, opacity: 0 }}
            transition={{ duration: dur, delay, ease: "easeIn" }}
            className="absolute top-0 w-2 h-3 rounded-sm"
            style={{ background: color }}
          />
        );
      })}
    </div>
  );
}

export function PetCard() {
  const { state } = useGame();
  const stage = stageForLevel(state.petLevel);
  const prevLevel = useRef(state.petLevel);
  const prevStage = useRef(stage);

  const [levelUp, setLevelUp] = useState(false);
  const [evolving, setEvolving] = useState(false);
  const [unlockToast, setUnlockToast] = useState<string | null>(null);

  useEffect(() => {
    if (state.petLevel > prevLevel.current) {
      setLevelUp(true);
      const t = setTimeout(() => setLevelUp(false), 2200);
      const newStage = stageForLevel(state.petLevel);
      if (newStage > prevStage.current) {
        setEvolving(true);
        setTimeout(() => setEvolving(false), 2400);
        const name = getStageName(state.petVariant, newStage);
        setUnlockToast(name);
        setTimeout(() => setUnlockToast(null), 3600);
        prevStage.current = newStage;
      }
      prevLevel.current = state.petLevel;
      return () => clearTimeout(t);
    }
  }, [state.petLevel, state.petVariant]);

  const pct = Math.min(100, Math.round((state.petExp / Math.max(1, state.expToNextLevel)) * 100));
  const stageName = getStageName(state.petVariant, stage);

  return (
    <div className="relative rounded-3xl border-2 border-border from-primary/10 via-card to-accent p-6 card-pop overflow-hidden">
      {/* screen flash */}
      <AnimatePresence>
        {levelUp && (
          <motion.div
            key="flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.85, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 bg-white pointer-events-none z-10"
          />
        )}
      </AnimatePresence>

      {levelUp && <Confetti />}

      <div className="flex flex-col md:flex-row items-center gap-6 relative">
        {/* Pet display with evolution glow */}
        <div className="relative w-60 h-60 flex items-center justify-center">
          <AnimatePresence>
            {(evolving || levelUp) && (
              <motion.div
                key="glow"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: [0.8, 1.5, 1.3], opacity: [0, 1, 0.6] }}
                exit={{ opacity: 0 }}
                transition={{ duration: evolving ? 2 : 1.2 }}
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, rgba(255,236,150,0.95) 0%, rgba(255,180,80,0.5) 40%, rgba(255,180,80,0) 75%)",
                  filter: "blur(6px)",
                }}
              />
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div
              key={`pet-${stage}-${state.petVariant}`}
              initial={
                evolving
                  ? { scale: 0.4, rotate: -180, opacity: 0, filter: "brightness(3)" }
                  : { opacity: 1 }
              }
              animate={
                evolving
                  ? {
                      scale: [0.4, 1.3, 1],
                      rotate: [-180, 0, 0],
                      opacity: 1,
                      filter: ["brightness(3)", "brightness(2)", "brightness(1)"],
                    }
                  : levelUp
                    ? { scale: [1, 1.15, 1] }
                    : { scale: 1 }
              }
              transition={{ duration: evolving ? 1.8 : 0.7 }}
              className="relative z-10"
            >
              <PetCanvas variant={state.petVariant} mood={state.petMood} stage={stage} size={300} />
            </motion.div>
          </AnimatePresence>

          {/* Floating "LEVEL UP!" */}
          <AnimatePresence>
            {levelUp && (
              <motion.div
                key="lvlup"
                initial={{ y: 20, opacity: 0, scale: 0.6 }}
                animate={{ y: -40, opacity: 1, scale: 1 }}
                exit={{ y: -70, opacity: 0 }}
                transition={{ duration: 1.6 }}
                className="absolute top-2 left-1/2 -translate-x-1/2 z-20 text-center"
              >
                <p className="text-xl font-extrabold text-yellow-500 drop-shadow-[0_2px_0_rgba(0,0,0,0.25)]">
                  LEVEL UP!
                </p>
                <p className="text-2xl font-extrabold text-primary drop-shadow-[0_2px_0_rgba(0,0,0,0.25)]">
                  Lv {state.petLevel}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Stats */}
        <div className="flex-1 w-full">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground text-xs font-extrabold px-2.5 py-1">
              <Star className="w-3 h-3" /> Stage {stage}
            </span>
            <span className="text-xs font-bold text-muted-foreground uppercase">{stageName}</span>
          </div>

          <h2 className="text-3xl font-extrabold mt-1.5 flex items-center gap-2">
            {state.petName}
            <span className="inline-flex items-center gap-1 text-lg font-extrabold text-yellow-500">
              <Zap className="w-5 h-5 fill-yellow-400" /> Lv {state.petLevel}
            </span>
          </h2>
          <p className="text-sm text-muted-foreground capitalize">Mood: {state.petMood}</p>

          {/* RPG EXP bar */}
          <div className="mt-4">
            <div className="flex justify-between items-end text-xs font-bold mb-1.5">
              <span className="uppercase text-muted-foreground tracking-wide">EXP</span>
              <span className="tabular-nums text-foreground">
                {state.petExp} / {state.expToNextLevel}
              </span>
            </div>
            <div className="relative h-5 rounded-full border-2 border-border bg-muted overflow-hidden shadow-inner">
              <motion.div
                className="h-full rounded-full bg-linear-to-r from-yellow-400 via-amber-400 to-orange-500 relative"
                initial={false}
                animate={{ width: `${pct}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
              >
                <div className="absolute inset-0 bg-linear-to-b from-white/40 to-transparent" />
              </motion.div>
              {/* notches */}
              <div className="absolute inset-0 flex pointer-events-none">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="flex-1 border-r border-black/10 last:border-r-0" />
                ))}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {state.expToNextLevel - state.petExp} EXP to next level
              {stage < 3 && <> · Evolves at Lv {stage === 1 ? 5 : 10}</>}
            </p>
          </div>

          {/* Stage progression chips */}
          <div className="mt-4 flex items-center gap-2 text-[11px] font-bold">
            {[1, 2, 3].map((s) => {
              const reached = stage >= (s as 1 | 2 | 3);
              return (
                <div
                  key={s}
                  className={`flex-1 text-center px-2 py-1.5 rounded-lg border-2 ${
                    reached
                      ? "bg-primary/15 border-primary text-primary"
                      : "bg-muted/40 border-border text-muted-foreground"
                  }`}
                >
                  {getStageName(state.petVariant, s as 1 | 2 | 3)}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Unlock toast */}
      <AnimatePresence>
        {unlockToast && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="absolute top-3 right-3 z-30 rounded-2xl border-2 border-yellow-400 bg-yellow-50 text-yellow-900 px-3 py-2 shadow-lg flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-yellow-600" />
            <div className="text-xs">
              <p className="font-extrabold leading-tight">Your pet evolved!</p>
              <p className="font-bold leading-tight">{unlockToast} unlocked!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
