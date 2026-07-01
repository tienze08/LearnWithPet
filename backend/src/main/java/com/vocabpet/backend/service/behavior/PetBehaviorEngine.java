package com.vocabpet.backend.service.behavior;

import com.vocabpet.backend.dto.PetRe.PetBehaviorResponse;

public interface PetBehaviorEngine {

    PetBehaviorResponse calculate(PetBehaviorContext context);

}