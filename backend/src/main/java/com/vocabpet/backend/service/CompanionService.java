package com.vocabpet.backend.service;

import com.vocabpet.backend.dto.companion.CompanionEventRequest;
import com.vocabpet.backend.dto.companion.CompanionPreferencesRequest;
import com.vocabpet.backend.dto.companion.CompanionStateResponse;
import com.vocabpet.backend.dto.PetRe.PetBehaviorResponse;
import com.vocabpet.backend.entity.User;
import com.vocabpet.backend.entity.Vocabulary;

public interface CompanionService {
    CompanionStateResponse getState();
    CompanionStateResponse recordEvent(CompanionEventRequest request);
    CompanionStateResponse updatePreferences(CompanionPreferencesRequest request);
    PetBehaviorResponse recordQuizOutcome(User user, Vocabulary vocabulary, boolean correct);
    PetBehaviorResponse recordReviewOutcome(User user, Vocabulary vocabulary, boolean correct);
}
