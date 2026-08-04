package com.vocabpet.backend.dto.companion;

import com.vocabpet.backend.entity.enums.CompanionEventType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CompanionEventRequest {
    @NotNull
    private CompanionEventType event;
}
