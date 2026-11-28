package com.vocabpet.backend.controller;

import com.vocabpet.backend.service.TranslationAiService;
import com.vocabpet.backend.service.TranslationAiService.GradeRequest;
import com.vocabpet.backend.service.TranslationAiService.GradeResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/japanese/translation")
@RequiredArgsConstructor
public class TranslationController {

    private final TranslationAiService translationAiService;

    @PostMapping("/grade")
    public GradeResponse grade(@Valid @RequestBody GradeRequest request) {
        return translationAiService.grade(request);
    }
}
