import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useGame } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Plus, Star, Volume2, Layers, ListChecks, Type, Sparkles } from "lucide-react";
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

export const Route = createFileRoute("/app/decks/$deckId")({
  component: DeckDetail,
});

type Mode = "browse" | "flashcards" | "quiz" | "type";

function DeckDetail() {
  const { deckId } = Route.useParams();
  const { state, addWord, toggleFavorite, recordAnswer } = useGame();
  const navigate = useNavigate();
  const deck = state.decks.find((d) => d.id === deckId);
  const words = useMemo(
    () => state.words.filter((w) => w.deckId === deckId),
    [state.words, deckId],
  );
  const [mode, setMode] = useState<Mode>("browse");

  if (!deck) {
    return (
      <div className="text-center py-20">
        <p>Deck not found.</p>
        <Button onClick={() => navigate({ to: "/app/decks" })} className="mt-3">
          Back to decks
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to="/app/decks"
        className="text-sm font-bold text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
      >
        <ArrowLeft className="w-4 h-4" /> All decks
      </Link>

      <div className="flex flex-wrap items-center gap-4">
        <div
          className={`w-16 h-16 rounded-2xl ${deck.color} flex items-center justify-center text-4xl`}
        >
          {deck.emoji}
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-extrabold">{deck.name}</h1>
          <p className="text-muted-foreground text-sm">
            {deck.description} · {words.length} words
          </p>
        </div>
        <AddWordDialog deckId={deckId} onAdd={addWord} />
      </div>

      <div className="flex flex-wrap gap-2">
        <ModeBtn
          active={mode === "browse"}
          onClick={() => setMode("browse")}
          icon={<Layers className="w-4 h-4" />}
        >
          Browse
        </ModeBtn>
        <ModeBtn
          active={mode === "flashcards"}
          onClick={() => setMode("flashcards")}
          icon={<Sparkles className="w-4 h-4" />}
        >
          Flashcards
        </ModeBtn>
        <ModeBtn
          active={mode === "quiz"}
          onClick={() => setMode("quiz")}
          icon={<ListChecks className="w-4 h-4" />}
        >
          Multiple choice
        </ModeBtn>
        <ModeBtn
          active={mode === "type"}
          onClick={() => setMode("type")}
          icon={<Type className="w-4 h-4" />}
        >
          Type the word
        </ModeBtn>
      </div>

      {mode === "browse" && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {words.map((w) => {
            const mastery = state.masteryByWord[w.id] ?? 0;
            const fav = state.favorites.includes(w.id);
            return (
              <div key={w.id} className="rounded-2xl border-2 border-border bg-card p-4 card-pop">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xl font-extrabold">{w.word}</p>
                    <p className="text-xs italic text-muted-foreground">{w.pos}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => speak(w.word)}
                      className="text-muted-foreground hover:text-primary"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleFavorite(w.id)}
                      className={fav ? "text-coin" : "text-muted-foreground"}
                    >
                      <Star className={`w-4 h-4 ${fav ? "fill-current" : ""}`} />
                    </button>
                  </div>
                </div>
                <p className="text-sm mt-2">{w.meaning}</p>
                <p className="text-xs italic text-muted-foreground mt-1">"{w.example}"</p>
                <div className="mt-2 flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full ${i < mastery ? "bg-primary" : "bg-muted"}`}
                    />
                  ))}
                </div>
              </div>
            );
          })}
          {words.length === 0 && (
            <div className="col-span-full text-center py-10 text-muted-foreground text-sm">
              No words yet. Click <strong>Add word</strong> to start.
            </div>
          )}
        </div>
      )}

      {mode === "flashcards" && <Flashcards words={words} onAnswer={recordAnswer} />}
      {mode === "quiz" && <QuizGame words={words} allWords={state.words} onAnswer={recordAnswer} />}
      {mode === "type" && <TypeGame words={words} onAnswer={recordAnswer} />}
    </div>
  );
}

function ModeBtn({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-bold transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card hover:border-primary"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  window.speechSynthesis.speak(u);
}

function Flashcards({
  words,
  onAnswer,
}: {
  words: ReturnType<typeof Array.prototype.slice> extends infer T ? any : any;
  onAnswer: (id: string, correct: boolean) => void;
}) {
  const list = words as {
    id: string;
    word: string;
    meaning: string;
    example: string;
    pos: string;
  }[];
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  if (!list.length) return <Empty />;
  const w = list[i % list.length];
  return (
    <div className="max-w-xl mx-auto">
      <p className="text-center text-sm text-muted-foreground mb-3">
        Card {(i % list.length) + 1} of {list.length}
      </p>
      <div className="perspective" onClick={() => setFlipped((f) => !f)}>
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.5 }}
          className="relative w-full cursor-pointer"
          style={{ transformStyle: "preserve-3d" }}
        >
          <FlashSide front>
            <p className="text-4xl font-extrabold">{w.word}</p>
            <p className="text-xs italic text-muted-foreground mt-2">{w.pos}</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                speak(w.word);
              }}
              className="mt-4 text-muted-foreground hover:text-primary"
            >
              <Volume2 className="w-6 h-6" />
            </button>
            <p className="text-xs text-muted-foreground mt-4">Tap to reveal</p>
          </FlashSide>
          <FlashSide back>
            <p className="text-2xl font-extrabold">{w.meaning}</p>
            <p className="text-sm italic text-muted-foreground mt-3 text-center">"{w.example}"</p>
          </FlashSide>
        </motion.div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          className="border-2 h-12"
          onClick={() => {
            onAnswer(w.id, false);
            setFlipped(false);
            setI(i + 1);
          }}
        >
          Still learning
        </Button>
        <Button
          className="btn-pop h-12"
          onClick={() => {
            onAnswer(w.id, true);
            setFlipped(false);
            setI(i + 1);
          }}
        >
          I know it
        </Button>
      </div>
    </div>
  );
}

function FlashSide({
  children,
  front,
  back,
}: {
  children: React.ReactNode;
  front?: boolean;
  back?: boolean;
}) {
  return (
    <div
      className="absolute inset-0 rounded-3xl border-2 border-border bg-card card-pop flex flex-col items-center justify-center p-6 text-center"
      style={{
        backfaceVisibility: "hidden",
        transform: back ? "rotateY(180deg)" : undefined,
      }}
    >
      {children}
      {front ? null : null}
    </div>
  );
}

function QuizGame({
  words,
  allWords,
  onAnswer,
}: {
  words: any[];
  allWords: any[];
  onAnswer: (id: string, c: boolean) => void;
}) {
  const [round, setRound] = useState(0);
  const q = useMemo(() => {
    if (!words.length) return null;
    const target = words[Math.floor(Math.random() * words.length)];
    const pool = allWords.filter((w: any) => w.id !== target.id);
    const ds: any[] = [];
    while (ds.length < 3 && pool.length)
      ds.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    const options = [target, ...ds].sort(() => Math.random() - 0.5);
    return { target, options };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, words, allWords]);
  const [picked, setPicked] = useState<string | null>(null);

  if (!q) return <Empty />;

  return (
    <div className="max-w-xl mx-auto rounded-3xl border-2 border-border bg-card p-6 card-pop">
      <p className="text-xs uppercase font-bold text-muted-foreground">Pick the meaning</p>
      <p className="text-4xl font-extrabold mt-2 text-center my-6">{q.target.word}</p>
      <div className="grid gap-2">
        {q.options.map((o: any) => {
          const correct = o.id === q.target.id;
          const isPicked = picked === o.id;
          return (
            <button
              key={o.id}
              disabled={picked !== null}
              onClick={() => {
                setPicked(o.id);
                onAnswer(q.target.id, correct);
                setTimeout(() => {
                  setPicked(null);
                  setRound((r) => r + 1);
                }, 900);
              }}
              className={`text-left p-3 rounded-xl border-2 text-sm transition-colors ${
                picked !== null && correct
                  ? "border-success bg-success/10 font-bold"
                  : picked !== null && isPicked && !correct
                    ? "border-destructive bg-destructive/10"
                    : "border-border hover:border-primary"
              }`}
            >
              {o.meaning}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TypeGame({
  words,
  onAnswer,
}: {
  words: any[];
  onAnswer: (id: string, c: boolean) => void;
}) {
  const [round, setRound] = useState(0);
  const w = useMemo(
    () => (words.length ? words[Math.floor(Math.random() * words.length)] : null),
    [round, words],
  );
  const [val, setVal] = useState("");
  const [result, setResult] = useState<null | boolean>(null);
  if (!w) return <Empty />;
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (result !== null) return;
    const correct = val.trim().toLowerCase() === w.word.toLowerCase();
    setResult(correct);
    onAnswer(w.id, correct);
    setTimeout(() => {
      setVal("");
      setResult(null);
      setRound((r) => r + 1);
    }, 1100);
  }
  return (
    <form
      onSubmit={submit}
      className="max-w-xl mx-auto rounded-3xl border-2 border-border bg-card p-6 card-pop"
    >
      <p className="text-xs uppercase font-bold text-muted-foreground">Type the word</p>
      <p className="text-lg mt-3">{w.meaning}</p>
      <p className="text-xs italic text-muted-foreground mt-1">
        Hint ({w.pos}): {w.word[0]}___
      </p>
      <Input
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="your answer"
        className="mt-4 h-12 text-lg"
      />
      {result !== null && (
        <p className={`mt-2 font-bold ${result ? "text-success" : "text-destructive"}`}>
          {result ? "Correct!" : `Answer: ${w.word}`}
        </p>
      )}
      <Button type="submit" className="btn-pop w-full mt-4 h-12">
        Check
      </Button>
    </form>
  );
}

function Empty() {
  return (
    <div className="text-center text-sm text-muted-foreground py-10">
      Add some words to this deck first.
    </div>
  );
}

function AddWordDialog({ deckId, onAdd }: { deckId: string; onAdd: (w: any) => void }) {
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState("");
  const [meaning, setMeaning] = useState("");
  const [example, setExample] = useState("");
  const [pos, setPos] = useState("noun");
  const [csv, setCsv] = useState("");

  function submit() {
    if (!word.trim() || !meaning.trim()) return;
    onAdd({ deckId, word: word.trim(), meaning: meaning.trim(), example: example.trim(), pos });
    setWord("");
    setMeaning("");
    setExample("");
  }

  function importCsv() {
    csv
      .split("\n")
      .map((row) => row.trim())
      .filter(Boolean)
      .forEach((row) => {
        const [w, m, e, p] = row.split(",").map((c) => c.trim());
        if (w && m) onAdd({ deckId, word: w, meaning: m, example: e || "", pos: p || "noun" });
      });
    setCsv("");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="btn-pop">
          <Plus className="w-4 h-4 mr-1" /> Add word
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
              <Input value={pos} onChange={(e) => setPos(e.target.value)} />
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
          <Button className="btn-pop w-full" onClick={submit}>
            Add
          </Button>
          <div className="pt-2 border-t-2">
            <Label className="text-xs">Or import CSV (word, meaning, example, pos per line)</Label>
            <Textarea
              rows={4}
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              placeholder="ephemeral, lasting a very short time, A rainbow is ephemeral., adj"
            />
            <Button
              variant="secondary"
              className="w-full mt-2"
              onClick={importCsv}
              disabled={!csv.trim()}
            >
              Import CSV
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
