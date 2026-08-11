package com.vocabpet.backend.service;

import com.vocabpet.backend.dto.companion.LearningProfileResponse;
import com.vocabpet.backend.entity.User;

public interface LearningProfileService {
    LearningProfileResponse profileFor(User user);
}
