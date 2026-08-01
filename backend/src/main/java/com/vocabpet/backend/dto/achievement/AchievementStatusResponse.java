package com.vocabpet.backend.dto.achievement;

import java.time.LocalDateTime;

public record AchievementStatusResponse(
        String code,
        int progress,
        int target,
        boolean unlocked,
        LocalDateTime unlockedAt) {
}
