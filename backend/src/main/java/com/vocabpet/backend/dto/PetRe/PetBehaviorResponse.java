package com.vocabpet.backend.dto.PetRe;

import com.vocabpet.backend.entity.enums.PetAction;
import com.vocabpet.backend.entity.enums.PetMood;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PetBehaviorResponse {

    private PetMood mood;

    private PetAction action;

    private String message;

    private int priority;

    private int duration;
}