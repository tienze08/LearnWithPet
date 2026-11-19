package com.vocabpet.backend.service.learningpath;

import java.time.Duration;
import java.time.LocalDateTime;

import com.vocabpet.backend.config.LearningPathProperties.Engine;
import com.vocabpet.backend.entity.enums.MasteryState;
import com.vocabpet.backend.entity.enums.Status;

/**
 * not_started → learning → understood → memorized → mastered. Only graded answers move an item;
 * opening a lesson never does. Thresholds come from config.
 */
public class MasteryRules {

    private final Engine cfg;

    public MasteryRules(Engine cfg) {
        this.cfg = cfg;
    }

    /** Grammar/kanji after one answer; {@code stage} is the Leitner stage after scheduling. */
    public MasteryState afterAnswer(MasteryState prev, int stage, int correct, int wrong, boolean answerCorrect) {
        if (!answerCorrect) {
            // A miss drops a memorized item back to understood, anything lower back to learning.
            return prev.ordinal() >= MasteryState.MEMORIZED.ordinal() ? MasteryState.UNDERSTOOD : MasteryState.LEARNING;
        }
        MasteryState s = max(prev, MasteryState.UNDERSTOOD);
        if (stage >= cfg.memorizedStage()) s = max(s, MasteryState.MEMORIZED);
        double accuracy = (double) correct / Math.max(1, correct + wrong);
        if (stage >= cfg.leitnerDays().size() && accuracy >= cfg.masteredAccuracy()) s = MasteryState.MASTERED;
        return s;
    }

    /** Vocabulary state derived from the existing FSRS row (UserVocabularyProgress); nothing extra is stored. */
    public MasteryState forVocab(int timesSeen, int repetitions, int correct, int incorrect, Status status,
                                 LocalDateTime lastReview, LocalDateTime nextReview) {
        if (timesSeen == 0 && repetitions == 0) return MasteryState.NOT_STARTED;
        if (correct == 0) return MasteryState.LEARNING;
        // FSRS puts a missed word back in ~10 minutes: treat that as a fresh miss.
        boolean justMissed = lastReview != null && nextReview != null
                && Duration.between(lastReview, nextReview).toHours() < 1;
        MasteryState s = MasteryState.UNDERSTOOD;
        if (repetitions >= cfg.vocabMemorizedReps()) s = MasteryState.MEMORIZED;
        double accuracy = (double) correct / Math.max(1, correct + incorrect);
        if (status == Status.MASTERED && accuracy >= cfg.masteredAccuracy()) s = MasteryState.MASTERED;
        if (justMissed) return s.ordinal() >= MasteryState.MEMORIZED.ordinal() ? MasteryState.UNDERSTOOD : MasteryState.LEARNING;
        return s;
    }

    private static MasteryState max(MasteryState a, MasteryState b) {
        return a.ordinal() >= b.ordinal() ? a : b;
    }
}
