import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Brain, Layers, ListChecks, Sparkles, Type } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import DeckHeader from "@/components/deck/DeckHeader";
import AddWordDialog from "@/components/deck/AddWordDialog";
import EditDeckDialog from "@/components/deck/EditDeckDialog";
import DeleteDeckDialog from "@/components/deck/DeleteDeckDialog";

import ModeButton from "@/components/deck/ModeButton";
import BrowseMode from "@/components/deck/BrowseMode";
import Flashcards from "@/components/deck/Flashcard";
import QuizGame from "@/components/deck/QuizGame";
import TypeGame from "@/components/deck/TypeMode";

import {
  useVocabulariesQuery,
  useCreateVocabularyMutation,
  useUpdateVocabularyMutation,
  useDeleteVocabularyMutation,
} from "@/hooks/queries/vocabulary.queries";

import {
  useDecksQuery,
  useUpdateDeckMutation,
  useDeleteDeckMutation,
} from "@/hooks/queries/deck.queries";

import {
  useAddBookmarkMutation,
  useRemoveBookmarkMutation,
} from "@/hooks/queries/bookmark.queries";
import SrsFlashCard from "@/components/deck/SrsFlashCard";
import { useGame } from "@/lib/store";

export const Route = createFileRoute("/app/decks/$deckId")({
  component: DeckDetail,
});

type Mode = "browse" | "srs" | "flashcards" | "quiz" | "type";

export default function DeckDetail() {
  const { recordAnswer: recordStudyAnswer } = useGame();
  const { deckId } = Route.useParams();

  const navigate = useNavigate();

  const deckIdNumber = Number(deckId);

  const { data: decks = [] } = useDecksQuery();

  const deck = decks.find((d) => d.id === deckIdNumber);

  const { data: words = [] } = useVocabulariesQuery(deckIdNumber);

  const createVocabulary = useCreateVocabularyMutation();

  const updateVocabulary = useUpdateVocabularyMutation();

  const deleteVocabulary = useDeleteVocabularyMutation();

  const updateDeck = useUpdateDeckMutation();

  const deleteDeck = useDeleteDeckMutation();

  const addBookmark = useAddBookmarkMutation();

  const removeBookmark = useRemoveBookmarkMutation();

  const [mode, setMode] = useState<Mode>("browse");

  function recordAnswer(id: number, correct: boolean) {
    recordStudyAnswer(String(id), correct);

    // sau này nối SRS backend ở đây
  }

  if (!deck) {
    return (
      <div className="py-20 text-center">
        <p className="studio-head text-2xl">Không tìm thấy bộ thẻ này.</p>

        <Button
          className="mt-3"
          onClick={() =>
            navigate({
              to: "/app/decks",
            })
          }
        >
          Về danh sách bộ thẻ
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1120px] space-y-8">
      <Link
        to="/app/decks"
        className="inline-flex min-h-11 items-center gap-1.5 text-sm studio-muted hover:text-foreground"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        Tất cả bộ thẻ
      </Link>

      <DeckHeader deck={deck} wordCount={words.length}>
        <EditDeckDialog
          deck={deck}
          onSave={(patch) => {
            updateDeck.mutate({
              id: deck.id,

              payload: {
                name: patch.name ?? deck.name,

                description: patch.description ?? deck.description,

                emoji: patch.emoji ?? deck.emoji,

                color: patch.color ?? deck.color,
              },
            });

            toast.success("Đã lưu bộ thẻ");
          }}
        />

        <DeleteDeckDialog
          deckName={deck.name}
          onConfirm={() => {
            deleteDeck.mutate(deck.id, {
              onSuccess: () => {
                toast.success("Đã xoá bộ thẻ");
                navigate({ to: "/app/decks" });
              },
              onError: (err) => {
                toast.error("Chưa xoá được bộ thẻ");
              },
            });

            navigate({
              to: "/app/decks",
            });
          }}
        />

        <AddWordDialog
          deckId={deck.id}
          onAdd={(word) => {
            createVocabulary.mutate({
              deckId: deck.id,

              payload: {
                word: word.word,

                meaning: word.meaning,

                example: word.example,

                difficulty: word.difficulty,

                partOfSpeech: word.partOfSpeech,
              },
            });
          }}
        />
      </DeckHeader>

      <div
        role="tablist"
        aria-label="Cách học"
        className="flex gap-1 overflow-x-auto border-b border-border"
      >
        <ModeButton
          active={mode === "browse"}
          onClick={() => setMode("browse")}
          icon={<Layers className="h-4 w-4" />}
        >
          Danh sách
        </ModeButton>

        <ModeButton
          active={mode === "srs"}
          onClick={() => setMode("srs")}
          icon={<Brain className="h-4 w-4" />}
        >
          Ôn SRS
        </ModeButton>

        <ModeButton
          active={mode === "flashcards"}
          onClick={() => setMode("flashcards")}
          icon={<Sparkles className="h-4 w-4" />}
        >
          Lật thẻ
        </ModeButton>

        <ModeButton
          active={mode === "quiz"}
          onClick={() => setMode("quiz")}
          icon={<ListChecks className="h-4 w-4" />}
        >
          Trắc nghiệm
        </ModeButton>

        <ModeButton
          active={mode === "type"}
          onClick={() => setMode("type")}
          icon={<Type className="h-4 w-4" />}
        >
          Gõ từ
        </ModeButton>
      </div>

      {mode === "browse" && (
        <BrowseMode
          words={words}
          masteryByWord={{}}
          toggleBookmark={(id) => {
            const word = words.find((w) => w.id === id);

            if (!word) return;

            if (word.bookmarked) {
              removeBookmark.mutate(id);
            } else {
              addBookmark.mutate(id);
            }
          }}
          updateWord={(id, patch) => {
            updateVocabulary.mutate({
              deckId: deck.id,

              vocabularyId: id,

              payload: patch as any,
            });
          }}
          deleteWord={(id) => {
            deleteVocabulary.mutate({
              deckId: deck.id,

              vocabularyId: id,
            });
          }}
        />
      )}

      {mode !== "browse" && (
        <div className="mx-auto max-w-[680px]">
          {mode === "srs" && <SrsFlashCard deckId={deck.id} />}
          {mode === "flashcards" && <Flashcards words={words} onAnswer={recordAnswer} />}
          {mode === "quiz" && <QuizGame words={words} allWords={words} onAnswer={recordAnswer} />}
          {mode === "type" && <TypeGame words={words} onAnswer={recordAnswer} />}
        </div>
      )}
    </div>
  );
}
