package com.vocabpet.backend.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.vocabpet.backend.dto.UserMissionRe.UserMissionResponse;
import com.vocabpet.backend.service.MissionService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/missions")
@RequiredArgsConstructor
public class MissionController {

    private final MissionService missionService;

    @GetMapping("/daily")
    public ResponseEntity<List<UserMissionResponse>> getDailyMissions() {
        return ResponseEntity.ok(
                missionService.getTodayMissions());
    }

    @PostMapping("/{missionId}/claim")
    public ResponseEntity<Void> claimMission(
            @PathVariable Long missionId) {

        missionService.claimMission(missionId);

        return ResponseEntity.ok().build();
    }

}