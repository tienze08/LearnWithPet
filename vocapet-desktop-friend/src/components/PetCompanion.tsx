import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useGame, stageForLevel, computePetMood, type PetMood } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { BookOpen, PencilLine, Sparkles, Target, X } from "lucide-react";
import { useAnswerQuizMutation, useRandomQuizMutation } from "@/hooks/queries/quiz.queries";
import { QuizAnswerResponse, QuizQuestionResponse } from "@/types/quiz";
import Pet, { PetHandle } from "./PixiPet/Pet";
import { PetAction } from "./PixiPet/AnimationController";
import { PetSpeechBubble } from "./PetSpeech";
import { speakPet } from "@/hooks/stores/petSpeech";
import { reactionFor } from "@/lib/pet/behavior";
import { petEvents } from "@/lib/pet/events";
import type { UserResponse } from "@/types/user";
import { useMeQuery } from "@/hooks/queries/user.queries";
import { useCompanionEventMutation, useCompanionPreferencesMutation, useCompanionStateQuery } from "@/hooks/queries/companion.queries";
import type { PetBehaviorResponse as ServerPetBehaviorResponse } from "@/types/pet";

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

const serverMood: Record<ServerPetBehaviorResponse["mood"], PetMood> = {
  HAPPY: "happy",
  SAD: "sad",
  CRYING: "crying",
  WAITING: "waiting",
};

function serverAction(action: ServerPetBehaviorResponse["action"]): PetAction {
  return action === "CRY" ? "SAD" : action;
}

export function PetCompanion() {
  const petRef = useRef<PetHandle>(null);
  const queryClient = useQueryClient();
  const { state, setPetInterval, recordAnswer } = useGame();
  const { data: me } = useMeQuery();
  const { data: companionState, refetch: refreshCompanionState } = useCompanionStateQuery(Boolean(me?.pet));
  const [reminder, setReminder] = useState(false);
  const [open, setOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [picked, setPicked] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [eventMood, setEventMood] = useState<PetMood | null>(null);
  const [interrupting, setInterrupting] = useState(false);
  const [isApproachingQuiz, setIsApproachingQuiz] = useState(false);
  const [petX, setPetX] = useState(24);
  const [viewportWidth, setViewportWidth] = useState(0);
  const lastActivityAt = useRef(Date.now());
  const interruptionInProgress = useRef(false);
  const quizArrivalInProgress = useRef(false);
  const walkInProgress = useRef(false);
  const petXRef = useRef(petX);
  const facingRef = useRef<"left" | "right">("left");

  const { mutateAsync: getQuiz } = useRandomQuizMutation();
  const { mutate: recordCompanionEvent } = useCompanionEventMutation();
  const { mutate: updateCompanionPreferences } = useCompanionPreferencesMutation();

  const triggerPetAnimation = (action: PetAction = "STUDY") => {
    window.requestAnimationFrame(() => {
      petRef.current?.play(action);
    });
  };

  const maxPetX = () => Math.max(24, window.innerWidth - 132);

  const movePetTo = (nextX: number, facing?: "left" | "right") => {
    const clampedX = Math.min(maxPetX(), Math.max(24, nextX));
    petXRef.current = clampedX;
    setPetX(clampedX);
    if (facing) {
      facingRef.current = facing;
      petRef.current?.setFacing(facing);
    }
  };

  /**
   * A quiz is initiated by the companion, rather than appearing as a sudden
   * system popup. The pet reaches the right edge first; the card then opens
   * above and to the left of it, fully inside the viewport.
   */
  const showQuizAtRight = (nextQuiz: QuizQuestionResponse) => {
    if (quizArrivalInProgress.current) return;

    quizArrivalInProgress.current = true;
    setReminder(false);
    setIsApproachingQuiz(true);
    movePetTo(maxPetX(), "right");
    triggerPetAnimation("WALK");

    window.setTimeout(() => {
      setQuiz(nextQuiz);
      setPicked(null);
      setAnswerResult(null);
      setOpen(true);
      setIsApproachingQuiz(false);
      quizArrivalInProgress.current = false;
      triggerPetAnimation("STUDY");
    }, 850);
  };

  const openPetQuiz = async () => {
    if (open || reminder || interrupting || quizArrivalInProgress.current) return;
    try {
      const nextQuiz = await getQuiz(undefined);
      showQuizAtRight(nextQuiz);
    } catch (error) {
      console.error("Pet click quiz failed", error);
      speakPet(`${state.petName}: Add a word to one of your decks, then we can practise together.`, 1, 4);
    }
  };

  const openCompanionOverview = () => {
    // A click is a gentle way to check in with the companion. Starting a quiz
    // remains an explicit choice from the overview (or a scheduled reminder).
    if (open || isApproachingQuiz) return;
    setReminder(false);
    setShowSettings((visible) => !visible);
  };

  const applyServerReaction = (reaction: ServerPetBehaviorResponse) => {
    setEventMood(serverMood[reaction.mood]);
    triggerPetAnimation(serverAction(reaction.action));
    if (reaction.message) {
      speakPet(`${state.petName}: ${reaction.message}`, reaction.priority, reaction.duration);
    }
    window.setTimeout(() => setEventMood(null), reaction.duration * 1000);
  };

  useEffect(() => {
    if (!me?.id || !me.pet) return;
    recordCompanionEvent("APP_OPENED", { onSuccess: (snapshot) => applyServerReaction(snapshot.reaction) });
  }, [me?.id]);

  useEffect(() => {
    const unsubscribe = petEvents.subscribe((event) => {
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
    return () => {
      unsubscribe();
    };
  }, [state.petName]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Start at the lower-right, then wander only while the companion is free.
    setViewportWidth(window.innerWidth);
    movePetTo(window.innerWidth - 132, "left");
    const keepOnScreen = () => {
      setViewportWidth(window.innerWidth);
      movePetTo(petXRef.current);
    };
    window.addEventListener("resize", keepOnScreen);
    return () => window.removeEventListener("resize", keepOnScreen);
  }, []);

  useEffect(() => {
    if (open || reminder || showSettings || interrupting || typeof window === "undefined") return;

    let finishWalkTimer: number | undefined;
    const walkTimer = window.setTimeout(() => {
      if (walkInProgress.current) return;

      walkInProgress.current = true;
      // Determine the direction from the actual current position. This is
      // more reliable than a stale direction flag after a quiz interrupts a
      // route: an edge arrival always turns around for the next trip.
      const atRightEdge = petXRef.current >= maxPetX() - 2;
      const nextX = atRightEdge ? 24 : maxPetX();
      const direction = atRightEdge ? "left" : "right";
      movePetTo(nextX, direction);
      triggerPetAnimation("WALK");

      finishWalkTimer = window.setTimeout(() => {
        triggerPetAnimation("IDLE");
        const nextDirection = direction === "right" ? "left" : "right";
        facingRef.current = nextDirection;
        // Store the turned direction immediately so the next authored walk
        // row is the opposite row, never a backwards slide.
        petRef.current?.setFacing(nextDirection);
        walkInProgress.current = false;
      }, 6200);
    }, 6000);

    return () => {
      window.clearTimeout(walkTimer);
      if (finishWalkTimer) window.clearTimeout(finishWalkTimer);
      walkInProgress.current = false;
    };
  }, [open, reminder, showSettings, interrupting]);

  useEffect(() => {
    const markActivity = () => {
      lastActivityAt.current = Date.now();
    };
    const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "scroll", "touchstart"];
    events.forEach((event) => window.addEventListener(event, markActivity, { passive: true }));
    return () => events.forEach((event) => window.removeEventListener(event, markActivity));
  }, []);

  useEffect(() => {
    if (reminder || open || typeof window === "undefined") return;

    let approachTimer: number | undefined;
    let invitationTimer: number | undefined;
    const timer = window.setTimeout(
      async () => {
        // A reminder is deliberately a simple countdown: it should fire even
        // while the companion settings panel is open or the user is active.
        const notificationsActive = companionState?.remindersEnabled ?? true;
        if (!notificationsActive) return;

        // A real reminder changes Pip's state; it never triggers an ambient,
        // context-free walk around the application.
        interruptionInProgress.current = true;
        setInterrupting(true);
        setEventMood("waiting");
        triggerPetAnimation("THINK");
        speakPet(`${state.petName}: Hmm...`, 1, 2);

        approachTimer = window.setTimeout(() => {
          triggerPetAnimation("THINK");
          speakPet(`${state.petName}: Hey! Quick question?`, 2, 3);
        }, 850);

        invitationTimer = window.setTimeout(async () => {
          try {
            const nextQuiz = await getQuiz(undefined);
            showQuizAtRight(nextQuiz);
          } catch (error) {
            console.error("Pet reminder quiz failed", error);
            speakPet(`${state.petName}: Let's review a word when you're ready.`, 1, 4);
          } finally {
            setInterrupting(false);
            interruptionInProgress.current = false;
          }
        }, 2100);
        return;

        const remindersEnabled = companionState?.remindersEnabled ?? true;
        if (!remindersEnabled || interruptionInProgress.current) return;

        interruptionInProgress.current = true;
        setInterrupting(true);
        setEventMood("waiting");
        triggerPetAnimation("THINK");
        speakPet(`${state.petName}: Hmm…`, 1, 2);

        approachTimer = window.setTimeout(() => {
          triggerPetAnimation("WALK");
          speakPet(`${state.petName}: I have a quick question for you.`, 1, 3);
        }, 900);

        invitationTimer = window.setTimeout(() => {
          triggerPetAnimation("IDLE");
          setReminder(true);
          setInterrupting(false);
          interruptionInProgress.current = false;
          speakPet(`${state.petName}: Hey! Quick question?`, 2, 5);
        }, 2300);
        return;
        try {
          petEvents.emit({ type: "REMINDER_TRIGGERED" });
          setReminder(true);
        } catch (e) {
          // Không có quiz hoặc lỗi
        }
      },
      state.popupIntervalMin * 60 * 1000,
    );

    return () => {
      window.clearTimeout(timer);
      if (approachTimer) window.clearTimeout(approachTimer);
      if (invitationTimer) window.clearTimeout(invitationTimer);
    };
  }, [open, reminder, state.popupIntervalMin, companionState?.remindersEnabled, state.petName]);

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
    if (!open && !reminder && !showSettings && !interrupting) {
      triggerPetAnimation("IDLE");
    }
  }, [open, reminder, showSettings, interrupting]);

  useEffect(() => {
    const notes = [
      "Tiny review, big progress!",
      "I saved a word for us to practice.",
      "One question at a time — you've got this.",
      "Want to make your streak sparkle today?",
    ];
    // Ask the behavior engine periodically. It may choose to stay quiet; unlike
    // the previous implementation, this never chooses a random line locally.
    const id = window.setInterval(() => {
      if (!open && !reminder) {
        void refreshCompanionState().then(({ data }) => {
          if (data?.reaction.message) applyServerReaction(data.reaction);
        });
      }
    }, 90_000);
    void notes;
    return () => window.clearInterval(id);
  }, [open, reminder, refreshCompanionState]);

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
    }).catch((error) => {
      console.error("Quiz answer failed", error);
      speakPet(`${state.petName}: I couldn't check that answer. Please try again.`, 2, 4);
      window.setTimeout(() => {
        setOpen(false);
        setPicked(null);
        setAnswerResult(null);
      }, 1400);
      return null;
    });

    if (!result) return;

      setAnswerResult(result);
      recordAnswer(String(quiz.vocabularyId), result.correct, { xp: result.xp, coin: result.coin });
      queryClient.setQueryData<UserResponse>(["me"], (currentUser) =>
        currentUser
          ? {
              ...currentUser,
              xp: currentUser.xp + result.xp,
              totalXp: currentUser.totalXp + result.xp,
              coin: currentUser.coin + result.coin,
            }
          : currentUser,
      );
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["achievements", "me"] }),
        queryClient.invalidateQueries({ queryKey: ["me"] }),
      ]);

    // Show the result immediately. Server-side companion memory may return a
    // message afterwards, but it must not make a correct answer look like an
    // idle/wave action instead of the authored jump.
    applyServerReaction(result.petBehavior);
    triggerPetAnimation(result.correct ? "CELEBRATE" : "SAD");
    recordCompanionEvent(result.correct ? "ANSWER_CORRECT" : "ANSWER_WRONG", {
      onSuccess: (snapshot) => {
        applyServerReaction(snapshot.reaction);
        triggerPetAnimation(result.correct ? "CELEBRATE" : "SAD");
      },
      onError: () => {
        // The companion event is optional: quiz feedback must not be blocked by it.
      },
    });

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
  // The quiz is 320px wide. Keep the entire companion group inside the
  // viewport when it opens instead of letting a right-edge pet clip the card.
  const overlayX = open || reminder || showSettings
    ? Math.max(16, viewportWidth - 344)
    : petX;
  const isOverlayOpen = open || reminder || showSettings;

  return (
    <motion.div
      className="fixed bottom-6 left-0 z-40 flex flex-col items-end gap-2 pointer-events-none"
      animate={{ x: overlayX }}
      transition={{ type: "tween", ease: "easeInOut", duration: isApproachingQuiz ? 0.8 : isOverlayOpen ? 0.25 : 6 }}
    >
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
                  try {
                    const quiz = await getQuiz(undefined);
                    showQuizAtRight(quiz);
                  } catch (error) {
                    console.error("Reminder quiz failed", error);
                  }
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
                {answerResult === null ? (
                  <span className="text-muted-foreground">Checking your answer…</span>
                ) : answerResult.correct ? (
                  <span className="text-success">✨ Amazing! +{answerResult.xp} XP · +{answerResult.coin} 🪙</span>
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

          {companionState && (
            <div className="mb-3 rounded-xl border border-border bg-muted/40 p-2">
              <p className="text-xs font-semibold capitalize">
                Companion · {companionState.personality.toLowerCase()} · Energy {companionState.energy}%
              </p>
              {companionState.daysTogether > 0 && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Together {companionState.daysTogether} days · {companionState.totalSessionsTogether} study moments
                </p>
              )}
              {companionState.frequentlyWrongWord && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Let's revisit: {companionState.frequentlyWrongWord}
                </p>
              )}
              {companionState.learningProfile?.weakestTopic && (
                <div className="mt-1">
                  <p className="text-[11px] text-muted-foreground">
                    Focus next: {companionState.learningProfile.weakestTopic}
                    {companionState.learningProfile.averageQuizScore > 0
                      ? ` (${companionState.learningProfile.averageQuizScore}% recent accuracy)`
                      : ""}
                  </p>
                  {companionState.learningProfile.weakestDeckId && (
                    <button
                      className="mt-1 text-xs font-medium text-primary hover:underline"
                      onClick={async () => {
                        try {
                          const quiz = await getQuiz(companionState.learningProfile.weakestDeckId!);
                          setShowSettings(false);
                          showQuizAtRight(quiz);
                        } catch (error) {
                          console.error("Weak-topic quiz failed", error);
                          speakPet(`${state.petName}: I couldn't prepare that practice set yet.`, 1, 4);
                        }
                      }}
                    >
                      Practice {companionState.learningProfile.weakestTopic}
                    </button>
                  )}
                </div>
              )}
              {companionState.learningProfile?.totalStudyMinutes > 0 && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  We have studied {companionState.learningProfile.totalStudyMinutes} minutes together.
                </p>
              )}
              <button
                className="mt-1 text-xs font-medium text-primary hover:underline"
                onClick={() => updateCompanionPreferences({ remindersEnabled: !companionState.remindersEnabled })}
              >
                {companionState.remindersEnabled ? "Pause companion reminders" : "Turn on companion reminders"}
              </button>
            </div>
          )}
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
                  const quiz = await getQuiz(undefined);
                  showQuizAtRight(quiz);
                } catch (e) {
                  console.error(e);
                  speakPet(`${state.petName}: Add a word to one of your decks, then we can practise together.`, 1, 5);
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
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <PetSpeechBubble />

        <div
          role="button"
          tabIndex={0}
          aria-label="Open companion overview"
          onClick={openCompanionOverview}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openCompanionOverview();
            }
          }}
          className="select-none cursor-pointer p-0 transition-transform hover:scale-[1.03]"
        >
          <div className="flex h-24 w-24 items-center justify-center">
            <Pet
              ref={petRef}
              variant={state.petVariant}
              stage={stageForLevel(state.petLevel)}
              size={104}
              mood={visibleMood}
            />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
