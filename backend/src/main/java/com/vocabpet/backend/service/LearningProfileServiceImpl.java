package com.vocabpet.backend.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.vocabpet.backend.dto.companion.LearningProfileResponse;
import com.vocabpet.backend.entity.StudySession;
import com.vocabpet.backend.entity.User;
import com.vocabpet.backend.repository.StudyReviewRepository;
import com.vocabpet.backend.repository.StudySessionRepository;
import com.vocabpet.backend.repository.UserVocabularyProgressRepository;

import lombok.RequiredArgsConstructor;

/** Turns persisted study data into a small, explainable learner profile. */
@Service
@RequiredArgsConstructor
public class LearningProfileServiceImpl implements LearningProfileService {
    private final StudyReviewRepository studyReviewRepository;
    private final StudySessionRepository studySessionRepository;
    private final UserVocabularyProgressRepository progressRepository;

    @Override
    @Transactional(readOnly = true)
    public LearningProfileResponse profileFor(User user) {
        List<Object[]> topics = studyReviewRepository.findTopicPerformanceByUserId(user.getId());
        String strongestTopic = null;
        String weakestTopic = null;
        Long weakestDeckId = null;
        double highestAccuracy = -1;
        double lowestAccuracy = Double.MAX_VALUE;

        for (Object[] topic : topics) {
            long attempts = ((Number) topic[3]).longValue();
            if (attempts < 3) continue;
            double accuracy = ((Number) topic[2]).doubleValue() / attempts;
            String name = (String) topic[1];
            if (accuracy > highestAccuracy) {
                highestAccuracy = accuracy;
                strongestTopic = name;
            }
            if (accuracy < lowestAccuracy) {
                lowestAccuracy = accuracy;
                weakestTopic = name;
                weakestDeckId = ((Number) topic[0]).longValue();
            }
        }

        long totalReviews = studyReviewRepository.countByUserId(user.getId());
        long studyMinutes = studySessionRepository.findByUserId(user.getId()).stream()
                .mapToLong(StudySession::getDurationSeconds)
                .sum() / 60;
        int averageQuizScore = totalReviews == 0 ? 0
                : (int) Math.round(studyReviewRepository.countSuccessfulByUserId(user.getId()) * 100.0 / totalReviews);

        Integer preferredStudyHour = studySessionRepository.findPreferredStudyHour(user.getId());
        return LearningProfileResponse.builder()
                .totalWordsLearned(progressRepository.countOwnedByUserId(user.getId()))
                .totalReviews(totalReviews)
                .totalStudyMinutes(studyMinutes)
                .averageQuizScore(averageQuizScore)
                .strongestTopic(strongestTopic)
                .weakestTopic(weakestTopic)
                .weakestDeckId(weakestDeckId)
                .preferredStudyHour(preferredStudyHour == null ? -1 : preferredStudyHour)
                .build();
    }
}
