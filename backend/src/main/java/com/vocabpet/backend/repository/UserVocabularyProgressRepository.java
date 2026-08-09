package com.vocabpet.backend.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.vocabpet.backend.entity.UserVocabularyProgress;
import com.vocabpet.backend.entity.Vocabulary;

public interface UserVocabularyProgressRepository
                extends JpaRepository<UserVocabularyProgress, Long> {

        Optional<UserVocabularyProgress> findByUserIdAndVocabularyId(
                        Long userId,
                        Long vocabularyId);

        // Study Session
        @Query("""
                        SELECT p
                        FROM UserVocabularyProgress p
                        WHERE p.user.id=:userId
                        AND p.vocabulary.deck.user.id=:userId
                        AND p.vocabulary.deck.id=:deckId
                        AND (p.nextReviewTime IS NULL OR p.nextReviewTime<=:now)
                        ORDER BY p.nextReviewTime ASC
                        """)
        List<UserVocabularyProgress> findDueCards(
                        Long userId,
                        Long deckId,
                        LocalDateTime now);

        // Quiz Desktop
        @Query("""
                        SELECT p
                        FROM UserVocabularyProgress p
                        WHERE p.user.id=:userId
                        AND p.vocabulary.deck.user.id=:userId
                        AND (p.nextReviewTime IS NULL OR p.nextReviewTime<=:now)
                        ORDER BY p.nextReviewTime ASC
                        """)
        List<UserVocabularyProgress> findDueCardsForQuiz(
                        Long userId,
                        LocalDateTime now);

        @Query("""
                        SELECT COUNT(p)
                        FROM UserVocabularyProgress p
                        WHERE p.user.id=:userId
                        AND p.vocabulary.deck.user.id=:userId
                        AND (p.nextReviewTime IS NULL OR p.nextReviewTime<=:now)
                        """)
        long countDueCards(Long userId, LocalDateTime now);

        @Query("""
                        SELECT v
                        FROM Vocabulary v
                        WHERE v.deck.id=:deckId
                        AND v.id NOT IN (
                            SELECT p.vocabulary.id
                            FROM UserVocabularyProgress p
                            WHERE p.user.id=:userId
                        )
                        """)
        List<Vocabulary> findNewCards(
                        Long userId,
                        Long deckId);

        @Query("""
                        SELECT v
                        FROM Vocabulary v
                        WHERE v.deck.user.id=:userId
                        AND v.id NOT IN (
                            SELECT p.vocabulary.id
                            FROM UserVocabularyProgress p
                            WHERE p.user.id=:userId
                        )
                        ORDER BY v.id ASC
                        """)
        List<Vocabulary> findNewCardsForQuiz(Long userId);

        long countByUserIdAndRepetitionsGreaterThanEqual(Long userId, int repetitions);

        long countByUserIdAndRepetitionsBetween(Long userId, int minimumRepetitions, int maximumRepetitions);
}
