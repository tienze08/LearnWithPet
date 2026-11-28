package com.vocabpet.backend.service;

import com.vocabpet.backend.config.TangoProperties;
import com.vocabpet.backend.entity.enums.TangoVocabularyStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Word status from answer counts. Thresholds come from app.tango.* (see TANGO_PRD §4.1). */
@Component
@RequiredArgsConstructor
public class TangoStatusCalculator {

    private final TangoProperties properties;

    public TangoVocabularyStatus calculate(int answered, int correct) {
        if (answered == 0) return TangoVocabularyStatus.NEW;
        double accuracy = (double) correct / answered;
        TangoProperties.Mastery mastery = properties.mastery();
        if (answered >= mastery.minAnswered() && accuracy >= mastery.minAccuracy()) {
            return TangoVocabularyStatus.MASTERED;
        }
        if (accuracy < properties.needReview().maxAccuracy()) {
            return TangoVocabularyStatus.NEED_REVIEW;
        }
        return TangoVocabularyStatus.LEARNING;
    }
}
