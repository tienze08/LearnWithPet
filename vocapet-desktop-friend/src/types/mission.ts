export type MissionType =
  | "LEARN_WORDS"
  | "FINISH_SESSION"
  | "REVIEW_COUNT"
  | "STUDY_TIME";

export interface UserMissionResponse {
  id: number;
  title: string;
  description: string;

  type: MissionType;

  currentValue: number;
  targetValue: number;

  rewardXp: number;
  rewardCoin: number;

  completed: boolean;
  rewardClaimed: boolean;
}