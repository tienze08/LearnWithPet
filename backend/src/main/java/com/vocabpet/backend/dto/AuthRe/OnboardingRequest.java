package com.vocabpet.backend.dto.AuthRe;

import lombok.Data;

@Data
public class OnboardingRequest {

    private String avatarType;

    private String petName;

    private String petSpecies;
}
