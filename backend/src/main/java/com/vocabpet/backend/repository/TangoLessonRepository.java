package com.vocabpet.backend.repository;

import com.vocabpet.backend.entity.TangoLesson;
import com.vocabpet.backend.entity.enums.JlptLevel;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TangoLessonRepository extends JpaRepository<TangoLesson, Long> {

    Optional<TangoLesson> findByJlptLevelAndLessonNumber(JlptLevel jlptLevel, int lessonNumber);

    List<TangoLesson> findByJlptLevelAndPublishedTrueOrderBySortOrderAsc(JlptLevel jlptLevel);

    Optional<TangoLesson> findByIdAndPublishedTrue(Long id);
}
