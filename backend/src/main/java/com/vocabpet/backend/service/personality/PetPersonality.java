package com.vocabpet.backend.service.personality;

import com.vocabpet.backend.dto.PetRe.PetBehaviorResponse;
import com.vocabpet.backend.entity.enums.PetSpecies;

public interface PetPersonality {

    PetSpecies getSpecies();

    String buildMessage(PetBehaviorResponse behavior);

}