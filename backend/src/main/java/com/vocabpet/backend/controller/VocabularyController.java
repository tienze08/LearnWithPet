package com.vocabpet.backend.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.vocabpet.backend.dto.VocabularyRe.VocabularyRequest;
import com.vocabpet.backend.dto.VocabularyRe.VocabularyResponse;
import com.vocabpet.backend.service.VocabularyService;
import org.springframework.http.HttpStatus;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/decks/{deckId}/vocabularies")
@RequiredArgsConstructor
public class VocabularyController {

    private final VocabularyService vocabularyService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public VocabularyResponse createVocabulary(
            @PathVariable Long deckId,
            @Valid @RequestBody VocabularyRequest request) {

        return vocabularyService.createVocabulary(deckId, request);
    }

    @GetMapping
    public ResponseEntity<List<VocabularyResponse>> getVocabulariesByDeck(
            @PathVariable Long deckId) {

        return ResponseEntity.ok(
                vocabularyService.getVocabulariesByDeck(deckId));
    }
}
