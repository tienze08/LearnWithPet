package com.vocabpet.backend.service;

import com.vocabpet.backend.dto.companion.CompanionEventRequest;
import com.vocabpet.backend.dto.companion.CompanionPreferencesRequest;
import com.vocabpet.backend.dto.companion.CompanionStateResponse;
import com.vocabpet.backend.dto.companion.LearningProfileResponse;
import com.vocabpet.backend.dto.PetRe.PetBehaviorResponse;
import com.vocabpet.backend.entity.User;
import com.vocabpet.backend.entity.Vocabulary;
import com.vocabpet.backend.entity.StudySession;

public interface CompanionService {
    CompanionStateResponse getState();
    CompanionStateResponse recordEvent(CompanionEventRequest request);
    CompanionStateResponse updatePreferences(CompanionPreferencesRequest request);
    LearningProfileResponse getLearningProfile();
    PetBehaviorResponse recordQuizOutcome(User user, Vocabulary vocabulary, boolean correct);
    PetBehaviorResponse recordReviewOutcome(User user, Vocabulary vocabulary, boolean correct);
    void recordSessionCompleted(User user, StudySession session);
}
