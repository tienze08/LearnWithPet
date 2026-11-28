package com.vocabpet.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/** Tango thresholds. Bound from app.tango.* in application.yaml. */
@ConfigurationProperties(prefix = "app.tango")
public record TangoProperties(
        @DefaultValue Mastery mastery,
        @DefaultValue NeedReview needReview,
        @DefaultValue Lesson lesson,
        @DefaultValue Answer answer,
        @DefaultValue Seed seed) {

    public record Mastery(@DefaultValue("5") int minAnswered, @DefaultValue("0.80") double minAccuracy) {}

    public record NeedReview(@DefaultValue("0.60") double maxAccuracy) {}

    public record Lesson(@DefaultValue("0.80") double quizPassAccuracy) {}

    public record Answer(@DefaultValue("false") boolean ignoreVietnameseDiacritics) {}

    public record Seed(@DefaultValue("true") boolean enabled) {}
}
