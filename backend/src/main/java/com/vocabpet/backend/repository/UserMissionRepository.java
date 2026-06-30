package com.vocabpet.backend.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.vocabpet.backend.entity.UserMission;
import com.vocabpet.backend.entity.enums.MissionType;

public interface UserMissionRepository extends JpaRepository<UserMission, Long> {

    List<UserMission> findByUserIdAndDate(Long userId, LocalDate date);

    Optional<UserMission> findByUserIdAndTypeAndDate(Long userId, MissionType type, LocalDate date);
}
