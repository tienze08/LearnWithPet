package com.vocabpet.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "kana_item_progress", uniqueConstraints =
        @UniqueConstraint(columnNames = {"user_id", "script", "kana"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KanaItemProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String kana;

    @Column(nullable = false)
    private String script;

    @Column(nullable = false)
    private String section;

    @Builder.Default
    private int correctCount = 0;

    @Builder.Default
    private int wrongCount = 0;

    private LocalDateTime lastSeenAt;

    @Builder.Default
    private boolean mastered = false;
}
