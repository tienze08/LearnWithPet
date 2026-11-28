package com.vocabpet.backend.entity;

import java.time.Instant;
import java.time.LocalDate;

import com.vocabpet.backend.entity.enums.JlptLevel;
import com.vocabpet.backend.entity.enums.PathPlanStatus;

import jakarta.persistence.*;
import lombok.*;

/** One run of a curriculum path for a user. The schedule itself is recomputed daily, not stored here. */
@Entity
@Table(name = "learning_plans", indexes = @Index(columnList = "user_id,status"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LearningPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Curriculum path id, e.g. n5-minna-1-5. */
    @Column(nullable = false, length = 64)
    private String pathId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 2)
    private JlptLevel level;

    @Column(nullable = false)
    private LocalDate startDate;

    @Column(nullable = false)
    private LocalDate targetDate;

    /**
     * Day the daily pace was last set (plan start, or the last settings change). The cap on catching up after missed
     * days is measured from here, so a learner who chooses more minutes or a new date gets a pace that fits it.
     * Null on plans created before this existed: startDate is used.
     */
    private LocalDate paceFrom;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    @Builder.Default
    private PathPlanStatus status = PathPlanStatus.ACTIVE;

    /** JSON snapshot of the profile and engine config at plan start, so later config edits stay explainable. */
    @Column(columnDefinition = "TEXT")
    private String configSnapshot;

    private Instant createdAt;

    @PrePersist
    void created() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
