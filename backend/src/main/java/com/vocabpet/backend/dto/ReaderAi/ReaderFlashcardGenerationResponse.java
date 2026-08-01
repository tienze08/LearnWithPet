package com.vocabpet.backend.dto.ReaderAi;

import java.util.List;

/** Safe API response for Reader; no Gemini-specific payload leaks to the client. */
public record ReaderFlashcardGenerationResponse(
        List<GeneratedFlashcardResponse> cards,
        String companionMessage) {
}
