package com.vocabpet.backend.service;

import com.vocabpet.backend.entity.UserVocabularyProgress;
import com.vocabpet.backend.entity.enums.Rating;
import com.vocabpet.backend.entity.enums.Status;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;

@Service
public class FsrsServiceImpl implements FsrsService {

    @Override
    public void review(UserVocabularyProgress p, Rating rating) {

        double stability = p.getStability();
        double difficulty = p.getDifficulty();
        int reps = p.getRepetitions();
        int lapses = p.getLapses();

        LocalDateTime now = LocalDateTime.now();

        // elapsed time (days)
        double elapsedDays = 1;
        if (p.getLastReviewTime() != null) {
            elapsedDays = Duration.between(
                    p.getLastReviewTime(),
                    now).toHours() / 24.0;
        }

        // normalize init
        if (stability <= 0)
            stability = 0.5;
        if (difficulty <= 0)
            difficulty = 0.3;

        // rating weights (core FSRS idea simplified)
        double stabilityFactor;
        double difficultyDelta;

        // Avoid an enum-switch helper class here. A stale dev build can retain
        // FsrsServiceImpl.class but miss its generated FsrsServiceImpl$1 class.
        if (rating == Rating.AGAIN) {
            stabilityFactor = 0.3;
            difficultyDelta = 0.2;
            lapses++;
        } else if (rating == Rating.HARD) {
            stabilityFactor = 0.9;
            difficultyDelta = 0.05;
        } else if (rating == Rating.GOOD) {
            stabilityFactor = 1.2;
            difficultyDelta = -0.02;
        } else if (rating == Rating.EASY) {
            stabilityFactor = 1.6;
            difficultyDelta = -0.05;
        } else {
            stabilityFactor = 1.0;
            difficultyDelta = 0;
        }

        // FSRS core update
        stability = stability * stabilityFactor * (1 + elapsedDays * 0.05);
        difficulty = clamp(difficulty + difficultyDelta, 0.0, 1.0);

        reps++;

        // AGAIN enters a short relearning step so a forgotten word returns in
        // this study period, rather than disappearing for an entire day.
        LocalDateTime nextReview;
        if (rating == Rating.AGAIN) {
            stability = Math.max(0.2, stability * 0.7);
            nextReview = now.plusMinutes(10);
            p.setStatus(Status.LEARNING);
        } else {
            double intervalDays = stability * 2.5;
            if (rating == Rating.EASY) intervalDays *= 1.3;
            if (rating == Rating.HARD) intervalDays *= 0.8;

            long wholeDays = Math.max(rating == Rating.EASY ? 2 : 1, (long) Math.ceil(intervalDays));
            nextReview = now.plusDays(wholeDays);
            p.setStatus(reps >= 4 && stability >= 2.0 ? Status.MASTERED : Status.LEARNING);
        }

        // save back
        p.setStability(stability);
        p.setDifficulty(difficulty);
        p.setRepetitions(reps);
        p.setLapses(lapses);

        p.setLastReviewTime(now);
        p.setNextReviewTime(nextReview);
    }

    private double clamp(double v, double min, double max) {
        return Math.max(min, Math.min(max, v));
    }
}
