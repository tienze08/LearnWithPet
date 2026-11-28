package com.vocabpet.backend.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;

class TangoAnswerNormalizerTest {

    private final TangoAnswerNormalizer normalizer = new TangoAnswerNormalizer();

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
            "ホン|ほん",
            "ほん|ほん",
            " ほ ん |ほん",
            "ＨＯＮ|HON",
            "本。|本",
            "ｶﾀｶﾅ|かたかな",
            "ホンダ|ほんだ"
    })
    void normalizesJapaneseAnswers(String raw, String expected) {
        assertThat(normalizer.normalizeJapanese(raw)).isEqualTo(expected);
    }

    @Test
    void japaneseNormalizationKeepsRomajiAsIs() {
        // Romaji is not accepted as an answer; normalization must not turn it into kana.
        assertThat(normalizer.normalizeJapanese("hon")).isEqualTo("hon");
    }

    @Test
    void normalizesVietnameseMeaningsCaseSpacingAndPunctuation() {
        assertThat(normalizer.normalizeMeaning("  Trường   Học. ", false)).isEqualTo("trường học");
        assertThat(normalizer.normalizeMeaning("Xin Chào!", false)).isEqualTo("xin chào");
    }

    @Test
    void keepsDiacriticsUnlessConfigured() {
        assertThat(normalizer.normalizeMeaning("trường học", false)).isEqualTo("trường học");
        assertThat(normalizer.normalizeMeaning("trường học", false)).isNotEqualTo("truong hoc");
    }

    @Test
    void stripsDiacriticsWhenConfigured() {
        assertThat(normalizer.normalizeMeaning("Trường Học", true)).isEqualTo("truong hoc");
        assertThat(normalizer.normalizeMeaning("đi", true)).isEqualTo("di");
    }

    @Test
    void nullOrBlankBecomesEmpty() {
        assertThat(normalizer.normalizeJapanese(null)).isEmpty();
        assertThat(normalizer.normalizeMeaning("   ", false)).isEmpty();
    }
}
