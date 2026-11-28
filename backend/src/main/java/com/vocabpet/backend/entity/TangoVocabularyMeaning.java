package com.vocabpet.backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "tango_vocabulary_meanings",
        uniqueConstraints = @UniqueConstraint(columnNames = {"vocabulary_id", "language", "meaning"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TangoVocabularyMeaning {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vocabulary_id", nullable = false)
    private TangoVocabulary vocabulary;

    @Column(nullable = false, length = 8)
    @Builder.Default
    private String language = "vi";

    @Column(nullable = false, length = 255)
    private String meaning;

    @Column(name = "is_primary", nullable = false)
    private boolean primaryMeaning;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(length = 255)
    private String note;
}
