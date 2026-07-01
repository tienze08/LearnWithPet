import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
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
  const [color, setColor] = useState("emerald");

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
              <div className="mt-3 flex items-center justify-between text-xs font-bold">
                <span>0 words</span>
                <span className="text-primary">0 mastered</span>
              </div>

              <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary w-0" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
