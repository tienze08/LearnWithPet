package com.vocabpet.backend.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.vocabpet.backend.entity.DailyPlan;

public interface DailyPlanRepository extends JpaRepository<DailyPlan, Long> {
    Optional<DailyPlan> findByPlanIdAndLocalDate(Long planId, LocalDate localDate);

    List<DailyPlan> findByPlanIdOrderByLocalDateDesc(Long planId);
}
