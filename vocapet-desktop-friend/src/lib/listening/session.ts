// One lesson run: question ids, results and what to practise next. Pure, so it also runs in Node checks.
import type { Difficulty, ExerciseType, Lesson, SourceExercise } from "./types";

export interface Answer {
  questionId: string;
  type: ExerciseType;
  difficulty: Difficulty;
  correct: boolean;
  replays: number;
  words: string[];
  grammar: string[];
}

export const questionId = (lesson: Pick<Lesson, "id">, exercise: string, sub?: string) =>
  `${lesson.id}/${exercise}${sub ? `.${sub}` : ""}`;

const idsOf = (lesson: Lesson, e: SourceExercise) =>
  e.type === "dialogue"
    ? e.questions.map((q) => questionId(lesson, e.id, q.id))
    : [questionId(lesson, e.id)];

export const questionCount = (lesson: Lesson) =>
  lesson.exercises.flatMap((e) => idsOf(lesson, e)).length;

/** The exercises of a run; with `only`, just those questions (dialogues keep only the listed ones). */
export function exercisesFor(lesson: Lesson, only?: string[]): SourceExercise[] {
  if (!only) return lesson.exercises;
  return lesson.exercises.flatMap((e): SourceExercise[] => {
    if (e.type !== "dialogue") return only.includes(questionId(lesson, e.id)) ? [e] : [];
    const questions = e.questions.filter((q) => only.includes(questionId(lesson, e.id, q.id)));
    return questions.length ? [{ ...e, questions }] : [];
  });
}

/** Lines an exercise plays, first and last. */
export const linesOf = (e: SourceExercise): [number, number] =>
  e.type === "dialogue" ? [e.lines[0], e.lines[e.lines.length - 1]] : [e.line, e.line];

export interface Submitted {
  /** Question id suffix inside a dialogue. */
  sub?: string;
  correct: boolean;
  words?: string[];
  grammar?: string[];
}

export function toAnswers(
  lesson: Lesson,
  e: SourceExercise,
  results: Submitted[],
  difficulty: Difficulty,
  replays: number,
): Answer[] {
  return results.map((r, i) => ({
    questionId: questionId(lesson, e.id, r.sub),
    type: e.type,
    difficulty,
    correct: r.correct,
    // Replays belong to the exercise; count them once.
    replays: i === 0 ? Math.min(replays, 999) : 0,
    words: r.words ?? [],
    grammar: e.type === "dialogue" ? (r.grammar ?? []) : grammarOf(lesson, e),
  }));
}

/** What a single-sentence exercise tests: its own grammar ids, else everything in the sentence. */
export const grammarOf = (lesson: Lesson, e: Exclude<SourceExercise, { type: "dialogue" }>) =>
  e.grammar?.length ? e.grammar : lesson.lines[e.line].grammarIds;

export function summarize(answers: Answer[]) {
  const wrong = answers.filter((a) => !a.correct);
  const correct = answers.length - wrong.length;
  return {
    total: answers.length,
    correct,
    accuracy: answers.length ? correct / answers.length : 0,
    replays: answers.reduce((sum, a) => sum + a.replays, 0),
    mistakes: wrong.map((a) => a.questionId),
    weakWords: [...new Set(wrong.flatMap((a) => a.words))],
    weakGrammar: [...new Set(wrong.flatMap((a) => a.grammar))],
  };
}

export const REPEAT_BELOW = 0.8;

export interface LessonRecord {
  lessonId: string;
  lastAccuracy: number | null;
  lastCompletedAt: string;
  mistakes: string[];
}

export interface Recommendation {
  lesson: Lesson;
  review: boolean;
  reason: string;
}

/** Mistakes first, then a weak lesson, then something new (one with weak words if any), then the oldest one. */
export function recommend(
  lessons: Lesson[],
  records: LessonRecord[],
  weak: string[] = [],
  skip?: string,
): Recommendation | null {
  const pool = lessons.filter((l) => l.id !== skip);
  const of = (l: Lesson) => records.find((r) => r.lessonId === l.id);
  const stillThere = (l: Lesson) =>
    of(l)?.mistakes.filter((id) => l.exercises.some((e) => idsOf(l, e).includes(id))) ?? [];

  const missed = pool.find((l) => stillThere(l).length > 0);
  if (missed)
    return {
      lesson: missed,
      review: true,
      reason: `Còn ${stillThere(missed).length} câu nghe sai cần ôn.`,
    };
  const low = pool.find((l) => (of(l)?.lastAccuracy ?? 1) < REPEAT_BELOW);
  if (low)
    return {
      lesson: low,
      review: false,
      reason: "Lần gần nhất đúng dưới 80%, nên nghe lại cả bài.",
    };
  const fresh = pool.filter((l) => !of(l));
  const uses = (l: Lesson) =>
    l.exercises
      .flatMap((e): { words?: string[] }[] => (e.type === "dialogue" ? e.questions : [e]))
      .reduce((n, q) => n + (q.words ?? []).filter((w) => weak.includes(w)).length, 0);
  if (fresh.length) {
    const best = [...fresh].sort((a, b) => uses(b) - uses(a))[0];
    return {
      lesson: best,
      review: false,
      reason: uses(best) ? "Bài mới, có từ bạn hay nghe nhầm." : "Bài tiếp theo bạn chưa nghe.",
    };
  }
  const oldest = [...pool].sort((a, b) =>
    of(a)!.lastCompletedAt.localeCompare(of(b)!.lastCompletedAt),
  )[0];
  return oldest
    ? { lesson: oldest, review: false, reason: "Bài lâu nhất bạn chưa nghe lại." }
    : null;
}
