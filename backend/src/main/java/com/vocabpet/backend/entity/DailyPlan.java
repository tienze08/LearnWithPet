package com.vocabpet.backend.entity;

import java.time.Instant;
import java.time.LocalDate;

import jakarta.persistence.*;
import lombok.*;

/** Today's plan, generated on the first open of the user's local day and then frozen for that day. */
@Entity
@Table(name = "daily_plans", uniqueConstraints = @UniqueConstraint(columnNames = {"plan_id", "local_date"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DailyPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "plan_id", nullable = false)
    private LearningPlan plan;

    /** Date in the user's timezone. */
    @Column(name = "local_date", nullable = false)
    private LocalDate localDate;

    /** JSON: blocks (GRAMMAR, VOCAB, KANJI, REVIEW) with item ids, estimated minutes, status and resume position. */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String blocksJson;

    @Column(nullable = false)
    private int estimatedMinutes;

    private Instant completedAt;

    private Instant createdAt;

    @Version
    private Long version;

    @PrePersist
    void created() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
