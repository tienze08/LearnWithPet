package com.vocabpet.backend.controller;

import com.vocabpet.backend.dto.ReaderAi.ReaderFlashcardGenerationRequest;
import com.vocabpet.backend.dto.ReaderAi.ReaderFlashcardGenerationResponse;
import com.vocabpet.backend.dto.ReaderAi.ReaderVocabularySuggestionRequest;
import com.vocabpet.backend.dto.ReaderAi.ReaderVocabularySuggestionResponse;
import com.vocabpet.backend.service.ReaderAiService;
import com.vocabpet.backend.service.ReaderDocumentService;
import com.vocabpet.backend.dto.reader.ReaderDocumentResponse;
import com.vocabpet.backend.dto.reader.ReaderDocumentStateRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/reader")
@RequiredArgsConstructor
public class ReaderAiController {
    private final ReaderAiService readerAiService;
    private final ReaderDocumentService readerDocumentService;

    @PostMapping(value = "/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ReaderDocumentResponse uploadDocument(
            @RequestPart("file") MultipartFile file,
            @RequestParam("extractedText") String extractedText) {
        return readerDocumentService.upload(file, extractedText);
    }

    @GetMapping("/documents/latest")
    public ResponseEntity<ReaderDocumentResponse> latestDocument() {
        return ResponseEntity.of(readerDocumentService.findLatest());
    }

    @GetMapping("/documents/latest/file")
    public ResponseEntity<Resource> latestDocumentFile() {
        Resource file = readerDocumentService.latestFile();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(readerDocumentService.latestContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.inline().filename("reader-document.pdf").build().toString())
                .body(file);
    }

    @PutMapping("/documents/latest/state")
    public ReaderDocumentResponse updateDocumentState(
            @Valid @RequestBody ReaderDocumentStateRequest request) {
        return readerDocumentService.updateState(request);
    }

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
