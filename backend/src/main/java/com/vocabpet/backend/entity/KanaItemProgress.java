package com.vocabpet.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "kana_item_progress", uniqueConstraints =
        @UniqueConstraint(columnNames = {"user_id", "script", "kana"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KanaItemProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String kana;

    @Column(nullable = false)
    private String script;

    @Column(nullable = false)
    private String section;

    @Builder.Default
    private int correctCount = 0;

    @Builder.Default
    private int wrongCount = 0;

    private LocalDateTime lastSeenAt;

    @Builder.Default
    private boolean mastered = false;

    /** Learning Path review schedule (Leitner); null until the path schedules this kana. */
    @Column(nullable = false)
    @org.hibernate.annotations.ColumnDefault("0")
    @Builder.Default
    private int srsStage = 0;

    private java.time.Instant nextReviewAt;

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
}
