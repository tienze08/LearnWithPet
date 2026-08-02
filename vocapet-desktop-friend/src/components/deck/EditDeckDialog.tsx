import { useState } from "react";

import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DeckResponse } from "@/api/deck.api";

interface EditDeckDialogProps {
  deck: DeckResponse;
  onSave: (patch: Partial<Omit<DeckResponse, "id">>) => void;
}

const EMOJIS = ["📚", "🌍", "🍔", "💼", "🎨", "🧪", "🏃", "🎵", "🎮", "🌱", "🎓", "☕", "✈️"];

const COLORS = [
  "bg-emerald-100",
  "bg-sky-100",
  "bg-amber-100",
  "bg-rose-100",
  "bg-violet-100",
  "bg-teal-100",
];

export default function EditDeckDialog({ deck, onSave }: EditDeckDialogProps) {
  const [open, setOpen] = useState(false);

  const [name, setName] = useState(deck.name);
  const [description, setDescription] = useState(deck.description);
  const [emoji, setEmoji] = useState(deck.emoji);
  const [color, setColor] = useState(deck.color);

  function reset() {
    setName(deck.name);
    setDescription(deck.description);
    setEmoji(deck.emoji);
    setColor(deck.color);
  }

  function handleSave() {
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      description: description.trim(),
      emoji,
      color,
    });

    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);

        if (value) {
          reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Pencil className="mr-1 h-4 w-4" />
          Edit deck
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit deck</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Name</Label>

            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          </div>

          <div>
            <Label>Description</Label>

            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
            />
          </div>

          <div>
            <Label>Emoji</Label>

            <div className="mt-2 flex flex-wrap gap-2">
              {EMOJIS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setEmoji(item)}
                  className={`h-10 w-10 rounded-xl border-2 text-xl ${
                    emoji === item ? "border-primary bg-primary/10" : "border-border"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Color</Label>

            <div className="mt-2 flex flex-wrap gap-2">
              {COLORS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setColor(item)}
                  className={`h-10 w-10 rounded-xl border-2 ${item} ${
                    color === item ? "border-primary ring-2 ring-primary/40" : "border-border"
                  }`}
                />
              ))}
            </div>
          </div>

          <Button className="btn-pop w-full" onClick={handleSave}>
            Save changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
