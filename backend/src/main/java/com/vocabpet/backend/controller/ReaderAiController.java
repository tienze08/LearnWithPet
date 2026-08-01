package com.vocabpet.backend.controller;

import com.vocabpet.backend.dto.ReaderAi.ReaderFlashcardGenerationRequest;
import com.vocabpet.backend.dto.ReaderAi.ReaderFlashcardGenerationResponse;
import com.vocabpet.backend.dto.ReaderAi.ReaderVocabularySuggestionRequest;
import com.vocabpet.backend.dto.ReaderAi.ReaderVocabularySuggestionResponse;
import com.vocabpet.backend.service.ReaderAiService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reader")
@RequiredArgsConstructor
public class ReaderAiController {
    private final ReaderAiService readerAiService;

    @PostMapping("/generate-flashcards")
    public ReaderFlashcardGenerationResponse generateFlashcards(
            @Valid @RequestBody ReaderFlashcardGenerationRequest request) {
        return readerAiService.generate(request);
    }

    @PostMapping("/suggest-vocabulary")
    public ReaderVocabularySuggestionResponse suggestVocabulary(
            @Valid @RequestBody ReaderVocabularySuggestionRequest request) {
        return readerAiService.suggestVocabulary(request);
    }
}
