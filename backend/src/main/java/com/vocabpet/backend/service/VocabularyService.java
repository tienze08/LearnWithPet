package com.vocabpet.backend.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.vocabpet.backend.dto.VocabularyRe.VocabularyRequest;
import com.vocabpet.backend.dto.VocabularyRe.VocabularyResponse;
import com.vocabpet.backend.entity.Deck;
import com.vocabpet.backend.entity.TangoLesson;
import com.vocabpet.backend.entity.TangoLessonVocabulary;
import com.vocabpet.backend.entity.TangoVocabulary;
import com.vocabpet.backend.entity.User;
import com.vocabpet.backend.entity.Vocabulary;
import com.vocabpet.backend.mapper.VocabularyMapper;
import com.vocabpet.backend.repository.BookmarkRepository;
import com.vocabpet.backend.repository.DeckRepository;
import com.vocabpet.backend.repository.TangoLessonVocabularyRepository;
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
    private final TangoLessonVocabularyRepository tangoLessonVocabularyRepository;

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

        List<Vocabulary> vocabularies = vocabularyRepository.findByDeckId(deckId);
        List<VocabularyResponse> responses = vocabularies.stream()
                .map(vocabulary -> {
                    VocabularyResponse response = vocabularyMapper.toResponse(vocabulary);
                    response.setBookmarked(bookmarkedIds.contains(vocabulary.getId()));
                    return response;
                })
                .toList();
        fillLessons(vocabularies, responses);
        return responses;
    }

    @Transactional
    public List<VocabularyResponse> getMyVocabularies() {
        User user = currentUserService.getCurrentUser();
        Set<Long> bookmarkedIds = bookmarkRepository.findByUser(user).stream()
                .map(bookmark -> bookmark.getVocabulary().getId())
                .collect(Collectors.toSet());

        List<Vocabulary> vocabularies = vocabularyRepository.findByDeckUserId(user.getId());
        List<VocabularyResponse> responses = vocabularies.stream()
                .map(vocabulary -> {
                    VocabularyResponse response = vocabularyMapper.toResponse(vocabulary);
                    response.setBookmarked(bookmarkedIds.contains(vocabulary.getId()));
                    return response;
                })
                .toList();
        fillLessons(vocabularies, responses);
        return responses;
    }

    /** Adds the source lesson (first published one) to cards linked to a Tango word. */
    private void fillLessons(List<Vocabulary> vocabularies, List<VocabularyResponse> responses) {
        Set<Long> tangoIds = vocabularies.stream()
                .filter(v -> v.getTangoVocabulary() != null)
                .map(v -> v.getTangoVocabulary().getId())
                .collect(Collectors.toSet());
        if (tangoIds.isEmpty()) return;
        Map<Long, TangoLesson> lessonByWord = new HashMap<>();
        for (TangoLessonVocabulary lv : tangoLessonVocabularyRepository.findPublishedByVocabularyIds(tangoIds)) {
            lessonByWord.putIfAbsent(lv.getVocabulary().getId(), lv.getLesson());
        }
        for (int i = 0; i < vocabularies.size(); i++) {
            TangoVocabulary t = vocabularies.get(i).getTangoVocabulary();
            TangoLesson lesson = t == null ? null : lessonByWord.get(t.getId());
            if (lesson == null) continue;
            responses.get(i).setLessonId(lesson.getId());
            responses.get(i).setLessonNumber(lesson.getLessonNumber());
            responses.get(i).setJlptLevel(lesson.getJlptLevel().name());
        }
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
