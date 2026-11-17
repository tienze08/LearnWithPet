package com.vocabpet.backend.repository;

import com.vocabpet.backend.entity.TangoLessonVocabulary;
import com.vocabpet.backend.entity.enums.JlptLevel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TangoLessonVocabularyRepository extends JpaRepository<TangoLessonVocabulary, Long> {

    List<TangoLessonVocabulary> findByLessonIdOrderByPositionAsc(Long lessonId);

    List<TangoLessonVocabulary> findByVocabularyId(Long vocabularyId);

    @Query("SELECT lv FROM TangoLessonVocabulary lv JOIN FETCH lv.lesson l JOIN FETCH lv.vocabulary "
            + "WHERE l.jlptLevel = :level AND l.published = true")
    List<TangoLessonVocabulary> findPublishedByLevel(@Param("level") JlptLevel level);
}
