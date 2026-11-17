package com.vocabpet.backend.entity;

import com.vocabpet.backend.entity.enums.TangoPartOfSpeech;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Catalog word shared by many lessons. Separate from {@link Vocabulary}, which is deck-scoped.
 */
@Entity
@Table(name = "tango_vocabularies",
        uniqueConstraints = @UniqueConstraint(columnNames = {"kana", "expression_key"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TangoVocabulary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Kanji form, null for kana-only words. */
    @Column(length = 64)
    private String expression;

    /** Non-null copy of expression ("" when absent) so the unique index works on MySQL. */
    @Column(name = "expression_key", nullable = false, length = 64)
    private String expressionKey;

    @Column(nullable = false, length = 64)
    private String kana;

    @Column(nullable = false, length = 64)
    private String romaji;

    @Enumerated(EnumType.STRING)
    @Column(name = "part_of_speech", nullable = false, length = 32)
    private TangoPartOfSpeech partOfSpeech;

    @Column(name = "audio_url")
    private String audioUrl;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @Builder.Default
    @OneToMany(mappedBy = "vocabulary", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    private List<TangoVocabularyMeaning> meanings = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "vocabulary", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    private List<TangoVocabularyExample> examples = new ArrayList<>();

    public static String keyFor(String expression) {
        return expression == null ? "" : expression.trim();
    }

    @PrePersist
    @PreUpdate
    void touch() {
        expressionKey = keyFor(expression);
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }
}
