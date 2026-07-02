import { useState } from "react";
import { motion } from "framer-motion";
import { Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import FlashSide from "./FlashSide";
import { speak } from "./speak";
import type { Vocabulary } from "@/types/vocabulary";
import Empty from "./EmptyState";

interface FlashcardsProps {
  words: Vocabulary[];
  onAnswer: (id: number, correct: boolean) => void;
}

export default function Flashcards({ words, onAnswer }: FlashcardsProps) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (!words.length) {
    return <Empty />;
  }

  const currentWord = words[index % words.length];

  const nextCard = (correct: boolean) => {
    onAnswer(currentWord.id, correct);
    setFlipped(false);
    setIndex((prev) => prev + 1);
  };

  return (
    <div className="mx-auto max-w-xl">
      <p className="mb-3 text-center text-sm text-muted-foreground">
        Card {(index % words.length) + 1} of {words.length}
      </p>

      <div className="perspective" onClick={() => setFlipped((prev) => !prev)}>
        <motion.div
          animate={{
            rotateY: flipped ? 180 : 0,
          }}
          transition={{
            duration: 0.5,
          }}
          className="relative w-full aspect-4/3 cursor-pointer"
          style={{
            transformStyle: "preserve-3d",
          }}
        >
          <FlashSide front>
            <h2 className="text-4xl font-extrabold">{currentWord.word}</h2>

            <p className="mt-2 text-xs italic text-muted-foreground">{currentWord.partOfSpeech}</p>

            <button
              onClick={(e) => {
                e.stopPropagation();
                speak(currentWord.word);
              }}
              className="mt-4 text-muted-foreground transition-colors hover:text-primary"
            >
              <Volume2 className="h-6 w-6" />
            </button>

            <p className="mt-4 text-xs text-muted-foreground">Tap to reveal</p>
          </FlashSide>

          <FlashSide back>
            <h2 className="text-2xl font-extrabold">{currentWord.meaning}</h2>

            <p className="mt-3 text-center text-sm italic text-muted-foreground">
              "{currentWord.example}"
            </p>
          </FlashSide>
        </motion.div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Button variant="outline" className="h-12 border-2" onClick={() => nextCard(false)}>
          Still learning
        </Button>

        <Button className="btn-pop h-12" onClick={() => nextCard(true)}>
          I know it
        </Button>
      </div>
    </div>
  );
}
