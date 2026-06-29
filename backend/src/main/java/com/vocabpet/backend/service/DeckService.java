package com.vocabpet.backend.service;

import com.vocabpet.backend.dto.DeckRe.DeckRequest;
import com.vocabpet.backend.dto.DeckRe.DeckResponse;
import com.vocabpet.backend.entity.Deck;
import com.vocabpet.backend.mapper.DeckMapper;
import com.vocabpet.backend.repository.DeckRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DeckService {

    private final DeckRepository deckRepository;
    private final DeckMapper deckMapper;

    @Transactional
    public DeckResponse createDeck(DeckRequest request) {

        if (deckRepository.existsByName(request.getName())) {
            throw new IllegalArgumentException("Deck already exists");
        }

        Deck deck = deckMapper.toEntity(request);

        deck = deckRepository.save(deck);

        return deckMapper.toResponse(deck);
    }

}