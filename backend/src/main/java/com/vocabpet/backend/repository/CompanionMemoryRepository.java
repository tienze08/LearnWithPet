package com.vocabpet.backend.repository;

import com.vocabpet.backend.entity.CompanionMemory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CompanionMemoryRepository extends JpaRepository<CompanionMemory, Long> {
    Optional<CompanionMemory> findByProfileId(Long profileId);
}
