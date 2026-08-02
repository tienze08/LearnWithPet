import type { GameState } from "./store";

export type AchievementTier = "bronze" | "silver" | "gold" | "legendary";

export type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: "Learning" | "Streak" | "Pet" | "Collection" | "Mastery";
  tier: AchievementTier;
  target: number;
  progress: (s: GameState) => number;
};

const mastered = (s: GameState, min = 4) =>
  Object.values(s.masteryByWord).filter((m) => m >= min).length;

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first-review",
    title: "First Steps",
    description: "Review your very first word.",
    icon: "🌱",
    category: "Learning",
    tier: "bronze",
    target: 1,
    progress: (s) => s.reviewHistory.length,
  },
  {
    id: "reviews-50",
    title: "Getting Warm",
    description: "Review 50 words in total.",
    icon: "📖",
    category: "Learning",
    tier: "silver",
    target: 50,
    progress: (s) => s.reviewHistory.length,
  },
  {
    id: "reviews-250",
    title: "Bookworm",
    description: "Review 250 words in total.",
    icon: "📚",
    category: "Learning",
    tier: "gold",
    target: 250,
    progress: (s) => s.reviewHistory.length,
  },
  {
    id: "streak-3",
    title: "Habit Forming",
    description: "Keep a 3-day study streak.",
    icon: "🔥",
    category: "Streak",
    tier: "bronze",
    target: 3,
    progress: (s) => s.streak,
  },
  {
    id: "streak-7",
    title: "Week Warrior",
    description: "Keep a 7-day study streak.",
    icon: "⚡",
    category: "Streak",
    tier: "silver",
    target: 7,
    progress: (s) => s.streak,
  },
  {
    id: "streak-30",
    title: "Unstoppable",
    description: "Keep a 30-day study streak.",
    icon: "🏅",
    category: "Streak",
    tier: "legendary",
    target: 30,
    progress: (s) => s.streak,
  },
  {
    id: "level-5",
    title: "Rising Learner",
    description: "Reach account level 5.",
    icon: "⭐",
    category: "Learning",
    tier: "silver",
    target: 5,
    progress: (s) => s.level,
  },
  {
    id: "level-10",
    title: "Vocabulary Adept",
    description: "Reach account level 10.",
    icon: "🌟",
    category: "Learning",
    tier: "gold",
    target: 10,
    progress: (s) => s.level,
  },
  {
    id: "pet-level-5",
    title: "Growing Buddy",
    description: "Evolve your pet to stage 2 (level 5).",
    icon: "🐣",
    category: "Pet",
    tier: "silver",
    target: 5,
    progress: (s) => s.petLevel,
  },
  {
    id: "pet-level-10",
    title: "Legendary Companion",
    description: "Evolve your pet to stage 3 (level 10).",
    icon: "🐲",
    category: "Pet",
    tier: "legendary",
    target: 10,
    progress: (s) => s.petLevel,
  },
  {
    id: "mastery-5",
    title: "Word Collector",
    description: "Master 5 words (mastery 4+).",
    icon: "🎯",
    category: "Mastery",
    tier: "bronze",
    target: 5,
    progress: (s) => mastered(s),
  },
  {
    id: "mastery-25",
    title: "Word Master",
    description: "Master 25 words (mastery 4+).",
    icon: "👑",
    category: "Mastery",
    tier: "gold",
    target: 25,
    progress: (s) => mastered(s),
  },
  {
    id: "coins-500",
    title: "Coin Hoarder",
    description: "Collect 500 coins.",
    icon: "🪙",
    category: "Collection",
    tier: "silver",
    target: 500,
    progress: (s) => s.coins,
  },
  {
    id: "favorites-10",
    title: "Curator",
    description: "Add 10 words to favorites.",
    icon: "💖",
    category: "Collection",
    tier: "bronze",
    target: 10,
    progress: (s) => s.favorites.length,
  },
  {
    id: "decks-5",
    title: "Deck Builder",
    description: "Have 5 decks in your library.",
    icon: "🗂️",
    category: "Collection",
    tier: "silver",
    target: 5,
    progress: (s) => s.decks.length,
  },
];

export const TIER_LABEL: Record<AchievementTier, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  legendary: "Legendary",
};

export function achievementStatus(a: Achievement, s: GameState) {
  const raw = a.progress(s);
  const value = Math.max(0, Math.min(a.target, raw));
  return { value, pct: Math.round((value / a.target) * 100), unlocked: raw >= a.target };
}
