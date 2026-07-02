import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface Props {
  open: boolean;
  streak: number;
  onClose: () => void;
}

export default function StreakPopup({ open, streak, onClose }: Props) {
  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      onClose();
    }, 2500);

    return () => clearTimeout(timer);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{
            opacity: 0,
            y: -20,
            scale: 0.95,
          }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
          }}
          exit={{
            opacity: 0,
            y: -20,
            scale: 0.95,
          }}
          transition={{
            duration: 0.25,
          }}
          className="
            fixed
            top-6
            right-6
            z-9999
            rounded-2xl
            border
            bg-card
            px-5
            py-4
            shadow-xl
          "
        >
          <div className="flex items-center gap-3">
            <div className="text-3xl">🔥</div>

            <div>
              <p className="font-bold text-lg">{streak} Day Streak!</p>

              <p className="text-sm text-muted-foreground">Keep up the great work!</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
