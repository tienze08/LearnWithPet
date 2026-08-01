package com.vocabpet.backend.controller;

import com.vocabpet.backend.dto.achievement.AchievementStatusResponse;
import com.vocabpet.backend.service.AchievementService;
import com.vocabpet.backend.service.CurrentUserService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/achievements")
@RequiredArgsConstructor
public class AchievementController {
    private final AchievementService achievementService;
    private final CurrentUserService currentUserService;

    @GetMapping("/me")
    public List<AchievementStatusResponse> mine() {
        return achievementService.getMyAchievements(currentUserService.getCurrentUser());
    }
}
