package com.vocabpet.backend.dto.ListeningRe;

import java.time.Instant;
import java.util.List;

public final class ListeningResponses {

    private ListeningResponses() {}

    public record Attempt(Long attemptId, String lessonId, String mode, int total, int correct, double accuracy,
                          int replays, int durationSeconds, Instant completedAt, boolean isNew) {}

    /** {@code attempts}, {@code lastAccuracy} and {@code bestAccuracy} count full runs only. */
    public record LessonProgress(String lessonId, String level, int attempts, Double lastAccuracy, Double bestAccuracy,
                                 int replays, int durationSeconds, Instant lastCompletedAt, List<String> mistakes) {}

    /** A word or grammar id the learner often misses by ear. Says nothing about mastery of it elsewhere. */
    public record WeakRef(String ref, int wrong, int total) {}

    public record Progress(List<LessonProgress> lessons, List<WeakRef> weakWords, List<WeakRef> weakGrammar) {}
}
