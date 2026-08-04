import type { PetBehaviorResponse } from "./pet";

export type CompanionPersonality = "GENTLE" | "PLAYFUL" | "FOCUSED";
export type CompanionEventType =
  | "APP_OPENED"
  | "STUDY_STARTED"
  | "REVIEW_COMPLETED"
  | "SESSION_COMPLETED"
  | "ANSWER_CORRECT"
  | "ANSWER_WRONG"
  | "DAILY_GOAL_COMPLETED"
  | "STREAK_BROKEN";

export interface CompanionStateResponse {
  petName: string;
  species: string;
  petLevel: number;
  personality: CompanionPersonality;
  energy: number;
  remindersEnabled: boolean;
  quietHoursStart: number;
  quietHoursEnd: number;
  streak: number;
  reviewsToday: number;
  dailyGoal: number;
  reaction: PetBehaviorResponse;
}

export interface CompanionPreferences {
  personality?: CompanionPersonality;
  remindersEnabled?: boolean;
  quietHoursStart?: number;
  quietHoursEnd?: number;
}
