package com.vocabpet.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.vocabpet.backend.entity.StudyReview;

public interface StudyReviewRepository
        extends JpaRepository<StudyReview, Long> {

    List<StudyReview> findBySessionId(Long sessionId);

    long countBySessionId(Long sessionId);

}
