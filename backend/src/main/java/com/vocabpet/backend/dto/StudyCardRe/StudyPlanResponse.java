package com.vocabpet.backend.dto.StudyCardRe;

import java.time.LocalDateTime;
import java.util.List;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class StudyPlanResponse {
    private long dueCards;
    private int estimatedMinutes;
    private long reviewsToday;
    private int dailyGoal;
    private int streak;
    private Long suggestedDeckId;
    private String suggestedDeckName;
    private List<DueReason> dueReasons;
    private List<UpcomingCard> upcomingCards;

    @Data
    @Builder
    public static class DueReason {
        private String code;
        private String label;
        private String detail;
        private long count;
        private Long deckId;
        private String deckName;
        private List<String> words;
    }

    @Data
    @Builder
    public static class UpcomingCard {
        private Long vocabularyId;
        private String word;
        private String deckName;
        private LocalDateTime dueAt;
    }
}
