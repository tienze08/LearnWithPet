package com.vocabpet.backend.dto.KanaRe;

import lombok.*;

@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class KanaSectionProgress {
    private String script;
    private String section;
    private int totalKana;
    private int seen;
    private int mastered;
    private int needsImprovement;
    private int notYetSeen;
    private Double overallAccuracy;
    private String lastAttempted;
}
