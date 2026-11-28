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
            /* pace new items to finish with this share of the lesson days used, leaving room for review lessons and unit boundaries */
            @DefaultValue("0.85") double paceSlack,
            /* forecasts and feasibility assume reviews eat this share of each day */
            @DefaultValue("0.25") double reviewReserveShare,
            /* Leitner intervals in days, one per stage */
            @DefaultValue({"1", "3", "7", "14", "30"}) List<Integer> leitnerDays,
            /* mastery: stage >= memorizedStage is MEMORIZED; last stage and accuracy >= masteredAccuracy is MASTERED */
            @DefaultValue("3") int memorizedStage,
            @DefaultValue("0.85") double masteredAccuracy,
            /* vocab (FSRS repetitions) equivalents */
            @DefaultValue("3") int vocabMemorizedReps,
            /* placement test questions per type */
            @DefaultValue("6") int placementGrammar,
            @DefaultValue("5") int placementVocab,
            @DefaultValue("4") int placementKanji,
            @DefaultValue("10") int placementHiragana,
            @DefaultValue("10") int placementKatakana,
            /* kana: time per new character */
            @DefaultValue("30") double kanaSeconds,
            /* phases: one practice question per item, one test question per item */
            @DefaultValue("20") double practiceSeconds,
            @DefaultValue("20") double testSeconds,
            @DefaultValue("12") int testQuestions,
            @DefaultValue("15") int weeklyTestQuestions,
            /* weekly "Củng cố": items of the cycle shown again */
            @DefaultValue("10") int consolidateMax,
            /* practice: weak / previously wrong items added on top of today's items */
            @DefaultValue("5") int practiceExtraMax,
            /* relearning weak items (after a weekly test < 60%) may take this share of the learning time */
            @DefaultValue("0.5") double relearnShare,
            /* a short unit is followed by the next one in the same day when this share of the day's quota is left */
            @DefaultValue("0.4") double unitMergeShare,
            /* tests */
            @DefaultValue("0.8") double dailyPassScore,
            @DefaultValue("0.9") double weeklyNormalMin,
            @DefaultValue("0.8") double weeklyEarlyReviewMin,
            @DefaultValue("0.6") double weeklyReduceMin,
            @DefaultValue("0.3") double weeklyReduceNewCut,
            /* weak flag: on after this many misses in a row (or any miss in a test), off after this many correct in a row */
            @DefaultValue("2") int weakAfterWrongStreak,
            @DefaultValue("2") int weakClearAfterCorrectStreak,
            /* skill map: the weakest skill (quality below the threshold, with enough items started) gets a bigger share */
            @DefaultValue("0.75") double weakSkillThreshold,
            @DefaultValue("0.3") double weakSkillBoost,
            @DefaultValue("5") int minIntroducedForSkill,
            /* kana gate: at most this many new kana a day, so a day stays about one small set of characters */
            @DefaultValue("12") int maxNewKanaPerDay,
            /* chapter tests (Hiragana, Katakana, Kana gate): questions and pass mark */
            @DefaultValue("20") int chapterTestQuestions,
            @DefaultValue("0.85") double chapterPassScore) {
    }
}
