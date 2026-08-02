package com.vocabpet.backend.service;

import com.vocabpet.backend.dto.DeckRe.DeckRequest;
import com.vocabpet.backend.dto.DeckRe.DeckResponse;
import com.vocabpet.backend.entity.Deck;
import com.vocabpet.backend.entity.User;
import com.vocabpet.backend.mapper.DeckMapper;
import com.vocabpet.backend.repository.DeckRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

import java.util.List;

import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DeckService {

    private final DeckRepository deckRepository;
    private final DeckMapper deckMapper;
    private final CurrentUserService currentUserService;

    @Transactional
    public DeckResponse createDeck(DeckRequest request) {

        User user = currentUserService.getCurrentUser();

        if (deckRepository.existsByUserAndName(user, request.getName())) {
            throw new IllegalArgumentException("Deck already exists");
        }

        Deck deck = deckMapper.toEntity(request);

        deck.setUser(user);

        deck = deckRepository.save(deck);

        return deckMapper.toResponse(deck);
    }

    @Transactional()
    public List<DeckResponse> getDecks() {

        User user = currentUserService.getCurrentUser();

        return deckRepository.findByUser(user)
                .stream()
                .map(deckMapper::toResponse)
                .toList();
    }

    @Transactional
    public DeckResponse updateDeck(
            Long deckId,
            DeckRequest request) {

        User user = currentUserService.getCurrentUser();

        Deck deck = deckRepository
                .findByIdAndUser(deckId, user)
                .orElseThrow(
                        () -> new RuntimeException("Deck not found"));

        if (request.getName() != null) {

            deck.setName(
                    request.getName());

        }

        if (request.getDescription() != null) {

            deck.setDescription(
                    request.getDescription());

        }

        if (request.getEmoji() != null) {

            deck.setEmoji(
                    request.getEmoji());

        }

        if (request.getColor() != null) {

            deck.setColor(
                    request.getColor());

        }

        return deckMapper.toResponse(deck);

    }

    @Transactional
    public void deleteDeck(Long deckId) {

        User user = currentUserService.getCurrentUser();

        Deck deck = deckRepository
                .findByIdAndUser(deckId, user)
                .orElseThrow(() -> new RuntimeException("Deck not found"));

        deckRepository.delete(deck);

    }
}