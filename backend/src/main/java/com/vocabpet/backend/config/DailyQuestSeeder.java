package com.vocabpet.backend.config;

import com.vocabpet.backend.entity.DailyQuest;
import com.vocabpet.backend.entity.enums.MissionType;
import com.vocabpet.backend.repository.DailyQuestRepository;
import com.vocabpet.backend.service.MissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DailyQuestSeeder implements ApplicationRunner {
    private final DailyQuestRepository dailyQuestRepository;
    private final MissionService missionService;

    @Override
    public void run(ApplicationArguments args) {
        seed(MissionType.LEARN_WORDS, "Fresh words", "Learn 3 new vocabulary words.", 3, 20, 4);
        seed(MissionType.REVIEW_COUNT, "Daily review", "Review 5 vocabulary words.", 5, 25, 5);
        seed(MissionType.FINISH_SESSION, "Study sprint", "Finish one study session.", 1, 30, 5);
        seed(MissionType.DESKTOP_QUIZ, "Quiz buddy", "Complete 3 quick quizzes with Burumaru.", 3, 15, 3);

        // Existing users get today's mission rows as soon as a new deployment starts.
        missionService.generateAllUsersMissions();
    }

    private void seed(MissionType type, String title, String description, int target, int rewardXp, int rewardCoin) {
        if (dailyQuestRepository.findByType(type).isPresent()) return;

        dailyQuestRepository.save(DailyQuest.builder()
                .type(type)
                .title(title)
                .description(description)
                .target(target)
                .rewardXp(rewardXp)
                .rewardCoin(rewardCoin)
                .active(true)
                .build());
    }
}
