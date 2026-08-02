import { useState } from "react";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface DeleteWordDialogProps {
  wordName: string;
  onConfirm: () => void;
}

export default function DeleteWordDialog({ wordName, onConfirm }: DeleteWordDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="
          text-muted-foreground
          hover:text-destructive
          transition
          cursor-pointer
          "
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete "{wordName}"?</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          This will permanently remove the word from the deck. This action cannot be undone.
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>

          <Button
            variant="destructive"
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
          >
            Delete vocabulary
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
