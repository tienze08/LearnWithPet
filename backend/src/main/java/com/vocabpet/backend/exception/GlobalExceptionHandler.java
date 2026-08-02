package com.vocabpet.backend.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.vocabpet.backend.dto.AuthRe.ErrorResponse;

import java.time.LocalDateTime;

@RestControllerAdvice
public class GlobalExceptionHandler {

        @ExceptionHandler(EmailAlreadyExistsException.class)
        public ResponseEntity<ErrorResponse> handleEmailExists(
                        EmailAlreadyExistsException ex) {

                return ResponseEntity.status(HttpStatus.CONFLICT)
                                .body(
                                                ErrorResponse.builder()
                                                                .status(409)
                                                                .message(ex.getMessage())
                                                                .timestamp(LocalDateTime.now())
                                                                .build());
        }

        @ExceptionHandler(InvalidCredentialsException.class)
        public ResponseEntity<ErrorResponse> handleInvalidCredentials(
                        InvalidCredentialsException ex) {

                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                                .body(
                                                ErrorResponse.builder()
                                                                .status(401)
                                                                .message(ex.getMessage())
                                                                .timestamp(LocalDateTime.now())
                                                                .build());
        }

        @ExceptionHandler(NoMoreCardsException.class)
        public ResponseEntity<Void> handle(NoMoreCardsException ex) {
                return ResponseEntity.noContent().build();
        }

        @ExceptionHandler(GeminiQuotaExceededException.class)
        public ResponseEntity<ErrorResponse> handleGeminiQuota(GeminiQuotaExceededException ex) {
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                                .header(HttpHeaders.RETRY_AFTER, String.valueOf(ex.getRetryAfterSeconds()))
                                .body(ErrorResponse.builder()
                                                .status(HttpStatus.TOO_MANY_REQUESTS.value())
                                                .message(ex.getMessage() + " Try again in about " + ex.getRetryAfterSeconds() + " seconds.")
                                                .timestamp(LocalDateTime.now())
                                                .build());
        }
}
