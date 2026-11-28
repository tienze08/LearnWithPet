package com.vocabpet.backend.entity;

import java.time.Instant;

import com.vocabpet.backend.entity.enums.MasteryState;
import com.vocabpet.backend.entity.enums.PathItemType;

import jakarta.persistence.*;
import lombok.*;

/**
 * Per-user progress for grammar points and kanji (ids come from the frontend content files).
 * Vocabulary progress is NOT stored here: it stays in UserVocabularyProgress (FSRS).
 */
@Entity
@Table(name = "item_progress",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "item_type", "item_id"}),
        indexes = @Index(columnList = "user_id,next_review_at"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ItemProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "item_type", nullable = false, length = 16, columnDefinition = "varchar(16)")
    private PathItemType itemType;

    /** Grammar slug (e.g. "ni-time") or the kanji character itself. */
    @Column(name = "item_id", nullable = false, length = 64)
    private String itemId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    @Builder.Default
    private MasteryState masteryState = MasteryState.NOT_STARTED;

    /** Leitner stage; 0 = not in review yet. */
    @Builder.Default
    private int srsStage = 0;

    /** Set by the placement test: counted as understood until the first review confirms or refutes it. */
    @Builder.Default
    private boolean provisional = false;

    @Column(name = "next_review_at")
    private Instant nextReviewAt;

    @Builder.Default
    private int correctCount = 0;

    @Builder.Default
    private int wrongCount = 0;

    private Instant lastReviewedAt;

    /** Learning Path: weak = needs extra work (wrong in a test, or several misses in a row). Separate from mastery. */
    @Column(nullable = false)
    @org.hibernate.annotations.ColumnDefault("false")
    @Builder.Default
    private boolean weak = false;

    /** +n = n correct answers in a row, -n = n wrong in a row. Drives the weak flag. */
    @Column(nullable = false)
    @org.hibernate.annotations.ColumnDefault("0")
    @Builder.Default
    private int answerStreak = 0;

    @Version
    private Long version;
}
