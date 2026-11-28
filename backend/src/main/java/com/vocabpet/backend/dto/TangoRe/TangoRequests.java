package com.vocabpet.backend.dto.TangoRe;

import com.vocabpet.backend.entity.enums.TangoQuizMode;
import com.vocabpet.backend.entity.enums.TangoQuizScope;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.util.List;

/** Request bodies for the Tango write API. Client-sent correctness fields are not part of these records. */
public final class TangoRequests {

    private TangoRequests() {
    }

    public record StudyProgressRequest(
            @NotNull @NotEmpty @Size(max = 50) List<@NotNull Long> vocabularyIds,
            @Min(1) Integer lastPosition) {}

    public record AttemptRequest(
            @NotBlank @Size(max = 64) String clientAttemptId,
            @NotNull TangoQuizMode mode,
            @NotNull TangoQuizScope scope,
            @Min(0) @Max(86400) Integer durationSeconds,
            @NotEmpty @Size(max = 100) @Valid List<AnswerRequest> answers) {}

    public record AnswerRequest(
            @NotNull Long vocabularyId,
            @NotNull TangoQuizMode mode,
            @Size(max = 255) String answer) {}
}
