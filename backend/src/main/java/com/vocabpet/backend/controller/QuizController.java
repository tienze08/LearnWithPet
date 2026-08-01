package com.vocabpet.backend.controller;

import com.vocabpet.backend.dto.QuizRe.QuizAnswerRequest;
import com.vocabpet.backend.dto.QuizRe.QuizAnswerResponse;
import com.vocabpet.backend.dto.QuizRe.QuizQuestionResponse;
import com.vocabpet.backend.service.QuizService;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/quiz")
@RequiredArgsConstructor
public class QuizController {

    private final QuizService quizService;

    @GetMapping("/random")
    public QuizQuestionResponse randomQuestion() {
        return quizService.randomQuestion();
    }

    @PostMapping("/answer")
    public QuizAnswerResponse answer(
            @RequestBody QuizAnswerRequest request) {

        return quizService.answer(request);
    }
}
