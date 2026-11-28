package com.vocabpet.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/** One saved shadowing run. No audio is stored; independent of listening, vocabulary, grammar and SRS progress. */
@Entity
@Table(name = "shadowing_sessions", uniqueConstraints =
        @UniqueConstraint(columnNames = {"user_id", "client_session_id"}))
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShadowingSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "client_session_id", nullable = false, length = 64)
    private String clientSessionId;

    @Column(name = "unit_id", nullable = false, length = 64)
    private String unitId;

    @Column(name = "jlpt_level", nullable = false, length = 2)
    private String level;

    /** REPEAT, IMMEDIATE or CONTINUOUS. */
    @Column(name = "practice_mode", nullable = false, length = 12)
    private String mode;

    @Column(name = "sentence_count", nullable = false)
    private int sentences;

    @Column(name = "recording_count", nullable = false)
    private int recordings;

    /** Every sentence of the unit was practised. */
    @Column(nullable = false)
    private boolean completed;

    @Column(name = "duration_seconds", nullable = false)
    private int durationSeconds;

    @Column(name = "completed_at", nullable = false)
    private Instant completedAt;

    @ElementCollection
    @CollectionTable(name = "shadowing_sentence_results", joinColumns = @JoinColumn(name = "session_id"))
    @OrderColumn(name = "position")
    @Builder.Default
    private List<ShadowingSentenceResult> results = new ArrayList<>();
}
