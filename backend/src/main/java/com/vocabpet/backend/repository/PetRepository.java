package com.vocabpet.backend.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.vocabpet.backend.entity.Pet;

public interface PetRepository extends JpaRepository<Pet, Long> {

    Optional<Pet> findByUserId(Long userId);

}