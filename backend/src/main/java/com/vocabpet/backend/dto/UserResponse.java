package com.vocabpet.backend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserResponse {

    private Long id;
    private String name;
    private String email;
    private Integer level;
    private Integer xp;
    private Boolean onboarded;
    private String avatarType;
    private PetResponse pet;
}