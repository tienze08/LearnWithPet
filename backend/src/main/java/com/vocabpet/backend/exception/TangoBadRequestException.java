package com.vocabpet.backend.exception;

public class TangoBadRequestException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    public TangoBadRequestException(String message) {
        super(message);
    }
}
