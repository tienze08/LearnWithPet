package com.vocabpet.backend.dto.StudyCardRe;

import java.time.LocalDateTime;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ReviewResponse {

    private int intervalDays;

    private LocalDateTime nextReviewTime;

}
