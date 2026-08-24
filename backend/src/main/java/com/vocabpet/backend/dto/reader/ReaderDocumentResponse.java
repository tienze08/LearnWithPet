package com.vocabpet.backend.dto.reader;

import java.time.LocalDateTime;

public record ReaderDocumentResponse(
        Long id,
        String title,
        String contentType,
        long sizeBytes,
        String extractedText,
        String basketJson,
        String highlightsJson,
        LocalDateTime updatedAt) {}
