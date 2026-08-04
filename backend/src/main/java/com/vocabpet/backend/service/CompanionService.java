package com.vocabpet.backend.service;

import com.vocabpet.backend.dto.companion.CompanionEventRequest;
import com.vocabpet.backend.dto.companion.CompanionPreferencesRequest;
import com.vocabpet.backend.dto.companion.CompanionStateResponse;

public interface CompanionService {
    CompanionStateResponse getState();
    CompanionStateResponse recordEvent(CompanionEventRequest request);
    CompanionStateResponse updatePreferences(CompanionPreferencesRequest request);
}
