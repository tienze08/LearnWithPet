package com.vocabpet.backend.repository;

import java.util.List;
import java.time.LocalDateTime;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.vocabpet.backend.entity.StudyReview;

public interface StudyReviewRepository
        extends JpaRepository<StudyReview, Long> {

    List<StudyReview> findBySessionId(Long sessionId);

    long countBySessionId(Long sessionId);

    boolean existsBySessionIdAndVocabularyId(Long sessionId, Long vocabularyId);

    long countByUserId(Long userId);

    long countByUserIdAndReviewedAtBetween(Long userId, LocalDateTime from, LocalDateTime to);

    List<StudyReview> findTop6ByUserIdOrderByReviewedAtDesc(Long userId);

    List<StudyReview> findTop20ByUserIdOrderByReviewedAtDesc(Long userId);

    @Query("""
            SELECT r FROM StudyReview r
            WHERE r.user.id = :userId
            AND r.vocabulary.deck.user.id = :userId
            AND r.reviewedAt >= :from AND r.reviewedAt < :to
            ORDER BY r.reviewedAt DESC
            """)
    List<StudyReview> findOwnedReviewsBetween(Long userId, LocalDateTime from, LocalDateTime to);

    @Query("""
            SELECT r.vocabulary.deck.id,
                   r.vocabulary.deck.name,
                   SUM(CASE WHEN r.rating IN (com.vocabpet.backend.entity.enums.Rating.GOOD,
                                              com.vocabpet.backend.entity.enums.Rating.EASY) THEN 1 ELSE 0 END),
                   COUNT(r)
            FROM StudyReview r
            WHERE r.user.id = :userId
            GROUP BY r.vocabulary.deck.id, r.vocabulary.deck.name
            """)
    List<Object[]> findTopicPerformanceByUserId(Long userId);

    @Query("""
            SELECT COUNT(r) FROM StudyReview r
            WHERE r.user.id = :userId
            AND r.rating IN (com.vocabpet.backend.entity.enums.Rating.GOOD,
                             com.vocabpet.backend.entity.enums.Rating.EASY)
            """)
    long countSuccessfulByUserId(Long userId);

}
