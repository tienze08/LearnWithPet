import { FormEvent, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import Empty from "./EmptyState";

import type { Vocabulary } from "@/types/vocabulary";

interface TypeGameProps {
  words: Vocabulary[];

  onAnswer: (id: number, correct: boolean) => void;
}

export default function TypeGame({ words, onAnswer }: TypeGameProps) {
  const [round, setRound] = useState(0);

  const [value, setValue] = useState("");

  const [result, setResult] = useState<boolean | null>(null);

  const currentWord = useMemo(() => {
    if (!words.length) return null;

    return words[Math.floor(Math.random() * words.length)];
  }, [round, words]);

  if (!currentWord) {
    return <Empty />;
  }

  const word = currentWord;

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (result !== null) return;

    const correct = value.trim().toLowerCase() === word.word.toLowerCase();

    setResult(correct);

    onAnswer(word.id, correct);

    setTimeout(() => {
      setValue("");

      setResult(null);

      setRound((prev) => prev + 1);
    }, 1100);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="
      mx-auto max-w-xl rounded-3xl
      border-2 border-border
      bg-card p-6 card-pop"
    >
      <p className="text-xs font-bold uppercase text-muted-foreground">Type the word</p>

      <p className="mt-3 text-lg">{word.meaning}</p>

      <p className="mt-1 text-xs italic text-muted-foreground">
        Hint ({word.partOfSpeech}
        ): {word.word.charAt(0)}
        ___
      </p>

      <Input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Your answer"
        className="mt-4 h-12 text-lg"
      />

      {result !== null && (
        <p
          className={`
          mt-2 font-bold
          ${result ? "text-success" : "text-destructive"}
          `}
        >
          {result ? "Correct!" : `Answer: ${word.word}`}
        </p>
      )}

      <Button type="submit" className="btn-pop mt-4 h-12 w-full">
        Check
      </Button>
    </form>
  );
}
