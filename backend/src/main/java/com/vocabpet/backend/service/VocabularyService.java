package com.vocabpet.backend.service;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.vocabpet.backend.dto.VocabularyRe.VocabularyRequest;
import com.vocabpet.backend.dto.VocabularyRe.VocabularyResponse;
import com.vocabpet.backend.entity.Deck;
import com.vocabpet.backend.entity.User;
import com.vocabpet.backend.entity.Vocabulary;
import com.vocabpet.backend.mapper.VocabularyMapper;
import com.vocabpet.backend.repository.BookmarkRepository;
import com.vocabpet.backend.repository.DeckRepository;
import com.vocabpet.backend.repository.VocabularyRepository;

import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class VocabularyService {

    private final VocabularyRepository vocabularyRepository;
    private final BookmarkRepository bookmarkRepository;
    private final DeckRepository deckRepository;
    private final VocabularyMapper vocabularyMapper;
    private final CurrentUserService currentUserService;

    @Transactional
    public VocabularyResponse createVocabulary(
            Long deckId,
            VocabularyRequest request) {

        User user = currentUserService.getCurrentUser();
        Deck deck = deckRepository
                .findByIdAndUser(deckId, user)
                .orElseThrow(() -> new EntityNotFoundException("Deck not found"));

        Vocabulary vocabulary = vocabularyMapper.toEntity(request);

        vocabulary.setDeck(deck);

        vocabulary = vocabularyRepository.save(vocabulary);

        return vocabularyMapper.toResponse(vocabulary);
    }

    @Transactional
    public List<VocabularyResponse> getVocabulariesByDeck(Long deckId) {

        User user = currentUserService.getCurrentUser();

        Set<Long> bookmarkedIds = bookmarkRepository.findByUser(user)
                .stream()
                .map(bookmark -> bookmark.getVocabulary().getId())
                .collect(Collectors.toSet());

        return vocabularyRepository.findByDeckId(deckId)
                .stream()
                .map(vocabulary -> {
                    VocabularyResponse response = vocabularyMapper.toResponse(vocabulary);
                    response.setBookmarked(bookmarkedIds.contains(vocabulary.getId()));
                    return response;
                })
                .toList();
    }

    @Transactional
    public VocabularyResponse updateVocabulary(
            Long deckId,
            Long vocabularyId,
            VocabularyRequest request) {

        User user = currentUserService.getCurrentUser();

        Deck deck = deckRepository
                .findByIdAndUser(deckId, user)
                .orElseThrow(() -> new EntityNotFoundException("Deck not found"));

        Vocabulary vocabulary = vocabularyRepository.findById(vocabularyId)
                .orElseThrow(() -> new EntityNotFoundException("Vocabulary not found"));

        if (!vocabulary.getDeck().getId()
                .equals(deck.getId())) {

            throw new EntityNotFoundException(
                    "Vocabulary does not belong to this deck");
        }

        vocabularyMapper.updateEntity(
                vocabulary,
                request);

        return vocabularyMapper.toResponse(vocabulary);
    }

    @Transactional
    public void deleteVocabulary(
            Long deckId,
            Long vocabularyId) {

        User user = currentUserService.getCurrentUser();

        Deck deck = deckRepository
                .findByIdAndUser(deckId, user)
                .orElseThrow(() -> new EntityNotFoundException("Deck not found"));

        Vocabulary vocabulary = vocabularyRepository.findById(vocabularyId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Vocabulary not found"));

        if (!vocabulary.getDeck().getId()
                .equals(deck.getId())) {

            throw new EntityNotFoundException(
                    "Vocabulary does not belong to this deck");
        }

        vocabularyRepository.delete(vocabulary);
    }
}