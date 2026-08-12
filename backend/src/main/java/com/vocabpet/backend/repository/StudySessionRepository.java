package com.vocabpet.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.vocabpet.backend.entity.StudySession;

public interface StudySessionRepository
        extends JpaRepository<StudySession, Long> {

    List<StudySession> findByUserId(Long userId);

    @Query(value = """
            SELECT HOUR(started_at)
            FROM study_sessions
            WHERE user_id = :userId AND started_at IS NOT NULL
            GROUP BY HOUR(started_at)
            ORDER BY COUNT(*) DESC
            LIMIT 1
            """, nativeQuery = true)
    Integer findPreferredStudyHour(Long userId);

}
