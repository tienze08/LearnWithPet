package com.vocabpet.backend.dto.PetRe;

import com.vocabpet.backend.entity.enums.PetSpecies;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PetResponse {

    private Long id;

    private String name;

    private PetSpecies species;

    private boolean locked;

    private int level;

    private int xp;

    private PetBehaviorResponse behavior;
}
