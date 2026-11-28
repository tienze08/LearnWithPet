package com.vocabpet.backend.repository;

import com.vocabpet.backend.entity.UserTangoFavorite;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface UserTangoFavoriteRepository extends JpaRepository<UserTangoFavorite, Long> {

    List<UserTangoFavorite> findByUserIdAndVocabularyIdIn(Long userId, Collection<Long> vocabularyIds);

    boolean existsByUserIdAndVocabularyId(Long userId, Long vocabularyId);

    java.util.Optional<UserTangoFavorite> findByUserIdAndVocabularyId(Long userId, Long vocabularyId);

    List<UserTangoFavorite> findByUserIdOrderByCreatedAtDesc(Long userId);
}
