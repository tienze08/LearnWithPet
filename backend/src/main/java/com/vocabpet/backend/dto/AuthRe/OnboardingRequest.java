package com.vocabpet.backend.dto.AuthRe;

import com.vocabpet.backend.entity.enums.PetSpecies;

import lombok.Data;

@Data
public class OnboardingRequest {

    private String avatarType;

    private String petName;

    private PetSpecies petSpecies;
}
