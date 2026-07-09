package com.vocabpet.backend.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.vocabpet.backend.entity.UserMission;

public interface UserMissionRepository extends JpaRepository<UserMission, Long> {

    Optional<UserMission> findByUserIdAndDailyQuestIdAndDate(
            Long userId,
            Long dailyQuestId,
            LocalDate date);

    List<UserMission> findAllByUserIdAndDate(
            Long userId,
            LocalDate date);
}