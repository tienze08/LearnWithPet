package com.vocabpet.backend.dto.StudyCardRe;

import java.time.LocalDate;
import java.util.List;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class StudyAnalyticsResponse {
    private long learningWords;
    private long learnedWords;
    private long masteredWords;
    private long weekMinutes;
    private List<DailyAccuracy> accuracy;
    private List<DeckAccuracy> decks;
    private List<LocalDate> activeDays;

    @Data @Builder public static class DailyAccuracy { private LocalDate date; private long reviewed; private long correct; }
    @Data @Builder public static class DeckAccuracy { private Long deckId; private String deckName; private long reviewed; private long correct; }
}
