package com.vocabpet.backend.repository;

import com.vocabpet.backend.entity.UserTangoLessonProgress;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface UserTangoLessonProgressRepository extends JpaRepository<UserTangoLessonProgress, Long> {

    List<UserTangoLessonProgress> findByUserId(Long userId);

    java.util.Optional<UserTangoLessonProgress> findByUserIdAndLessonId(Long userId, Long lessonId);

    List<UserTangoLessonProgress> findByUserIdAndLessonIdIn(Long userId, Collection<Long> lessonIds);
}
