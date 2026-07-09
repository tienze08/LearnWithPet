package com.vocabpet.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.vocabpet.backend.entity.DailyQuest;
import com.vocabpet.backend.entity.enums.MissionType;

public interface DailyQuestRepository extends JpaRepository<DailyQuest, Long> {

    List<DailyQuest> findByActiveTrue();

    Optional<DailyQuest> findByType(MissionType type);
}
