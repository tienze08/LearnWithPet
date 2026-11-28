package com.vocabpet.backend.exception;

public class TangoConflictException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    public TangoConflictException(String message) {
        super(message);
    }
}
