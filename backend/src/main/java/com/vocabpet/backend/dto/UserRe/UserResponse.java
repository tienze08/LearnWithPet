package com.vocabpet.backend.dto.UserRe;

import com.vocabpet.backend.dto.PetResponse;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserResponse {

    private Long id;

    private String name;

    private String email;

    private String avatar;

    private int level;

    private int xp;

    private int totalXp;

    private int streak;

    private Boolean onboarded;

    private PetResponse pet;

}