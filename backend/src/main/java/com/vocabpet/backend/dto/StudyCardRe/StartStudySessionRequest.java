package com.vocabpet.backend.dto.StudyCardRe;

import lombok.Data;

@Data
public class StartStudySessionRequest {

    private Long deckId;

    /** Number of review attempts to include. Null means a normal full session. */
    private Integer reviewLimit;

}
