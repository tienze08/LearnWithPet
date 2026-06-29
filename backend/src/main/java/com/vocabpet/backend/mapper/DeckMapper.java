package com.vocabpet.backend.mapper;

import org.springframework.stereotype.Component;

import com.vocabpet.backend.dto.DeckRe.DeckRequest;
import com.vocabpet.backend.dto.DeckRe.DeckResponse;
import com.vocabpet.backend.entity.Deck;

@Component
public class DeckMapper {

    public Deck toEntity(DeckRequest request) {

        return Deck.builder()
                .name(request.getName())
                .description(request.getDescription())
                .build();
    }

    public DeckResponse toResponse(Deck deck) {

        return DeckResponse.builder()
                .id(deck.getId())
                .name(deck.getName())
                .description(deck.getDescription())
                .wordCount(
                        deck.getVocabularies() == null
                                ? 0
                                : deck.getVocabularies().size())
                .build();
    }
}