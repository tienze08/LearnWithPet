package com.vocabpet.backend.entity.enums;

/**
 * Content kind in the learning path. ItemProgress holds GRAMMAR and KANJI only: VOCAB progress stays in
 * UserVocabularyProgress and KANA in KanaItemProgress. Stored as varchar (see LearningPathSchemaPatch), not a MySQL ENUM.
 */
public enum PathItemType { KANA, GRAMMAR, VOCAB, KANJI }
