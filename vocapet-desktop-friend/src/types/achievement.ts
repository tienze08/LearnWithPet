export type AchievementStatusResponse = {
  code: string;
  progress: number;
  target: number;
  unlocked: boolean;
  unlockedAt: string | null;
};
