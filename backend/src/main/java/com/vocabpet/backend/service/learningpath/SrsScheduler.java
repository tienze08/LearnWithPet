package com.vocabpet.backend.service.learningpath;

import java.time.Instant;

import com.vocabpet.backend.service.learningpath.PathModel.ItemState;

/** Review scheduling for grammar and kanji. Phase 2 can swap the Leitner implementation for SM-2/FSRS. */
public interface SrsScheduler {

    /** New state (stage, next review, counters, mastery) after one graded answer. */
    ItemState scheduleNextReview(ItemState itemProgress, boolean correct, Instant now);

    /** Placement test said "known": counted as understood, reviewed soon so the SRS confirms it. */
    ItemState provisionallyKnown(ItemState itemProgress, Instant now);
}
