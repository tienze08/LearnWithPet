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

interface DeleteDeckDialogProps {
  deckName: string;
  onConfirm: () => void;
}

export default function DeleteDeckDialog({ deckName, onConfirm }: DeleteDeckDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-destructive hover:text-destructive">
          <Trash2 className="mr-1 h-4 w-4" />
          Delete
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete "{deckName}"?</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          This will permanently remove the deck and all of its words. This action cannot be undone.
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
            Delete deck
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
