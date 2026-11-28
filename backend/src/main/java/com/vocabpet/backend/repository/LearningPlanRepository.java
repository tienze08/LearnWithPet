package com.vocabpet.backend.repository;

import java.util.Optional;

import com.vocabpet.backend.entity.enums.PathPlanStatus;

import org.springframework.data.jpa.repository.JpaRepository;

import com.vocabpet.backend.entity.LearningPlan;

public interface LearningPlanRepository extends JpaRepository<LearningPlan, Long> {
    Optional<LearningPlan> findFirstByUserIdAndStatusOrderByIdDesc(Long userId, PathPlanStatus status);
}
