package com.vocabpet.backend.service;

import org.springframework.stereotype.Service;

import com.vocabpet.backend.entity.UserReward;
import com.vocabpet.backend.repository.UserRewardRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class RewardServiceImpl implements RewardService {

    private final UserRewardRepository rewardRepository;

    @Override
    public void grantReward(Long userId, int xp, int coin) {

        UserReward reward = rewardRepository.findById(userId)
                .orElseGet(() -> {
                    UserReward r = new UserReward();
                    r.setUserId(userId);
                    r.setXp(0);
                    r.setCoin(0);
                    r.setLevel(1);
                    return r;
                });

        reward.setXp(reward.getXp() + xp);
        reward.setCoin(reward.getCoin() + coin);

        rewardRepository.save(reward);
    }
}
