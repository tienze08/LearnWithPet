package com.vocabpet.backend.dto.ReaderAi;

import java.util.List;

/** Minimal DTO matching Gemini generateContent request JSON. */
public record GeminiGenerateContentRequest(
        List<Content> contents,
        GenerationConfig generationConfig) {

    public record Content(List<Part> parts) {
    }

    public record Part(String text) {
    }

    public record GenerationConfig(
            String responseMimeType,
            Integer temperature) {
    }
}
