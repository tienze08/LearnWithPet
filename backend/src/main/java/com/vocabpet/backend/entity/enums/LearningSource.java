package com.vocabpet.backend.entity.enums;

/**
 * Where a learning event happened. All sources write to the same UserVocabularyProgress record.
 * Do not add values without a migration: on MySQL the column is a native ENUM that ddl-auto=update never widens.
 */
public enum LearningSource {
    TANGO,
    FLASHCARD,
    REVIEW,
    QUIZ
}
