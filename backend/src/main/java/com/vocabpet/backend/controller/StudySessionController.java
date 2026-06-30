package com.vocabpet.backend.controller;

import com.vocabpet.backend.dto.StudyCardRe.ReviewRequest;
import com.vocabpet.backend.dto.StudyCardRe.StartStudySessionRequest;
import com.vocabpet.backend.dto.StudyCardRe.StartStudySessionResponse;
import com.vocabpet.backend.entity.StudySession;
import com.vocabpet.backend.service.StudySessionService;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/study-sessions")
@RequiredArgsConstructor
public class StudySessionController {

    private final StudySessionService studySessionService;

    @PostMapping("/start")
    public ResponseEntity<StartStudySessionResponse> startSession(
            @RequestBody StartStudySessionRequest request) {

        StudySession session = studySessionService.startSession(request.getDeckId());

        return ResponseEntity.ok(
                StartStudySessionResponse.builder()
                        .sessionId(session.getId())
                        .build());
    }

    @GetMapping("/{sessionId}/next-card")
    public ResponseEntity<?> nextCard(@PathVariable Long sessionId) {

        return ResponseEntity.ok(
                studySessionService.getNextCard(sessionId));
    }

    @PostMapping("/{sessionId}/review")
    public ResponseEntity<?> review(
            @PathVariable Long sessionId,
            @RequestBody ReviewRequest request) {

        return ResponseEntity.ok(
                studySessionService.review(sessionId, request));
    }

    @PostMapping("/{sessionId}/finish")
    public ResponseEntity<Void> finish(@PathVariable Long sessionId) {

        studySessionService.finishSession(sessionId);
        return ResponseEntity.ok().build();
    }

}
