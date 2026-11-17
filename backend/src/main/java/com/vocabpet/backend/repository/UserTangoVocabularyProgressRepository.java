package com.vocabpet.backend.repository;

import com.vocabpet.backend.entity.UserTangoVocabularyProgress;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface UserTangoVocabularyProgressRepository extends JpaRepository<UserTangoVocabularyProgress, Long> {

    List<UserTangoVocabularyProgress> findByUserId(Long userId);

    List<UserTangoVocabularyProgress> findByUserIdAndVocabularyIdIn(Long userId, Collection<Long> vocabularyIds);

    Optional<UserTangoVocabularyProgress> findByUserIdAndVocabularyId(Long userId, Long vocabularyId);
}
