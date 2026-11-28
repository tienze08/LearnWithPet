package com.vocabpet.backend.dto.AuthRe;

import com.vocabpet.backend.entity.enums.PetSpecies;

import lombok.Data;

@Data
public class OnboardingRequest {

    private String avatarType;

    private String petName;

    private PetSpecies petSpecies;

    private String displayName;

    private Integer dailyGoal;

    private String studyLevel;

    private String studyGoal;
}
