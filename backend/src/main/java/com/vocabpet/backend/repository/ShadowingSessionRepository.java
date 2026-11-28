package com.vocabpet.backend.repository;

import com.vocabpet.backend.entity.ShadowingSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ShadowingSessionRepository extends JpaRepository<ShadowingSession, Long> {

    Optional<ShadowingSession> findByUserIdAndClientSessionId(Long userId, String clientSessionId);

    List<ShadowingSession> findByUserIdOrderByCompletedAtAscIdAsc(Long userId);
}
