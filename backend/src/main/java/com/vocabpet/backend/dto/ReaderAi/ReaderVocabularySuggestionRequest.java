package com.vocabpet.backend.dto.ReaderAi;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ReaderVocabularySuggestionRequest(
        @NotBlank @Size(max = 8000) String context,
        @Size(max = 200) String sourceTitle) {
}
