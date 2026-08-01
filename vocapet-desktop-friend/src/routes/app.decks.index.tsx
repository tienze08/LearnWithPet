import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, Plus, Search } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useCreateDeckMutation, useDecksQuery } from "@/hooks/queries/deck.queries";

export const Route = createFileRoute("/app/decks/")({
  component: DecksPage,
});

const EMOJIS = ["📚", "🌍", "🍔", "💼", "🎨", "🧪", "🏃", "🎵", "🎮", "🌱"];

const COLORS = [
  {
    name: "emerald",
    class: "bg-emerald-100",
  },
  {
    name: "sky",
    class: "bg-sky-100",
  },
  {
    name: "amber",
    class: "bg-amber-100",
  },
  {
    name: "rose",
    class: "bg-rose-100",
  },
  {
    name: "violet",
    class: "bg-violet-100",
  },
  {
    name: "teal",
    class: "bg-teal-100",
  },
];

function DecksPage() {
  const { data: decks = [], isLoading } = useDecksQuery();
  const createDeckMutation = useCreateDeckMutation();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [color, setColor] = useState(COLORS[0].class);

  const filteredDecks = decks.filter((d) => d.name.toLowerCase().includes(q.toLowerCase()));

  async function handleCreate() {
    if (!name.trim()) return;

    await createDeckMutation.mutateAsync({
      name: name.trim(),

      description: desc.trim(),

      emoji,

      color,
    });

    setName("");
    setDesc("");
    setEmoji(EMOJIS[0]);
    setOpen(false);
  }

  if (isLoading) {
    return <div className="flex justify-center py-20">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">Decks</h1>
          <p className="text-muted-foreground text-sm">Pick a deck to study or build your own.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search decks"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9 w-56"
            />
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="btn-pop">
                <Plus className="w-4 h-4 mr-1" /> New deck
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a deck</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Cooking words"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    placeholder="optional"
                  />
                </div>
                <div>
                  <Label>Emoji</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {EMOJIS.map((e) => (
                      <button
                        key={e}
                        onClick={() => setEmoji(e)}
                        className={`w-10 h-10 text-xl rounded-xl border-2 ${emoji === e ? "border-primary bg-primary/10" : "border-border"}`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Color</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {COLORS.map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => setColor(c.class)}
                        className={`
          h-10 w-10 rounded-full border-2 transition
          ${c.class}
          ${color === c.class ? "border-primary ring-2 ring-primary/30" : "border-border"}
        `}
                      />
                    ))}
                  </div>
                </div>
                <Button className="btn-pop w-full" onClick={handleCreate}>
                  Create deck
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDecks.map((d) => {
          const wordCount = d.wordCount ?? 0;
          // The API currently exposes the number of words, not per-word mastery.
          // Keep progress honest at 0 until study progress is available from the API.
          const studiedCount = 0;
          const progress = wordCount > 0 ? Math.round((studiedCount / wordCount) * 100) : 0;
          return (
            <Link
              key={d.id}
              to="/app/decks/$deckId"
              params={{
                deckId: `${d.id}`,
              }}
              className="rounded-3xl border-2 border-border bg-card p-5 card-pop hover:border-primary transition-colors"
            >
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-2xl text-4xl ${d.color}`}
              >
                {d.emoji}
              </div>
              <h3 className="font-extrabold text-lg mt-3">{d.name}</h3>
              <p className="text-xs text-muted-foreground">{d.description}</p>
              <div className="mt-5 rounded-2xl border border-border bg-muted/45 p-3">
                <div className="flex items-center justify-between gap-3 text-xs font-bold">
                  <span className="inline-flex items-center gap-1.5 text-foreground">
                    <BookOpen className="h-3.5 w-3.5 text-primary" />
                    {wordCount} {wordCount === 1 ? "word" : "words"}
                  </span>
                  <span className="text-primary">{progress}% mastered</span>
                </div>
                <div
                  className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-background ring-1 ring-border/70"
                  role="progressbar"
                  aria-label={`Mastery progress for ${d.name}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress}
                >
                  <div
                    className="h-full rounded-full bg-linear-to-r from-primary/75 via-primary to-emerald-400 transition-[width] duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] font-medium text-muted-foreground">
                  {wordCount === 0 ? "Add words to begin studying." : `${studiedCount} of ${wordCount} words mastered`}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
