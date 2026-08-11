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
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading decks">
        {[0, 1, 2].map((item) => <div key={item} className="h-56 animate-pulse rounded-2xl border border-border bg-card/60" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Learning library</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Your decks</h1>
          <p className="mt-2 text-sm text-muted-foreground">A quiet place to collect, practise and remember new words.</p>
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
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              className="group rounded-2xl border border-border bg-card/80 p-5 card-pop transition-all hover:-translate-y-0.5 hover:border-primary/50"
            >
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-2xl text-4xl ${d.color}`}
              >
                {d.emoji}
              </div>
              <div className="mt-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-lg">{d.name}</h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{d.description || "Your personal vocabulary workspace."}</p>
                </div>
                <span className="text-xs font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">Open</span>
              </div>
              <div className="mt-5 rounded-xl bg-muted/55 p-3">
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
        {!isLoading && filteredDecks.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-border bg-card/55 px-6 py-14 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><BookOpen className="h-5 w-5" /></div>
            <h2 className="font-bold">Your learning journey starts here.</h2>
            <p className="mt-1 text-sm text-muted-foreground">Create a deck and give Pip something new to learn with you.</p>
          </div>
        )}
      </div>
    </div>
  );
}
