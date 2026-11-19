package com.vocabpet.backend.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.vocabpet.backend.entity.LearningSession;
import com.vocabpet.backend.entity.enums.PathSessionKind;

public interface LearningSessionRepository extends JpaRepository<LearningSession, Long> {
    Optional<LearningSession> findFirstByDailyPlanIdAndKindOrderByIdDesc(Long dailyPlanId, PathSessionKind kind);

    List<LearningSession> findByUserIdAndStartedAtAfter(Long userId, Instant after);
}
