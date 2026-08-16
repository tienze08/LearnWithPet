package com.vocabpet.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import com.vocabpet.backend.dto.QuizRe.QuizAnswerRequest;
import com.vocabpet.backend.dto.QuizRe.QuizQuestionResponse;
import com.vocabpet.backend.entity.User;
import com.vocabpet.backend.entity.Vocabulary;
import com.vocabpet.backend.entity.enums.PartOfSpeech;
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

    @Test
    void randomQuestionAlwaysIncludesTheCorrectMeaning() {
        User currentUser = new User(); currentUser.setId(10L);
        Vocabulary correct = vocabulary(1L, "sister", "female sibling");
        List<Vocabulary> cards = List.of(
                correct,
                vocabulary(2L, "suddenly", "quickly and unexpectedly"),
                vocabulary(3L, "jump", "moved suddenly because of surprise"),
                vocabulary(4L, "conversation", "talks between two or more people"),
                vocabulary(5L, "picture", "a drawing or photograph"));
        when(currentUserService.getCurrentUser()).thenReturn(currentUser);
        when(progressRepository.findDueCardsForQuiz(eq(10L), any())).thenReturn(List.of());
        when(progressRepository.findNewCardsForQuiz(10L)).thenReturn(List.of(correct));
        when(vocabularyRepository.findByDeckUserId(10L)).thenReturn(cards);

        QuizQuestionResponse question = service.randomQuestion();

        assertEquals("sister", question.getWord());
        assertEquals(4, question.getOptions().size());
        org.junit.jupiter.api.Assertions.assertTrue(question.getOptions().contains("female sibling"));
    }

    private Vocabulary vocabulary(Long id, String word, String meaning) {
        Vocabulary vocabulary = new Vocabulary();
        vocabulary.setId(id);
        vocabulary.setWord(word);
        vocabulary.setMeaning(meaning);
        vocabulary.setPartOfSpeech(PartOfSpeech.NOUN);
        return vocabulary;
    }
}
