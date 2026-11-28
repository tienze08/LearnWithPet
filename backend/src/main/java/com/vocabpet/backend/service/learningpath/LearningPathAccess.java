package com.vocabpet.backend.service.learningpath;

import org.springframework.stereotype.Service;

import com.vocabpet.backend.config.LearningPathProperties;
import com.vocabpet.backend.entity.User;

import lombok.RequiredArgsConstructor;

/** Feature flag check: on for everyone, or only for allowlisted emails while trying it on production. */
@Service
@RequiredArgsConstructor
public class LearningPathAccess {

    private final LearningPathProperties properties;

    public boolean isEnabledFor(User user) {
        if (properties.enabled()) return true;
        String email = user.getEmail();
        return email != null && properties.allowlist().stream()
                .anyMatch(a -> a != null && a.trim().equalsIgnoreCase(email.trim()));
    }
}
