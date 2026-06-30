package com.vocabpet.backend.service;

public interface MissionService {

    void trackLearnWord(Long userId);

    void trackSessionCompleted(Long userId);

    void trackReview(Long userId);
}
