package com.vocabpet.backend.config;

import com.vocabpet.backend.service.AchievementService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/** Seeds achievement definitions only after JPA has finished schema creation. */
@Component
@Order(20)
@RequiredArgsConstructor
public class AchievementSeeder implements ApplicationRunner {
    private final AchievementService achievementService;

    @Override
    public void run(ApplicationArguments args) {
        achievementService.seedDefaults();
    }
}
