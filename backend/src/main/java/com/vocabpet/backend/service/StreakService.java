package com.vocabpet.backend.service;

import com.vocabpet.backend.dto.StudyCardRe.StreakUpdateResult;
import com.vocabpet.backend.entity.UserStreak;

public interface StreakService {
    StreakUpdateResult updateMyStreak();

    UserStreak getMyStreak();
}
