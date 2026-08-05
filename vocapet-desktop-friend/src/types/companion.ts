import type { PetBehaviorResponse } from "./pet";

export type CompanionPersonality = "GENTLE" | "PLAYFUL" | "FOCUSED";
export type PetIntent =
  | "REST"
  | "MORNING_GREETING"
  | "RECONNECT"
  | "USUAL_STUDY_TIME"
  | "REVISIT_TRICKY_WORD"
  | "INVITE_STUDY"
  | "CELEBRATE_PROGRESS"
  | "AMBIENT_WAITING";
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
  daysTogether: number;
  totalSessionsTogether: number;
  usualStudyHour: number;
  frequentlyWrongWord: string | null;
  intent: PetIntent;
  reaction: PetBehaviorResponse;
}

export interface CompanionPreferences {
  personality?: CompanionPersonality;
  remindersEnabled?: boolean;
  quietHoursStart?: number;
  quietHoursEnd?: number;
}
