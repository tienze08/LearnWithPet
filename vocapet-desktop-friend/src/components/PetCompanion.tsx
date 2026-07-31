import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { useGame, stageForLevel, computePetMood, type PetMood } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { BookOpen, PencilLine, Sparkles, Target, X } from "lucide-react";
import { useAnswerQuizMutation, useRandomQuizMutation } from "@/hooks/queries/quiz.queries";
import { QuizAnswerResponse, QuizQuestionResponse } from "@/types/quiz";
import Pet, { PetHandle } from "./PixiPet/Pet";
import { useRef } from "react";
import { PetAction } from "./PixiPet/AnimationController";
import { PetSpeechBubble } from "./PetSpeech";
import { speakPet } from "@/hooks/stores/petSpeech";
import { reactionFor } from "@/lib/pet/behavior";
import { petEvents } from "@/lib/pet/events";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const MOOD_META: Record<PetMood, { emoji: string; label: string; tone: string }> = {
  crying: { emoji: "😭", label: "Missed the streak", tone: "text-destructive" },
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
  const petRef = useRef<PetHandle>(null);
  const { state, setPetInterval } = useGame();
  const [reminder, setReminder] = useState(false);
  const [open, setOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [picked, setPicked] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [eventMood, setEventMood] = useState<PetMood | null>(null);
  const [roamTarget, setRoamTarget] = useState({ x: 0, y: 0 });
  const roamSideRef = useRef<"left" | "right">("right");

  const { mutateAsync: getQuiz } = useRandomQuizMutation();

  const triggerPetAnimation = (action: PetAction = "STUDY") => {
    window.requestAnimationFrame(() => {
      petRef.current?.play(action);
    });
  };

  useEffect(() => {
    return petEvents.subscribe((event) => {
      const reaction = reactionFor(event);
      setEventMood(reaction.emotion);
      triggerPetAnimation(reaction.action);
      if (
        reaction.message &&
        event.type !== "ANSWER_CORRECT" &&
        event.type !== "ANSWER_WRONG"
      ) {
        speakPet(`${state.petName}: ${reaction.message}`, reaction.priority, 3);
      }
      window.setTimeout(() => setEventMood(null), 1800);
    });
  }, [state.petName]);

  useEffect(() => {
    const timer = setInterval(
      async () => {
        if (open) return;

        try {
          petEvents.emit({ type: "REMINDER_TRIGGERED" });
          setReminder(true);
        } catch (e) {
          // Không có quiz hoặc lỗi
        }
      },
      state.popupIntervalMin * 60 * 1000,
    );

    return () => clearInterval(timer);
  }, [open, state.popupIntervalMin]);

  const [quiz, setQuiz] = useState<QuizQuestionResponse | null>(null);
  const studiedToday = state.lastStudyDate === todayISO();
  const liveMood = computePetMood({
    reviewsToday: state.dailyDate === todayISO() ? state.dailyProgress : 0,
    dailyGoal: state.dailyGoal,
    streak: state.streak,
    studiedToday,
  });
  const moodMeta = MOOD_META[state.petMood] ?? MOOD_META.waiting;

  useEffect(() => {
    const canRoam = !open && !reminder && !showSettings;
    if (!canRoam || typeof window === "undefined") {
      setRoamTarget({ x: 0, y: 0 });
      triggerPetAnimation("IDLE");
      return;
    }

    let turnTimer: number | undefined;
    const chooseNextSpot = () => {
      const horizontalRoom = Math.min(340, Math.max(0, window.innerWidth - 170));
      const nextSide = roamSideRef.current === "right" ? "left" : "right";

      // Pause at each edge so the change is visibly a turn, rather than an
      // instant mirrored slide while the pet is already moving.
      triggerPetAnimation("IDLE");
      turnTimer = window.setTimeout(() => {
        roamSideRef.current = nextSide;
        petRef.current?.setFacing(nextSide);
        setRoamTarget({ x: nextSide === "left" ? -horizontalRoom : 0, y: 0 });
        triggerPetAnimation("WALK");
      }, 360);
    };

    chooseNextSpot();
    const id = window.setInterval(chooseNextSpot, 6000);
    return () => {
      window.clearInterval(id);
      if (turnTimer) window.clearTimeout(turnTimer);
    };
  }, [open, reminder, showSettings]);

  useEffect(() => {
    const notes = [
      "Tiny review, big progress!",
      "I saved a word for us to practice.",
      "One question at a time — you've got this.",
      "Want to make your streak sparkle today?",
    ];
    const id = setInterval(() => {
      if (!open && !reminder) {
        speakPet(`${state.petName}: ${notes[Math.floor(Math.random() * notes.length)]}`, 0, 4);
      }
    }, 90_000);
    return () => clearInterval(id);
  }, [open, reminder, state.petName]);

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
    // Reminders stay visible until the learner dismisses them or chooses an action.
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
  }, [open, quiz?.vocabularyId]);

  const { mutateAsync: answerQuiz } = useAnswerQuizMutation();

  const [answerResult, setAnswerResult] = useState<QuizAnswerResponse | null>(null);

  async function handleAnswer(answer: string | null) {
    if (!quiz) return;

    setPicked(answer);

    const result = await answerQuiz({
      vocabularyId: quiz.vocabularyId,
      answer: answer ?? "",
    });

    setAnswerResult(result);

    petEvents.emit({ type: result.correct ? "ANSWER_CORRECT" : "ANSWER_WRONG" });

    // Đợi người dùng xem kết quả
    setTimeout(() => {
      setOpen(false);
      setPicked(null);
      setAnswerResult(null);

      speakPet(
        result.petBehavior.message,
        result.petBehavior.priority,
        5, // hoặc Math.max(result.petBehavior.duration, 5)
      );
    }, 1800);
  }

  const reactionMood: PetMood =
    picked === null ? "waiting" : answerResult?.correct ? "happy" : "waiting";
  const visibleMood = eventMood ?? (open ? reactionMood : state.petMood);

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
                onClick={async () => {
                  const quiz = await getQuiz();
                  setQuiz(quiz);
                  setOpen(true);
                  triggerPetAnimation("STUDY");
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
            <div className="relative flex items-center gap-2 mb-2">
              <Pet
                ref={petRef}
                variant={state.petVariant}
                stage={stageForLevel(state.petLevel)}
                size={64}
                mood={visibleMood}
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
              <p className="text-2xl font-extrabold tracking-tight">{quiz.word}</p>
              <p className="text-[10px] text-muted-foreground italic">{quiz.partOfSpeech}</p>
            </div>
            <div className="grid gap-1.5">
              {quiz.options.map((option) => (
                <button
                  key={option}
                  onClick={() => picked === null && handleAnswer(option)}
                  disabled={picked !== null}
                >
                  {option}
                </button>
              ))}
            </div>
            {picked !== null && (
              <p className="text-center mt-2 text-xs font-bold">
                {answerResult?.correct ? (
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
              onClick={async () => {
                setShowSettings(false);

                try {
                  const quiz = await getQuiz();
                  setQuiz(quiz);
                  setOpen(true);
                  triggerPetAnimation("STUDY");
                } catch (e) {
                  console.error(e);
                }
              }}
            >
              <PencilLine className="w-4 h-4 mb-0.5" />
              Practice
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
      {/* Floating pet */}
      <motion.div
        className="relative pointer-events-auto"
        animate={roamTarget}
        transition={{ duration: 5.5, ease: "easeInOut" }}
      >
        <PetSpeechBubble />

        <button
          onClick={() => setShowSettings((v) => !v)}
          aria-label="Open pet"
          className="hover:scale-105 transition-transform"
        >
          <div className="w-20 h-20 flex items-center justify-center">
            <Pet
              ref={petRef}
              variant={state.petVariant}
              stage={stageForLevel(state.petLevel)}
              size={124}
              mood={visibleMood}
            />
          </div>
        </button>
      </motion.div>
    </div>
  );
}
