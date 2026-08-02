package com.vocabpet.backend.dto.StudyCardRe;

import java.time.LocalDateTime;

import com.vocabpet.backend.entity.enums.Rating;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RecentReviewResponse {
    private Long vocabularyId;
    private String word;
    private String meaning;
    private Rating rating;
    private LocalDateTime reviewedAt;
}
