package com.vocabpet.backend.dto.ReaderAi;

/** A normalized card returned by Gemini and shown in the Reader preview. */
public record GeneratedFlashcardResponse(
        String word,
        String partOfSpeech,
        String ipa,
        String cefr,
        String meaning,
        String example,
        String contextSentence) {
}
