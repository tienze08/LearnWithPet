package com.vocabpet.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/** Learning memory owned by one companion for one vocabulary item. */
@Entity
@Table(name = "companion_word_memories", uniqueConstraints =
        @UniqueConstraint(columnNames = { "profile_id", "vocabulary_id" }))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompanionWordMemory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "profile_id", nullable = false)
    private CompanionProfile profile;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vocabulary_id", nullable = false)
    private Vocabulary vocabulary;

    @Builder.Default
    private int reviewCount = 0;

    @Builder.Default
    private int wrongCount = 0;

    @Builder.Default
    private int correctCount = 0;

    @Builder.Default
    private boolean mastered = false;

    private LocalDateTime lastReviewedAt;
}
