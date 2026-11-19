import { useNavigate } from "@tanstack/react-router";
import { Layers } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAddLessonToDeckMutation } from "@/hooks/queries/tango.queries";

/** Copies a Tango lesson's words into the "Tango {level}" flashcard deck (idempotent on the backend). */
export function AddToDeckButton({
  lessonId,
  compact = false,
  className = "",
}: {
  lessonId: number;
  compact?: boolean;
  className?: string;
}) {
  const navigate = useNavigate();
  const toDeck = useAddLessonToDeckMutation();

  const onClick = () =>
    toDeck.mutate(lessonId, {
      onSuccess: (r) => {
        const openDeck = {
          label: "Mở deck",
          onClick: () => navigate({ to: "/app/decks/$deckId", params: { deckId: String(r.deckId) } }),
        };
        if (r.added === 0) toast("Bài này đã có trong flashcard", { action: openDeck });
        else toast.success(`Đã thêm ${r.added} từ vào deck ${r.deckName}`, { action: openDeck });
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : "Không thêm được vào flashcard"),
    });

  return (
    <Button
      type="button"
      variant={compact ? "ghost" : "outline"}
      size={compact ? "sm" : "default"}
      onClick={onClick}
      disabled={toDeck.isPending}
      aria-label="Thêm vào flashcard"
      className={className}
    >
      <Layers aria-hidden className="mr-1.5 h-4 w-4" />
      {toDeck.isPending ? "Đang thêm…" : compact ? "Flashcard" : "Thêm vào flashcard"}
    </Button>
  );
}
