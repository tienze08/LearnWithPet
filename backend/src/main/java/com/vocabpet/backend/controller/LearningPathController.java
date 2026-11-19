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

    @PostMapping("/answers")
    public AnswerResponse answer(@RequestBody AnswerRequest request) {
        return service.answer(request);
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
