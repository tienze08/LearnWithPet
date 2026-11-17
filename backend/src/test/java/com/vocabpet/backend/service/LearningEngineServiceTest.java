package com.vocabpet.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.time.LocalDateTime;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

import com.vocabpet.backend.entity.TangoVocabulary;
import com.vocabpet.backend.entity.User;
import com.vocabpet.backend.entity.UserVocabularyProgress;
import com.vocabpet.backend.entity.Vocabulary;
import com.vocabpet.backend.entity.enums.LearningSource;
import com.vocabpet.backend.entity.enums.Rating;
import com.vocabpet.backend.repository.UserVocabularyProgressRepository;

class LearningEngineServiceTest {

    private final UserVocabularyProgressRepository repo = mock(UserVocabularyProgressRepository.class);
    private final FsrsService fsrs = mock(FsrsService.class);
    private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    private final LearningEngineService engine = new LearningEngineService(repo, fsrs, events);

    private final User user = User.builder().id(1L).build();

    @Test
    void newFlashcardRowLinksCanonicalAndCountsCorrect() {
        Vocabulary v = Vocabulary.builder().id(10L).build();
        TangoVocabulary t = TangoVocabulary.builder().id(20L).build();
        v.setTangoVocabulary(t);
        when(repo.findByUserIdAndVocabularyId(1L, 10L)).thenReturn(Optional.empty());
        when(repo.findByUserIdAndTangoVocabularyId(1L, 20L)).thenReturn(Optional.empty());
        when(repo.save(any())).thenAnswer(i -> i.getArgument(0));

        UserVocabularyProgress p = engine.record(user, v, null, LearningSource.FLASHCARD, Rating.GOOD);

        assertThat(p.getVocabulary()).isSameAs(v);
        assertThat(p.getTangoVocabulary()).isSameAs(t);
        assertThat(p.getCorrectCount()).isEqualTo(1);
        assertThat(p.getTimesSeen()).isEqualTo(1);
        assertThat(p.getLastSource()).isEqualTo(LearningSource.FLASHCARD);
        verify(fsrs).review(p, Rating.GOOD);
    }

    @Test
    void tangoAnswerUsesCanonicalRowAndCountsIncorrect() {
        TangoVocabulary t = TangoVocabulary.builder().id(20L).build();
        UserVocabularyProgress existing = UserVocabularyProgress.builder().user(user).tangoVocabulary(t).build();
        when(repo.findByUserIdAndTangoVocabularyId(1L, 20L)).thenReturn(Optional.of(existing));
        when(repo.save(any())).thenAnswer(i -> i.getArgument(0));

        UserVocabularyProgress p = engine.record(user, null, t, LearningSource.QUIZ, Rating.AGAIN);

        assertThat(p).isSameAs(existing);
        assertThat(p.getIncorrectCount()).isEqualTo(1);
        assertThat(p.getCorrectCount()).isZero();
        verify(repo, never()).findByUserIdAndVocabularyId(anyLong(), anyLong());
    }

    @Test
    void canonicalOnlyRowIsMergedIntoDeckRow() {
        Vocabulary v = Vocabulary.builder().id(10L).build();
        TangoVocabulary t = TangoVocabulary.builder().id(20L).build();
        v.setTangoVocabulary(t);
        UserVocabularyProgress deckRow = UserVocabularyProgress.builder().user(user).vocabulary(v)
                .timesSeen(2).correctCount(2).build();
        UserVocabularyProgress tangoRow = UserVocabularyProgress.builder().user(user).tangoVocabulary(t)
                .timesSeen(3).correctCount(1).incorrectCount(2).build();
        when(repo.findByUserIdAndVocabularyId(1L, 10L)).thenReturn(Optional.of(deckRow));
        when(repo.findByUserIdAndTangoVocabularyId(1L, 20L)).thenReturn(Optional.of(tangoRow));
        when(repo.save(any())).thenAnswer(i -> i.getArgument(0));

        UserVocabularyProgress p = engine.record(user, v, null, LearningSource.FLASHCARD, Rating.GOOD);

        assertThat(p).isSameAs(deckRow);
        assertThat(p.getTimesSeen()).isEqualTo(2 + 3 + 1);
        assertThat(p.getCorrectCount()).isEqualTo(2 + 1 + 1);
        assertThat(p.getIncorrectCount()).isEqualTo(2);
        assertThat(p.getTangoVocabulary()).isSameAs(t);
        verify(repo).delete(tangoRow);
    }

    @Test
    void recordSeenDoesNotReschedule() {
        TangoVocabulary t = TangoVocabulary.builder().id(20L).build();
        LocalDateTime due = LocalDateTime.of(2030, 1, 1, 0, 0);
        UserVocabularyProgress existing = UserVocabularyProgress.builder().user(user).tangoVocabulary(t)
                .nextReviewTime(due).build();
        when(repo.findByUserIdAndTangoVocabularyId(1L, 20L)).thenReturn(Optional.of(existing));
        when(repo.save(any())).thenAnswer(i -> i.getArgument(0));

        engine.recordSeen(user, t, LearningSource.TANGO);

        assertThat(existing.getTimesSeen()).isEqualTo(1);
        assertThat(existing.getNextReviewTime()).isEqualTo(due);
        verifyNoInteractions(fsrs);
    }
}
