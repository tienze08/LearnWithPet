package com.vocabpet.backend.repository;

import com.vocabpet.backend.entity.TangoVocabulary;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TangoVocabularyRepository extends JpaRepository<TangoVocabulary, Long> {

    Optional<TangoVocabulary> findByKanaAndExpressionKey(String kana, String expressionKey);
}
