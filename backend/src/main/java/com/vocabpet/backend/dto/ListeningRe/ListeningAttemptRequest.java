package com.vocabpet.backend.dto.ListeningRe;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.util.List;

/**
 * A finished lesson run. Lessons are frontend content (like kana), so the client grades; totals are always counted
 * here from the answers. Refs are restricted so they can be stored comma separated.
 */
public record ListeningAttemptRequest(
        @NotNull @Pattern(regexp = "[A-Za-z0-9-]{8,64}") String clientAttemptId,
        @NotNull @Pattern(regexp = "n[1-5]-[a-z0-9-]{1,60}") String lessonId,
        @NotNull @Pattern(regexp = "N[1-5]") String level,
        @NotNull @Pattern(regexp = "FULL|REVIEW") String mode,
        @Min(0) @Max(14400) int durationSeconds,
        @NotEmpty @Size(max = 100) List<@NotNull @Valid Answer> answers) {

    public record Answer(
            @NotNull @Pattern(regexp = "[a-z0-9/._-]{1,100}") String questionId,
            @NotNull @Pattern(regexp = "choose|fill|dictation|dialogue") String type,
            @NotNull @Pattern(regexp = "EASY|MEDIUM|HARD") String difficulty,
            @NotNull Boolean correct,
            @Min(0) @Max(999) int replays,
            @Size(max = 20) List<@NotNull @Pattern(regexp = "[^,]{1,40}") String> words,
            @Size(max = 20) List<@NotNull @Pattern(regexp = "[a-z0-9-]{1,80}") String> grammar) {}
}
