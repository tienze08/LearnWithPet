import type { PetAction } from "@/components/PixiPet/AnimationController";
import type { PetMood } from "@/lib/store";
import type { PetEvent } from "./events";

export type PetReaction = {
  action: PetAction;
  emotion: PetMood;
  message?: string;
  priority: number;
};

const reactions: Record<PetEvent["type"], PetReaction> = {
  SESSION_STARTED: { action: "STUDY", emotion: "waiting", message: "Let's learn together!", priority: 1 },
  SESSION_FINISHED: { action: "HAPPY", emotion: "happy", message: "Nice work today!", priority: 2 },
  QUIZ_STARTED: { action: "THINK", emotion: "waiting", message: "I'm thinking with you.", priority: 1 },
  QUIZ_COMPLETED: { action: "IDLE", emotion: "waiting", priority: 0 },
  CARD_REVIEWED: { action: "STUDY", emotion: "waiting", priority: 0 },
  ANSWER_CORRECT: { action: "CELEBRATE", emotion: "happy", message: "Great job!", priority: 2 },
  ANSWER_WRONG: { action: "SAD", emotion: "sad", message: "No worries — we'll learn it together.", priority: 1 },
  LEVEL_UP: { action: "CELEBRATE", emotion: "excited", message: "You leveled up!", priority: 3 },
  STREAK_UPDATED: { action: "CELEBRATE", emotion: "excited", message: "Your streak is growing!", priority: 2 },
  REMINDER_TRIGGERED: { action: "IDLE", emotion: "waiting", message: "Ready for today's review?", priority: 1 },
};

export function reactionFor(event: PetEvent): PetReaction {
  const reaction = reactions[event.type];
  if (event.detail?.dailyGoalComplete) {
    return { action: "CELEBRATE", emotion: "excited", message: "You completed today's goal!", priority: 3 };
  }
  return reaction;
}
