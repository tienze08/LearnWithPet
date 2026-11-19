package com.vocabpet.backend.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.vocabpet.backend.entity.PathProfile;

public interface PathProfileRepository extends JpaRepository<PathProfile, Long> {
    Optional<PathProfile> findByUserId(Long userId);
}
