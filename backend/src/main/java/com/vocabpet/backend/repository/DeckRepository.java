package com.vocabpet.backend.repository;

import com.vocabpet.backend.entity.Deck;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DeckRepository extends JpaRepository<Deck, Long> {

    boolean existsByName(String name);

}