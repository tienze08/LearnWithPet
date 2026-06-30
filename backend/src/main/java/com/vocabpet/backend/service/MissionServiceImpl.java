package com.vocabpet.backend.service;

import java.time.LocalDate;
import java.util.List;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.vocabpet.backend.entity.UserMission;
import com.vocabpet.backend.entity.enums.MissionType;
import com.vocabpet.backend.repository.UserMissionRepository;
import com.vocabpet.backend.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class MissionServiceImpl implements MissionService {

    private final UserMissionRepository missionRepository;
    private final RewardService rewardService;
    private final UserRepository userRepository;

    @Override
    public void trackLearnWord(Long userId) {
        updateMission(userId, MissionType.LEARN_WORDS, 1);
    }

    @Override
    public void trackSessionCompleted(Long userId) {
        updateMission(userId, MissionType.FINISH_SESSION, 1);
    }

    @Override
    public void trackReview(Long userId) {
        updateMission(userId, MissionType.REVIEW_COUNT, 1);
    }

    private void ensureMission(Long userId, MissionType type) {

        LocalDate today = LocalDate.now();

        missionRepository
                .findByUserIdAndTypeAndDate(userId, type, today)
                .orElseGet(() -> {
                    UserMission mission = new UserMission();
                    mission.setUserId(userId);
                    mission.setType(type);
                    mission.setDate(today);

                    mission.setCurrentValue(0);
                    mission.setCompleted(false);

                    switch (type) {
                        case LEARN_WORDS -> {
                            mission.setTargetValue(10);
                            mission.setRewardXp(50);
                            mission.setRewardCoin(20);
                        }
                        case FINISH_SESSION -> {
                            mission.setTargetValue(3);
                            mission.setRewardXp(30);
                            mission.setRewardCoin(10);
                        }
                        case REVIEW_COUNT -> {
                            mission.setTargetValue(20);
                            mission.setRewardXp(40);
                            mission.setRewardCoin(15);
                        }
                        case STUDY_TIME -> {
                            mission.setTargetValue(60); // phút học
                            mission.setRewardXp(60);
                            mission.setRewardCoin(25);
                        }
                    }

                    return missionRepository.save(mission);
                });
    }

    @Scheduled(cron = "0 0 0 * * *")
    public void generateAllUsersMissions() {
        List<Long> userIds = userRepository.findAllIds();

        for (Long userId : userIds) {
            for (MissionType type : MissionType.values()) {
                ensureMission(userId, type);
            }
        }
    }

    private void updateMission(Long userId, MissionType type, int increment) {

        LocalDate today = LocalDate.now();

        UserMission mission = missionRepository
                .findByUserIdAndTypeAndDate(userId, type, today)
                .orElseThrow(() -> new RuntimeException("Mission not generated yet"));

        if (mission.isCompleted())
            return;

        mission.setCurrentValue(mission.getCurrentValue() + increment);

        if (mission.getCurrentValue() >= mission.getTargetValue()) {
            mission.setCompleted(true);

            rewardService.grantReward(
                    userId,
                    mission.getRewardXp(),
                    mission.getRewardCoin());
        }

        missionRepository.save(mission);
    }
}
