package com.vocabpet.backend.dto.ShadowingRe;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.util.List;

/** A finished shadowing run. Only numbers and self-assessment are sent; recordings never leave the browser. */
public record ShadowingSessionRequest(
        @NotNull @Pattern(regexp = "[A-Za-z0-9-]{8,64}") String clientSessionId,
        @NotNull @Pattern(regexp = "n[1-5]-[a-z0-9-]{1,60}") String unitId,
        @NotNull @Pattern(regexp = "N[1-5]") String level,
        @NotNull @Pattern(regexp = "REPEAT|IMMEDIATE|CONTINUOUS") String mode,
        @Min(1) @Max(100) int unitSentences,
        @Min(0) @Max(14400) int durationSeconds,
        @NotEmpty @Size(max = 100) List<@NotNull @Valid Sentence> sentences) {

    private static final String CHECK = "WORDS|LONG_VOWEL|SMALL_TSU|RHYTHM|CLEAR";

    public record Sentence(
            @NotNull @Pattern(regexp = "[a-z0-9:-]{1,100}") String sentenceKey,
            @Min(0) @Max(99) int recordings,
            @Size(max = 5) List<@NotNull @Pattern(regexp = CHECK) String> passed,
            @Size(max = 5) List<@NotNull @Pattern(regexp = CHECK) String> missed,
            @Min(0) @Max(100) Integer contentMatch) {}
}
