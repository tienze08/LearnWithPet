package com.vocabpet.backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "tango_vocabulary_examples",
        uniqueConstraints = @UniqueConstraint(columnNames = {"vocabulary_id", "sort_order"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TangoVocabularyExample {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vocabulary_id", nullable = false)
    private TangoVocabulary vocabulary;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String japanese;

    @Column(columnDefinition = "TEXT")
    private String reading;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String vietnamese;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;
}
