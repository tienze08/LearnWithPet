package com.vocabpet.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

/** What happened with one sentence. {@code passed} / {@code missed} are self-assessment items, comma separated. */
@Embeddable
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class ShadowingSentenceResult {

    @Column(name = "sentence_key", nullable = false, length = 100)
    private String sentenceKey;

    @Column(name = "recording_count", nullable = false)
    private int recordings;

    @Column(name = "passed_checks", length = 100)
    private String passed;

    @Column(name = "missed_checks", length = 100)
    private String missed;

    /** Share of the sentence a speech recognizer heard (0-100); content matching, not pronunciation. */
    @Column(name = "content_match")
    private Integer contentMatch;
}
