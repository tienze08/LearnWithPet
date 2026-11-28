// Pure pet rules: mood, growth stage and experience per level.
import type { PetMood, PetStage } from "@/lib/store";

export const BASE_EXP = 100;
export const EXP_GROWTH = 1.2;

export function computePetMood(opts: {
  reviewsToday: number;
  dailyGoal: number;
  streak: number;
  studiedToday: boolean;
}): PetMood {
  const { reviewsToday, dailyGoal, streak, studiedToday } = opts;
  const hour = new Date().getHours();
  if (!studiedToday || reviewsToday === 0) return hour >= 23 || hour < 6 ? "sleepy" : "waiting";
  if (reviewsToday >= dailyGoal && streak >= 7) return "excited";
  if (reviewsToday >= dailyGoal) return "happy";
  return "waiting";
}

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
