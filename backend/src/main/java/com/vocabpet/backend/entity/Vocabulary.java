package com.vocabpet.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import com.vocabpet.backend.entity.enums.Difficulty;

@Entity
@Table(name = "vocabularies")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Vocabulary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String word;

    @Column(columnDefinition = "TEXT")
    private String meaning;

    @Column(columnDefinition = "TEXT")
    private String example;

    @Enumerated(EnumType.STRING)
    private Difficulty difficulty;

    private String topic;

    @ManyToOne
    @JoinColumn(name = "deck_id")
    private Deck deck;
}