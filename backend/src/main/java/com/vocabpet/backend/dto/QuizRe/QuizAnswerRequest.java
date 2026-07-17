package com.vocabpet.backend.dto.QuizRe;

import lombok.Data;

@Data
public class QuizAnswerRequest {

    private Long vocabularyId;

    private String answer;

}