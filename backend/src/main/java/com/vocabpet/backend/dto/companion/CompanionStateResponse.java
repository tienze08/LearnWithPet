package com.vocabpet.backend.dto.companion;

import com.vocabpet.backend.dto.PetRe.PetBehaviorResponse;
import com.vocabpet.backend.entity.enums.CompanionPersonality;
import com.vocabpet.backend.entity.enums.PetSpecies;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CompanionStateResponse {
    private String petName;
    private PetSpecies species;
    private int petLevel;
    private CompanionPersonality personality;
    private int energy;
    private boolean remindersEnabled;
    private int quietHoursStart;
    private int quietHoursEnd;
    private int streak;
    private long reviewsToday;
    private int dailyGoal;
    private PetBehaviorResponse reaction;
}
