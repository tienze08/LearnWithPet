package com.vocabpet.backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "bookmarks", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "user_id", "vocabulary_id" })
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Bookmark {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vocabulary_id", nullable = false)
    private Vocabulary vocabulary;

}