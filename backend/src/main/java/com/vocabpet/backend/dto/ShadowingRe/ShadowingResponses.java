package com.vocabpet.backend.dto.ShadowingRe;

import java.time.Instant;
import java.util.List;

public final class ShadowingResponses {

    private ShadowingResponses() {}

    public record Session(Long sessionId, String unitId, String level, String mode, int sentences, int recordings,
                          boolean completed, int durationSeconds, Instant completedAt, boolean isNew) {}

    /** A sentence whose latest self-assessment or content match shows a problem. {@code timesMissed} counts all runs. */
    public record Difficulty(String sentenceKey, String unitId, List<String> missed, Integer contentMatch,
                             int timesMissed) {}

    public record CheckCount(String check, int missed, int assessed) {}

    public record Progress(int sentencesPracticed, int totalRecordings, int totalSeconds, List<String> completedUnits,
                           List<Session> sessions, List<Difficulty> difficulties, List<CheckCount> checks) {}
}
