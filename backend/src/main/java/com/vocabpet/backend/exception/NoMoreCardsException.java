package com.vocabpet.backend.exception;

public class NoMoreCardsException extends RuntimeException {

    private static final long serialVersionUID = 1L;
    public NoMoreCardsException(String message) {
        super(message);
    }
}