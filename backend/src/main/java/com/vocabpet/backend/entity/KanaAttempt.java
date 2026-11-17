package com.vocabpet.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "kana_attempts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KanaAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String script;

    @Column(nullable = false)
    private String section;

    @Column(nullable = false)
    private int score;

    @Column(nullable = false)
    private int total;

    private Integer durationSeconds;

    @Column(nullable = false)
    private LocalDateTime completedAt;

    @Column(unique = true)
    private String clientAttemptId;

    @PrePersist
    public void prePersist() {
        if (completedAt == null) completedAt = LocalDateTime.now();
    }
}
