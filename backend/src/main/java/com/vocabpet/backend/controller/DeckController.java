package com.vocabpet.backend.controller;

import com.vocabpet.backend.dto.DeckRe.DeckRequest;
import com.vocabpet.backend.dto.DeckRe.DeckResponse;
import com.vocabpet.backend.service.DeckService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/decks")
@RequiredArgsConstructor
public class DeckController {

    private final DeckService deckService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DeckResponse createDeck(
            @Valid @RequestBody DeckRequest request) {

        return deckService.createDeck(request);
    }

    @GetMapping
    public ResponseEntity<List<DeckResponse>> getDecks() {

        return ResponseEntity.ok(
                deckService.getDecks());
    }

    @PutMapping("/{id}")
    public ResponseEntity<DeckResponse> updateDeck(
            @PathVariable Long id,
            @Valid @RequestBody DeckRequest request) {

        return ResponseEntity.ok(
                deckService.updateDeck(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteDeck(
            @PathVariable Long id) {

        deckService.deleteDeck(id);

        return ResponseEntity.ok(
                "Delete successfully");
    }
}