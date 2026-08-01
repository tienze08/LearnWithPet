import type { GameState } from "./store";

export type DailyTask = {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  coins: number;
  target: number;
  progress: (s: GameState) => number;
};

export const DAILY_TASKS: DailyTask[] = [
  {
    id: "warmup",
    title: "Warm-up Review",
    description: "Review 5 words today to wake up your brain.",
    icon: "📖",
    xp: 20,
    coins: 10,
    target: 5,
    progress: (s) => Math.min(5, s.dailyProgress),
  },
  {
    id: "daily-goal",
    title: "Hit Your Daily Goal",
    description: "Complete your daily review goal.",
    icon: "🎯",
    xp: 50,
    coins: 25,
    target: 1,
    progress: (s) => (s.dailyProgress >= s.dailyGoal ? 1 : 0),
  },
  {
    id: "sharp-mind",
    title: "Sharp Mind",
    description: "Answer 10 questions correctly today.",
    icon: "🧠",
    xp: 40,
    coins: 15,
    target: 10,
    progress: (s) => Math.min(10, s.dailyCorrect),
  },
  {
    id: "double-up",
    title: "Double Up",
    description: "Review 20 words today.",
    icon: "🔥",
    xp: 60,
    coins: 30,
    target: 20,
    progress: (s) => Math.min(20, s.dailyProgress),
  },
  {
    id: "word-master",
    title: "Word Master",
    description: "Master a new word (reach mastery 4+).",
    icon: "🏆",
    xp: 35,
    coins: 20,
    target: 1,
    progress: (s) =>
      Object.values(s.masteryByWord).some((m) => m >= 4) ? 1 : 0,
  },
  {
    id: "streak-keeper",
    title: "Streak Keeper",
    description: "Keep your streak alive (study today).",
    icon: "⚡",
    xp: 25,
    coins: 10,
    target: 1,
    progress: (s) => (s.dailyProgress > 0 ? 1 : 0),
  },
];
