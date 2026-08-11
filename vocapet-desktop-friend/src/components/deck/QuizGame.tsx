import type { Vocabulary } from "@/types/vocabulary";
import { useEffect, useMemo, useState } from "react";
import Empty from "./EmptyState";
import { petEvents } from "@/lib/pet/events";

interface QuizGameProps {
  words: Vocabulary[];
  allWords: Vocabulary[];
  onAnswer: (id: number, correct: boolean) => void;
}

export default function QuizGame({ words, allWords, onAnswer }: QuizGameProps) {
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);

  useEffect(() => {
    petEvents.emit({ type: "QUIZ_STARTED" });
  }, []);

  const question = useMemo(() => {
    if (!words.length) return null;

    const target = words[Math.floor(Math.random() * words.length)];

    const pool = allWords.filter((word) => word.id !== target.id);

    const distractors: Vocabulary[] = [];

    while (distractors.length < 3 && pool.length > 0) {
      const randomIndex = Math.floor(Math.random() * pool.length);

      distractors.push(pool.splice(randomIndex, 1)[0]);
    }

    const options = [target, ...distractors].sort(() => Math.random() - 0.5);

    return {
      target,
      options,
    };
  }, [round, words, allWords]);

  if (!question) {
    return <Empty />;
  }

  return (
    <div className="mx-auto max-w-xl rounded-[2rem] border border-border bg-card/85 p-6 md:p-8 card-pop">
      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
        <span>Quick practice</span><span>Pick the meaning</span>
      </div>

      <h2 className="my-8 text-center text-4xl font-extrabold tracking-tight md:text-5xl">{question.target.word}</h2>

      <div className="grid gap-2">
        {question.options.map((option) => {
          const isCorrect = option.id === question.target.id;

          const isPicked = picked === option.id;

          return (
            <button
              key={option.id}
              disabled={picked !== null}
              onClick={() => {
                setPicked(option.id);

                onAnswer(question.target.id, isCorrect);
                petEvents.emit({ type: isCorrect ? "ANSWER_CORRECT" : "ANSWER_WRONG" });

                setTimeout(() => {
                  setPicked(null);
                  setRound((r) => r + 1);
                  petEvents.emit({ type: "QUIZ_COMPLETED" });
                }, 900);
              }}
              className={`rounded-xl border p-4 text-left text-sm font-medium transition-all ${
                picked !== null && isCorrect
                  ? "border-success bg-success/10 font-bold"
                  : picked !== null && isPicked && !isCorrect
                    ? "border-destructive bg-destructive/10"
                    : "border-border bg-card/70 hover:-translate-y-px hover:border-primary/60 hover:bg-primary/5"
              }`}
            >
              {option.meaning}
            </button>
          );
        })}
      </div>
    </div>
  );
}
