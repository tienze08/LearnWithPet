package com.vocabpet.backend.dto.VocabularyRe;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class VocabularyResponse {

    private Long id;

    private String word;

    private String meaning;

    private String example;

    private String difficulty;

    private String partOfSpeech;

    private Long deckId;
}