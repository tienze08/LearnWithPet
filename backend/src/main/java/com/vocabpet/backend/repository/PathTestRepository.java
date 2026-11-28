package com.vocabpet.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.vocabpet.backend.entity.PathTest;

public interface PathTestRepository extends JpaRepository<PathTest, Long> {
    Optional<PathTest> findByDailyPlanId(Long dailyPlanId);

    List<PathTest> findByDailyPlanPlanIdOrderByIdDesc(Long planId);
}
