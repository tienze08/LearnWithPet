package com.vocabpet.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "study_sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudySession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "deck_id")
    private Deck deck;

    private LocalDateTime startedAt;

    private LocalDateTime finishedAt;

    @Builder.Default
    private Integer totalReviews = 0;

    @Builder.Default
    private Integer uniqueCards = 0;

    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL)
    @Builder.Default
    private List<StudyReview> reviews = new ArrayList<>();

    public Long getDurationSeconds() {
        if (startedAt == null || finishedAt == null)
            return 0L;

        return Duration.between(startedAt, finishedAt).toSeconds();
    }
}