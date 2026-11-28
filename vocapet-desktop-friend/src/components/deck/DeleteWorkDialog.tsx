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
          type="button"
          aria-label="Xoá từ"
          className="grid h-10 w-10 cursor-pointer place-items-center rounded-[var(--radius)] text-muted-foreground transition-colors hover:bg-primary-soft hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xoá “{wordName}”?</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Từ này sẽ bị xoá khỏi bộ thẻ vĩnh viễn. Không thể hoàn tác.
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
            Xoá từ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
