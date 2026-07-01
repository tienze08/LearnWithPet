// components/PetSpeech.tsx

import { motion, AnimatePresence } from "framer-motion";
import { useMemo } from "react";
import { useGame } from "@/lib/store";

const SAD_MESSAGES = [
  "I miss our lesson today... 😢",
  "One quick review would cheer me up.",
  "You haven't studied yet today — let's start with 5 words.",
];

const WAITING_MESSAGES = [
  "I'm ready when you are 🙂",
  "A short review would make me smile.",
  "Let's keep the streak alive together.",
];

const HAPPY_MESSAGES = [
  "You made me happy today! 😊",
  "Nice work — your pet is glowing with progress ✨",
  "A few more words and we are on a roll.",
];

const EXCITED_MESSAGES = [
  "Daily goal unlocked! ✨",
  "You're unstoppable — keep going!",
  "Today's learning streak is shining!",
];

export function PetSpeech() {
  const { state } = useGame();

  const message = useMemo(() => {
    if (state.petMood === "excited") {
      return EXCITED_MESSAGES[state.petLevel % EXCITED_MESSAGES.length];
    }

    if (state.petMood === "happy") {
      return HAPPY_MESSAGES[state.streak % HAPPY_MESSAGES.length];
    }

    if (state.petMood === "waiting") {
      return WAITING_MESSAGES[state.level % WAITING_MESSAGES.length];
    }

    return SAD_MESSAGES[state.level % SAD_MESSAGES.length];
  }, [state.petMood, state.petLevel, state.level, state.streak]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={message}
        initial={{
          opacity: 0,
          y: 10,
          scale: 0.9,
        }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
        }}
        exit={{
          opacity: 0,
          y: -8,
          scale: 0.95,
        }}
        transition={{
          duration: 0.25,
        }}
        className="absolute -top-16 left-1/2 -translate-x-1/2"
      >
        <div className="relative rounded-2xl bg-white dark:bg-zinc-800 border-2 border-border shadow-xl px-4 py-3">
          <p className="text-sm font-semibold text-center leading-snug">{message}</p>

          {/* bubble tail */}
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-4 h-4 bg-white dark:bg-zinc-800 border-r-2 border-b-2 border-border rotate-45" />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
