package com.vocabpet.backend.dto.VocabularyRe;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VocabularyResponse {

    private Long id;

    private String word;

    private String meaning;

    private String example;

    private String difficulty;

    private String partOfSpeech;

    private Long deckId;

    private boolean bookmarked;

    /** Set only for cards linked to a Tango word; null for plain (English) cards. */
    private String kana;

    private String romaji;

    private Long lessonId;

    private Integer lessonNumber;

    private String jlptLevel;
}