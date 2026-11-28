package com.vocabpet.backend.dto.KanaRe;

import lombok.*;

import java.util.List;

@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class KanaAttemptResponse {
    private Long attemptId;
    private String script;
    private String section;
    private int score;
    private int total;
    private double accuracy;
    private String completedAt;
    private List<WeakKanaItem> weakKana;
    private boolean isNew;
}
