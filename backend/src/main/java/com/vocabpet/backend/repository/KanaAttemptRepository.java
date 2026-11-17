package com.vocabpet.backend.repository;

import com.vocabpet.backend.entity.KanaAttempt;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface KanaAttemptRepository extends JpaRepository<KanaAttempt, Long> {

    boolean existsByClientAttemptId(String clientAttemptId);

    KanaAttempt findByClientAttemptId(String clientAttemptId);

    List<KanaAttempt> findByUserIdOrderByCompletedAtDesc(Long userId);

    List<KanaAttempt> findByUserIdAndScriptAndSection(Long userId, String script, String section);
}
