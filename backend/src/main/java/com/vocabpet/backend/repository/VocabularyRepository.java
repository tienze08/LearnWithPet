package com.vocabpet.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.vocabpet.backend.entity.Vocabulary;

public interface VocabularyRepository extends JpaRepository<Vocabulary, Long> {

    List<Vocabulary> findByDeckId(Long deckId);

    @Query(value = """
            SELECT *
            FROM vocabularies
            WHERE id <> :id
            ORDER BY RAND()
            LIMIT 3
            """, nativeQuery = true)
    List<Vocabulary> findRandomWrongOptions(Long id);

    @Query(value = """
            SELECT *
            FROM vocabularies
            ORDER BY RAND()
            LIMIT 1
            """, nativeQuery = true)
    Optional<Vocabulary> findRandomVocabulary();
}
