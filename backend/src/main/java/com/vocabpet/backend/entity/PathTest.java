package com.vocabpet.backend.entity;

import java.time.Instant;

import jakarta.persistence.*;
import lombok.*;

/**
 * One end-of-day or weekly test of a DailyPlan. Keeps attempt 1, the optional retake and the final result apart.
 * kind and adjustment are varchar on purpose (MySQL ENUM columns cannot gain values under ddl-auto=update).
 */
@Entity
@Table(name = "path_tests", uniqueConstraints = @UniqueConstraint(columnNames = {"daily_plan_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PathTest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "daily_plan_id", nullable = false)
    private DailyPlan dailyPlan;

    /** DAILY or WEEKLY. */
    @Column(nullable = false, length = 16)
    private String kind;

    /** Share correct, 0–1. */
    private Double attempt1Score;

    private Double attempt2Score;

    /** Set once the test is over: attempt 1 passed, or the retake was taken or skipped. */
    private Double finalScore;

    @Column(nullable = false)
    @Builder.Default
    private boolean passed = false;

    /** JSON array of item keys answered wrong in any attempt. */
    @Column(columnDefinition = "TEXT")
    private String wrongItemsJson;

    /** Weekly only: NORMAL, REVIEW_EARLY, REDUCE_NEW, RELEARN. */
    @Column(length = 16)
    private String adjustment;

    /** Short explanation shown after the test. */
    @Column(length = 300)
    private String message;

    private Instant createdAt;

    private Instant finishedAt;

    @PrePersist
    void created() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
