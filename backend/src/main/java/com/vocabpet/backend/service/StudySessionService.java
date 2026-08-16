package com.vocabpet.backend.service;

import java.util.List;

import com.vocabpet.backend.dto.StudyCardRe.RecentReviewResponse;
import com.vocabpet.backend.dto.StudyCardRe.ReviewRequest;
import com.vocabpet.backend.dto.StudyCardRe.ReviewResponse;
import com.vocabpet.backend.dto.StudyCardRe.StudyCardResponse;
import com.vocabpet.backend.dto.StudyCardRe.StudyDashboardResponse;
import com.vocabpet.backend.dto.StudyCardRe.StudyPlanResponse;
import com.vocabpet.backend.entity.StudySession;

public interface StudySessionService {

        StudySession startSession(
                        Long deckId);

        StudyCardResponse getNextCard(
                        Long sessionId);

        ReviewResponse review(
                        Long sessionId,
                        ReviewRequest request);

        void finishSession(
                        Long sessionId);

        List<RecentReviewResponse> getRecentReviews();

        StudyDashboardResponse getDashboardStats();

        StudyPlanResponse getTodayPlan();

}
