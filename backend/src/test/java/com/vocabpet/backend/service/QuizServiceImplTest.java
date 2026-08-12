package com.vocabpet.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import com.vocabpet.backend.dto.QuizRe.QuizAnswerRequest;
import com.vocabpet.backend.entity.User;
import com.vocabpet.backend.repository.StudyReviewRepository;
import com.vocabpet.backend.repository.StudySessionRepository;
import com.vocabpet.backend.repository.UserRepository;
import com.vocabpet.backend.repository.UserVocabularyProgressRepository;
import com.vocabpet.backend.repository.VocabularyRepository;

@ExtendWith(MockitoExtension.class)
class QuizServiceImplTest {
    @Mock private CurrentUserService currentUserService;
    @Mock private VocabularyRepository vocabularyRepository;
    @Mock private UserRepository userRepository;
    @Mock private UserVocabularyProgressRepository progressRepository;
    @Mock private StudySessionRepository studySessionRepository;
    @Mock private StudyReviewRepository studyReviewRepository;
    @Mock private FsrsService fsrsService;
    @Mock private RewardService rewardService;
    @Mock private MissionService missionService;
    @Mock private StreakService streakService;
    @Mock private AchievementService achievementService;
    @Mock private CompanionService companionService;
    @InjectMocks private QuizServiceImpl service;

    @Test
    void answerRejectsCardThatDoesNotBelongToCurrentUser() {
        User currentUser = new User(); currentUser.setId(10L);
        QuizAnswerRequest request = new QuizAnswerRequest();
        request.setVocabularyId(88L);
        request.setAnswer("private answer");
        when(currentUserService.getCurrentUser()).thenReturn(currentUser);
        when(vocabularyRepository.findByIdAndDeckUserId(88L, 10L)).thenReturn(Optional.empty());

        ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> service.answer(request));

        assertEquals(409, error.getStatusCode().value());
        verify(fsrsService, never()).review(any(), any());
        verify(rewardService, never()).grantReward(any(), eq(10), eq(2));
    }

    @Test
    void answerRequiresNonBlankAnswerBeforeTouchingProgress() {
        User currentUser = new User(); currentUser.setId(10L);
        QuizAnswerRequest request = new QuizAnswerRequest();
        request.setVocabularyId(88L);
        request.setAnswer(" ");
        when(currentUserService.getCurrentUser()).thenReturn(currentUser);

        ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> service.answer(request));

        assertEquals(400, error.getStatusCode().value());
        verify(vocabularyRepository, never()).findByIdAndDeckUserId(any(), any());
    }
}
