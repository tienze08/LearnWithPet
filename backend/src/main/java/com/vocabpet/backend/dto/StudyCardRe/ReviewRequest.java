package com.vocabpet.backend.dto.StudyCardRe;

import com.vocabpet.backend.entity.enums.Rating;

import lombok.Data;

@Data
public class ReviewRequest {

    private Long vocabularyId;

    private Rating rating;
}
