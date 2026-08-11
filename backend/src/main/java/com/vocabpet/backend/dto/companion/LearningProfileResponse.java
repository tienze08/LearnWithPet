package com.vocabpet.backend.dto.companion;

import lombok.Builder;
import lombok.Data;

/**
 * Derived learning data used by the personality engine. This is intentionally
 * separate from FSRS scheduling: it describes habits and confidence, not when
 * a card is due.
 */
@Data
@Builder
public class LearningProfileResponse {
    private long totalWordsLearned;
    private long totalReviews;
    private long totalStudyMinutes;
    private int averageQuizScore;
    private String strongestTopic;
    private String weakestTopic;
    private Long weakestDeckId;
    private int preferredStudyHour;
}
