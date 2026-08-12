package com.vocabpet.backend.repository;

import com.vocabpet.backend.entity.CompanionWordMemory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CompanionWordMemoryRepository extends JpaRepository<CompanionWordMemory, Long> {
    Optional<CompanionWordMemory> findByProfileIdAndVocabularyId(Long profileId, Long vocabularyId);
    Optional<CompanionWordMemory> findTopByProfileIdAndWrongCountGreaterThanOrderByWrongCountDescLastReviewedAtDesc(
            Long profileId, int wrongCount);
}
