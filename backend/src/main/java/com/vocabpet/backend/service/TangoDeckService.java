package com.vocabpet.backend.service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.vocabpet.backend.entity.Deck;
import com.vocabpet.backend.entity.TangoLesson;
import com.vocabpet.backend.entity.TangoLessonVocabulary;
import com.vocabpet.backend.entity.TangoVocabulary;
import com.vocabpet.backend.entity.TangoVocabularyExample;
import com.vocabpet.backend.entity.TangoVocabularyMeaning;
import com.vocabpet.backend.entity.User;
import com.vocabpet.backend.entity.Vocabulary;
import com.vocabpet.backend.entity.enums.Difficulty;
import com.vocabpet.backend.entity.enums.PartOfSpeech;
import com.vocabpet.backend.entity.enums.TangoPartOfSpeech;
import com.vocabpet.backend.exception.TangoNotFoundException;
import com.vocabpet.backend.repository.DeckRepository;
import com.vocabpet.backend.repository.TangoLessonRepository;
import com.vocabpet.backend.repository.TangoLessonVocabularyRepository;
import com.vocabpet.backend.repository.VocabularyRepository;

import lombok.RequiredArgsConstructor;

/** Copies a Tango lesson's words into the user's "Tango {level}" flashcard deck, each linked to its canonical word. */
@Service
@RequiredArgsConstructor
public class TangoDeckService {

    private final CurrentUserService currentUserService;
    private final TangoLessonRepository lessonRepository;
    private final TangoLessonVocabularyRepository lessonVocabularyRepository;
    private final DeckRepository deckRepository;
    private final VocabularyRepository vocabularyRepository;

    public record ToDeckResponse(Long deckId, String deckName, int added, int skipped) {}

    @Transactional
    public ToDeckResponse addLessonToDeck(Long lessonId) {
        User user = currentUserService.getCurrentUser();
        TangoLesson lesson = lessonRepository.findByIdAndPublishedTrue(lessonId)
                .orElseThrow(() -> new TangoNotFoundException("Lesson not found"));

        String deckName = "Tango " + lesson.getJlptLevel().name();
        Deck deck = deckRepository.findFirstByUserAndName(user, deckName)
                .orElseGet(() -> deckRepository.save(Deck.builder()
                        .name(deckName)
                        .description("Từ vựng Minna no Nihongo " + lesson.getJlptLevel().name())
                        .emoji("🇯🇵")
                        .color("green")
                        .user(user)
                        .build()));

        Set<Long> existing = new HashSet<>();
        for (Vocabulary v : vocabularyRepository.findByDeckIdAndDeckUserId(deck.getId(), user.getId())) {
            if (v.getTangoVocabulary() != null) existing.add(v.getTangoVocabulary().getId());
        }

        int added = 0;
        int skipped = 0;
        List<TangoLessonVocabulary> links = lessonVocabularyRepository.findByLessonIdOrderByPositionAsc(lessonId);
        for (TangoLessonVocabulary link : links) {
            TangoVocabulary t = link.getVocabulary();
            if (!existing.add(t.getId())) {
                skipped++;
                continue;
            }
            vocabularyRepository.save(Vocabulary.builder()
                    .word(t.getExpression() != null ? t.getExpression() : t.getKana())
                    .meaning(primaryMeaning(t))
                    .example(t.getExamples().stream().findFirst().map(TangoVocabularyExample::getJapanese).orElse(null))
                    .difficulty(Difficulty.MEDIUM)
                    .partOfSpeech(toPartOfSpeech(t.getPartOfSpeech()))
                    .tangoVocabulary(t)
                    .deck(deck)
                    .build());
            added++;
        }
        return new ToDeckResponse(deck.getId(), deckName, added, skipped);
    }

    private static String primaryMeaning(TangoVocabulary t) {
        return t.getMeanings().stream()
                .filter(TangoVocabularyMeaning::isPrimaryMeaning)
                .findFirst()
                .or(() -> t.getMeanings().stream().findFirst())
                .map(TangoVocabularyMeaning::getMeaning)
                .orElse("");
    }

    private static PartOfSpeech toPartOfSpeech(TangoPartOfSpeech p) {
        if (p == null) return PartOfSpeech.NOUN;
        return switch (p) {
            case VERB_GODAN, VERB_ICHIDAN, VERB_IRREGULAR -> PartOfSpeech.VERB;
            case I_ADJECTIVE, NA_ADJECTIVE -> PartOfSpeech.ADJECTIVE;
            case ADVERB -> PartOfSpeech.ADVERB;
            default -> PartOfSpeech.NOUN;
        };
    }
}
