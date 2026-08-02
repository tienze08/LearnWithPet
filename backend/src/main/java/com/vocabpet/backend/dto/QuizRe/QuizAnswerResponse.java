package com.vocabpet.backend.dto.QuizRe;

import com.vocabpet.backend.dto.PetRe.PetBehaviorResponse;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class QuizAnswerResponse {

    private boolean correct;

    private String correctAnswer;

    private int xp;

    private int coin;

    private PetBehaviorResponse petBehavior;

}
