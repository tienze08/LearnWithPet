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
