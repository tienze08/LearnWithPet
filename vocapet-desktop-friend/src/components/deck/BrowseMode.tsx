import { toast } from "sonner";

import VocabularyCard from "./VocabularyCard";
import Empty from "./EmptyState";

import type { Vocabulary } from "@/types/vocabulary";

interface BrowseModeProps {
  words: Vocabulary[];

  masteryByWord: Record<number, number>;

  toggleBookmark: (id: number) => void;

  updateWord: (id: number, patch: Partial<Vocabulary>) => void;

  deleteWord: (id: number) => void;
}

export default function BrowseMode({
  words,

  masteryByWord,

  toggleBookmark,

  updateWord,

  deleteWord,
}: BrowseModeProps) {
  if (!words.length) {
    return <Empty />;
  }

  return (
    <div
      className="
      grid gap-3
      sm:grid-cols-2
      lg:grid-cols-3"
    >
      {words.map((word) => (
        <VocabularyCard
          key={word.id}
          word={word}
          mastery={masteryByWord[word.id] ?? 0}
          bookmarked={word.bookmarked}
          toggleBookmark={toggleBookmark}
          updateWord={(id, patch) => {
            updateWord(id, patch);

            toast.success("Word updated");
          }}
          deleteWord={(id) => {
            deleteWord(id);

            toast.success("Word deleted");
          }}
        />
      ))}
    </div>
  );
}
