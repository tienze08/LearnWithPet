package com.vocabpet.backend.dto.QuizRe;

import java.util.List;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class QuizQuestionResponse {

    private Long vocabularyId;

    private String word;

    private List<String> options;

    private String partOfSpeech;

}
