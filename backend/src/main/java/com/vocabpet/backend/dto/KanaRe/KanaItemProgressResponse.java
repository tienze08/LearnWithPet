package com.vocabpet.backend.dto.KanaRe;

import lombok.*;

@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class KanaItemProgressResponse {
    private String kana;
    private String script;
    private String section;
    private int correctCount;
    private int wrongCount;
    private boolean mastered;
}
