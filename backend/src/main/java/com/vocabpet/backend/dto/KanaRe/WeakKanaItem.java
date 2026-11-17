package com.vocabpet.backend.dto.KanaRe;

import lombok.*;

@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class WeakKanaItem {
    private String kana;
    private String script;
    private String section;
    private int correctCount;
    private int wrongCount;
    private int totalSeen;
    private Double accuracy;
    private boolean mastered;
    private String lastSeenAt;
}
