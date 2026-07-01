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
import { Textarea } from "@/components/ui/textarea";

import type { Difficulty, Vocabulary } from "@/types/vocabulary";

interface EditWordDialogProps {
  word: Vocabulary;

  onSave: (patch: Partial<Vocabulary>) => void;
}

export default function EditWordDialog({ word, onSave }: EditWordDialogProps) {
  const [open, setOpen] = useState(false);

  const [editedWord, setEditedWord] = useState(word.word);

  const [meaning, setMeaning] = useState(word.meaning);

  const [example, setExample] = useState(word.example);

  const [difficulty, setDifficulty] = useState<Difficulty>(word.difficulty);

  const [partOfSpeech, setPartOfSpeech] = useState(word.partOfSpeech);

  function resetForm() {
    setEditedWord(word.word);

    setMeaning(word.meaning);

    setExample(word.example);

    setDifficulty(word.difficulty);

    setPartOfSpeech(word.partOfSpeech);
  }

  function handleSave() {
    if (!editedWord.trim() || !meaning.trim()) {
      return;
    }

    onSave({
      word: editedWord.trim(),

      meaning: meaning.trim(),

      example: example.trim(),

      difficulty,

      partOfSpeech,
    });

    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);

        if (value) {
          resetForm();
        }
      }}
    >
      <DialogTrigger asChild>
        <button
          className="
          text-muted-foreground
          transition-colors
          hover:text-primary"
          aria-label="Edit word"
          cursor-pointer
        >
          <Pencil className="h-4 w-4" />
        </button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit word</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Word</Label>

              <Input
                value={editedWord}
                maxLength={60}
                onChange={(e) => setEditedWord(e.target.value)}
              />
            </div>

            <div>
              <Label>Part of speech</Label>

              <Input
                value={partOfSpeech}
                maxLength={20}
                onChange={(e) => setPartOfSpeech(e.target.value as typeof partOfSpeech)}
              />
            </div>
          </div>

          <div>
            <Label>Difficulty</Label>

            <select
              className="
              mt-1
              w-full
              rounded-md
              border
              p-2"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            >
              <option value="EASY">EASY</option>

              <option value="MEDIUM">MEDIUM</option>

              <option value="HARD">HARD</option>
            </select>
          </div>

          <div>
            <Label>Meaning</Label>

            <Input value={meaning} maxLength={200} onChange={(e) => setMeaning(e.target.value)} />
          </div>

          <div>
            <Label>Example</Label>

            <Textarea
              rows={3}
              value={example}
              maxLength={300}
              onChange={(e) => setExample(e.target.value)}
            />
          </div>

          <Button className="btn-pop w-full" onClick={handleSave}>
            Save changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
