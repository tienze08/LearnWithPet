import { apiFetch } from "./client";

// Personalized Learning Path. The backend decides what to study; questions are generated on the frontend
// (grammar/kanji content lives here), and only item ids and results go over the wire.

export type PathItemType = "KANA" | "GRAMMAR" | "VOCAB" | "KANJI";
/** The four fixed phases of a day, in order. */
export type Phase = "REVIEW" | "LEARN" | "PRACTICE" | "TEST";
export const PHASE_ORDER: Phase[] = ["REVIEW", "LEARN", "PRACTICE", "TEST"];
export type DayKind = "LESSON" | "UNIT_REVIEW" | "REVIEW_DAY" | "WEEKLY_TEST" | "REST";
export type Skill = "HIRAGANA" | "KATAKANA" | "VOCAB" | "KANJI" | "GRAMMAR";
export type MasteryState = "NOT_STARTED" | "LEARNING" | "UNDERSTOOD" | "MEMORIZED" | "MASTERED";
export type StartingLevel = "BEGINNER" | "STUDYING" | "KNOWS_LEVEL";
export type PathPace = "RELAXED" | "FLEXIBLE" | "FAST_TRACK";
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
  pace: PathPace;
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
  hiragana: string[];
  katakana: string[];
  grammar: string[];
  vocab: string[];
  kanji: string[];
}

export interface PlacementAnswer {
  itemType: PathItemType;
  itemId: string;
  correct: boolean;
}

/** label is the item's mastery (Mới / Đang học / Đang ôn / Thành thạo / Yếu), not lesson progress. */
export interface TodayItem {
  itemType: PathItemType;
  itemId: string;
  done: boolean;
  label: string;
  weak: boolean;
}

export type PhaseStatus = "NOT_STARTED" | "IN_PROGRESS" | "DONE";

export interface PhaseView {
  phase: Phase;
  label: string;
  items: TodayItem[];
  minutes: number;
  status: PhaseStatus;
  counts: Partial<Record<PathItemType, number>>;
}

export interface TestView {
  kind: "DAILY" | "WEEKLY" | "CHAPTER" | "UNIT_REVIEW";
  attempt1Score: number | null;
  attempt2Score: number | null;
  finalScore: number | null;
  passed: boolean;
  canRetake: boolean;
  wrongItems: { type: PathItemType; id: string }[];
  message: string | null;
}

export type CalendarStatus = "DONE" | "TODAY" | "MISSED" | "UPCOMING" | "REST" | "NONE";

export interface CalendarDay {
  date: string;
  dayNumber: number | null;
  title: string | null;
  kind: DayKind | null;
  status: CalendarStatus;
  /** New items planned for the day, per type (only types present). */
  newItems: Partial<Record<PathItemType, number>>;
  chapterId?: string | null;
  /** DAILY (every study day), WEEKLY, CHAPTER; null on rest days. */
  checkpoint?: "DAILY" | "WEEKLY" | "CHAPTER" | null;
}

export interface SkillView {
  skill: Skill;
  label: string;
  percent: number;
  introduced: number;
  total: number;
}

export interface TodayResponse {
  path: PathInfo;
  date: string;
  kind: DayKind;
  dayNumber: number;
  totalDays: number;
  title: string;
  progressPercent: number;
  itemsUnderstood: number;
  itemsTotal: number;
  /** Items started at least once (placement-known included). */
  itemsIntroduced: number;
  itemsMastered: number;
  daysCompleted: number;
  streak: number;
  phases: PhaseView[];
  nextPhase: Phase | null;
  totalMinutes: number;
  completed: boolean;
  reducedNew: boolean;
  deferredReviews: number;
  test: TestView | null;
  cycleNote: string | null;
  feasibility: Feasibility;
  week: CalendarDay[];
  skills: SkillView[];
  suggestion: string;
  profile: ProfileResponse;
  focus: Focus;
  /** Units learned before their planned day (planned day not yet past). */
  learnedAhead: AheadView[];
  /** Speed on real study (last two weeks); null before three study days. Never changes the target date. */
  actualPace?: {
    itemsPerStudyDay: number;
    sampleStudyDays: number;
    remainingItems: number;
    estimatedFinish: string | null;
    behindTarget: boolean;
  } | null;
  /** Review before new lessons (advice, never a lock). */
  advice?: {
    kind: "REVIEW_BACKLOG" | "LOW_ACCURACY" | null;
    dueReviews: number;
    recentAccuracy: number | null;
  };
}

export interface AheadView {
  unitId: string;
  title: string;
  scheduledFor: string | null;
  learnedOn: string;
}

export interface NextLesson {
  title: string;
  unitIds: string[];
  items: TodayItem[];
  scheduledFor: string | null;
  /** REVIEW / TEST lessons are taken on the lesson page (/units/{id}/check). */
  kind: UnitKind;
  /** (Part of) today's plan, not done yet. */
  inToday: boolean;
  status: UnlockStatus;
}

/**
 * reason, when lessons is empty: PATH_DONE | BLOCKED. aheadCap is the pace's suggested daily amount, never a lock.
 * TODAY_NOT_DONE / LIMIT_REACHED are no longer sent (kept for older servers).
 */
export interface NextUp {
  pace: PathPace;
  lessons: NextLesson[];
  reason: "TODAY_NOT_DONE" | "LIMIT_REACHED" | "PATH_DONE" | "BLOCKED" | null;
  aheadUnitsToday: number;
  aheadCap: number;
}

export type UnitKind = "LEARN" | "REVIEW" | "TEST";
/** Access from prerequisites only; the planned day never locks a lesson. COMPLETED is not mastery. */
export type UnlockStatus = "LOCKED" | "AVAILABLE" | "IN_PROGRESS" | "COMPLETED";

export interface UnitState {
  id: string;
  title: string;
  kind: UnitKind;
  chapterId: string | null;
  chapterTitle: string | null;
  status: UnlockStatus;
  lockedReason: string | null;
  missing: { id: string; title: string }[];
  itemsTotal: number;
  itemsLearned: number;
  /** Knowledge (items understood or better), separate from completion. */
  masteryPercent: number;
  /** Suggested day; once learned, the original planned day. Information only. */
  scheduledFor: string | null;
  inToday: boolean;
  learnedAhead: boolean;
  learnedOn: string | null;
  estimatedMinutes: number;
}

export interface UnitsResponse {
  units: UnitState[];
  nextUnitId: string | null;
}

export interface UnitLesson {
  unit: UnitState;
  mode: "LEARN" | "REVISIT" | "CHECK" | "LOCKED";
  items: TodayItem[];
}

/** What today is for, derived by the backend from the unit, its chapter and the forecast. */
export interface Focus {
  objective: string;
  why: string;
  outcome: string;
  chapterId: string | null;
  chapterTitle: string | null;
  nextTitle: string | null;
  nextDate: string | null;
  nextKind: DayKind | null;
}

export type UnitStatus = "DONE" | "ACTIVE" | "OPEN" | "LOCKED";

export interface UnitView {
  id: string;
  title: string;
  kind: "LEARN" | "REVIEW" | "TEST";
  status: UnitStatus;
  /** Done before its planned day. */
  ahead: boolean;
}

export interface ChapterView {
  id: string;
  title: string;
  goal: string;
  status: "DONE" | "ACTIVE" | "LOCKED";
  unitsTotal: number;
  unitsDone: number;
  percent: number;
  units: UnitView[];
  unlockRequires: string | null;
  unlockMissing: number;
}

export interface RoadmapResponse {
  path: PathInfo;
  today: string;
  targetDate: string;
  days: CalendarDay[];
  level: string;
  progressPercent: number;
  dayNumber: number;
  totalDays: number;
  chapters: ChapterView[];
}

/** Review state of the path's items from their real schedule. history only has days with answers. */
export interface ReviewOverview {
  due: number;
  overdue: number;
  weak: number;
  dueByType: Partial<Record<PathItemType, number>>;
  nextReviewAt: string | null;
  upcoming: { date: string; count: number }[];
  history: { date: string; answered: number; correct: number }[];
}

export interface PlacementSection {
  skill: Skill;
  label: string;
  asked: number;
  correct: number;
  /** Items now treated as known (skipped in new lessons, reviewed soon). */
  known: number;
  total: number;
}

export interface PlacementResult {
  kanaKnown: number;
  grammarKnown: number;
  vocabKnown: number;
  kanjiKnown: number;
  sections: PlacementSection[];
}

/** A cycle of the projected path, ending with its weekly test (testDate null for a last, shorter one). */
export interface PreviewStage {
  index: number;
  from: string;
  to: string;
  lessonDays: number;
  reviewDays: number;
  testDate: string | null;
  topics: string[];
}

export interface PreviewResponse {
  feasibility: Feasibility;
  startDate: string;
  minutesPerDay: number;
  daysPerWeek: number;
  days: CalendarDay[];
  stages: PreviewStage[];
  prioritySkills: SkillView[];
}

export interface AnswerRequest {
  itemType: PathItemType;
  itemId: string;
  correct: boolean;
  review: boolean;
  questionKind: string;
  phase: Phase;
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
  apiFetch<PlacementResult>(`${base}/placement`, json("POST", { answers }));
export const previewPath = (body: ProfileRequest) =>
  apiFetch<PreviewResponse>(`${base}/preview`, json("POST", body));
export const getToday = () => apiFetch<TodayResponse>(`${base}/today`);
export const postPathAnswer = (body: AnswerRequest) =>
  apiFetch<{ masteryState: MasteryState; weak: boolean; label: string }>(
    `${base}/answers`,
    json("POST", body),
  );
export const submitPathTest = (
  attempt: 1 | 2,
  answers: { itemType: PathItemType; itemId: string; correct: boolean }[],
) => apiFetch<TestView>(`${base}/tests`, json("POST", { attempt, answers }));
export const skipPathRetake = () =>
  apiFetch<TestView>(`${base}/tests/skip-retake`, { method: "POST" });
export const getNextUp = () => apiFetch<NextUp>(`${base}/next-up`);
export const setPathPace = (pace: PathPace) =>
  apiFetch<ProfileResponse>(`${base}/pace`, json("PUT", { pace }));
export const getUnits = () => apiFetch<UnitsResponse>(`${base}/units`);
export const getUnitLesson = (id: string) =>
  apiFetch<UnitLesson>(`${base}/units/${encodeURIComponent(id)}`);
export const checkUnit = (
  id: string,
  answers: { itemType: PathItemType; itemId: string; correct: boolean }[],
) =>
  apiFetch<TestView>(
    `${base}/units/${encodeURIComponent(id)}/check`,
    json("POST", { attempt: 1, answers }),
  );
export const getRoadmap = () => apiFetch<RoadmapResponse>(`${base}/roadmap`);
export const getReviewOverview = () => apiFetch<ReviewOverview>(`${base}/review-overview`);
export const getPathReviewQueue = () =>
  apiFetch<{ itemType: PathItemType; itemId: string }[]>(`${base}/review-queue`);
export const reportQuestion = (body: {
  itemType: PathItemType;
  itemId: string;
  questionKind: string;
  questionJson: string;
  comment: string;
}) => apiFetch<null>(`${base}/reports`, json("POST", body));
