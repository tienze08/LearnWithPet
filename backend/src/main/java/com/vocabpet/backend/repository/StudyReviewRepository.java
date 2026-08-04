package com.vocabpet.backend.repository;

import java.util.List;
import java.time.LocalDateTime;

import org.springframework.data.jpa.repository.JpaRepository;

import com.vocabpet.backend.entity.StudyReview;

public interface StudyReviewRepository
        extends JpaRepository<StudyReview, Long> {

    List<StudyReview> findBySessionId(Long sessionId);

    long countBySessionId(Long sessionId);

    long countByUserId(Long userId);

    long countByUserIdAndReviewedAtBetween(Long userId, LocalDateTime from, LocalDateTime to);

    List<StudyReview> findTop6ByUserIdOrderByReviewedAtDesc(Long userId);

    List<StudyReview> findTop20ByUserIdOrderByReviewedAtDesc(Long userId);

}
