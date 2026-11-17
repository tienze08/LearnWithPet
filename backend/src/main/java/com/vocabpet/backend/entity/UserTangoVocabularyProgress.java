package com.vocabpet.backend.entity;

import com.vocabpet.backend.entity.enums.TangoVocabularyStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/** Per-user progress for a catalog word. Shared across all lessons that contain the word. */
@Entity
@Table(name = "user_tango_vocabulary_progress",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "vocabulary_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserTangoVocabularyProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vocabulary_id", nullable = false)
    private TangoVocabulary vocabulary;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    @Builder.Default
    private TangoVocabularyStatus status = TangoVocabularyStatus.NEW;

    private LocalDateTime viewedAt;

    @Builder.Default
    private int answeredCount = 0;

    @Builder.Default
    private int correctCount = 0;

    @Builder.Default
    private int incorrectCount = 0;

    private LocalDateTime lastAnsweredAt;

    private LocalDateTime masteredAt;

    @Version
    private Long version;
}
