package com.vocabpet.backend.entity.enums;

/** How eagerly the Learning Path offers extra lessons after today's plan. Never changes the plan itself. */
public enum PathPace {
    RELAXED(1, 1), FLEXIBLE(1, 2), FAST_TRACK(3, 5);

    /** Lessons suggested at once after today's plan is done. */
    public final int suggested;
    /** Most units a learner may learn ahead in one day. */
    public final int maxAheadUnitsPerDay;

    PathPace(int suggested, int maxAheadUnitsPerDay) {
        this.suggested = suggested;
        this.maxAheadUnitsPerDay = maxAheadUnitsPerDay;
    }
}
