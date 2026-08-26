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
import { useTranslation } from "@/lib/i18n";

interface DeleteDeckDialogProps {
  deckName: string;
  onConfirm: () => void;
}

export default function DeleteDeckDialog({ deckName, onConfirm }: DeleteDeckDialogProps) {
  const { t: tr } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-destructive hover:text-destructive">
          <Trash2 className="mr-1 h-4 w-4" />
          {tr("decks.delete")}
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tr("decks.deleteTitle", { name: deckName })}</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          {tr("decks.deleteDetail")}
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {tr("decks.cancel")}
          </Button>

          <Button
            variant="destructive"
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
          >
            {tr("decks.deleteAction")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
