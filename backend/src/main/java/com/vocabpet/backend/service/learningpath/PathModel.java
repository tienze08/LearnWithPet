package com.vocabpet.backend.service.learningpath;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Set;

import com.vocabpet.backend.entity.enums.MasteryState;
import com.vocabpet.backend.entity.enums.PathItemType;

/** Plain values the Learning Engine works on. No JPA, no Spring: the engine is tested without a database. */
public final class PathModel {

    private PathModel() {}

    /** Kana "hiragana:か", grammar slug, Tango vocabulary id (as text) or kanji character. */
    public record ItemKey(PathItemType type, String id) {}

    /**
     * The engine's view of one item's progress, whatever table it lives in (ItemProgress, UserVocabularyProgress,
     * KanaItemProgress). Mastery ({@code state}) and {@code weak} are separate: weak marks items that need extra work.
     */
    public record ItemState(ItemKey key, MasteryState state, int stage, Instant nextReviewAt,
                            int correct, int wrong, Instant lastReviewedAt, boolean weak) {

        public boolean introduced() {
            return state != MasteryState.NOT_STARTED;
        }

        public boolean atLeast(MasteryState s) {
            return state.ordinal() >= s.ordinal();
        }

        double errorRate() {
            int n = correct + wrong;
            return n == 0 ? 0 : (double) wrong / n;
        }

        ItemState withWeak(boolean w) {
            return new ItemState(key, state, stage, nextReviewAt, correct, wrong, lastReviewedAt, w);
        }
    }

    /**
     * A curriculum unit with its items expanded (vocab lessons turned into word ids), in learning order.
     * A unit with no items and a non-empty {@code reviewOf} is a review lesson over those units; with {@code test} set it is a
     * chapter test, done only when passed (the service decides that and reports it in CycleState.completedReviewUnits).
     */
    public record PlanUnit(String id, int order, String title, List<String> prerequisites, List<ItemKey> items, List<String> reviewOf,
                           boolean test) {

        public PlanUnit(String id, int order, String title, List<String> prerequisites, List<ItemKey> items, List<String> reviewOf) {
            this(id, order, title, prerequisites, items, reviewOf, false);
        }

        public boolean isReview() {
            return items.isEmpty() && !reviewOf.isEmpty();
        }
    }

    public record Profile(int minutesPerDay, int daysPerWeek, LocalDate startDate, LocalDate targetDate, ZoneId zone) {}

    /** The four fixed phases of a day. On a weekly-test day LEARN is "Củng cố" (no new items) and TEST is the weekly test. */
    public enum Phase { REVIEW, LEARN, PRACTICE, TEST }

    public enum DayKind {
        /** New items of one unit (sometimes two short ones). */
        LESSON,
        /** A review lesson from the curriculum, e.g. "Ôn Hiragana cơ bản". */
        UNIT_REVIEW,
        /** Nothing new left (or nothing open): review, weak items and a test. */
        REVIEW_DAY,
        /** Last study day of a cycle: consolidate, weak items, weekly test. */
        WEEKLY_TEST,
        /** Not a study day by the weekly schedule: optional review only, never counted. */
        REST
    }

    public enum Skill { HIRAGANA, KATAKANA, VOCAB, KANJI, GRAMMAR }

    public record PhasePlan(Phase phase, List<ItemKey> items, double minutes) {}

    public record DayPlan(LocalDate date, DayKind kind, int dayNumber, String title, List<String> unitIds,
                          List<PhasePlan> phases, int totalMinutes, boolean reducedNew, int deferredReviews) {

        public PhasePlan phase(Phase p) {
            return phases.stream().filter(x -> x.phase() == p).findFirst().orElseThrow();
        }
    }

    /**
     * Where the learner is in the current cycle (daysPerWeek study days ending with a weekly test) and what the
     * last weekly test asked for. Built by the service from stored plans and tests.
     *
     * @param lessonDaysDone       completed study days since the last weekly test (missed and rest days do not count)
     * @param cycleItems           items learned in those days (the weekly test covers them)
     * @param reduceNew            last weekly test scored 60–79%: fewer new items this cycle
     * @param relearn              last weekly test scored &lt; 60%: wrong items to relearn before new ones
     * @param extraPractice        wrong items of the last weekly test to practise again
     * @param completedReviewUnits review units already done (completed day, or skipped because placement knew them)
     */
    public record CycleState(int lessonDaysDone, Set<ItemKey> cycleItems, boolean reduceNew, Set<ItemKey> relearn,
                             Set<ItemKey> extraPractice, Set<String> completedReviewUnits) {

        public static CycleState fresh() {
            return new CycleState(0, Set.of(), false, Set.of(), Set.of(), Set.of());
        }
    }

    /**
     * feasible=false means the remaining new material does not fit before the target date at this pace.
     * suggestedMinutesPerDay keeps the date; suggestedTargetDate keeps the minutes.
     */
    public record Feasibility(boolean feasible, int remainingNewItems, int studyDaysLeft, int studyDaysNeeded,
                              int calendarDaysNeeded, LocalDate estimatedFinish,
                              int suggestedMinutesPerDay, LocalDate suggestedTargetDate) {}

    /** A projected future day (roadmap). */
    public record ForecastDay(LocalDate date, DayKind kind, String title, List<String> unitIds,
                              int kana, int grammar, int vocab, int kanji) {}

    /** percent: mastery over every item of the skill in scope; quality: mastery over the items already started. */
    public record SkillScore(Skill skill, int percent, int introduced, int total, Double quality) {}

    /** What the engine does after a weekly test, and the sentence shown to the learner. */
    public record WeeklyAdjustment(String action, String message) {}

    public record PlacementAnswer(ItemKey key, boolean correct) {}

    /**
     * Access to a lesson, decided by prerequisites only (never by the schedule). COMPLETED is lesson completion (every
     * item learned once, a review lesson done, a chapter test passed), not mastery.
     */
    public enum UnitStatus { LOCKED, AVAILABLE, IN_PROGRESS, COMPLETED }

    /** missing: prerequisite unit ids not completed yet (empty unless LOCKED). */
    public record UnitAccess(PlanUnit unit, UnitStatus status, List<String> missing, int itemsLearned) {}
}
