package com.vocabpet.backend.service.personality;

import org.springframework.stereotype.Service;

import com.vocabpet.backend.dto.PetRe.PetBehaviorResponse;
import com.vocabpet.backend.entity.enums.PetSpecies;

/** Personality copy for the golden PUPU companion. */
@Service
public class PupuPersonality implements PetPersonality {
    @Override
    public PetSpecies getSpecies() {
        return PetSpecies.PUPU;
    }

    @Override
    public String buildMessage(PetBehaviorResponse behavior) {
        return switch (behavior.getAction()) {
            case IDLE -> "Purr… I'm right here.";
            case STUDY -> "Let's review this one together.";
            case HAPPY, CELEBRATE -> "That was wonderful!";
            case SAD, CRY -> "It's okay. We'll see it again soon.";
            case WALK -> "A little stretch before we learn?";
            case SLEEP -> "I'll rest while you take a break.";
            case THINK -> "Hmm, let me think…";
        };
    }
}
