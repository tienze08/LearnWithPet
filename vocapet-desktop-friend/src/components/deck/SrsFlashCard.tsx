import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import { speak } from "./speak";

import {
  useFinishStudySessionMutation,
  useNextStudyCardQuery,
  useReviewStudyCardMutation,
  useStartStudySessionMutation,
} from "@/hooks/queries/study-session.queries";
import StreakPopup from "./StreakPopup";

interface Props {
  deckId: number;
}

const RATINGS = [
  {
    label: "Again",
    value: "AGAIN" as const,
    className: "bg-red-500 hover:bg-red-600 text-white",
  },
  {
    label: "Hard",
    value: "HARD" as const,
    className: "bg-orange-500 hover:bg-orange-600 text-white",
  },
  {
    label: "Good",
    value: "GOOD" as const,
    className: "bg-primary text-primary-foreground",
  },
  {
    label: "Easy",
    value: "EASY" as const,
    className: "bg-sky-500 hover:bg-sky-600 text-white",
  },
];

export default function StudySessionFlashcards({ deckId }: Props) {
  console.log("SrsFlashCard render");
  const [started, setStarted] = useState(false);

  const [sessionId, setSessionId] = useState<number | null>(null);

  const [flipped, setFlipped] = useState(false);
  const [showStreak, setShowStreak] = useState(false);
  const [streak, setStreak] = useState(0);

  const startMutation = useStartStudySessionMutation();
  const finishMutation = useFinishStudySessionMutation();
  const [finished, setFinished] = useState(false);

  const { data, isLoading } = useNextStudyCardQuery(sessionId);

  const reviewMutation = useReviewStudyCardMutation(sessionId ?? 0);

  useEffect(() => {
    if (started && sessionId && !isLoading && data === null && !finished) {
      finishMutation.mutate(sessionId);
      setFinished(true);
    }
  }, [started, sessionId, isLoading, data, finished, finishMutation]);

  useEffect(() => {
    setFlipped(false);
  }, [data]);

  if (!started) {
    return (
      <div className="max-w-xl mx-auto rounded-3xl border-2 border-border bg-card p-10 text-center">
        <h2 className="text-3xl font-bold">Ready to study?</h2>

        <p className="mt-3 text-muted-foreground">Review today's due cards with FSRS.</p>

        <Button
          className="mt-8 w-full h-12"
          onClick={startSession}
          disabled={startMutation.isPending}
        >
          {startMutation.isPending ? "Starting..." : "Start Study"}
        </Button>
      </div>
    );
  }

  const streakPopup = (
    <StreakPopup open={showStreak} streak={streak} onClose={() => setShowStreak(false)} />
  );

  if (finished) {
    return (
      <>
        {streakPopup}
        <div className="max-w-xl mx-auto rounded-3xl border-2 border-border bg-card p-10 text-center">
          <div className="text-6xl">🎉</div>

          <h2 className="mt-4 text-3xl font-extrabold">Finished!</h2>

          <p className="mt-3 text-muted-foreground">
            You have finished all vocabulary in this study session.
          </p>

          <Button variant="outline" className="mt-8 w-full h-12" disabled>
            Reset Progress (Coming Soon)
          </Button>
        </div>
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        {streakPopup}
        <div className="text-center py-12">Loading...</div>
      </>
    );
  }

  if (!data) {
    return null;
  }

  async function startSession() {
    const session = await startMutation.mutateAsync({
      deckId,
    });

    setSessionId(session.sessionId);
    setStarted(true);
  }

  async function review(rating: "AGAIN" | "HARD" | "GOOD" | "EASY") {
    if (!data) return;

    const result = await reviewMutation.mutateAsync({
      vocabularyId: data.vocabularyId,
      rating,
    });

    console.log(result);

    if (result.streakUpdated) {
      setStreak(result.currentStreak);
      setShowStreak(true);
    }
  }

  return (
    <>
      <StreakPopup open={showStreak} streak={streak} onClose={() => setShowStreak(false)} />

      <div className="max-w-xl mx-auto space-y-4">
        <div onClick={() => setFlipped((f) => !f)} className="cursor-pointer">
          <AnimatePresence mode="wait">
            <motion.div
              key={data.vocabularyId + (flipped ? "-back" : "-front")}
              initial={{
                opacity: 0,
                y: 12,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                y: -12,
              }}
              className="
            relative
            rounded-3xl
            border-2
            border-border
            bg-card
            p-8
            aspect-4/3
            min-h-420px
            card-pop
            flex
            flex-col
            items-center
            justify-center
            text-center
            "
            >
              {!flipped ? (
                <>
                  <p className="text-xs italic text-muted-foreground">{data.partOfSpeech}</p>

                  <h2 className="text-4xl font-extrabold mt-2">{data.word}</h2>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      speak(data.word);
                    }}
                    className="mt-4"
                  >
                    <Volume2 className="h-6 w-6" />
                  </button>

                  <p className="mt-5 text-xs text-muted-foreground">Click to reveal</p>
                </>
              ) : (
                <>
                  <h2 className="text-3xl font-bold">{data.meaning}</h2>

                  <p className="mt-4 italic text-muted-foreground">"{data.example}"</p>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {flipped ? (
          <div className="grid grid-cols-4 gap-2">
            {RATINGS.map((rating) => (
              <Button
                key={rating.value}
                onClick={() => review(rating.value)}
                className={rating.className}
              >
                {rating.label}
              </Button>
            ))}
          </div>
        ) : (
          <Button className="w-full" onClick={() => setFlipped(true)}>
            Show Answer
          </Button>
        )}
      </div>
    </>
  );
}
