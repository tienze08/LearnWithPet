package com.vocabpet.backend.entity;

import com.vocabpet.backend.entity.enums.TangoQuizMode;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "tango_quiz_answers",
        uniqueConstraints = @UniqueConstraint(columnNames = {"attempt_id", "vocabulary_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TangoQuizAnswer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "attempt_id", nullable = false)
    private TangoQuizAttempt attempt;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vocabulary_id", nullable = false)
    private TangoVocabulary vocabulary;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TangoQuizMode mode;

    @Column(name = "submitted_answer", nullable = false, length = 255)
    private String submittedAnswer;

    @Column(name = "normalized_answer", nullable = false, length = 255)
    private String normalizedAnswer;

    @Column(name = "is_correct", nullable = false)
    private boolean correct;
}
