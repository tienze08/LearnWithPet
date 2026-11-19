import { apiFetch } from "./client";

// Personalized Learning Path. The backend decides what to study; questions are generated on the frontend
// (grammar/kanji content lives here), and only item ids and results go over the wire.

export type PathItemType = "GRAMMAR" | "VOCAB" | "KANJI";
export type BlockType = PathItemType | "REVIEW";
/** Display and study order of the Today blocks. */
export const BLOCK_ORDER: BlockType[] = ["GRAMMAR", "VOCAB", "KANJI", "REVIEW"];
export type MasteryState = "NOT_STARTED" | "LEARNING" | "UNDERSTOOD" | "MEMORIZED" | "MASTERED";
export type StartingLevel = "BEGINNER" | "STUDYING" | "KNOWS_LEVEL";
export type PathGoal = "PASS_JLPT" | "BASIC_CONVERSATION" | "PREPARE_NEXT_LEVEL";

export interface PathInfo {
  id: string;
  title: string;
  scope: string;
}

export interface PathStatus {
  enabled: boolean;
  onboarded: boolean;
  path: PathInfo | null;
}

export interface ProfileRequest {
  currentLevel: StartingLevel;
  goal: PathGoal;
  minutesPerDay: number;
  daysPerWeek: number;
  /** yyyy-mm-dd in the learner's timezone */
  targetDate: string;
  timezone: string;
}

export interface ProfileResponse extends ProfileRequest {
  targetLevel: string;
  startDate: string | null;
}

export interface Feasibility {
  feasible: boolean;
  remainingNewItems: number;
  studyDaysLeft: number;
  studyDaysNeeded: number;
  calendarDaysNeeded: number;
  estimatedFinish: string;
  suggestedMinutesPerDay: number;
  suggestedTargetDate: string;
}

export interface PathVocab {
  id: string;
  word: string;
  kana: string;
  romaji: string;
  meaning: string;
  lesson: number;
}

export interface PlacementQuestions {
  grammar: string[];
  vocab: string[];
  kanji: string[];
}

export interface PlacementAnswer {
  itemType: PathItemType;
  itemId: string;
  correct: boolean;
}

export interface TodayItem {
  itemType: PathItemType;
  itemId: string;
  done: boolean;
}

export type BlockStatus = "NOT_STARTED" | "IN_PROGRESS" | "DONE";

export interface TodayBlock {
  type: BlockType;
  items: TodayItem[];
  minutes: number;
  status: BlockStatus;
}

export interface ForecastDay {
  date: string;
  grammar: number;
  vocab: number;
  kanji: number;
}

export interface TodayResponse {
  path: PathInfo;
  date: string;
  studyDay: boolean;
  dayIndex: number;
  totalDays: number;
  progressPercent: number;
  itemsUnderstood: number;
  itemsTotal: number;
  streak: number;
  blocks: TodayBlock[];
  totalMinutes: number;
  completed: boolean;
  reducedForAccuracy: boolean;
  deferredReviews: number;
  feasibility: Feasibility;
  forecast: ForecastDay[];
  profile: ProfileResponse;
}

export interface AnswerRequest {
  itemType: PathItemType;
  itemId: string;
  correct: boolean;
  review: boolean;
  questionKind: string;
}

const base = "/api/learning-path";
const json = (method: string, body: unknown): RequestInit => ({
  method,
  body: JSON.stringify(body),
});

export const getPathStatus = () => apiFetch<PathStatus>(`${base}/status`);
export const getPathProfile = () => apiFetch<ProfileResponse | null>(`${base}/profile`);
export const savePathProfile = (body: ProfileRequest) =>
  apiFetch<ProfileResponse>(`${base}/profile`, json("PUT", body));
export const checkFeasibility = (body: ProfileRequest) =>
  apiFetch<Feasibility>(`${base}/feasibility`, json("POST", body));
export const getPathVocabulary = () => apiFetch<PathVocab[]>(`${base}/vocabulary`);
export const getPlacement = (hints: string[]) =>
  apiFetch<PlacementQuestions>(
    `${base}/placement${hints.length ? `?hints=${hints.map(encodeURIComponent).join(",")}` : ""}`,
  );
export const submitPlacement = (answers: PlacementAnswer[]) =>
  apiFetch<{ grammarKnown: number; vocabKnown: number; kanjiKnown: number }>(
    `${base}/placement`,
    json("POST", { answers }),
  );
export const getToday = () => apiFetch<TodayResponse>(`${base}/today`);
export const postPathAnswer = (body: AnswerRequest) =>
  apiFetch<{ masteryState: MasteryState }>(`${base}/answers`, json("POST", body));
export const getPathReviewQueue = () =>
  apiFetch<{ itemType: PathItemType; itemId: string }[]>(`${base}/review-queue`);
export const reportQuestion = (body: {
  itemType: PathItemType;
  itemId: string;
  questionKind: string;
  questionJson: string;
  comment: string;
}) => apiFetch<null>(`${base}/reports`, json("POST", body));
