import type { Vocabulary } from "@/types/vocabulary";
import { useMemo, useState } from "react";
import Empty from "./EmptyState";

interface QuizGameProps {
  words: Vocabulary[];
  allWords: Vocabulary[];
  onAnswer: (id: number, correct: boolean) => void;
}

export default function QuizGame({ words, allWords, onAnswer }: QuizGameProps) {
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);

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
    <div className="mx-auto max-w-xl rounded-3xl border-2 border-border bg-card p-6 card-pop">
      <p className="text-xs font-bold uppercase text-muted-foreground">Pick the meaning</p>

      <h2 className="my-6 text-center text-4xl font-extrabold">{question.target.word}</h2>

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

                setTimeout(() => {
                  setPicked(null);
                  setRound((r) => r + 1);
                }, 900);
              }}
              className={`rounded-xl border-2 p-3 text-left text-sm transition-colors ${
                picked !== null && isCorrect
                  ? "border-success bg-success/10 font-bold"
                  : picked !== null && isPicked && !isCorrect
                    ? "border-destructive bg-destructive/10"
                    : "border-border hover:border-primary"
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
