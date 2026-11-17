package com.vocabpet.backend.controller;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.web.bind.annotation.*;

import com.vocabpet.backend.entity.enums.Rating;
import com.vocabpet.backend.service.LearningReviewService;
import com.vocabpet.backend.service.LearningReviewService.ReviewItem;

import lombok.RequiredArgsConstructor;

/** Unified learning API: one review queue and one attempt endpoint across flashcards and Tango. */
@RestController
@RequestMapping("/api/learning")
@RequiredArgsConstructor
public class LearningController {

    private final LearningReviewService reviewService;

    @GetMapping("/review/queue")
    public List<ReviewItem> reviewQueue(@RequestParam(defaultValue = "20") int limit) {
        return reviewService.dueQueue(Math.min(Math.max(limit, 1), 100));
    }

    @PostMapping("/attempts")
    public AttemptResponse attempt(@RequestBody AttemptRequest request) {
        var p = reviewService.reviewWord(request.tangoVocabularyId(), request.vocabularyId(), request.rating());
        return new AttemptResponse(p.getNextReviewTime(), p.getTimesSeen(), p.getCorrectCount(), p.getIncorrectCount());
    }

    public record AttemptRequest(Long tangoVocabularyId, Long vocabularyId, Rating rating) {}

    public record AttemptResponse(LocalDateTime nextReviewTime, int timesSeen, int correctCount, int incorrectCount) {}
}
