package com.vocabpet.backend.repository;

import com.vocabpet.backend.entity.TangoQuizAnswer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TangoQuizAnswerRepository extends JpaRepository<TangoQuizAnswer, Long> {

    List<TangoQuizAnswer> findByAttemptIdOrderByIdAsc(Long attemptId);
}
