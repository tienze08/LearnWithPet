package com.vocabpet.backend.service.personality;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.vocabpet.backend.dto.PetRe.PetBehaviorResponse;
import com.vocabpet.backend.entity.enums.PetSpecies;

@Service
public class PersonalityEngineImpl implements PersonalityEngine {

    private final Map<PetSpecies, PetPersonality> personalities;

    public PersonalityEngineImpl(List<PetPersonality> list) {

        this.personalities = list.stream()
                .collect(Collectors.toMap(
                        PetPersonality::getSpecies,
                        Function.identity()));
    }

    @Override
    public String buildMessage(
            PetSpecies species,
            PetBehaviorResponse behavior) {

        return personalities
                .get(species)
                .buildMessage(behavior);
    }
}
