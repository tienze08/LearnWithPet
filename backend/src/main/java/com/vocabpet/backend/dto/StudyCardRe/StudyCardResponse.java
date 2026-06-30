package com.vocabpet.backend.dto.StudyCardRe;

import com.vocabpet.backend.entity.enums.Difficulty;
import com.vocabpet.backend.entity.enums.PartOfSpeech;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class StudyCardResponse {

    private Long progressId;

    private Long vocabularyId;

    private String word;

    private String meaning;

    private String example;

    private Difficulty difficulty;

    private PartOfSpeech partOfSpeech;
}
