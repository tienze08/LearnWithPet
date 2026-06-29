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

}