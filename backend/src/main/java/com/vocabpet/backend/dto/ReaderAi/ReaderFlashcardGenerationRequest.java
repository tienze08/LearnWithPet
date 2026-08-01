package com.vocabpet.backend.dto.ReaderAi;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

/** Input received after a user highlights words in Reader. */
public record ReaderFlashcardGenerationRequest(
        @NotEmpty @Size(max = 30) List<@NotBlank @Size(max = 60) String> words,
        @NotBlank @Size(max = 8000) String context,
        @Size(max = 200) String sourceTitle) {
}
