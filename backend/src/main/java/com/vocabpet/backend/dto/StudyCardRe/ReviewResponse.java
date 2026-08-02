package com.vocabpet.backend.dto.StudyCardRe;

import java.time.LocalDateTime;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ReviewResponse {

    private LocalDateTime nextReviewTime;

    private boolean streakUpdated;

    private int currentStreak;

    private int longestStreak;

}
