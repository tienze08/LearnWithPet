package com.vocabpet.backend.entity;

import java.time.Instant;
import java.time.LocalDate;

import com.vocabpet.backend.entity.enums.JlptLevel;
import com.vocabpet.backend.entity.enums.PathGoal;
import com.vocabpet.backend.entity.enums.PathStartingLevel;

import jakarta.persistence.*;
import lombok.*;

/** Learning Path settings chosen in onboarding. One row per user; editing it triggers a replan. */
@Entity
@Table(name = "path_profiles", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PathProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private PathStartingLevel currentLevel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private PathGoal goal;

    @Column(nullable = false)
    private int minutesPerDay;

    @Column(nullable = false)
    private int daysPerWeek;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 2)
    private JlptLevel targetLevel;

    @Column(nullable = false)
    private LocalDate targetDate;

    /** IANA zone, e.g. Asia/Bangkok. Day boundaries for plans and streaks use this zone. */
    @Column(nullable = false, length = 64)
    private String timezone;

    private Instant createdAt;

    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    void touch() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }
}
