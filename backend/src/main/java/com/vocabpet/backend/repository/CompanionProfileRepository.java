package com.vocabpet.backend.repository;

import com.vocabpet.backend.entity.CompanionProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CompanionProfileRepository extends JpaRepository<CompanionProfile, Long> {
    Optional<CompanionProfile> findByPetId(Long petId);
}
