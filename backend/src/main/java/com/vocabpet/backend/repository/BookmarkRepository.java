package com.vocabpet.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.vocabpet.backend.entity.Bookmark;
import com.vocabpet.backend.entity.User;

public interface BookmarkRepository
        extends JpaRepository<Bookmark, Long> {

    boolean existsByUserIdAndVocabularyId(
            Long userId,
            Long vocabularyId);

    Optional<Bookmark> findByUserIdAndVocabularyId(
            Long userId,
            Long vocabularyId);

    List<Bookmark> findByUser(User user);

}