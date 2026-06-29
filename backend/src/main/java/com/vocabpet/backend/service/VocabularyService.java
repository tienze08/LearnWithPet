package com.vocabpet.backend.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.vocabpet.backend.dto.VocabularyRe.VocabularyRequest;
import com.vocabpet.backend.dto.VocabularyRe.VocabularyResponse;
import com.vocabpet.backend.entity.Deck;
import com.vocabpet.backend.entity.Vocabulary;
import com.vocabpet.backend.mapper.VocabularyMapper;
import com.vocabpet.backend.repository.DeckRepository;
import com.vocabpet.backend.repository.VocabularyRepository;

import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class VocabularyService {

    private final VocabularyRepository vocabularyRepository;
    private final DeckRepository deckRepository;
    private final VocabularyMapper vocabularyMapper;

    @Transactional
    public VocabularyResponse createVocabulary(
            Long deckId,
            VocabularyRequest request) {

        Deck deck = deckRepository.findById(deckId)
                .orElseThrow(() -> new EntityNotFoundException("Deck not found"));

        Vocabulary vocabulary = vocabularyMapper.toEntity(request);

        vocabulary.setDeck(deck);

        vocabulary = vocabularyRepository.save(vocabulary);

        return vocabularyMapper.toResponse(vocabulary);
    }

    @Transactional
    public List<VocabularyResponse> getVocabulariesByDeck(Long deckId) {

        if (!deckRepository.existsById(deckId)) {
            throw new EntityNotFoundException("Deck not found");
        }

        return vocabularyRepository.findByDeckId(deckId)
                .stream()
                .map(vocabularyMapper::toResponse)
                .toList();
    }
}