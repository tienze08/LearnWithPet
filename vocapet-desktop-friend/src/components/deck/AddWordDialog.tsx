import { useState } from "react";
import { Plus } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";

interface CreateWordRequest {
  deckId: number;

  word: string;

  meaning: string;

  example: string;

  difficulty: "EASY" | "MEDIUM" | "HARD";

  partOfSpeech: "NOUN" | "VERB" | "ADJECTIVE" | "ADVERB";
}

interface AddWordDialogProps {
  deckId: number;
  onAdd: (word: CreateWordRequest) => void;
}

export default function AddWordDialog({ deckId, onAdd }: AddWordDialogProps) {
  const [open, setOpen] = useState(false);

  const [word, setWord] = useState("");
  const [meaning, setMeaning] = useState("");
  const [example, setExample] = useState("");
  const [difficulty, setDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("EASY");

  const [partOfSpeech, setPartOfSpeech] = useState<"NOUN" | "VERB" | "ADJECTIVE" | "ADVERB">(
    "NOUN",
  );

  const [csv, setCsv] = useState("");

  function resetForm() {
    setWord("");
    setMeaning("");
    setExample("");
    setDifficulty("EASY");
    setPartOfSpeech("NOUN");
  }

  function handleSubmit() {
    if (!word.trim() || !meaning.trim()) return;

    onAdd({
      deckId,
      word: word.trim(),
      meaning: meaning.trim(),
      example: example.trim(),
      difficulty,
      partOfSpeech,
    });

    resetForm();
    setOpen(false);
  }

  function handleImportCsv() {
    csv
      .split("\n")
      .map((row) => row.trim())
      .filter(Boolean)
      .forEach((row) => {
        const [w, m, e, p] = row.split(",").map((item) => item.trim());

        if (!w || !m) return;

        onAdd({
          deckId,
          word: w,
          meaning: m,
          example: e ?? "",
          difficulty: p === "MEDIUM" ? "MEDIUM" : p === "HARD" ? "HARD" : "EASY",
          partOfSpeech:
            p?.toUpperCase() === "VERB"
              ? "VERB"
              : p?.toUpperCase() === "ADJECTIVE"
                ? "ADJECTIVE"
                : p?.toUpperCase() === "ADVERB"
                  ? "ADVERB"
                  : "NOUN",
        });
      });

    setCsv("");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="btn-pop">
          <Plus className="mr-1 h-4 w-4" />
          Add word
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to deck</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Word</Label>

              <Input value={word} onChange={(e) => setWord(e.target.value)} />
            </div>

            <div>
              <Label>Part of speech</Label>

              <Input
                value={partOfSpeech}
                onChange={(e) => setPartOfSpeech(e.target.value as any)}
              />
            </div>
          </div>

          <div>
            <Label>Meaning</Label>

            <Input value={meaning} onChange={(e) => setMeaning(e.target.value)} />
          </div>

          <div>
            <Label>Example</Label>

            <Input value={example} onChange={(e) => setExample(e.target.value)} />
          </div>

          <Button className="btn-pop w-full" onClick={handleSubmit}>
            Add
          </Button>

          <div className="border-t-2 pt-2">
            <Label className="text-xs">Or import CSV (word, meaning, example, pos)</Label>

            <Textarea
              rows={4}
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              placeholder="apple, quả táo, I eat an apple., noun"
            />

            <Button
              variant="secondary"
              className="mt-2 w-full"
              disabled={!csv.trim()}
              onClick={handleImportCsv}
            >
              Import CSV
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
