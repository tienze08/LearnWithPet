package com.vocabpet.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import com.vocabpet.backend.entity.User;
import com.vocabpet.backend.repository.DeckRepository;
import com.vocabpet.backend.repository.StudyReviewRepository;
import com.vocabpet.backend.repository.StudySessionRepository;
import com.vocabpet.backend.repository.UserVocabularyProgressRepository;
import com.vocabpet.backend.repository.VocabularyRepository;

@ExtendWith(MockitoExtension.class)
class StudySessionServiceImplTest {
    @Mock
    private StudySessionRepository sessionRepository;
    @Mock
    private UserVocabularyProgressRepository progressRepository;
    @Mock
    private StudyReviewRepository reviewRepository;
    @Mock
    private AchievementService achievementService;
    @Mock
    private VocabularyRepository vocabularyRepository;
    @Mock
    private FsrsService fsrsService;
    @Mock
    private StreakService streakService;
    @Mock
    private MissionService missionService;
    @Mock
    private CompanionService companionService;
    @Mock
    private DeckRepository deckRepository;
    @Mock
    private CurrentUserService currentUserService;
    @InjectMocks
    private StudySessionServiceImpl service;

    @Test
    void startSessionRejectsAnotherUsersDeck() {
        User user = new User();
        user.setId(1L);
        when(currentUserService.getCurrentUser()).thenReturn(user);
        when(deckRepository.findByIdAndUser(99L, user)).thenReturn(Optional.empty());

        ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> service.startSession(99L));

        assertEquals(404, error.getStatusCode().value());
    }
}
