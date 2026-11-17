package com.vocabpet.backend.service;

import com.vocabpet.backend.config.TangoProperties;
import com.vocabpet.backend.entity.enums.TangoVocabularyStatus;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TangoStatusCalculatorTest {

    private final TangoStatusCalculator calculator = new TangoStatusCalculator(new TangoProperties(
            new TangoProperties.Mastery(5, 0.80),
            new TangoProperties.NeedReview(0.60),
            new TangoProperties.Lesson(0.80),
            new TangoProperties.Answer(false),
            new TangoProperties.Seed(false)));

    @Test
    void noAnswersIsNew() {
        assertThat(calculator.calculate(0, 0)).isEqualTo(TangoVocabularyStatus.NEW);
    }

    @Test
    void fiveCorrectInARowIsMastered() {
        assertThat(calculator.calculate(5, 5)).isEqualTo(TangoVocabularyStatus.MASTERED);
    }

    @Test
    void fourOfFiveIsExactlyMasteredThreshold() {
        assertThat(calculator.calculate(5, 4)).isEqualTo(TangoVocabularyStatus.MASTERED);
    }

    @Test
    void threeOfFiveIsNotMasteredAndNotNeedReview() {
        assertThat(calculator.calculate(5, 3)).isEqualTo(TangoVocabularyStatus.LEARNING);
    }

    @Test
    void fewAnswersNeverMasteredEvenIfPerfect() {
        assertThat(calculator.calculate(4, 4)).isEqualTo(TangoVocabularyStatus.LEARNING);
    }

    @Test
    void lowAccuracyNeedsReview() {
        assertThat(calculator.calculate(1, 0)).isEqualTo(TangoVocabularyStatus.NEED_REVIEW);
        assertThat(calculator.calculate(5, 2)).isEqualTo(TangoVocabularyStatus.NEED_REVIEW);
    }
}
