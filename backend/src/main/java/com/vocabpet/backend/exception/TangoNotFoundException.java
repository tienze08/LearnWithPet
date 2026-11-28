package com.vocabpet.backend.exception;

public class TangoNotFoundException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    public TangoNotFoundException(String message) {
        super(message);
    }
}
