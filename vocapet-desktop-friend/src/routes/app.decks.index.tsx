import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Plus, Search } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useCreateDeckMutation, useDecksQuery } from "@/hooks/queries/deck.queries";
import { ErrorBlock, LoadingBlock } from "@/components/tango/shared";
import { PetNote } from "@/components/learning-path/studio";

export const Route = createFileRoute("/app/decks/")({
  component: DecksPage,
});

const EMOJIS = ["📚", "🌍", "🍔", "💼", "🎨", "🧪", "🏃", "🎵", "🎮", "🌱"];

// Stored on the deck as-is (the API keeps the class name), so the values must not change.
const COLORS = [
  { name: "emerald", label: "Lục", class: "bg-emerald-100" },
  { name: "sky", label: "Lam", class: "bg-sky-100" },
  { name: "amber", label: "Vàng", class: "bg-amber-100" },
  { name: "rose", label: "Hồng", class: "bg-rose-100" },
  { name: "violet", label: "Tím", class: "bg-violet-100" },
  { name: "teal", label: "Ngọc", class: "bg-teal-100" },
];

/** Flashcards: the learner's own decks as a ruled list, a search when there are several, and a create dialog. */
function DecksPage() {
  const decks = useDecksQuery();
  const list = decks.data ?? [];
  const [q, setQ] = useState("");
  const filtered = list.filter((d) => d.name.toLowerCase().includes(q.trim().toLowerCase()));
  const totalWords = list.reduce((n, d) => n + (d.wordCount ?? 0), 0);

  return (
    <div className="mx-auto max-w-[1120px] space-y-10">
      <header className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] lg:items-end lg:gap-16">
        <div className="space-y-3">
          <p className="studio-kicker">
            <span lang="ja" className="normal-case tracking-normal">
              単語帳
            </span>{" "}
            · Flashcards
          </p>
          <h1 className="studio-head text-4xl leading-[1.05] sm:text-5xl">Bộ thẻ của bạn</h1>
          <p className="studio-muted">
            {list.length > 0
              ? `${list.length} bộ thẻ · ${totalWords} từ bạn tự sưu tầm.`
              : "Nơi gom những từ bạn muốn tự ôn theo cách riêng."}
          </p>
        </div>
        {list.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            <CreateDeck />
          </div>
        )}
      </header>

      {decks.isPending ? (
        <LoadingBlock rows={3} />
      ) : decks.isError ? (
        <ErrorBlock error={decks.error} onRetry={() => decks.refetch()} />
      ) : list.length === 0 ? (
        <section className="studio-rule-t studio-rule-b grid gap-6 py-10 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <PetNote mood="waiting" size={64}>
            Chưa có bộ thẻ nào. Tạo một bộ cho chủ đề bạn thích, mình học cùng bạn.
          </PetNote>
          <CreateDeck />
        </section>
      ) : (
        <section aria-labelledby="deck-list" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="deck-list" className="studio-kicker studio-kicker-muted">
              {filtered.length} bộ thẻ
            </h2>
            {list.length > 3 && (
              <div className="relative">
                <Search
                  aria-hidden
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 studio-muted"
                />
                <Input
                  aria-label="Tìm bộ thẻ"
                  placeholder="Tìm bộ thẻ"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="h-11 w-64 pl-9"
                />
              </div>
            )}
          </div>
          <ul className="studio-rule-t">
            {filtered.map((d) => {
              const words = d.wordCount ?? 0;
              return (
                <li key={d.id}>
                  <Link
                    to="/app/decks/$deckId"
                    params={{ deckId: `${d.id}` }}
                    className="studio-row studio-rule-b group grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-4 px-2 py-4 sm:grid-cols-[3.5rem_minmax(0,1fr)_8rem_1.5rem]"
                  >
                    <span
                      aria-hidden
                      className={`grid h-12 w-12 place-items-center rounded-[var(--radius)] border border-border text-2xl ${d.color}`}
                    >
                      {d.emoji}
                    </span>
                    <span className="min-w-0">
                      <span className="studio-head block truncate text-xl">{d.name}</span>
                      <span className="block truncate text-sm studio-muted">
                        {d.description || "Bộ thẻ riêng của bạn"}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="studio-head block text-2xl tabular-nums">{words}</span>
                      <span className="block text-xs studio-muted">từ</span>
                    </span>
                    <ArrowRight
                      aria-hidden
                      className="hidden h-4 w-4 text-primary transition-transform group-hover:translate-x-1 sm:block"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
          {filtered.length === 0 && (
            <p className="text-sm studio-muted">Không có bộ thẻ nào tên “{q}”.</p>
          )}
        </section>
      )}
    </div>
  );
}

function CreateDeck() {
  const createDeckMutation = useCreateDeckMutation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [color, setColor] = useState(COLORS[0].class);

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus aria-hidden className="h-4 w-4" /> Tạo bộ thẻ
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="studio-head text-2xl">Tạo bộ thẻ</DialogTitle>
          <DialogDescription>Đặt tên theo chủ đề để dễ tìm lại.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleCreate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="deck-name">Tên bộ thẻ</Label>
            <Input
              id="deck-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Từ về nấu ăn"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="deck-desc">Mô tả (không bắt buộc)</Label>
            <Input id="deck-desc" value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium">Biểu tượng</legend>
            <div className="flex flex-wrap gap-2">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  aria-pressed={emoji === e}
                  aria-label={`Biểu tượng ${e}`}
                  onClick={() => setEmoji(e)}
                  className={`grid h-11 w-11 place-items-center rounded-[var(--radius)] border text-xl ${
                    emoji === e ? "border-primary bg-primary-soft" : "border-border"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium">Màu nền</legend>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  aria-pressed={color === c.class}
                  aria-label={`Màu ${c.label}`}
                  onClick={() => setColor(c.class)}
                  className={`h-11 w-11 rounded-[var(--radius)] border ${c.class} ${
                    color === c.class
                      ? "border-primary outline-2 outline-offset-2 outline-primary"
                      : "border-border"
                  }`}
                />
              ))}
            </div>
          </fieldset>
          {createDeckMutation.isError && (
            <p role="alert" className="text-sm text-destructive">
              Chưa tạo được bộ thẻ. Thử lại.
            </p>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={createDeckMutation.isPending || !name.trim()}
          >
            {createDeckMutation.isPending ? "Đang tạo…" : "Tạo bộ thẻ"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
