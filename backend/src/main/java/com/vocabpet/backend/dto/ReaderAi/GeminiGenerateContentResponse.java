package com.vocabpet.backend.dto.ReaderAi;

import java.util.List;

/** Minimal DTO needed to extract Gemini's generated JSON text safely. */
public record GeminiGenerateContentResponse(List<Candidate> candidates) {

    public record Candidate(Content content) {
    }

    public record Content(List<Part> parts) {
    }

    public record Part(String text) {
    }
}
