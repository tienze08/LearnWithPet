package com.vocabpet.backend.dto.ReaderAi;

import java.util.List;

public record ReaderVocabularySuggestionResponse(String companionMessage, List<VocabularySuggestionResponse> suggestions) {
}
