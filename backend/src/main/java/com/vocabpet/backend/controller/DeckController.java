package com.vocabpet.backend.controller;

import com.vocabpet.backend.dto.DeckRe.DeckRequest;
import com.vocabpet.backend.dto.DeckRe.DeckResponse;
import com.vocabpet.backend.service.DeckService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
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

}