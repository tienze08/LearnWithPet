import { usePetSpeech } from "@/hooks/stores/petSpeech";
import { AnimatePresence, motion } from "framer-motion";

export function PetSpeechBubble() {
  const speech = usePetSpeech((s) => s.speech);

  return (
    <AnimatePresence>
      {speech && (
        <motion.div
          key={speech.message}
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8 }}
          className="absolute -top-28 left-1/2 -translate-x-1/2"
        >
          <div className="relative rounded-2xl bg-card border-2 border-border shadow-xl px-4 py-3">
            <p className="text-sm font-semibold">{speech.message}</p>

            <div
              className="absolute left-1/2 -bottom-2
                        w-4 h-4 rotate-45
                        bg-card border-r-2 border-b-2 border-border"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
