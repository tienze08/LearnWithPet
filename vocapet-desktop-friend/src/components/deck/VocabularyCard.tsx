import { Star, Trash2, Volume2 } from "lucide-react";

import { speak } from "./speak";
import EditWordDialog from "./EditWordDialog";

import type { Vocabulary } from "@/types/vocabulary";
import DeleteWordDialog from "./DeleteWorkDialog";

interface VocabularyCardProps {
  word: Vocabulary;

  mastery: number;

  bookmarked: boolean;

  toggleBookmark: (id: number) => void;

  updateWord: (id: number, patch: Partial<Vocabulary>) => void;

  deleteWord: (id: number) => void;
}

export default function VocabularyCard({
  word,

  mastery,

  bookmarked,

  toggleBookmark,

  updateWord,

  deleteWord,
}: VocabularyCardProps) {
  return (
    <div
      className="
      rounded-2xl
      border-2
      border-border
      bg-card
      p-4
      card-pop"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-2xl font-extrabold">{word.word}</h3>

          <p className="text-xs italic text-muted-foreground">{word.partOfSpeech}</p>

          <p className="text-xs text-muted-foreground">{word.difficulty}</p>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => speak(word.word)}
            className="
            text-muted-foreground
            hover:text-primary"
          >
            <Volume2 className="h-4 w-4 cursor-pointer" />
          </button>

          <button
            onClick={() => toggleBookmark(word.id)}
            className={bookmarked ? "text-coin" : "text-muted-foreground" + " cursor-pointer"}
          >
            <Star
              className={`
              h-4 w-4
              ${bookmarked ? "fill-current" : ""}
              `}
            />
          </button>

          <EditWordDialog word={word} onSave={(patch) => updateWord(word.id, patch)} />

          <DeleteWordDialog wordName={word.word} onConfirm={() => deleteWord(word.id)} />
        </div>
      </div>

      <p className="mt-3 text-sm">{word.meaning}</p>

      <p
        className="
        mt-2
        text-xs
        italic
        text-muted-foreground"
      >
        "{word.example}"
      </p>

      <div className="mt-3 flex gap-1">
        {Array.from({
          length: 5,
        }).map((_, index) => (
          <div
            key={index}
            className={`
            h-1.5
            flex-1
            rounded-full
            ${index < mastery ? "bg-primary" : "bg-muted"}
            `}
          />
        ))}
      </div>
    </div>
  );
}
