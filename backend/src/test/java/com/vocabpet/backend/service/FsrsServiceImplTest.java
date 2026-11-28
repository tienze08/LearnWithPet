package com.vocabpet.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Duration;
import java.time.LocalDateTime;

import org.junit.jupiter.api.Test;

import com.vocabpet.backend.entity.UserVocabularyProgress;
import com.vocabpet.backend.entity.enums.Rating;
import com.vocabpet.backend.entity.enums.Status;

class FsrsServiceImplTest {

    private final FsrsService service = new FsrsServiceImpl();

    @Test
    void againSchedulesShortRelearningStep() {
        UserVocabularyProgress progress = UserVocabularyProgress.builder()
                .stability(1.2).difficulty(0.4).repetitions(2).build();
        LocalDateTime before = LocalDateTime.now();

        service.review(progress, Rating.AGAIN);

        assertEquals(Status.LEARNING, progress.getStatus());
        assertEquals(3, progress.getRepetitions());
        assertEquals(1, progress.getLapses());
        assertTrue(Duration.between(before, progress.getNextReviewTime()).toMinutes() >= 9);
        assertTrue(Duration.between(before, progress.getNextReviewTime()).toMinutes() <= 11);
    }

    @Test
    void goodSchedulesAtLeastTomorrowAndNeverDecreasesRepetitions() {
        UserVocabularyProgress progress = UserVocabularyProgress.builder()
                .stability(1.0).difficulty(0.5).repetitions(0).build();
        LocalDateTime before = LocalDateTime.now();

        service.review(progress, Rating.GOOD);

        assertEquals(1, progress.getRepetitions());
        assertEquals(Status.LEARNING, progress.getStatus());
        assertTrue(!progress.getNextReviewTime().isBefore(before.plusHours(23)));
    }
}
