export type PetEventType =
  | "SESSION_STARTED"
  | "SESSION_FINISHED"
  | "QUIZ_STARTED"
  | "QUIZ_COMPLETED"
  | "CARD_REVIEWED"
  | "ANSWER_CORRECT"
  | "ANSWER_WRONG"
  | "LEVEL_UP"
  | "STREAK_UPDATED"
  | "REMINDER_TRIGGERED";

export type PetEvent = {
  type: PetEventType;
  detail?: { streak?: number; dailyGoalComplete?: boolean };
};

type Listener = (event: PetEvent) => void;

const listeners = new Set<Listener>();

export const petEvents = {
  emit(event: PetEvent) {
    listeners.forEach((listener) => listener(event));
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
