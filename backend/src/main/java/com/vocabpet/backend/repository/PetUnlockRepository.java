package com.vocabpet.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.vocabpet.backend.entity.PetUnlock;
import com.vocabpet.backend.entity.User;
import com.vocabpet.backend.entity.enums.PetSpecies;

public interface PetUnlockRepository extends JpaRepository<PetUnlock, Long> {
    Optional<PetUnlock> findByUserIdAndSpecies(Long userId, PetSpecies species);

    List<PetUnlock> findByUserId(Long userId);

    boolean existsByUserAndSpecies(User user, PetSpecies species);
}
