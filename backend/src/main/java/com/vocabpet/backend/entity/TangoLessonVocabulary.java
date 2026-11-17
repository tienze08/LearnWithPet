package com.vocabpet.backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "tango_lesson_vocabularies", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"lesson_id", "vocabulary_id"}),
        @UniqueConstraint(columnNames = {"lesson_id", "position"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TangoLessonVocabulary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "lesson_id", nullable = false)
    private TangoLesson lesson;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vocabulary_id", nullable = false)
    private TangoVocabulary vocabulary;

    @Column(nullable = false)
    private int position;

    @Column(nullable = false)
    @Builder.Default
    private boolean required = true;
}
