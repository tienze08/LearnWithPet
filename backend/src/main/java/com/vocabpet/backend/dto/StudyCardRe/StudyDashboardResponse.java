package com.vocabpet.backend.dto.StudyCardRe;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class StudyDashboardResponse {
    private long learningWords;
    private long masteredWords;
    private long recentCorrect;
    private long recentReviews;
}
