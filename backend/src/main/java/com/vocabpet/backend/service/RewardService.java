package com.vocabpet.backend.service;

public interface RewardService {
    void grantReward(Long userId, int xp, int coin);
}
