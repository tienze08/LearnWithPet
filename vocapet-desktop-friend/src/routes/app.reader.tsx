import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useGame } from "@/lib/store";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  BookOpen,
  Highlighter,
  Loader2,
  Upload,
  Volume2,
  X,
  Sparkles,
  Check,
  PanelRightClose,
  ShoppingBasket,
  Trash2,
} from "lucide-react";
import type { GeneratedCard } from "@/lib/reader-ai.functions";
import { generateReaderFlashcardsApi, suggestReaderVocabularyApi } from "@/api/reader.api";
import { Pet } from "@/components/PixiPet/Pet";
import { stageForLevel } from "@/lib/store";
import { speakPet } from "@/hooks/stores/petSpeech";
import { petEvents } from "@/lib/pet/events";
import { useDecksQuery } from "@/hooks/queries/deck.queries";
import { useCreateVocabularyMutation, useMyVocabulariesQuery } from "@/hooks/queries/vocabulary.queries";
import type { BasketItem, VocabularySuggestion } from "@/components/reader/types";
import { sentenceAround, speakWord } from "@/components/reader/utils/text";
import { PdfDocumentViewer, PdfReaderLoader } from "@/components/reader/PdfReaderLoader";
import { getLatestPdf, saveLatestPdf } from "@/components/reader/pdf-storage";
import type { Vocabulary } from "@/types/vocabulary";
import { useMeQuery } from "@/hooks/queries/user.queries";

export const Route = createFileRoute("/app/reader")({
  component: ReaderPage,
  head: () => ({
    meta: [
      { title: "Reader – Highlight words to make flashcards | VocaPet" },
      {
        name: "description",
        content:
          "Read real books and documents in VocaPet, highlight any unfamiliar word, and save it as a flashcard straight from the side panel.",
      },
      { property: "og:title", content: "VocaPet Reader – Highlight to flashcard" },
      {
        property: "og:description",
        content:
          "Read articles or your own documents, highlight a word, and save it into any deck as a flashcard.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Library = { id: string; title: string; author: string; emoji: string; text: string };
type HighlightDetail = { meaning: string; lastReviewed: string; retention: number };

function scanDocumentWords(text: string) {
  const frequencies = new Map<string, number>();
  for (const raw of text.match(/[\p{L}][\p{L}'-]*/gu) ?? []) {
    const word = raw.toLocaleLowerCase().replace(/^['-]+|['-]+$/g, "");
    if (word.length >= 3) frequencies.set(word, (frequencies.get(word) ?? 0) + 1);
  }
  return frequencies;
}

function ReadingParagraph({
  text,
  savedWords,
  basketWords,
  vocabularyByWord,
  highlights,
  onReview,
}: {
  text: string;
  savedWords: Set<string>;
  basketWords: Set<string>;
  vocabularyByWord: Map<string, Vocabulary>;
  highlights: Record<string, HighlightDetail>;
  onReview: (word: string) => void;
}) {
  return (
    <>
      {text.split(/(\b[\p{L}][\p{L}'-]*\b)/u).map((token, index) => {
        const normalized = token.toLowerCase();
        const isSaved = savedWords.has(normalized);
        const inBasket = basketWords.has(normalized);
        if (!isSaved && !inBasket) return token;
        const vocabulary = vocabularyByWord.get(normalized);
        const highlight = highlights[normalized];
        const mastery = vocabulary ? Math.min(5, 2) : 1;
        const retention = 60 + mastery * 8;
        return (
          <span key={`${token}-${index}`} className="group relative inline-block mx-0.5">
            <span
              className={`cursor-help rounded px-0.5 font-semibold underline decoration-2 underline-offset-4 ${inBasket ? "bg-amber-100 decoration-amber-400" : "bg-primary/15 decoration-primary"}`}
            >
              {token}
              {inBasket && <sup className="ml-0.5 text-[9px] no-underline">📚</sup>}
            </span>
            <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-60 -translate-x-1/2 rounded-2xl border-2 border-border bg-card p-3 text-left text-xs shadow-xl group-hover:block group-focus-within:block">
              <span className="mb-1 flex items-center gap-1 font-extrabold text-primary">
                🐱 {inBasket ? "In your basket" : "Already in your deck"}
              </span>
              <span className="block font-bold text-foreground">
                Meaning:{" "}
                <span className="font-medium">
                  {vocabulary?.meaning ?? highlight?.meaning ?? "Ready for AI analysis"}
                </span>
              </span>
              {!inBasket && (
                <>
                  <span className="mt-2 block text-muted-foreground">
                    Learning progress · {highlight?.retention ?? retention}% retention
                  </span>
                  <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-primary"
                      style={{ width: `${highlight?.retention ?? retention}%` }}
                    />
                  </span>
                  <span className="mt-1 block text-muted-foreground">
                    Last reviewed:{" "}
                    {highlight?.lastReviewed ?? (mastery < 2 ? "Needs a first review" : "Recently")}
                  </span>
                </>
              )}
              <button
                type="button"
                onClick={() => onReview(token)}
                className="pointer-events-auto mt-2 w-full rounded-lg bg-primary px-2 py-1.5 font-bold text-primary-foreground hover:brightness-95"
              >
                🐱 Review with Burumaru
              </button>
            </span>
          </span>
        );
      })}
    </>
  );
}

const LIBRARY: Library[] = [
  {
    id: "wonderland",
    title: "Alice's Adventures in Wonderland",
    author: "Lewis Carroll",
    emoji: "🐇",
    text: `Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, "and what is the use of a book," thought Alice, "without pictures or conversations?"

So she was considering in her own mind (as well as she could, for the hot day made her feel very sleepy and stupid), whether the pleasure of making a daisy-chain would be worth the trouble of getting up and picking the daisies, when suddenly a White Rabbit with pink eyes ran close by her.

There was nothing so very remarkable in that; nor did Alice think it so very much out of the way to hear the Rabbit say to itself, "Oh dear! Oh dear! I shall be late!" But when the Rabbit actually took a watch out of its waistcoat-pocket, and looked at it, and then hurried on, Alice started to her feet, for it flashed across her mind that she had never before seen a rabbit with either a waistcoat-pocket, or a watch to take out of it, and burning with curiosity, she ran across the field after it, and fortunately was just in time to see it pop down a large rabbit-hole under the hedge.`,
  },
  {
    id: "climate",
    title: "The Shifting Climate (IELTS Reading)",
    author: "Academic passage",
    emoji: "🌍",
    text: `Scientists have long observed that the planet's climate is inherently variable, yet the magnitude of recent change is unprecedented. Comprehensive analysis of ice cores, tree rings and ocean sediments reveals a conspicuous acceleration in warming since the industrial era began.

The consequences are already tangible. Coastal communities face the prospect of inundation as glaciers deteriorate and thermal expansion elevates sea levels. Agricultural yields fluctuate as rainfall becomes erratic, and prolonged droughts jeopardise food security in vulnerable regions.

Mitigation strategies are diverse. Some advocate a rapid transition to renewable energy, while others emphasise adaptation: reinforcing infrastructure, cultivating drought-resistant crops and restoring wetlands that buffer storm surges. Most researchers concur that a combination of both approaches is indispensable, and that procrastination will inevitably render future intervention more costly.`,
  },
  {
    id: "meeting",
    title: "Quarterly Business Review (TOEIC)",
    author: "Workplace document",
    emoji: "💼",
    text: `Thank you all for attending this quarterly review. Revenue exceeded our forecast by nine percent, largely because the logistics team managed to negotiate more favourable freight rates with our primary supplier.

However, several deliverables slipped past their deadline. The procurement department will submit a revised timeline by Friday, and each stakeholder should reconcile their budget allocations before the audit commences.

Looking ahead, we intend to outsource routine maintenance so that in-house engineers can prioritise product development. Please forward any concerns to your line manager; we will consolidate the feedback and circulate a summary next week.`,
  },
];

export function ReaderPage() {
  const { state } = useGame();
  const { data: me } = useMeQuery();
  const { data: decks = [] } = useDecksQuery();
  const { data: myVocabularies = [] } = useMyVocabulariesQuery();
  const createVocabulary = useCreateVocabularyMutation();
  const [sourceId, setSourceId] = useState<string>(LIBRARY[0].id);
  const [customText, setCustomText] = useState("");
  const [customTitle, setCustomTitle] = useState("My document");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [basket, setBasket] = useState<BasketItem[]>([]);
  const [deckId, setDeckId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [aiStatus, setAiStatus] = useState("Ready to help you discover useful words.");
  const [suggestions, setSuggestions] = useState<VocabularySuggestion[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [preview, setPreview] = useState<GeneratedCard[] | null>(null);
  const [savedThisSession, setSavedThisSession] = useState<string[]>([]);
  const [highlights, setHighlights] = useState<Record<string, HighlightDetail>>({});
  const [pdfStorageReady, setPdfStorageReady] = useState(false);
  const [showLearnedWords, setShowLearnedWords] = useState(false);
  const [importedHighlightTerms, setImportedHighlightTerms] = useState<string[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const skipNextBasketPersist = useRef(true);

  const doc = useMemo(() => {
    if (sourceId === "custom" || sourceId === "pdf") {
      return {
        title: customTitle || "My document",
        author: "Pasted text",
        emoji: "📄",
        text: customText,
      };
    }
    return LIBRARY.find((l) => l.id === sourceId) ?? LIBRARY[0];
  }, [sourceId, customText, customTitle]);

  const savedWords = useMemo(
    () => new Set([...state.words.map((w) => w.word.toLowerCase()), ...Object.keys(highlights)]),
    [state.words, highlights],
  );
  const savedVocabularyByWord = useMemo(() => {
    const entries = state.words.map(
      (word) =>
        [
          word.word.toLowerCase(),
          {
            ...word,
            difficulty: "EASY",
            partOfSpeech: "NOUN",
            bookmarked: false,
          } as unknown as Vocabulary,
        ] as [string, Vocabulary],
    );

    return new Map<string, Vocabulary>(entries);
  }, [state.words]);
  const basketWords = useMemo(
    () => new Set(basket.map((item) => item.word.toLowerCase())),
    [basket],
  );
  const pdfWordFrequencies = useMemo(() => sourceId === "pdf" ? scanDocumentWords(doc.text) : new Map<string, number>(), [sourceId, doc.text]);
  const learnedPdfWords = useMemo(() => {
    const userWords = new Set(myVocabularies.map((word) => word.word.toLocaleLowerCase()));
    return [...pdfWordFrequencies.keys()].filter((word) => userWords.has(word));
  }, [myVocabularies, pdfWordFrequencies]);

  const selected = basket.filter((b) => b.checked);

  useEffect(() => {
    if (!deckId && decks[0]) setDeckId(String(decks[0].id));
  }, [deckId, decks]);

  useEffect(() => {
    if (!me?.id) return;
    let active = true;

    void getLatestPdf(me.id).then((stored) => {
      if (!active || !stored) return;
      setPdfFile(stored.file);
      setCustomTitle(stored.title);
      setCustomText(stored.text);
      setBasket((stored.basket as BasketItem[] | undefined) ?? []);
      setHighlights((stored.highlights as Record<string, HighlightDetail> | undefined) ?? {});
      setSourceId("pdf");
      setPdfStorageReady(true);
    });

    return () => { active = false; };
  }, [me?.id]);

  async function handlePdfLoaded({ title, text, file, importedHighlights = [] }: { title: string; text: string; file: File; importedHighlights?: string[] }) {
    setCustomTitle(title);
    setCustomText(text);
    setPdfFile(file);
    setBasket([]);
    setHighlights({});
    setSourceId("pdf");
    setPdfStorageReady(true);
    setAiStatus("Your PDF is open. I can analyse its text while you read the original pages.");
    if (importedHighlights.length) {
      setImportedHighlightTerms(importedHighlights);
      setAiStatus(`I found ${importedHighlights.length} highlights you made earlier. Review them before adding to your basket.`);
    }
    speakPet("Your PDF is ready. Let’s find useful words together!", 1, 5);

    if (me?.id) {
      try {
        await saveLatestPdf({ userId: me.id, title, text, file, savedAt: Date.now(), basket: [], highlights: {} });
      } catch {
        toast.error("Your PDF could not be saved locally. Check browser storage permissions.");
      }
    }
  }

  useEffect(() => {
    if (sourceId === "pdf") return;
    const stored = localStorage.getItem(`vocapet:reader-highlights:${doc.title}`);
    setHighlights(stored ? JSON.parse(stored) : {});
  }, [doc.title, sourceId]);

  useEffect(() => {
    if (sourceId === "pdf") return;
    const stored = localStorage.getItem(`vocapet:reader-basket:${doc.title}`);
    skipNextBasketPersist.current = true;
    try {
      setBasket(stored ? JSON.parse(stored) : []);
    } catch {
      setBasket([]);
    }
  }, [doc.title, sourceId]);

  useEffect(() => {
    if (sourceId === "pdf") return;
    if (skipNextBasketPersist.current) {
      skipNextBasketPersist.current = false;
      return;
    }
    localStorage.setItem(`vocapet:reader-basket:${doc.title}`, JSON.stringify(basket));
  }, [basket, doc.title, sourceId]);

  useEffect(() => {
    if (!me?.id || !pdfFile || sourceId !== "pdf" || !pdfStorageReady) return;
    void saveLatestPdf({
      userId: me.id,
      title: customTitle,
      text: customText,
      file: pdfFile,
      basket,
      highlights,
      savedAt: Date.now(),
    });
  }, [me?.id, pdfFile, sourceId, pdfStorageReady, customTitle, customText, basket, highlights]);

  function handleSelection(event?: { clientX?: number; clientY?: number; fromPdf?: boolean }) {
    const sel = typeof window !== "undefined" ? window.getSelection() : null;
    let text = sel?.toString().trim().replace(/\s+/g, " ") ?? "";
    if (event?.fromPdf && event.clientX !== undefined && event.clientY !== undefined && /\s/.test(text)) {
      text = wordAtPointer(event.clientX, event.clientY) ?? text;
    }
    if (!text || text.length > 60) return;
    const clean = text.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
    if (!clean) return;
    setPanelOpen(true);
    setBasket((b) => {
      if (b.some((i) => i.word.toLowerCase() === clean.toLowerCase())) return b;
      return [
        ...b,
        {
          id: `${clean}-${Date.now()}`,
          word: clean,
          checked: true,
          sentence: sentenceAround(doc.text, clean),
        },
      ];
    });
    setAiStatus(`I saved “${clean}” with its sentence context. Add more when you spot them!`);
    speakPet(`Nice choice! I’ll help you remember ${clean}.`, 1, 4);
    sel?.removeAllRanges();
  }

  function wordAtPointer(clientX: number, clientY: number) {
    const documentWithCaret = document as Document & {
      caretRangeFromPoint?: (x: number, y: number) => Range | null;
    };
    const range = documentWithCaret.caretRangeFromPoint?.(clientX, clientY);
    const node = range?.startContainer;
    if (!node || node.nodeType !== Node.TEXT_NODE) return null;

    const value = node.textContent ?? "";
    const offset = Math.min(range?.startOffset ?? 0, value.length);
    const before = value.slice(0, offset).match(/[\p{L}'-]+$/u)?.[0] ?? "";
    const after = value.slice(offset).match(/^[\p{L}'-]+/u)?.[0] ?? "";
    const word = `${before}${after}`.replace(/^['-]+|['-]+$/g, "");
    return word || null;
  }

  function importExistingHighlights() {
    if (!importedHighlightTerms?.length) return;
    setBasket((current) => {
      const seen = new Set(current.map((item) => item.word.toLocaleLowerCase()));
      const next = [...current];
      for (const word of importedHighlightTerms) {
        if (seen.has(word.toLocaleLowerCase())) continue;
        seen.add(word.toLocaleLowerCase());
        next.push({
          id: `${word}-${Date.now()}-${next.length}`,
          word,
          checked: true,
          sentence: sentenceAround(doc.text, word),
        });
      }
      return next;
    });
    setPanelOpen(true);
    setImportedHighlightTerms(null);
    speakPet("I added your previous highlights to the basket. Let’s make flashcards!", 1, 5);
  }

  async function generate() {
    if (!selected.length) {
      toast.error("Highlight some words first");
      return;
    }
    setGenerating(true);
    setAiStatus("AI is reading the passage and checking each word in context…");
    petEvents.emit({ type: "SESSION_STARTED" });
    try {
      const res = await generateReaderFlashcardsApi({
        words: selected.map((s) => s.word),
        context: doc.text,
        sourceTitle: doc.title,
      });
      setPreview(res.cards.map((card) => ({ ...card, pos: card.partOfSpeech })));
      setAiStatus(
        res.companionMessage || `I prepared ${res.cards.length} flashcards for you to review.`,
      );
      speakPet(`I found ${res.cards.length} useful words. Let’s check them together!`, 1, 5);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate flashcards");
    } finally {
      setGenerating(false);
    }
  }

  async function askForSuggestions() {
    if (!doc.text.trim()) return;
    setSuggesting(true);
    setAiStatus("I’m reading this passage to find useful words for you…");
    try {
      const result = await suggestReaderVocabularyApi({
        context: doc.text,
        sourceTitle: doc.title,
      });
      setSuggestions(result.suggestions);
      setAiStatus(result.companionMessage);
      speakPet(result.companionMessage, 1, 5);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not analyze this passage");
    } finally {
      setSuggesting(false);
    }
  }

  function addSuggestion(suggestion: Pick<VocabularySuggestion, "word" | "contextSentence">) {
    setBasket((items) =>
      items.some((item) => item.word.toLowerCase() === suggestion.word.toLowerCase())
        ? items
        : [
            ...items,
            {
              id: `${suggestion.word}-${Date.now()}`,
              word: suggestion.word,
              checked: true,
              sentence: suggestion.contextSentence,
            },
          ],
    );
    setPanelOpen(true);
  }

  function addWordToReview(word: string) {
    const contextSentence = sentenceAround(doc.text, word);
    addSuggestion({ word, contextSentence });
    speakPet(`Let’s review ${word} together!`, 2, 4);
  }

  async function saveAll() {
    if (!preview) return;
    if (!deckId) {
      toast.error("Create a deck first");
      return;
    }
    const parsedDeckId = Number(deckId);
    if (!Number.isFinite(parsedDeckId)) return;
    try {
      await Promise.all(
        preview.map((card) =>
          createVocabulary.mutateAsync({
            deckId: parsedDeckId,
            payload: {
              word: card.word,
              meaning: card.meaning,
              example: card.example,
              difficulty: ["C1", "C2"].includes(card.cefr)
                ? "HARD"
                : ["B2", "B1"].includes(card.cefr)
                  ? "MEDIUM"
                  : "EASY",
              partOfSpeech:
                card.pos === "adj"
                  ? "ADJECTIVE"
                  : card.pos === "adv"
                    ? "ADVERB"
                    : card.pos === "verb"
                      ? "VERB"
                      : "NOUN",
            },
          }),
        ),
      );
    } catch (error) {
      toast.error("Could not save every flashcard. Please try again.");
      return;
    }
    const deck = decks.find((d) => d.id === parsedDeckId);
    toast.success(`Saved ${preview.length} flashcards to ${deck?.name ?? "deck"}`);
    setAiStatus(
      `Great work — ${preview.length} cards are scheduled for review. I’ll remind you when they are due.`,
    );
    speakPet("Your new cards are ready. I’ll help you review them!", 1, 5);
    petEvents.emit({ type: "SESSION_FINISHED" });
    setSavedThisSession((s) => [...preview.map((c) => c.word), ...s]);
    const nextHighlights = Object.fromEntries(
      preview.map((card) => [
        card.word.toLowerCase(),
        {
          meaning: card.meaning,
          lastReviewed: "Just added",
          retention: 92,
        },
      ]),
    );
    setHighlights((current) => {
      const next = { ...current, ...nextHighlights };
      localStorage.setItem(`vocapet:reader-highlights:${doc.title}`, JSON.stringify(next));
      return next;
    });
    const savedSet = new Set(preview.map((c) => c.word.toLowerCase()));
    setBasket((b) => b.filter((i) => !savedSet.has(i.word.toLowerCase())));
    setPreview(null);
  }

  function patchCard(i: number, patch: Partial<GeneratedCard>) {
    setPreview((p) => (p ? p.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) : p));
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCustomText(String(reader.result ?? ""));
      setCustomTitle(file.name.replace(/\.[^.]+$/, ""));
      setSourceId("custom");
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border-2 border-border gradient-to-br from-primary/15 via-accent to-secondary p-6 card-pop">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center text-3xl">
            📖
          </div>
          <div>
            <h1 className="text-2xl font-extrabold">Reader with Burumaru</h1>
            <p className="text-sm text-muted-foreground font-semibold">
              Highlight words as you read — collect them in the basket, then generate all flashcards
              at once.
            </p>
          </div>
          <div className="ml-auto hidden sm:flex items-center gap-3 rounded-2xl border border-primary/25 bg-card/70 px-3 py-2">
            <Pet
              variant={state.petVariant}
              stage={stageForLevel(state.petLevel)}
              mood="happy"
              size={46}
            />
            <p className="max-w-52 text-xs font-semibold text-muted-foreground">{aiStatus}</p>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={sourceId} onValueChange={setSourceId}>
          <SelectTrigger className="w-280px rounded-xl border-2 font-bold">
            <SelectValue placeholder="Choose a text" />
          </SelectTrigger>
          <SelectContent>
            {pdfFile && <SelectItem value="pdf">Uploaded PDF: {customTitle || "Untitled"}</SelectItem>}
            {LIBRARY.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.emoji} {l.title}
              </SelectItem>
            ))}
            <SelectItem value="custom">📄 My own text</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          className="rounded-xl border-2 font-bold"
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="w-4 h-4 mr-2" /> Upload .txt
        </Button>
        <Button
          variant="outline"
          className="rounded-xl border-2 font-bold"
          onClick={askForSuggestions}
          disabled={suggesting || !doc.text.trim()}
        >
          {suggesting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2" />
          )}
          Ask Burumaru for suggestions
        </Button>
        <input ref={fileRef} type="file" accept=".txt,.md,text/plain" hidden onChange={onFile} />
        <PdfReaderLoader onLoaded={({ title, text, file, importedHighlights }) => {
          void handlePdfLoaded({ title, text, file, importedHighlights });
          setCustomTitle(title);
          setCustomText(text);
          setPdfFile(file);
          setSourceId("pdf");
          setAiStatus("Your PDF is open. I can analyse its text while you read the original pages.");
          speakPet("Your PDF is ready. Let’s find useful words together!", 1, 5);
        }} />

        {sourceId === "pdf" && (
          <label className="flex items-center gap-2 rounded-xl border-2 border-border bg-card px-3 py-2 text-xs font-bold">
            <input type="checkbox" checked={showLearnedWords} onChange={(event) => setShowLearnedWords(event.target.checked)} className="accent-primary" />
            Show learned words ({learnedPdfWords.length})
          </label>
        )}

        {!panelOpen && (
          <Button className="rounded-xl font-bold ml-auto" onClick={() => setPanelOpen(true)}>
            <ShoppingBasket className="w-4 h-4 mr-2" /> Basket ({basket.length})
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] items-start">
        {/* Document */}
        <article className="rounded-3xl border-2 border-border bg-card p-6 card-pop">
          {sourceId === "custom" && (
            <div className="space-y-2 mb-5">
              <Label className="font-bold">Paste your book or document</Label>
              <Input
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Title"
                className="rounded-xl border-2"
              />
              <Textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Paste any English text here, then highlight words as you read…"
                className="rounded-xl border-2 min-h-140px"
              />
            </div>
          )}

          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl">{doc.emoji}</span>
            <h2 className="text-xl font-extrabold">{doc.title}</h2>
          </div>
          <p className="text-xs font-bold text-muted-foreground mb-4">{doc.author}</p>

          {sourceId === "pdf" && (
            <div className="mb-4 grid grid-cols-3 gap-2 rounded-2xl border border-primary/20 bg-primary/5 p-3 text-center text-xs">
              <div><p className="text-lg font-extrabold">{pdfWordFrequencies.size}</p><p className="text-muted-foreground">unique words</p></div>
              <div><p className="text-lg font-extrabold text-primary">{learnedPdfWords.length}</p><p className="text-muted-foreground">already learned</p></div>
              <div><p className="text-lg font-extrabold text-amber-600">{basketWords.size}</p><p className="text-muted-foreground">in basket</p></div>
            </div>
          )}

          {sourceId === "pdf" && pdfFile ? (
            <PdfDocumentViewer
              file={pdfFile}
              onTextSelected={handleSelection}
              basketWords={[...basketWords]}
              learnedWords={showLearnedWords ? learnedPdfWords : []}
            />
          ) : doc.text.trim() ? (
            <div
              onMouseUp={handleSelection}
              onTouchEnd={handleSelection}
              className="prose-reader space-y-4 text-[17px] leading-8 selection:bg-primary/30 cursor-text"
            >
              {doc.text.split(/\n{2,}/).map((para, i) => (
                <p key={i}>
                  <ReadingParagraph
                    text={para}
                    savedWords={savedWords}
                    basketWords={basketWords}
                    vocabularyByWord={savedVocabularyByWord}
                    highlights={highlights}
                    onReview={addWordToReview}
                  />
                </p>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground font-semibold">
              Paste some text above to start reading.
            </p>
          )}
          {suggestions.length > 0 && (
            <section className="mt-6 rounded-2xl border-2 border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">🐾</span>
                <p className="font-extrabold">Burumaru’s vocabulary picks</p>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.word}
                    onClick={() => addSuggestion(suggestion)}
                    className="rounded-xl border border-border bg-card p-3 text-left hover:border-primary transition-colors"
                  >
                    <span className="font-extrabold text-primary">{suggestion.word}</span>
                    <p className="mt-1 text-xs text-muted-foreground">{suggestion.reason}</p>
                    <p className="mt-1 text-[11px] italic text-muted-foreground line-clamp-2">
                      “{suggestion.contextSentence}”
                    </p>
                  </button>
                ))}
              </div>
            </section>
          )}
        </article>

        {/* Vocabulary Basket */}
        {panelOpen && (
          <aside className="lg:sticky lg:top-24 rounded-3xl border-2 border-border bg-card p-5 card-pop space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">🐱</span>
              <h2 className="font-extrabold">Vocabulary Basket</h2>
              <span className="text-xs font-bold text-muted-foreground">({basket.length})</span>
              <button
                onClick={() => setPanelOpen(false)}
                className="ml-auto text-muted-foreground hover:text-foreground"
                aria-label="Hide side panel"
              >
                <PanelRightClose className="w-5 h-5" />
              </button>
            </div>

            {basket.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-border p-5 text-center space-y-2">
                <BookOpen className="w-8 h-8 mx-auto text-muted-foreground" />
                <p className="text-sm font-bold">Highlight words while you read</p>
                <p className="text-xs text-muted-foreground">
                  Each word you select drops into the basket. When you finish the passage, generate
                  every flashcard in one go.
                </p>
              </div>
            ) : (
              <ul className="space-y-1.5 max-h-320px overflow-auto pr-1">
                {basket.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-2 rounded-xl border-2 border-border px-2.5 py-1.5"
                  >
                    <button
                      onClick={() =>
                        setBasket((b) =>
                          b.map((i) => (i.id === item.id ? { ...i, checked: !i.checked } : i)),
                        )
                      }
                      aria-label={item.checked ? `Unselect ${item.word}` : `Select ${item.word}`}
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                        item.checked
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-border"
                      }`}
                    >
                      {item.checked && <Check className="w-3.5 h-3.5" />}
                    </button>
                    <span className="font-bold text-sm truncate">{item.word}</span>
                    {savedWords.has(item.word.toLowerCase()) && (
                      <span className="text-[10px] font-bold text-muted-foreground">saved</span>
                    )}
                    <button
                      onClick={() => speakWord(item.word)}
                      className="ml-auto text-muted-foreground hover:text-primary"
                      aria-label={`Pronounce ${item.word}`}
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setBasket((b) => b.filter((i) => i.id !== item.id))}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${item.word}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="border-t-2 border-border pt-4 space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Save into deck</Label>
                <Select value={deckId} onValueChange={setDeckId}>
                  <SelectTrigger className="rounded-xl border-2">
                    <SelectValue placeholder="Deck" />
                  </SelectTrigger>
                  <SelectContent>
                    {decks.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.emoji} {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={generate}
                disabled={generating || selected.length === 0}
                className="w-full rounded-xl font-extrabold"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" /> Generate {selected.length} Flashcard
                    {selected.length === 1 ? "" : "s"}
                  </>
                )}
              </Button>
              {basket.length > 0 && (
                <button
                  onClick={() => setBasket([])}
                  className="w-full text-xs font-bold text-muted-foreground hover:text-destructive flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear basket
                </button>
              )}
              <p className="text-[11px] text-muted-foreground font-semibold text-center">
                AI reads the whole passage once and writes meaning, example, IPA and CEFR for every
                word.
              </p>
            </div>

            {savedThisSession.length > 0 && (
              <div className="pt-2 border-t-2 border-border space-y-2">
                <p className="text-xs font-extrabold text-muted-foreground uppercase">
                  Saved while reading ({savedThisSession.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {savedThisSession.map((w, i) => (
                    <span
                      key={`${w}-${i}`}
                      className="px-2 py-1 rounded-lg bg-primary/10 border border-primary/30 text-xs font-bold"
                    >
                      {w}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </aside>
        )}
      </div>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto rounded-3xl border-2">
          <DialogHeader>
            <DialogTitle className="font-extrabold flex items-center gap-2">
              <Highlighter className="w-5 h-5 text-primary" />
              Preview {preview?.length ?? 0} flashcards
            </DialogTitle>
            <DialogDescription>
              Tweak anything you like, then save them all into your deck.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {preview?.map((c, i) => (
              <div
                key={`${c.word}-${i}`}
                className="rounded-2xl border-2 border-border p-4 space-y-2"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-lg">{c.word}</span>
                  <span className="text-xs font-bold text-muted-foreground">{c.ipa}</span>
                  <span className="px-2 py-0.5 rounded-lg bg-primary/10 border border-primary/30 text-[11px] font-extrabold">
                    {c.cefr}
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-muted text-[11px] font-bold">
                    {c.pos}
                  </span>
                  <button
                    onClick={() => speakWord(c.word)}
                    className="ml-auto text-muted-foreground hover:text-primary"
                    aria-label={`Pronounce ${c.word}`}
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPreview((p) => (p ? p.filter((_, idx) => idx !== i) : p))}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`Remove ${c.word}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <Textarea
                  value={c.meaning}
                  onChange={(e) => patchCard(i, { meaning: e.target.value })}
                  className="rounded-xl border-2 min-h-56px"
                />
                <Textarea
                  value={c.example}
                  onChange={(e) => patchCard(i, { example: e.target.value })}
                  className="rounded-xl border-2 min-h-56px italic"
                />
              </div>
            ))}
          </div>

          <Button
            onClick={saveAll}
            disabled={!preview?.length}
            className="w-full rounded-xl font-extrabold"
          >
            <Check className="w-4 h-4 mr-2" /> Save All
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={!!importedHighlightTerms} onOpenChange={(open) => !open && setImportedHighlightTerms(null)}>
        <DialogContent className="max-w-lg rounded-3xl border-2">
          <DialogHeader>
            <DialogTitle className="font-extrabold">Import previous highlights</DialogTitle>
            <DialogDescription>
              Burumaru found {importedHighlightTerms?.length ?? 0} highlights embedded in this PDF. Remove anything you do not want, then add the rest to your basket.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-72 space-y-2 overflow-auto pr-1">
            {importedHighlightTerms?.map((word) => (
              <div key={word} className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3 py-2">
                <span className="font-bold">{word}</span>
                <button type="button" onClick={() => setImportedHighlightTerms((terms) => terms?.filter((term) => term !== word) ?? null)} className="text-muted-foreground hover:text-destructive" aria-label={`Remove ${word}`}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <Button onClick={importExistingHighlights} disabled={!importedHighlightTerms?.length} className="rounded-xl font-extrabold">
            <ShoppingBasket className="mr-2 h-4 w-4" /> Add to basket
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
