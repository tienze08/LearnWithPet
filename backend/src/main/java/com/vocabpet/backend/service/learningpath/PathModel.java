package com.vocabpet.backend.service.learningpath;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

import com.vocabpet.backend.entity.enums.MasteryState;
import com.vocabpet.backend.entity.enums.PathItemType;

/** Plain values the Learning Engine works on. No JPA, no Spring: the engine is tested without a database. */
public final class PathModel {

    private PathModel() {}

    /** Grammar slug, Tango vocabulary id (as text) or kanji character. */
    public record ItemKey(PathItemType type, String id) {}

    public record ItemState(ItemKey key, MasteryState state, int stage, Instant nextReviewAt,
                            int correct, int wrong, Instant lastReviewedAt) {

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
    }

    /** A curriculum unit with its items expanded (vocab lessons already turned into word ids), in learning order. */
    public record PlanUnit(String id, int order, List<String> prerequisites, List<ItemKey> items) {}

    public record Profile(int minutesPerDay, int daysPerWeek, LocalDate startDate, LocalDate targetDate, ZoneId zone) {}

    public enum BlockType { GRAMMAR, VOCAB, KANJI, REVIEW }

    public record Block(BlockType type, List<ItemKey> items, double minutes) {}

    public record DayPlan(LocalDate date, boolean studyDay, List<Block> blocks, int totalMinutes,
                          boolean reducedForAccuracy, int deferredReviews) {

        public Block block(BlockType t) {
            return blocks.stream().filter(b -> b.type() == t).findFirst().orElseThrow();
        }
    }

    /**
     * feasible=false means the remaining new material does not fit before the target date at this pace.
     * suggestedMinutesPerDay keeps the date; suggestedTargetDate keeps the minutes.
     */
    public record Feasibility(boolean feasible, int remainingNewItems, int studyDaysLeft, int studyDaysNeeded,
                              int calendarDaysNeeded, LocalDate estimatedFinish,
                              int suggestedMinutesPerDay, LocalDate suggestedTargetDate) {}

    public record ForecastDay(LocalDate date, int grammar, int vocab, int kanji) {}

    public record PlacementAnswer(ItemKey key, boolean correct) {}
}
