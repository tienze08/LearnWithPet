package com.vocabpet.backend.service;

import com.vocabpet.backend.entity.enums.LearningSource;

/** Published after every graded learning action. Pet and reward listeners subscribe to this later. */
public record LearningActivityEvent(Long userId, LearningSource source, boolean correct) {}
