import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { SEED_DECKS, SEED_WORDS, type Deck, type Word } from "./vocab-seed";

export type PetMood = "happy" | "sad" | "sleepy" | "excited" | "waiting";

export function computePetMood(opts: {
  reviewsToday: number;
  dailyGoal: number;
  streak: number;
  studiedToday: boolean;
}): PetMood {
  const { reviewsToday, dailyGoal, streak, studiedToday } = opts;
  if (!studiedToday || reviewsToday === 0) return "sad";
  if (reviewsToday >= dailyGoal && streak >= 7) return "excited";
  if (reviewsToday >= dailyGoal) return "happy";
  return "waiting";
}
export type PetVariant = "CAT" | "FOX" | "BUNNY" | "PANDA" | "DRAGON";
export type PetStage = 1 | 2 | 3;

export type UserProfile = {
  displayName: string;
  avatarEmoji: string;
  email?: string;
  joinedAt: number;
  onboarded: boolean;
};

export type ReviewEntry = {
  wordId: string;
  correct: boolean;
  at: number;
};

export type GameState = {
  xp: number;
  level: number;
  coins: number;
  streak: number;
  lastStudyDate: string | null;
  dailyGoal: number;
  dailyProgress: number;
  dailyDate: string;
  masteryByWord: Record<string, number>;
  favorites: string[];
  petMood: PetMood;
  petName: string;
  petVariant: PetVariant;
  petLevel: number;
  petExp: number;
  expToNextLevel: number;
  reviewHistory: ReviewEntry[];
  popupIntervalMin: number;
  decks: Deck[];
  words: Word[];
  user: UserProfile;
};

const STORAGE_KEY = "vocapet:v1";
const BASE_EXP = 100;
const EXP_GROWTH = 1.2;
const EXP_PER_CORRECT = 25;
const EXP_PER_WRONG = 5;

export function stageForLevel(level: number): PetStage {
  if (level >= 10) return 3;
  if (level >= 5) return 2;
  return 1;
}

export function expForLevel(level: number): number {
  let v = BASE_EXP;
  for (let i = 1; i < level; i++) v = Math.floor(v * EXP_GROWTH);
  return v;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const initialState: GameState = {
  xp: 0,
  level: 1,
  coins: 50,
  streak: 0,
  lastStudyDate: null,
  dailyGoal: 10,
  dailyProgress: 0,
  dailyDate: todayISO(),
  masteryByWord: {},
  favorites: [],
  petMood: "happy",
  petName: "Pip",
  petVariant: "CAT",
  petLevel: 1,
  petExp: 0,
  expToNextLevel: BASE_EXP,
  reviewHistory: [],
  popupIntervalMin: 5,
  decks: SEED_DECKS,
  words: SEED_WORDS,
  user: {
    displayName: "",
    avatarEmoji: "🦊",
    joinedAt: Date.now(),
    onboarded: false,
  },
};

const VALID_VARIANTS: PetVariant[] = ["CAT", "FOX", "BUNNY", "PANDA", "DRAGON"];

function load(): GameState {
  if (typeof window === "undefined") return initialState;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return initialState;
  const parsed = JSON.parse(raw) as Partial<GameState>;
  const petVariant = VALID_VARIANTS.includes(parsed.petVariant as PetVariant)
    ? (parsed.petVariant as PetVariant)
    : initialState.petVariant;
  const merged: GameState = {
    ...initialState,
    ...parsed,
    petVariant,
    user: { ...initialState.user, ...(parsed.user ?? {}) },
    decks: parsed.decks?.length ? parsed.decks : SEED_DECKS,
    words: parsed.words?.length ? parsed.words : SEED_WORDS,
  };
  // backfill EXP curve for legacy saves
  if (typeof parsed.petExp !== "number") merged.petExp = 0;
  if (typeof parsed.expToNextLevel !== "number" || merged.expToNextLevel <= 0) {
    merged.expToNextLevel = expForLevel(merged.petLevel || 1);
  }
  if (!merged.petLevel || merged.petLevel < 1) merged.petLevel = 1;
  return merged;
}

type Ctx = {
  state: GameState;

  setState: (updater: (s: GameState) => GameState) => void;

  recordAnswer: (wordId: string, correct: boolean) => void;

  addDeck: (deck: Omit<Deck, "id">) => string;

  addWord: (w: Omit<Word, "id">) => void;

  updateDeck: (id: string, patch: Partial<Omit<Deck, "id">>) => void;

  deleteDeck: (id: string) => void;

  updateWord: (id: string, patch: Partial<Omit<Word, "id" | "deckId">>) => void;

  deleteWord: (id: string) => void;

  toggleFavorite: (wordId: string) => void;

  setPetInterval: (min: number) => void;
};

const Ctx = createContext<Ctx | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setStateRaw] = useState<GameState>(initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStateRaw(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const t = todayISO();
    if (state.dailyDate !== t) {
      setStateRaw((s) => ({ ...s, dailyDate: t, dailyProgress: 0 }));
    }
  }, [hydrated, state.dailyDate]);

  useEffect(() => {
    if (!hydrated) return;
    const id = setInterval(() => {
      setStateRaw((s) => {
        const t = todayISO();
        const studiedToday = s.lastStudyDate === t;
        const reviewsToday = s.dailyDate === t ? s.dailyProgress : 0;
        const mood = computePetMood({
          reviewsToday,
          dailyGoal: s.dailyGoal,
          streak: s.streak,
          studiedToday,
        });
        return s.petMood === mood ? s : { ...s, petMood: mood };
      });
    }, 30_000);
    return () => clearInterval(id);
  }, [hydrated]);

  const api = useMemo<Ctx>(() => {
    const setState: Ctx["setState"] = (updater) => setStateRaw((s) => updater(s));
    return {
      state,
      setState,
      recordAnswer(wordId, correct) {
        setStateRaw((s) => {
          const mastery = { ...s.masteryByWord };
          const cur = mastery[wordId] ?? 0;
          mastery[wordId] = Math.max(0, Math.min(5, cur + (correct ? 1 : -1)));
          const xpGain = correct ? 10 : 2;
          const coinGain = correct ? 5 : 0;
          const newXp = s.xp + xpGain;
          const newLevel = Math.floor(newXp / 100) + 1;
          const t = todayISO();
          const sameDay = s.lastStudyDate === t;
          const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
          const streak = sameDay ? s.streak : s.lastStudyDate === yesterday ? s.streak + 1 : 1;

          // ---- Pet EXP / level curve ----
          let petLevel = s.petLevel;
          let petExp = s.petExp + (correct ? EXP_PER_CORRECT : EXP_PER_WRONG);
          let expToNext = s.expToNextLevel > 0 ? s.expToNextLevel : expForLevel(petLevel);
          while (petExp >= expToNext) {
            petExp -= expToNext;
            petLevel += 1;
            expToNext = Math.floor(expToNext * EXP_GROWTH);
          }

          const newDailyProgress = s.dailyDate === t ? s.dailyProgress + 1 : 1;
          const mood = correct
            ? computePetMood({
                reviewsToday: newDailyProgress,
                dailyGoal: s.dailyGoal,
                streak,
                studiedToday: true,
              })
            : "sad";

          return {
            ...s,
            masteryByWord: mastery,
            xp: newXp,
            level: newLevel,
            coins: s.coins + coinGain,
            streak,
            lastStudyDate: t,
            dailyProgress: newDailyProgress,
            dailyDate: t,
            petMood: mood,
            petLevel,
            petExp,
            expToNextLevel: expToNext,
            reviewHistory: [{ wordId, correct, at: Date.now() }, ...s.reviewHistory].slice(0, 500),
          };
        });
      },
      addDeck(deck) {
        const id = "deck_" + Math.random().toString(36).slice(2, 8);
        setStateRaw((s) => ({ ...s, decks: [...s.decks, { ...deck, id }] }));
        return id;
      },
      addWord(w) {
        const id = "w_" + Math.random().toString(36).slice(2, 8);
        setStateRaw((s) => ({ ...s, words: [...s.words, { ...w, id }] }));
      },
      updateDeck(id, patch) {
        setStateRaw((s) => ({
          ...s,
          decks: s.decks.map((deck) =>
            deck.id === id
              ? {
                  ...deck,
                  ...patch,
                }
              : deck,
          ),
        }));
      },
      deleteDeck(id) {
        setStateRaw((s) => ({
          ...s,
          decks: s.decks.filter((d) => d.id !== id),

          words: s.words.filter((w) => w.deckId !== id),
        }));
      },
      updateWord(id, patch) {
        setStateRaw((s) => ({
          ...s,
          words: s.words.map((word) =>
            word.id === id
              ? {
                  ...word,
                  ...patch,
                }
              : word,
          ),
        }));
      },
      deleteWord(id) {
        setStateRaw((s) => ({
          ...s,
          words: s.words.filter((word) => word.id !== id),
        }));
      },
      toggleFavorite(wordId) {
        setStateRaw((s) => ({
          ...s,
          favorites: s.favorites.includes(wordId)
            ? s.favorites.filter((f) => f !== wordId)
            : [...s.favorites, wordId],
        }));
      },
      setPetInterval(min) {
        setStateRaw((s) => ({ ...s, popupIntervalMin: min }));
      },
    };
  }, [state]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useGame() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useGame must be used inside GameProvider");
  return ctx;
}
