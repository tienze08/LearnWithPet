package com.vocabpet.backend.dto.StudyCardRe;

import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ActiveStudySessionResponse {
    private Long sessionId;
    private Long deckId;
    private String deckName;
    private LocalDateTime startedAt;
    private LocalDateTime lastActiveAt;
    private Long currentVocabularyId;
    private String currentWord;
    private Integer reviewed;
    private Integer uniqueCards;
    private Integer correct;
}
