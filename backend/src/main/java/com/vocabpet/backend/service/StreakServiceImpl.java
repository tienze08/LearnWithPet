package com.vocabpet.backend.service;

import java.time.LocalDate;

import org.springframework.stereotype.Service;

import com.vocabpet.backend.dto.StudyCardRe.StreakUpdateResult;
import com.vocabpet.backend.entity.User;
import com.vocabpet.backend.entity.UserStreak;
import com.vocabpet.backend.repository.UserStreakRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class StreakServiceImpl implements StreakService {

    private final UserStreakRepository streakRepository;
    private final CurrentUserService currentUserService;

    @Override
    public StreakUpdateResult updateMyStreak() {

        User user = currentUserService.getCurrentUser();
        LocalDate today = LocalDate.now();

        UserStreak streak = streakRepository.findByUserId(user.getId())
                .orElse(UserStreak.builder()
                        .user(user)
                        .currentStreak(0)
                        .longestStreak(0)
                        .lastActiveDate(null)
                        .build());

        LocalDate last = streak.getLastActiveDate();

        // đã hoạt động hôm nay → KHÔNG update nữa
        if (last != null && last.equals(today)) {
            return StreakUpdateResult.builder()
                    .updated(false)
                    .currentStreak(streak.getCurrentStreak())
                    .longestStreak(streak.getLongestStreak())
                    .build();
        }

        if (last == null) {
            streak.setCurrentStreak(1);
        } else if (last.equals(today.minusDays(1))) {
            streak.setCurrentStreak(streak.getCurrentStreak() + 1);
        } else {
            streak.setCurrentStreak(1);
        }

        streak.setLastActiveDate(today);

        streak.setLongestStreak(
                Math.max(streak.getLongestStreak(), streak.getCurrentStreak()));

        streakRepository.save(streak);

        return StreakUpdateResult.builder()
                .updated(true)
                .currentStreak(streak.getCurrentStreak())
                .longestStreak(streak.getLongestStreak())
                .build();
    }

    @Override
    public UserStreak getMyStreak() {

        User user = currentUserService.getCurrentUser();

        return streakRepository.findByUserId(user.getId())
                .orElse(null);
    }
}