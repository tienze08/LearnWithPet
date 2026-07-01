import { createFileRoute, Link } from "@tanstack/react-router";
import { useGame } from "@/lib/store";
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

export const Route = createFileRoute("/app/decks/")({
  component: DecksPage,
});

const EMOJIS = ["📚", "🌍", "🍔", "💼", "🎨", "🧪", "🏃", "🎵", "🎮", "🌱"];
const COLORS = ["bg-emerald-100", "bg-sky-100", "bg-amber-100", "bg-rose-100", "bg-violet-100", "bg-teal-100"];

function DecksPage() {
  const { state, addDeck } = useGame();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [emoji, setEmoji] = useState(EMOJIS[0]);

  const decks = state.decks.filter((d) => d.name.toLowerCase().includes(q.toLowerCase()));

  function handleCreate() {
    if (!name.trim()) return;
    addDeck({
      name: name.trim(),
      description: desc.trim() || "Custom deck",
      emoji,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    });
    setName(""); setDesc(""); setEmoji(EMOJIS[0]);
    setOpen(false);
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
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cooking words" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="optional" />
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
                <Button className="btn-pop w-full" onClick={handleCreate}>Create deck</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {decks.map((d) => {
          const words = state.words.filter((w) => w.deckId === d.id);
          const mastered = words.filter((w) => (state.masteryByWord[w.id] ?? 0) >= 4).length;
          const pct = words.length ? (mastered / words.length) * 100 : 0;
          return (
            <Link
              key={d.id}
              to="/app/decks/$deckId"
              params={{ deckId: d.id }}
              className="rounded-3xl border-2 border-border bg-card p-5 card-pop hover:border-primary transition-colors"
            >
              <div className={`w-14 h-14 rounded-2xl ${d.color} flex items-center justify-center text-3xl`}>
                {d.emoji}
              </div>
              <h3 className="font-extrabold text-lg mt-3">{d.name}</h3>
              <p className="text-xs text-muted-foreground">{d.description}</p>
              <div className="mt-3 flex items-center justify-between text-xs font-bold">
                <span>{words.length} words</span>
                <span className="text-primary">{mastered} mastered</span>
              </div>
              <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
