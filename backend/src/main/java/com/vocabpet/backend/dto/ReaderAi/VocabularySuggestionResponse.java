package com.vocabpet.backend.dto.ReaderAi;

public record VocabularySuggestionResponse(String word, String contextSentence, String reason) {
}
