package com.vocabpet.backend.entity;

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

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Status status = Status.NEW;

    @Builder.Default
    private int correctCount = 0;
    @Builder.Default
    private int wrongCount = 0;

    @Builder.Default
    private double easeFactor = 2.5;
    @Builder.Default
    private int intervalDays = 1;

    private LocalDateTime nextReviewTime;
    private LocalDateTime lastReviewTime;
}