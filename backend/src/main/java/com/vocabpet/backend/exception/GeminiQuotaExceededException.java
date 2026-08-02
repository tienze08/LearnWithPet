package com.vocabpet.backend.exception;

public class GeminiQuotaExceededException extends RuntimeException {
    private final int retryAfterSeconds;

    public GeminiQuotaExceededException(int retryAfterSeconds) {
        super("VocaPet AI has reached its Gemini request limit. Please try again shortly.");
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public int getRetryAfterSeconds() {
        return retryAfterSeconds;
    }
}
