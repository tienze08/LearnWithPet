package com.vocabpet.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.vocabpet.backend.entity.Vocabulary;

public interface VocabularyRepository extends JpaRepository<Vocabulary, Long> {

    List<Vocabulary> findByDeckId(Long deckId);

    Optional<Vocabulary> findByIdAndDeckUserId(Long id, Long userId);

    Optional<Vocabulary> findByIdAndDeckId(Long id, Long deckId);

    List<Vocabulary> findByDeckIdAndDeckUserId(Long deckId, Long userId);

    @Query("SELECT v FROM Vocabulary v WHERE v.deck.user.id = :userId")
    List<Vocabulary> findByDeckUserId(@Param("userId") Long userId);

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
