import { usePetSpeech } from "@/hooks/stores/petSpeech";
import { AnimatePresence, motion } from "framer-motion";

type PetSpeechBubbleProps = {
  /** The speech bubble opens away from the closest viewport edge. */
  align?: "left" | "right";
};

export function PetSpeechBubble({ align = "right" }: PetSpeechBubbleProps) {
  const speech = usePetSpeech((s) => s.speech);

  return (
    <AnimatePresence>
      {speech && (
        <motion.div
          key={speech.message}
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8 }}
          className={`absolute bottom-full z-50 mb-3 w-72 max-w-[calc(100vw-2rem)] ${
            align === "left" ? "left-0" : "right-0"
          }`}
        >
          <div className="relative rounded-2xl border border-border bg-popover px-4 py-3 shadow-lg">
            <p className="text-sm font-semibold leading-6 break-words">{speech.message}</p>

            <div
              className={`absolute -bottom-2
                        w-4 h-4 rotate-45
                        bg-popover border-r border-b border-border ${
                          align === "left" ? "left-8" : "right-8"
                        }`}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
