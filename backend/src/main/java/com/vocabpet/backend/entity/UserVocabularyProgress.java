package com.vocabpet.backend.entity;

import com.vocabpet.backend.entity.enums.LearningSource;
import com.vocabpet.backend.entity.enums.Status;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_vocabulary_progress", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "user_id", "vocabulary_id" })
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserVocabularyProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne
    @JoinColumn(name = "vocabulary_id")
    private Vocabulary vocabulary;

    /** Canonical word shared by Tango lessons and flashcard decks. Null for legacy rows. */
    @ManyToOne
    @JoinColumn(name = "tango_vocabulary_id")
    private TangoVocabulary tangoVocabulary;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Status status = Status.NEW;

    @Builder.Default
    private double stability = 0;

    @Builder.Default
    private double difficulty = 0;

    @Builder.Default
    private int repetitions = 0;

    @Builder.Default
    private int lapses = 0;

    private LocalDateTime lastReviewTime;

    @Builder.Default
    private LocalDateTime nextReviewTime = LocalDateTime.now();

    @Builder.Default
    private int timesSeen = 0;

    @Builder.Default
    private int correctCount = 0;

    @Builder.Default
    private int incorrectCount = 0;

    @Enumerated(EnumType.STRING)
    private LearningSource lastSource;

    /** Learning Path: weak = needs extra work (wrong in a test, or several misses in a row). Separate from mastery. */
    @Column(nullable = false)
    @org.hibernate.annotations.ColumnDefault("false")
    @Builder.Default
    private boolean weak = false;

    /** +n = n correct answers in a row, -n = n wrong in a row. Drives the weak flag. */
    @Column(nullable = false)
    @org.hibernate.annotations.ColumnDefault("0")
    @Builder.Default
    private int answerStreak = 0;
}