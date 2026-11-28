package com.vocabpet.backend.entity;

import com.vocabpet.backend.entity.enums.JlptLevel;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "tango_lessons",
        uniqueConstraints = @UniqueConstraint(columnNames = {"jlpt_level", "lesson_number"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TangoLesson {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "jlpt_level", nullable = false, length = 2)
    private JlptLevel jlptLevel;

    @Column(name = "lesson_number", nullable = false)
    private int lessonNumber;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(nullable = false)
    @Builder.Default
    private boolean published = true;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    void touch() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }
}
