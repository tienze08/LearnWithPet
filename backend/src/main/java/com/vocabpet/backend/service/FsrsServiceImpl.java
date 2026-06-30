package com.vocabpet.backend.service;

import com.vocabpet.backend.entity.UserVocabularyProgress;
import com.vocabpet.backend.entity.enums.Rating;
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

        switch (rating) {

            case AGAIN -> {
                stabilityFactor = 0.3;
                difficultyDelta = 0.2;

                lapses++;
            }

            case HARD -> {
                stabilityFactor = 0.9;
                difficultyDelta = 0.05;
            }

            case GOOD -> {
                stabilityFactor = 1.2;
                difficultyDelta = -0.02;
            }

            case EASY -> {
                stabilityFactor = 1.6;
                difficultyDelta = -0.05;
            }

            default -> {
                stabilityFactor = 1.0;
                difficultyDelta = 0;
            }
        }

        // FSRS core update
        stability = stability * stabilityFactor * (1 + elapsedDays * 0.05);
        difficulty = clamp(difficulty + difficultyDelta, 0.0, 1.0);

        reps++;

        // interval calculation (FSRS style simplified)
        double intervalDays;

        if (rating == Rating.AGAIN) {
            intervalDays = 1;
            stability = Math.max(0.2, stability * 0.7);
        } else {
            intervalDays = stability * 2.5;
        }

        if (rating == Rating.EASY) {
            intervalDays *= 1.3;
        }

        if (rating == Rating.HARD) {
            intervalDays *= 0.8;
        }

        if (intervalDays < 1)
            intervalDays = 1;

        // save back
        p.setStability(stability);
        p.setDifficulty(difficulty);
        p.setRepetitions(reps);
        p.setLapses(lapses);

        p.setLastReviewTime(now);
        p.setNextReviewTime(now.plusDays((long) intervalDays));
    }

    private double clamp(double v, double min, double max) {
        return Math.max(min, Math.min(max, v));
    }
}