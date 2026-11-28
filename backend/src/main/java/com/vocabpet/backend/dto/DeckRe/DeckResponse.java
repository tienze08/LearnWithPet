package com.vocabpet.backend.dto.DeckRe;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeckResponse {

    private Long id;

    private String name;

    private String description;

    private int wordCount;

    /** Words that have entered this user's shared FSRS schedule at least once. */
    private long studiedCount;

    /** Words that have reached the FSRS mastered state. */
    private long masteredCount;

    private String emoji;

    private String color;

}
