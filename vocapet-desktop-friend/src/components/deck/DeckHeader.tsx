import { DeckResponse } from "@/api/deck.api";
import { ReactNode } from "react";

interface DeckHeaderProps {
  deck: DeckResponse;
  wordCount: number;
  children?: ReactNode;
}

export default function DeckHeader({ deck, wordCount, children }: DeckHeaderProps) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-2xl text-4xl ${deck.color}`}
      >
        {deck.emoji}
      </div>

      <div className="flex-1">
        <h1 className="text-3xl font-extrabold">{deck.name}</h1>

        <p className="text-sm text-muted-foreground">
          {deck.description} · {wordCount} words
        </p>
      </div>

      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}
