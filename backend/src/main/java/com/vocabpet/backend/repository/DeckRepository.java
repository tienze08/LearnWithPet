package com.vocabpet.backend.repository;

import com.vocabpet.backend.entity.Deck;
import com.vocabpet.backend.entity.User;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface DeckRepository extends JpaRepository<Deck, Long> {

    boolean existsByName(String name);

    boolean existsByUserAndName(User user, String name);

    List<Deck> findByUser(User user);

    Optional<Deck> findByIdAndUser(Long id, User user);
}