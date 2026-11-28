package com.vocabpet.backend.service;

import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.Locale;

/** Normalizes learner answers before comparison. Romaji is intentionally not accepted (see TANGO_API_SPEC §3). */
@Component
public class TangoAnswerNormalizer {

    private static final Locale VI = Locale.forLanguageTag("vi");

    public String normalizeMeaning(String raw, boolean ignoreDiacritics) {
        String s = Normalizer.normalize(nullToEmpty(raw), Normalizer.Form.NFC)
                .trim()
                .replaceAll("\\s+", " ");
        s = stripTrailingPunctuation(s).toLowerCase(VI);
        if (ignoreDiacritics) {
            s = Normalizer.normalize(s, Normalizer.Form.NFD)
                    .replaceAll("\\p{M}", "")
                    .replace('đ', 'd');
        }
        return s;
    }

    public String normalizeJapanese(String raw) {
        String s = Normalizer.normalize(nullToEmpty(raw), Normalizer.Form.NFKC).replaceAll("\\s+", "");
        s = stripTrailingPunctuation(s);
        StringBuilder out = new StringBuilder(s.length());
        for (char c : s.toCharArray()) {
            // Katakana ァ (U+30A1) .. ヶ (U+30F6) map to hiragana by a fixed offset.
            out.append(c >= 'ァ' && c <= 'ヶ' ? (char) (c - 0x60) : c);
        }
        return out.toString();
    }

    private static String stripTrailingPunctuation(String s) {
        return s.replaceAll("[.!?。！？]+$", "");
    }

    private static String nullToEmpty(String s) {
        return s == null ? "" : s;
    }
}
