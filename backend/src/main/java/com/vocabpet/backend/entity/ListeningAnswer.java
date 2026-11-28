package com.vocabpet.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

/** One answered listening question. {@code words} / {@code grammar} are the content refs it tests, comma separated. */
@Embeddable
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class ListeningAnswer {

    @Column(name = "question_id", nullable = false, length = 100)
    private String questionId;

    @Column(name = "exercise_type", nullable = false, length = 16)
    private String type;

    @Column(nullable = false, length = 8)
    private String difficulty;

    @Column(name = "is_correct", nullable = false)
    private boolean correct;

    @Column(nullable = false)
    private int replays;

    @Column(name = "word_refs", length = 1000)
    private String words;

    @Column(name = "grammar_ids", length = 2000)
    private String grammar;
}
