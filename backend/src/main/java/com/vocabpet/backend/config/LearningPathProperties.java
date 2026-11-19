package com.vocabpet.backend.config;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Learning Path settings. Bound from app.learning-path.* in application.yaml.
 * enabled=true turns the feature on for everyone; otherwise only users whose email is in allowlist get it.
 */
@ConfigurationProperties(prefix = "app.learning-path")
public record LearningPathProperties(
        @DefaultValue("false") boolean enabled,
        @DefaultValue List<String> allowlist,
        @DefaultValue Engine engine) {

    /** Learning Engine tuning. Every value here is a guess to refine with real usage data. */
    public record Engine(
            /* time estimates */
            @DefaultValue("5") double grammarMinutes,
            @DefaultValue("40") double vocabSeconds,
            @DefaultValue("2") double kanjiMinutes,
            @DefaultValue("20") double reviewSeconds,
            /* reviews may take at most this share of the day while new material remains */
            @DefaultValue("0.5") double maxReviewShare,
            /* adaptive: recent review accuracy below lowAccuracy cuts new items by lowAccuracyCut */
            @DefaultValue("0.7") double lowAccuracy,
            @DefaultValue("0.3") double lowAccuracyCut,
            @DefaultValue("10") int minAnswersForAccuracy,
            @DefaultValue("3") int accuracyWindowDays,
            /* after missed days the daily new quota may grow to at most this multiple of the original */
            @DefaultValue("1.3") double maxQuotaGrowth,
            /* forecasts and feasibility assume reviews eat this share of each day */
            @DefaultValue("0.25") double reviewReserveShare,
            /* Leitner intervals in days, one per stage */
            @DefaultValue({"1", "3", "7", "14", "30"}) List<Integer> leitnerDays,
            /* mastery: stage >= memorizedStage is MEMORIZED; last stage and accuracy >= masteredAccuracy is MASTERED */
            @DefaultValue("3") int memorizedStage,
            @DefaultValue("0.85") double masteredAccuracy,
            /* vocab (FSRS repetitions) equivalents */
            @DefaultValue("3") int vocabMemorizedReps,
            /* placement test questions per type (15 in total) */
            @DefaultValue("6") int placementGrammar,
            @DefaultValue("5") int placementVocab,
            @DefaultValue("4") int placementKanji) {
    }
}
