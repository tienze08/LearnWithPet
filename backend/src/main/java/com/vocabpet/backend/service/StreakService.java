package com.vocabpet.backend.service;

import com.vocabpet.backend.entity.UserStreak;

public interface StreakService {
    void updateMyStreak();

    UserStreak getMyStreak();
}
