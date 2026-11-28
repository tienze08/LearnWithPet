package com.vocabpet.backend.repository;

import com.vocabpet.backend.entity.ListeningAttempt;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ListeningAttemptRepository extends JpaRepository<ListeningAttempt, Long> {

    Optional<ListeningAttempt> findByUserIdAndClientAttemptId(Long userId, String clientAttemptId);

    List<ListeningAttempt> findByUserIdOrderByCompletedAtAscIdAsc(Long userId);
}
