package com.vocabpet.backend.exception;

public class NoMoreCardsException extends RuntimeException {
    public NoMoreCardsException(String message) {
        super(message);
    }
}