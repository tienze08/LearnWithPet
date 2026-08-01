package com.vocabpet.backend.service;

import java.util.List;

import com.vocabpet.backend.dto.UserMissionRe.UserMissionResponse;

public interface MissionService {

    void trackLearnWord(Long userId);

    void trackSessionCompleted(Long userId);

    void trackReview(Long userId);

    void trackQuiz(Long userId);

    List<UserMissionResponse> getTodayMissions();

    void claimMission(Long missionId);
}
