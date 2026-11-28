package com.vocabpet.backend.entity;

import java.time.Instant;

import com.vocabpet.backend.entity.enums.PathSessionKind;

import jakarta.persistence.*;
import lombok.*;

/** One sitting in the Learning Path (placement test or a daily plan), with per-question results. */
@Entity
@Table(name = "learning_sessions", indexes = @Index(columnList = "user_id,started_at"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LearningSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Null for the placement test. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "daily_plan_id")
    private DailyPlan dailyPlan;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private PathSessionKind kind;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    private Instant endedAt;

    /** JSON array: [{itemType, itemId, questionKind, correct, answeredAt}]. */
    @Column(columnDefinition = "TEXT")
    private String resultsJson;
}
