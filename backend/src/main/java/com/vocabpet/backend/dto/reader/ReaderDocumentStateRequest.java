package com.vocabpet.backend.dto.reader;

import jakarta.validation.constraints.Size;

public record ReaderDocumentStateRequest(
        @Size(max = 100000) String basketJson,
        @Size(max = 100000) String highlightsJson) {}
