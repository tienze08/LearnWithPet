package com.vocabpet.backend.service;

import java.time.LocalDate;
import java.util.List;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.vocabpet.backend.dto.UserMissionRe.UserMissionResponse;
import com.vocabpet.backend.entity.DailyQuest;
import com.vocabpet.backend.entity.UserMission;
import com.vocabpet.backend.entity.enums.MissionType;
import com.vocabpet.backend.repository.DailyQuestRepository;
import com.vocabpet.backend.repository.UserMissionRepository;
import com.vocabpet.backend.repository.UserRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class MissionServiceImpl implements MissionService {

    private final UserMissionRepository missionRepository;
    private final RewardService rewardService;
    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;
    private final DailyQuestRepository dailyQuestRepository;

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

    @Override
    public void trackQuiz(Long userId) {
        updateMission(userId, MissionType.DESKTOP_QUIZ, 1);
    }

    private UserMission ensureMission(Long userId, DailyQuest quest) {

        LocalDate today = LocalDate.now();

        return missionRepository
                .findByUserIdAndDailyQuestIdAndDate(
                        userId,
                        quest.getId(),
                        today)
                .orElseGet(() -> {

                    UserMission mission = UserMission.builder()
                            .userId(userId)
                            .dailyQuest(quest)
                            .date(today)
                            .build();

                    return missionRepository.save(mission);
                });
    }

    @Scheduled(cron = "0 0 0 * * *")
    @Override
    public void generateAllUsersMissions() {
        List<DailyQuest> quests = dailyQuestRepository.findByActiveTrue();

        for (Long userId : userRepository.findAllIds()) {

            for (DailyQuest quest : quests) {

                ensureMission(userId, quest);

            }

        }
    }

    private void updateMission(Long userId,
            MissionType type,
            int increment) {

        DailyQuest quest = dailyQuestRepository.findByType(type).orElse(null);
        // A newly created/local database may not have seeded daily quests yet.
        // Mission progress is optional and must never block an actual review.
        if (quest == null) {
            return;
        }

        UserMission mission = ensureMission(userId, quest);

        if (mission.isCompleted()) {
            return;
        }

        mission.setCurrentValue(
                mission.getCurrentValue() + increment);

        if (mission.getCurrentValue() >= quest.getTarget()) {
            mission.setCompleted(true);
        }

        missionRepository.save(mission);
    }

    @Transactional
    @Override
    public void claimMission(Long missionId) {

        UserMission mission = missionRepository.findById(missionId)
                .orElseThrow();

        if (!mission.isCompleted()) {
            throw new RuntimeException("Mission is not completed");
        }

        if (mission.isRewardClaimed()) {
            throw new RuntimeException("Reward already claimed");
        }

        rewardService.grantReward(
                mission.getUserId(),
                mission.getDailyQuest().getRewardXp(),
                mission.getDailyQuest().getRewardCoin());

        mission.setRewardClaimed(true);

        missionRepository.saveAndFlush(mission);
    }

    @Override
    public List<UserMissionResponse> getTodayMissions() {

        Long userId = currentUserService.getCurrentUser().getId();
        LocalDate today = LocalDate.now();

        List<DailyQuest> quests = dailyQuestRepository.findByActiveTrue();

        for (DailyQuest quest : quests) {
            ensureMission(userId, quest);
        }

        return missionRepository
                .findAllByUserIdAndDate(userId, today)
                .stream()
                .map(mission -> {

                    DailyQuest quest = mission.getDailyQuest();

                    return UserMissionResponse.builder()
                            .id(mission.getId())
                            .type(quest.getType().name())
                            .title(quest.getTitle())
                            .description(quest.getDescription())
                            .currentValue(mission.getCurrentValue())
                            .targetValue(quest.getTarget())
                            .completed(mission.isCompleted())
                            .rewardClaimed(mission.isRewardClaimed())
                            .rewardXp(quest.getRewardXp())
                            .rewardCoin(quest.getRewardCoin())
                            .build();
                })
                .toList();
    }

}
