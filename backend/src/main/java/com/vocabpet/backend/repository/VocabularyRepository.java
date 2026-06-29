package com.vocabpet.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.vocabpet.backend.entity.Vocabulary;

public interface VocabularyRepository extends JpaRepository<Vocabulary, Long> {

    List<Vocabulary> findByDeckId(Long deckId);

}
