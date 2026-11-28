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
          Xoá
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xoá “{deckName}”?</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Bộ thẻ và toàn bộ từ trong đó sẽ bị xoá vĩnh viễn. Không thể hoàn tác.
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Huỷ
          </Button>

          <Button
            variant="destructive"
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
          >
            Xoá bộ thẻ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
