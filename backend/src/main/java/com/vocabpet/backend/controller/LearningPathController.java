package com.vocabpet.backend.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.vocabpet.backend.service.learningpath.LearningPathService;
import com.vocabpet.backend.service.learningpath.LearningPathService.*;
import com.vocabpet.backend.service.learningpath.PathModel.Feasibility;

import lombok.RequiredArgsConstructor;

/** Personalized Learning Path. Every endpoint except /status answers 404 while the feature is off for the user. */
@RestController
@RequestMapping("/api/learning-path")
@RequiredArgsConstructor
public class LearningPathController {

    private final LearningPathService service;

    @GetMapping("/status")
    public StatusResponse status() {
        return service.status();
    }

    @GetMapping("/profile")
    public ResponseEntity<ProfileResponse> profile() {
        return service.profile().map(ResponseEntity::ok).orElse(ResponseEntity.noContent().build());
    }

    @PutMapping("/profile")
    public ProfileResponse saveProfile(@RequestBody ProfileRequest request) {
        return service.saveProfile(request);
    }

    @PostMapping("/feasibility")
    public Feasibility feasibility(@RequestBody ProfileRequest request) {
        return service.feasibility(request);
    }

    @PostMapping("/preview")
    public PreviewResponse preview(@RequestBody ProfileRequest request) {
        return service.preview(request);
    }

    @GetMapping("/vocabulary")
    public List<VocabItem> vocabulary() {
        return service.vocabulary();
    }

    @GetMapping("/placement")
    public PlacementQuestions placement(@RequestParam(required = false) List<String> hints) {
        return service.placementQuestions(hints);
    }

    @PostMapping("/placement")
    public PlacementResult submitPlacement(@RequestBody PlacementRequest request) {
        return service.submitPlacement(request);
    }

    @GetMapping("/today")
    public TodayResponse today() {
        return service.today();
    }

    @GetMapping("/next-up")
    public NextUpResponse nextUp() {
        return service.nextUp();
    }

    /** Every lesson with its unlock state (LOCKED / AVAILABLE / IN_PROGRESS / COMPLETED) and suggested day. */
    @GetMapping("/units")
    public UnitsResponse units() {
        return service.unitStates();
    }

    /** One lesson to start or continue at any time once unlocked; LOCKED comes back with the reason and no items. */
    @GetMapping("/units/{unitId}")
    public UnitLesson unit(@PathVariable String unitId) {
        return service.unitLesson(unitId);
    }

    /** Submit a review lesson or chapter test taken on its own; it completes (and unlocks what follows) right away. */
    @PostMapping("/units/{unitId}/check")
    public TestView checkUnit(@PathVariable String unitId, @RequestBody TestRequest request) {
        return service.checkUnit(unitId, request);
    }

    @PutMapping("/pace")
    public ProfileResponse setPace(@RequestBody PaceRequest request) {
        return service.setPace(request);
    }

    @PostMapping("/answers")
    public AnswerResponse answer(@RequestBody AnswerRequest request) {
        return service.answer(request);
    }

    @PostMapping("/tests")
    public TestView submitTest(@RequestBody TestRequest request) {
        return service.submitTest(request);
    }

    @PostMapping("/tests/skip-retake")
    public TestView skipRetake() {
        return service.skipRetake();
    }

    @GetMapping("/roadmap")
    public RoadmapResponse roadmap() {
        return service.roadmap();
    }

    @GetMapping("/review-overview")
    public ReviewOverview reviewOverview() {
        return service.reviewOverview();
    }

    @GetMapping("/review-queue")
    public List<ReviewQueueItem> reviewQueue() {
        return service.reviewQueue();
    }

    @PostMapping("/reports")
    @ResponseStatus(HttpStatus.CREATED)
    public void report(@RequestBody ReportRequest request) {
        service.report(request);
    }
}
