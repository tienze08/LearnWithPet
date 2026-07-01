import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { Pet } from "./Pet";
import { useGame, stageForLevel, computePetMood, type PetMood } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { BookOpen, PencilLine, Sparkles, Target, X } from "lucide-react";
import type { Word } from "@/lib/vocab-seed";

function pickQuiz(words: Word[]) {
  if (words.length < 4) return null;
  const target = words[Math.floor(Math.random() * words.length)];
  const distractorsPool = words.filter((w) => w.id !== target.id);
  const distractors: Word[] = [];
  while (distractors.length < 3 && distractorsPool.length) {
    const i = Math.floor(Math.random() * distractorsPool.length);
    distractors.push(distractorsPool.splice(i, 1)[0]);
  }
  const options = [target, ...distractors]
    .sort(() => Math.random() - 0.5)
    .map((w) => ({ id: w.id, text: w.meaning }));
  return { target, options };
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const MOOD_META: Record<PetMood, { emoji: string; label: string; tone: string }> = {
  sad: { emoji: "😢", label: "Sad", tone: "text-destructive" },
  waiting: { emoji: "😐", label: "Waiting", tone: "text-muted-foreground" },
  happy: { emoji: "😊", label: "Happy", tone: "text-success" },
  excited: { emoji: "🤩", label: "Excited", tone: "text-primary" },
  sleepy: { emoji: "😴", label: "Sleepy", tone: "text-info" },
};

function reminderFor(mood: PetMood, name: string, goal: number, progress: number) {
  switch (mood) {
    case "sad":
      return `${name}: You haven't reviewed today… Let's do ${Math.min(5, goal)} words ❤️`;
    case "waiting":
      return `${name}: Nice start! ${progress}/${goal} done — keep going!`;
    case "happy":
      return `${name}: Daily goal smashed 🎉 One more quiz?`;
    case "excited":
      return `${name}: You're on fire 🔥 Ready for a challenge?`;
    default:
      return `${name}: Ready to learn?`;
  }
}

export function PetCompanion() {
  const { state, recordAnswer, setPetInterval } = useGame();
  const [reminder, setReminder] = useState(false);
  const [open, setOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [picked, setPicked] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const quiz = useMemo(() => (open ? pickQuiz(state.words) : null), [open, state.words]);
  const studiedToday = state.lastStudyDate === todayISO();
  const liveMood = computePetMood({
    reviewsToday: state.dailyDate === todayISO() ? state.dailyProgress : 0,
    dailyGoal: state.dailyGoal,
    streak: state.streak,
    studiedToday,
  });
  const moodMeta = MOOD_META[state.petMood] ?? MOOD_META.waiting;

  // schedule reminder bubble; auto-promote to quiz after a few seconds
  useEffect(() => {
    const id = setInterval(
      () => {
        setReminder((r) => r || !open);
      },
      Math.max(1, state.popupIntervalMin) * 60 * 1000,
    );
    return () => clearInterval(id);
  }, [state.popupIntervalMin, open]);

  // auto-open quiz a few seconds after reminder appears
  useEffect(() => {
    if (!reminder) return;
    const t = setTimeout(() => {
      setReminder(false);
      setOpen(true);
    }, 6000);
    return () => clearTimeout(t);
  }, [reminder]);

  // countdown
  useEffect(() => {
    if (!open || picked !== null) return;
    setTimeLeft(15);
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(id);
          handleAnswer(null);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, quiz?.target.id]);

  function handleAnswer(optionId: string | null) {
    if (!quiz) return;
    setPicked(optionId ?? "__timeout__");
    const correct = optionId === quiz.target.id;
    recordAnswer(quiz.target.id, correct);
    setTimeout(() => {
      setOpen(false);
      setPicked(null);
    }, 1600);
  }

  const reactionMood: PetMood =
    picked === null ? "waiting" : picked === quiz?.target.id ? "excited" : "sad";

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2 pointer-events-none">
      {/* Reminder speech bubble */}
      <AnimatePresence>
        {reminder && !open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="pointer-events-auto bg-card border-2 border-border rounded-2xl rounded-br-sm p-3 card-pop relative"
          >
            <button
              onClick={() => setReminder(false)}
              className="absolute -top-1 -right-1 bg-card border-2 border-border rounded-full p-0.5 text-muted-foreground"
              aria-label="Dismiss"
            >
              <X className="w-3 h-3" />
            </button>
            <p className="text-sm font-semibold leading-snug">
              {reminderFor(liveMood, state.petName, state.dailyGoal, state.dailyProgress)}
            </p>
            <div className="mt-2 flex gap-1.5">
              <Button
                size="sm"
                className="btn-pop h-7 text-xs"
                onClick={() => {
                  setReminder(false);
                  setOpen(true);
                }}
              >
                <Sparkles className="w-3 h-3 mr-1" /> Quiz me
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs border-2" asChild>
                <Link to="/app/decks" onClick={() => setReminder(false)}>
                  Review
                </Link>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quiz card pinned in corner */}
      <AnimatePresence>
        {open && quiz && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 240, damping: 20 }}
            className="pointer-events-auto w-[320px] bg-card rounded-3xl border-2 border-border p-4 card-pop relative"
          >
            <button
              onClick={() => {
                setOpen(false);
                setPicked(null);
              }}
              className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 mb-2">
              <Pet
                mood={reactionMood}
                variant={state.petVariant}
                stage={stageForLevel(state.petLevel)}
                size={44}
              />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase text-primary leading-tight">
                  Mini quiz!
                </p>
                <p className="text-xs text-muted-foreground leading-tight truncate">
                  What does it mean?
                </p>
              </div>
              <div
                className={`text-lg font-extrabold tabular-nums ${timeLeft <= 5 ? "text-destructive" : "text-foreground"}`}
              >
                {picked === null ? timeLeft : ""}
              </div>
            </div>
            <div className="text-center my-2">
              <p className="text-2xl font-extrabold tracking-tight">{quiz.target.word}</p>
              <p className="text-[10px] text-muted-foreground italic">{quiz.target.pos}</p>
            </div>
            <div className="grid gap-1.5">
              {quiz.options.map((opt) => {
                const isCorrect = opt.id === quiz.target.id;
                const isPicked = picked === opt.id;
                const showResult = picked !== null;
                return (
                  <button
                    key={opt.id}
                    onClick={() => picked === null && handleAnswer(opt.id)}
                    disabled={picked !== null}
                    className={`text-left text-xs p-2 rounded-lg border-2 transition-colors ${
                      showResult && isCorrect
                        ? "border-success bg-success/10 font-semibold"
                        : showResult && isPicked && !isCorrect
                          ? "border-destructive bg-destructive/10"
                          : "border-border hover:border-primary hover:bg-primary/5"
                    }`}
                  >
                    {opt.text}
                  </button>
                );
              })}
            </div>
            {picked !== null && (
              <p className="text-center mt-2 text-xs font-bold">
                {picked === quiz.target.id ? (
                  <span className="text-success">✨ Amazing! +10 XP · +5 🪙</span>
                ) : (
                  <span className="text-destructive">😅 Don't worry — we'll learn together.</span>
                )}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings popover */}
      {showSettings && !open && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="pointer-events-auto rounded-2xl border-2 border-border bg-card p-4 card-pop w-72"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="font-bold">{state.petName}</p>
            <button onClick={() => setShowSettings(false)} className="text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className={`text-xs font-semibold mb-1 ${moodMeta.tone}`}>
            {moodMeta.emoji} {moodMeta.label} · Lv {state.petLevel}
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            Today: {state.dailyProgress}/{state.dailyGoal} reviews · {state.streak}d streak
          </p>

          <p className="text-xs font-bold uppercase text-muted-foreground mb-1.5">Learn now</p>
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            <Button
              size="sm"
              variant="outline"
              className="h-auto flex-col py-2 border-2 text-xs"
              asChild
            >
              <Link to="/app/decks" onClick={() => setShowSettings(false)}>
                <BookOpen className="w-4 h-4 mb-0.5" /> Review
              </Link>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-auto flex-col py-2 border-2 text-xs"
              onClick={() => {
                setShowSettings(false);
                setOpen(true);
              }}
            >
              <PencilLine className="w-4 h-4 mb-0.5" /> Practice
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-auto flex-col py-2 border-2 text-xs"
              asChild
            >
              <Link to="/app/decks" onClick={() => setShowSettings(false)}>
                <Target className="w-4 h-4 mb-0.5" /> Challenge
              </Link>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mb-1">Remind me every…</p>
          <div className="flex gap-1">
            {[1, 5, 10, 20, 30].map((m) => (
              <button
                key={m}
                onClick={() => setPetInterval(m)}
                className={`flex-1 text-xs py-1 rounded-md border-2 ${state.popupIntervalMin === m ? "border-primary bg-primary/10 font-bold" : "border-border"}`}
              >
                {m}m
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Floating pet button */}
      <button
        onClick={() => setShowSettings((v) => !v)}
        className="pointer-events-auto rounded-full bg-card border-2 border-border p-2 card-pop hover:scale-105 transition-transform"
        aria-label="Open pet"
      >
        <Pet
          mood={state.petMood}
          variant={state.petVariant}
          stage={stageForLevel(state.petLevel)}
          size={64}
        />
      </button>
    </div>
  );
}
