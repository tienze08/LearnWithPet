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
  dueReviews: number;
  dailyGoal: number;
  daysTogether: number;
  totalSessionsTogether: number;
  usualStudyHour: number;
  learningProfile: LearningProfile;
  frequentlyWrongWord: string | null;
  intent: PetIntent;
  reaction: PetBehaviorResponse;
}

export interface LearningProfile {
  totalWordsLearned: number;
  totalReviews: number;
  totalStudyMinutes: number;
  averageQuizScore: number;
  strongestTopic: string | null;
  weakestTopic: string | null;
  weakestDeckId: number | null;
  preferredStudyHour: number;
}

export interface CompanionPreferences {
  personality?: CompanionPersonality;
  remindersEnabled?: boolean;
  quietHoursStart?: number;
  quietHoursEnd?: number;
}
