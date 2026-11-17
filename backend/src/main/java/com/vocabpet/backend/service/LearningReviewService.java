package com.vocabpet.backend.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.vocabpet.backend.entity.TangoVocabulary;
import com.vocabpet.backend.entity.User;
import com.vocabpet.backend.entity.UserVocabularyProgress;
import com.vocabpet.backend.entity.Vocabulary;
import com.vocabpet.backend.entity.enums.LearningSource;
import com.vocabpet.backend.entity.enums.Rating;
import com.vocabpet.backend.repository.TangoVocabularyRepository;
import com.vocabpet.backend.repository.UserVocabularyProgressRepository;
import com.vocabpet.backend.repository.VocabularyRepository;

import lombok.RequiredArgsConstructor;

/** Review Center: due words across flashcards and Tango, rated through the shared engine. */
@Service
@RequiredArgsConstructor
public class LearningReviewService {

    private final CurrentUserService currentUserService;
    private final UserVocabularyProgressRepository progressRepository;
    private final TangoVocabularyRepository tangoVocabularyRepository;
    private final VocabularyRepository vocabularyRepository;
    private final LearningEngineService learningEngine;

    public record ReviewItem(
            Long progressId,
            Long tangoVocabularyId,
            Long vocabularyId,
            String word,
            String kana,
            String romaji,
            String meaning,
            LocalDateTime nextReviewTime,
            int timesSeen,
            int correctCount,
            int incorrectCount) {}

    @Transactional(readOnly = true)
    public List<ReviewItem> dueQueue(int limit) {
        User user = currentUserService.getCurrentUser();
        return progressRepository.findAllDueForUser(user.getId(), LocalDateTime.now()).stream()
                .limit(limit)
                .map(this::toItem)
                .toList();
    }

    @Transactional
    public UserVocabularyProgress reviewWord(Long tangoVocabularyId, Long vocabularyId, Rating rating) {
        User user = currentUserService.getCurrentUser();
        if (rating == null || (tangoVocabularyId == null && vocabularyId == null)) {
            throw new IllegalArgumentException("A word and rating are required");
        }
        if (tangoVocabularyId != null) {
            TangoVocabulary t = tangoVocabularyRepository.findById(tangoVocabularyId)
                    .orElseThrow(() -> new IllegalArgumentException("Unknown Tango word"));
            return learningEngine.record(user, null, t, LearningSource.REVIEW, rating);
        }
        Vocabulary v = vocabularyRepository.findByIdAndDeckUserId(vocabularyId, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Unknown vocabulary"));
        return learningEngine.record(user, v, null, LearningSource.REVIEW, rating);
    }

    private ReviewItem toItem(UserVocabularyProgress p) {
        Vocabulary v = p.getVocabulary();
        TangoVocabulary t = p.getTangoVocabulary() != null ? p.getTangoVocabulary()
                : (v != null ? v.getTangoVocabulary() : null);
        String word;
        String kana = null;
        String romaji = null;
        String meaning;
        if (t != null) {
            word = t.getExpression() != null ? t.getExpression() : t.getKana();
            kana = t.getKana();
            romaji = t.getRomaji();
            meaning = t.getMeanings().stream()
                    .filter(m -> m.isPrimaryMeaning())
                    .map(m -> m.getMeaning())
                    .findFirst()
                    .orElse(t.getMeanings().isEmpty() ? "" : t.getMeanings().get(0).getMeaning());
        } else {
            word = v != null ? v.getWord() : "";
            meaning = v != null && v.getMeaning() != null ? v.getMeaning() : "";
        }
        return new ReviewItem(
                p.getId(),
                t != null ? t.getId() : null,
                v != null ? v.getId() : null,
                word, kana, romaji, meaning,
                p.getNextReviewTime(), p.getTimesSeen(), p.getCorrectCount(), p.getIncorrectCount());
    }
}
