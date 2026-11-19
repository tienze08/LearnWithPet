package com.vocabpet.backend.entity;

import java.time.Instant;

import com.vocabpet.backend.entity.enums.PathItemType;

import jakarta.persistence.*;
import lombok.*;

/** "Báo câu hỏi sai": a learner flags an auto-generated question. The question is snapshotted because it is built on the frontend. */
@Entity
@Table(name = "question_reports", indexes = @Index(columnList = "item_type,item_id"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuestionReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "item_type", nullable = false, length = 8)
    private PathItemType itemType;

    @Column(name = "item_id", nullable = false, length = 64)
    private String itemId;

    /** e.g. grammar-cloze, kanji-meaning, kanji-reading, vocab-meaning. */
    @Column(nullable = false, length = 32)
    private String questionKind;

    /** JSON of the question as shown: prompt, options, the answer the generator expected. */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String questionJson;

    @Column(length = 500)
    private String comment;

    private Instant createdAt;

    @PrePersist
    void created() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
