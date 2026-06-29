package com.vocabpet.backend.dto.VocabularyRe;

import com.vocabpet.backend.entity.enums.Difficulty;
import com.vocabpet.backend.entity.enums.PartOfSpeech;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class VocabularyRequest {

    @NotBlank
    private String word;

    @NotBlank
    private String meaning;

    private String example;

    @NotNull
    private Difficulty difficulty;

    @NotNull
    private PartOfSpeech partOfSpeech;
}