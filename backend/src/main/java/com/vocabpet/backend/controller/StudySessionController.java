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

        StudySession session = studySessionService.startSession(request.getDeckId(), request.getReviewLimit());

        return ResponseEntity.ok(
                StartStudySessionResponse.builder()
                        .sessionId(session.getId())
                        .build());
    }

    @GetMapping("/recent")
    public ResponseEntity<?> recentReviews() {
        return ResponseEntity.ok(studySessionService.getRecentReviews());
    }

    @GetMapping("/dashboard")
    public ResponseEntity<?> dashboardStats() {
        return ResponseEntity.ok(studySessionService.getDashboardStats());
    }

    @GetMapping("/analytics")
    public ResponseEntity<?> analytics(@RequestParam(defaultValue = "7") int days) {
        return ResponseEntity.ok(studySessionService.getAnalytics(days));
    }

    @GetMapping("/plan")
    public ResponseEntity<?> todayPlan() {
        return ResponseEntity.ok(studySessionService.getTodayPlan());
    }

    @GetMapping("/active")
    public ResponseEntity<?> activeSession() {
        return ResponseEntity.of(studySessionService.getActiveSession());
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
