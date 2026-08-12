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
          className="absolute bottom-full right-0 z-50 mb-3 w-72 max-w-[calc(100vw-2rem)]"
        >
          <div className="relative rounded-2xl border border-border bg-popover px-4 py-3 shadow-lg">
            <p className="text-sm font-semibold leading-6 break-words">{speech.message}</p>

            <div
              className="absolute right-8 -bottom-2
                        w-4 h-4 rotate-45
                        bg-popover border-r border-b border-border"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
