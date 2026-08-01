package com.vocabpet.backend.service;

import com.vocabpet.backend.dto.achievement.AchievementStatusResponse;
import com.vocabpet.backend.entity.Achievement;
import com.vocabpet.backend.entity.User;
import com.vocabpet.backend.entity.UserAchievement;
import com.vocabpet.backend.entity.enums.AchievementType;
import com.vocabpet.backend.repository.AchievementRepository;
import com.vocabpet.backend.repository.StudyReviewRepository;
import com.vocabpet.backend.repository.UserAchievementRepository;
import jakarta.annotation.PostConstruct;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AchievementService {
    private final AchievementRepository achievementRepository;
    private final UserAchievementRepository userAchievementRepository;
    private final StudyReviewRepository studyReviewRepository;

    @PostConstruct
    void seedDefaults() {
        seed("first-review", "First Steps", "Review your very first word.", 1, AchievementType.STUDY_WORD);
        seed("reviews-50", "Getting Warm", "Review 50 words in total.", 50, AchievementType.STUDY_WORD);
        seed("reviews-250", "Bookworm", "Review 250 words in total.", 250, AchievementType.STUDY_WORD);
        seed("streak-3", "Habit Forming", "Keep a 3-day study streak.", 3, AchievementType.STREAK);
        seed("streak-7", "Week Warrior", "Keep a 7-day study streak.", 7, AchievementType.STREAK);
        seed("streak-30", "Unstoppable", "Keep a 30-day study streak.", 30, AchievementType.STREAK);
        seed("level-5", "Rising Learner", "Reach account level 5.", 5, AchievementType.COMPLETE_QUIZ);
        seed("level-10", "Vocabulary Adept", "Reach account level 10.", 10, AchievementType.COMPLETE_QUIZ);
    }

    @Transactional
    public List<AchievementStatusResponse> getMyAchievements(User user) {
        checkForUser(user);
        Map<Long, UserAchievement> unlocked = userAchievementRepository.findByUserId(user.getId()).stream()
                .collect(Collectors.toMap(item -> item.getAchievement().getId(), Function.identity()));
        return achievementRepository.findAll().stream().map(achievement -> {
            int progress = progressFor(user, achievement);
            UserAchievement unlockedItem = unlocked.get(achievement.getId());
            return new AchievementStatusResponse(achievement.getCode(), progress, achievement.getTarget(),
                    unlockedItem != null, unlockedItem == null ? null : unlockedItem.getUnlockedAt());
        }).toList();
    }

    @Transactional
    public void checkForUser(User user) {
        for (Achievement achievement : achievementRepository.findAll()) {
            if (progressFor(user, achievement) >= achievement.getTarget()
                    && !userAchievementRepository.existsByUserIdAndAchievementId(user.getId(), achievement.getId())) {
                userAchievementRepository.save(UserAchievement.builder()
                        .user(user).achievement(achievement).unlockedAt(LocalDateTime.now()).build());
            }
        }
    }

    /**
     * Desktop quiz answers are reviews too, but they do not create a
     * StudyReview row. Record the first completed quiz review explicitly so
     * the starter achievement is never left in the locked state.
     */
    @Transactional
    public void recordQuizReview(User user) {
        achievementRepository.findByCode("first-review").ifPresent(achievement -> {
            if (!userAchievementRepository.existsByUserIdAndAchievementId(user.getId(), achievement.getId())) {
                userAchievementRepository.save(UserAchievement.builder()
                        .user(user).achievement(achievement).unlockedAt(LocalDateTime.now()).build());
            }
        });
        checkForUser(user);
    }

    private int progressFor(User user, Achievement achievement) {
        return switch (achievement.getType()) {
            case STUDY_WORD -> (int) studyReviewRepository.countByUserId(user.getId());
            case STREAK -> user.getStreak();
            case COMPLETE_QUIZ -> user.getLevel();
            default -> 0;
        };
    }

    private void seed(String code, String name, String description, int target, AchievementType type) {
        if (achievementRepository.findByCode(code).isEmpty()) {
            achievementRepository.save(Achievement.builder().code(code).name(name).description(description)
                    .target(target).type(type).build());
        }
    }
}
