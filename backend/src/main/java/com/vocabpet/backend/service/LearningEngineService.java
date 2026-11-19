package com.vocabpet.backend.service;

import java.util.Optional;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.vocabpet.backend.entity.TangoVocabulary;
import com.vocabpet.backend.entity.User;
import com.vocabpet.backend.entity.UserVocabularyProgress;
import com.vocabpet.backend.entity.Vocabulary;
import com.vocabpet.backend.entity.enums.LearningSource;
import com.vocabpet.backend.entity.enums.Rating;
import com.vocabpet.backend.repository.UserVocabularyProgressRepository;

import lombok.RequiredArgsConstructor;

/**
 * Single writer for per-user word progress. Flashcards, Tango lessons and quizzes
 * all update one UserVocabularyProgress row per user per canonical word.
 * Pet and reward code must listen to {@link LearningActivityEvent}, never call this from Pet code.
 */
@Service
@RequiredArgsConstructor
public class LearningEngineService {

    private final UserVocabularyProgressRepository progressRepository;
    private final FsrsService fsrsService;
    private final ApplicationEventPublisher events;

    /** Rated outcome: flashcard review or quiz answer. Schedules the next review. */
    @Transactional
    public UserVocabularyProgress record(User user, Vocabulary vocabulary, TangoVocabulary canonical,
                                         LearningSource source, Rating rating) {
        UserVocabularyProgress p = resolve(user, vocabulary, canonical);
        p.setTimesSeen(p.getTimesSeen() + 1);
        if (rating == Rating.AGAIN) p.setIncorrectCount(p.getIncorrectCount() + 1);
        else p.setCorrectCount(p.getCorrectCount() + 1);
        p.setLastSource(source);
        fsrsService.review(p, rating);
        UserVocabularyProgress saved = progressRepository.save(p);
        events.publishEvent(new LearningActivityEvent(user.getId(), source, rating != Rating.AGAIN));
        return saved;
    }

    /** Exposure without a graded answer (e.g. a Tango word first shown). Does not reschedule. */
    @Transactional
    public void recordSeen(User user, TangoVocabulary canonical, LearningSource source) {
        UserVocabularyProgress p = resolve(user, null, canonical);
        p.setTimesSeen(p.getTimesSeen() + 1);
        p.setLastSource(source);
        progressRepository.save(p);
    }

    /**
     * Placement test inferred the word is known: schedule it like a GOOD answer so FSRS verifies it soon.
     * No LearningActivityEvent, so an inferred word earns no missions or rewards.
     */
    @Transactional
    public void recordPlacement(User user, TangoVocabulary canonical) {
        UserVocabularyProgress p = resolve(user, null, canonical);
        p.setTimesSeen(p.getTimesSeen() + 1);
        p.setCorrectCount(p.getCorrectCount() + 1);
        p.setLastSource(LearningSource.TANGO); // path words are Tango words
        fsrsService.review(p, Rating.GOOD);
        progressRepository.save(p);
    }

    private UserVocabularyProgress resolve(User user, Vocabulary vocabulary, TangoVocabulary canonical) {
        if (canonical == null && vocabulary != null) canonical = vocabulary.getTangoVocabulary();

        Optional<UserVocabularyProgress> byVocabulary = vocabulary == null
                ? Optional.empty()
                : progressRepository.findByUserIdAndVocabularyId(user.getId(), vocabulary.getId());
        Optional<UserVocabularyProgress> byCanonical = canonical == null
                ? Optional.empty()
                : progressRepository.findByUserIdAndTangoVocabularyId(user.getId(), canonical.getId());

        UserVocabularyProgress p;
        if (byVocabulary.isPresent() && byCanonical.isPresent() && byVocabulary.get() != byCanonical.get()) {
            // Two rows for one word: fold the canonical-only row into the deck row when it is safe to do so.
            UserVocabularyProgress keep = byVocabulary.get();
            UserVocabularyProgress drop = byCanonical.get();
            if (drop.getVocabulary() == null) {
                mergeInto(keep, drop);
            }
            p = keep;
        } else {
            p = byVocabulary.or(() -> byCanonical).orElseGet(() ->
                    UserVocabularyProgress.builder().user(user).build());
        }

        if (vocabulary != null && p.getVocabulary() == null) p.setVocabulary(vocabulary);
        // Only attach the canonical word when no other row already carries it (keeps one row per word).
        if (canonical != null && byCanonical.isEmpty()) p.setTangoVocabulary(canonical);
        return p;
    }

    private void mergeInto(UserVocabularyProgress keep, UserVocabularyProgress drop) {
        keep.setTimesSeen(keep.getTimesSeen() + drop.getTimesSeen());
        keep.setCorrectCount(keep.getCorrectCount() + drop.getCorrectCount());
        keep.setIncorrectCount(keep.getIncorrectCount() + drop.getIncorrectCount());
        if (drop.getLastReviewTime() != null
                && (keep.getLastReviewTime() == null || drop.getLastReviewTime().isAfter(keep.getLastReviewTime()))) {
            keep.setStatus(drop.getStatus());
            keep.setStability(drop.getStability());
            keep.setDifficulty(drop.getDifficulty());
            keep.setRepetitions(drop.getRepetitions());
            keep.setLapses(drop.getLapses());
            keep.setLastReviewTime(drop.getLastReviewTime());
            keep.setNextReviewTime(drop.getNextReviewTime());
        }
        keep.setTangoVocabulary(drop.getTangoVocabulary());
        progressRepository.delete(drop);
        progressRepository.flush();
    }
}
