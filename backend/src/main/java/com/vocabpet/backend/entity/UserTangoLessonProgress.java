package com.vocabpet.backend.entity;

import com.vocabpet.backend.entity.enums.TangoLessonStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_tango_lesson_progress",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "lesson_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserTangoLessonProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "lesson_id", nullable = false)
    private TangoLesson lesson;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private TangoLessonStatus status;

    @Column(nullable = false)
    private LocalDateTime startedAt;

    private LocalDateTime lastStudiedAt;

    private Integer lastPosition;

    @Column(nullable = false)
    @Builder.Default
    private boolean quizPassed = false;

    private Double bestQuizAccuracy;

    private LocalDateTime completedAt;
}
