package com.vocabpet.backend.dto.KanaRe;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.util.List;

@Data
public class KanaAttemptRequest {

    private String clientAttemptId;

    @NotBlank
    @Pattern(regexp = "hiragana|katakana", message = "script must be 'hiragana' or 'katakana'")
    private String script;

    @NotBlank
    @Pattern(regexp = "basic|dakuten|handakuten|yoon", message = "section must be 'basic', 'dakuten', 'handakuten', or 'yoon'")
    private String section;

    @Min(0)
    private int score;

    @Min(1)
    private int total;

    private Integer durationSeconds;

    @NotEmpty
    @Valid
    private List<KanaItemResult> answers;
}
