package com.vocabpet.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/** One finished run of a listening lesson. Independent of vocabulary / grammar mastery and of the SRS schedules. */
@Entity
@Table(name = "listening_attempts", uniqueConstraints =
        @UniqueConstraint(columnNames = {"user_id", "client_attempt_id"}))
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ListeningAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "client_attempt_id", nullable = false, length = 64)
    private String clientAttemptId;

    @Column(name = "lesson_id", nullable = false, length = 64)
    private String lessonId;

    @Column(name = "jlpt_level", nullable = false, length = 2)
    private String level;

    /** FULL = the whole lesson; REVIEW = only previously missed questions. */
    @Column(name = "run_mode", nullable = false, length = 8)
    private String mode;

    @Column(name = "total_questions", nullable = false)
    private int total;

    @Column(name = "correct_count", nullable = false)
    private int correct;

    @Column(name = "replay_count", nullable = false)
    private int replays;

    @Column(name = "duration_seconds", nullable = false)
    private int durationSeconds;

    @Column(name = "completed_at", nullable = false)
    private Instant completedAt;

    @ElementCollection
    @CollectionTable(name = "listening_answers", joinColumns = @JoinColumn(name = "attempt_id"))
    @OrderColumn(name = "position")
    @Builder.Default
    private List<ListeningAnswer> answers = new ArrayList<>();
}
