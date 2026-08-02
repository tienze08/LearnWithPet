package com.vocabpet.backend.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.vocabpet.backend.dto.VocabularyRe.VocabularyResponse;
import com.vocabpet.backend.service.VocabularyService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/vocabularies")
@RequiredArgsConstructor
public class UserVocabularyController {
    private final VocabularyService vocabularyService;

    @GetMapping
    public ResponseEntity<List<VocabularyResponse>> getMyVocabularies() {
        return ResponseEntity.ok(vocabularyService.getMyVocabularies());
    }
}
