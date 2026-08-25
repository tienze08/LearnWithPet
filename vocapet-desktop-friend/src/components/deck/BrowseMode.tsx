import VocabularyCard from "./VocabularyCard";
import Empty from "./EmptyState";

import type { Vocabulary } from "@/types/vocabulary";
import { speakPet } from "@/hooks/stores/petSpeech";

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

            speakPet("Word updated — nice and tidy!", 1, 3);
          }}
          deleteWord={(id) => {
            deleteWord(id);

            speakPet("That word has been removed.", 1, 3);
          }}
        />
      ))}
    </div>
  );
}
