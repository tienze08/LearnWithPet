package com.vocabpet.backend.dto.BookmarkRe;

import lombok.*;

@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class BookmarkResponse {

    private Long id;

    private Long vocabularyId;

    private String word;

    private String meaning;

    private String example;

    private String difficulty;

    private String partOfSpeech;

    private Long deckId;

}