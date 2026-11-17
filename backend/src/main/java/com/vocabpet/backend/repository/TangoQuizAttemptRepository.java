package com.vocabpet.backend.repository;

import com.vocabpet.backend.entity.TangoQuizAttempt;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TangoQuizAttemptRepository extends JpaRepository<TangoQuizAttempt, Long> {

    Optional<TangoQuizAttempt> findByUserIdAndClientAttemptId(Long userId, String clientAttemptId);

    List<TangoQuizAttempt> findByUserIdOrderBySubmittedAtDesc(Long userId);
}
