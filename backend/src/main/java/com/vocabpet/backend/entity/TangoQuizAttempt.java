package com.vocabpet.backend.entity;

import com.vocabpet.backend.entity.enums.TangoQuizMode;
import com.vocabpet.backend.entity.enums.TangoQuizScope;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "tango_quiz_attempts",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "client_attempt_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TangoQuizAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "lesson_id", nullable = false)
    private TangoLesson lesson;

    @Column(name = "client_attempt_id", nullable = false, length = 64)
    private String clientAttemptId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TangoQuizMode mode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private TangoQuizScope scope;

    @Column(name = "total_questions", nullable = false)
    private int totalQuestions;

    @Column(name = "correct_count", nullable = false)
    private int correctCount;

    @Column(name = "incorrect_count", nullable = false)
    private int incorrectCount;

    @Column(nullable = false)
    private double accuracy;

    @Column(nullable = false)
    private boolean passed;

    private Integer durationSeconds;

    @Column(nullable = false)
    private LocalDateTime submittedAt;
}
