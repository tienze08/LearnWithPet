package com.vocabpet.backend.service.behavior;

import com.vocabpet.backend.dto.PetRe.PetBehaviorResponse;
import com.vocabpet.backend.entity.enums.PetEvent;

public interface PetBehaviorService {

    PetBehaviorResponse calculateCurrentBehavior();

    PetBehaviorResponse triggerEvent(PetEvent event);

}
