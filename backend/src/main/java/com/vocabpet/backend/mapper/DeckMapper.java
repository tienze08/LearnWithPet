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

                .emoji(request.getEmoji())

                .color(request.getColor())

                .build();

    }

    public DeckResponse toResponse(Deck deck) {

        return toResponse(deck, 0, 0);

    }

    public DeckResponse toResponse(Deck deck, long studiedCount, long masteredCount) {

        return DeckResponse.builder()

                .id(deck.getId())

                .name(deck.getName())

                .description(deck.getDescription())

                .emoji(deck.getEmoji())

                .color(deck.getColor())

                .wordCount(

                        deck.getVocabularies() == null

                                ? 0

                                : deck.getVocabularies().size()

                )

                .studiedCount(studiedCount)

                .masteredCount(masteredCount)

                .build();

    }

}
