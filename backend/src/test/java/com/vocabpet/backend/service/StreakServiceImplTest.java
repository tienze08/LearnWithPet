package com.vocabpet.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.vocabpet.backend.dto.StudyCardRe.StreakUpdateResult;
import com.vocabpet.backend.entity.User;
import com.vocabpet.backend.entity.UserStreak;
import com.vocabpet.backend.repository.UserRepository;
import com.vocabpet.backend.repository.UserStreakRepository;

@ExtendWith(MockitoExtension.class)
class StreakServiceImplTest {

    @Mock
    private UserStreakRepository streakRepository;

    @Mock
    private CurrentUserService currentUserService;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private StreakServiceImpl streakService;

    @Test
    void updateMyStreakShouldSyncCurrentStreakToUserProfile() {
        User user = new User();
        user.setId(11L);
        user.setStreak(0);

        when(currentUserService.getCurrentUser()).thenReturn(user);
        when(streakRepository.findByUserId(11L)).thenReturn(Optional.empty());

        StreakUpdateResult result = streakService.updateMyStreak();

        assertEquals(true, result.isUpdated());
        assertEquals(1, result.getCurrentStreak());
        assertEquals(1, user.getStreak());
        verify(streakRepository).save(any(UserStreak.class));
        verify(userRepository).save(user);
    }
}
