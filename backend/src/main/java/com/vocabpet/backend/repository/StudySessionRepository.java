package com.vocabpet.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.vocabpet.backend.entity.StudySession;

public interface StudySessionRepository
        extends JpaRepository<StudySession, Long> {

    List<StudySession> findByUserId(Long userId);

}
