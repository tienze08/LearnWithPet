package com.vocabpet.backend.service.learningpath;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import com.vocabpet.backend.config.LearningPathProperties.Engine;
import com.vocabpet.backend.entity.enums.MasteryState;
import com.vocabpet.backend.service.learningpath.PathModel.ItemState;

/** Leitner boxes: correct moves up one stage, wrong goes back to stage 1. Intervals come from config. */
public class LeitnerScheduler implements SrsScheduler {

    private final List<Integer> days;
    private final MasteryRules mastery;

    public LeitnerScheduler(Engine cfg) {
        this.days = cfg.leitnerDays();
        this.mastery = new MasteryRules(cfg);
    }

    @Override
    public ItemState scheduleNextReview(ItemState s, boolean correct, Instant now) {
        int stage = correct ? Math.min(s.stage() + 1, days.size()) : 1;
        int c = s.correct() + (correct ? 1 : 0);
        int w = s.wrong() + (correct ? 0 : 1);
        MasteryState state = mastery.afterAnswer(s.state(), stage, c, w, correct);
        Instant next = now.plus(Duration.ofDays(days.get(stage - 1)));
        return new ItemState(s.key(), state, stage, next, c, w, now);
    }

    @Override
    public ItemState provisionallyKnown(ItemState s, Instant now) {
        if (s.atLeast(MasteryState.UNDERSTOOD)) return s;
        return new ItemState(s.key(), MasteryState.UNDERSTOOD, 1, now.plus(Duration.ofDays(days.get(0))),
                s.correct(), s.wrong(), s.lastReviewedAt());
    }
}
