package com.vocabpet.backend.dto.StudyCardRe;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class StreakUpdateResult {

    private boolean updated;

    private int currentStreak;

    private int longestStreak;
}