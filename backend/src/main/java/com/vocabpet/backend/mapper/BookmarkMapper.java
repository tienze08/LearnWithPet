package com.vocabpet.backend.mapper;

import org.springframework.stereotype.Component;

import com.vocabpet.backend.dto.BookmarkRe.BookmarkResponse;
import com.vocabpet.backend.entity.Bookmark;
import com.vocabpet.backend.entity.Vocabulary;

@Component
public class BookmarkMapper {

    public BookmarkResponse toResponse(
            Bookmark bookmark) {

        Vocabulary vocabulary = bookmark.getVocabulary();

        return BookmarkResponse.builder()

                .id(bookmark.getId())

                .vocabularyId(
                        vocabulary.getId())

                .word(
                        vocabulary.getWord())

                .meaning(
                        vocabulary.getMeaning())

                .example(
                        vocabulary.getExample())

                .difficulty(
                        vocabulary.getDifficulty() == null
                                ? null
                                : vocabulary.getDifficulty().name())

                .partOfSpeech(
                        vocabulary.getPartOfSpeech() == null
                                ? null
                                : vocabulary.getPartOfSpeech().name())

                .deckId(
                        vocabulary.getDeck().getId())

                .build();
    }
}