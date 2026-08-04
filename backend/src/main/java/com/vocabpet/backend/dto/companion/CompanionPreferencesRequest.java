package com.vocabpet.backend.dto.companion;

import com.vocabpet.backend.entity.enums.CompanionPersonality;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Data;

@Data
public class CompanionPreferencesRequest {
    private CompanionPersonality personality;
    private Boolean remindersEnabled;

    @Min(0)
    @Max(23)
    private Integer quietHoursStart;

    @Min(0)
    @Max(23)
    private Integer quietHoursEnd;
}
