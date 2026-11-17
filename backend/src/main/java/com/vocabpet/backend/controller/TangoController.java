package com.vocabpet.backend.controller;

import com.vocabpet.backend.dto.AuthRe.ErrorResponse;
import com.vocabpet.backend.dto.TangoRe.TangoRequests.*;
import com.vocabpet.backend.dto.TangoRe.TangoResponses.*;
import com.vocabpet.backend.entity.enums.JlptLevel;
import com.vocabpet.backend.entity.enums.TangoQuizMode;
import com.vocabpet.backend.entity.enums.TangoQuizScope;
import com.vocabpet.backend.exception.TangoBadRequestException;
import com.vocabpet.backend.exception.TangoConflictException;
import com.vocabpet.backend.exception.TangoNotFoundException;
import com.vocabpet.backend.service.TangoLearningService;
import com.vocabpet.backend.service.TangoLearningService.AttemptSubmission;
import com.vocabpet.backend.service.TangoProgressService;
import com.vocabpet.backend.service.TangoReadService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/japanese/tango")
@RequiredArgsConstructor
public class TangoController {

    private final TangoReadService tangoReadService;
    private final TangoLearningService tangoLearningService;
    private final TangoProgressService tangoProgressService;

    @GetMapping("/levels")
    public LevelsResponse getLevels() {
        return tangoReadService.getLevels();
    }

    @GetMapping("/lessons")
    public LessonsResponse getLessons(@RequestParam JlptLevel level) {
        return tangoReadService.getLessons(level);
    }

    @GetMapping("/lessons/{id}")
    public LessonDetail getLesson(@PathVariable Long id) {
        return tangoReadService.getLesson(id);
    }

    @GetMapping("/lessons/{id}/vocabularies")
    public LessonVocabulariesResponse getLessonVocabularies(@PathVariable Long id) {
        return tangoReadService.getLessonVocabularies(id);
    }

    @GetMapping("/vocabularies/{id}")
    public VocabularyDetail getVocabulary(@PathVariable Long id) {
        return tangoReadService.getVocabulary(id);
    }

    @PostMapping("/lessons/{id}/start")
    public ResponseEntity<StartResponse> start(@PathVariable Long id) {
        StartResponse response = tangoLearningService.start(id);
        return ResponseEntity.status(response.created() ? HttpStatus.CREATED : HttpStatus.OK).body(response);
    }

    @PostMapping("/lessons/{id}/study-progress")
    public StudyProgressResponse studyProgress(@PathVariable Long id,
                                               @Valid @RequestBody StudyProgressRequest request) {
        return tangoLearningService.studyProgress(id, request);
    }

    @GetMapping("/lessons/{id}/quiz")
    public QuizResponse quiz(@PathVariable Long id,
                             @RequestParam(defaultValue = "MIXED") TangoQuizMode mode,
                             @RequestParam(defaultValue = "ALL") TangoQuizScope scope) {
        return tangoLearningService.buildQuiz(id, mode, scope);
    }

    @PostMapping("/lessons/{id}/attempts")
    public ResponseEntity<AttemptResponse> submitAttempt(@PathVariable Long id,
                                                         @Valid @RequestBody AttemptRequest request) {
        AttemptSubmission submission = tangoLearningService.submitAttempt(id, request);
        return ResponseEntity.status(submission.created() ? HttpStatus.CREATED : HttpStatus.OK)
                .body(submission.response());
    }

    @GetMapping("/progress")
    public ProgressResponse progress(@RequestParam(required = false) JlptLevel level) {
        return tangoProgressService.getProgress(level);
    }

    @GetMapping("/progress/weak")
    public WeakResponse weak(@RequestParam(required = false) JlptLevel level,
                             @RequestParam(required = false) Integer limit) {
        return tangoProgressService.getWeak(level, limit);
    }

    @PutMapping("/vocabularies/{id}/favorite")
    public FavoriteToggleResponse favorite(@PathVariable Long id) {
        return tangoProgressService.setFavorite(id, true);
    }

    @DeleteMapping("/vocabularies/{id}/favorite")
    public FavoriteToggleResponse unfavorite(@PathVariable Long id) {
        return tangoProgressService.setFavorite(id, false);
    }

    @GetMapping("/favorites")
    public FavoritesResponse favorites(@RequestParam(defaultValue = "0") int page,
                                       @RequestParam(defaultValue = "20") int size) {
        return tangoProgressService.getFavorites(page, size);
    }

    @GetMapping("/search")
    public SearchResponse search(@RequestParam String q,
                                 @RequestParam(required = false) JlptLevel level,
                                 @RequestParam(required = false) String type) {
        return tangoProgressService.search(q, level, type);
    }

    @ExceptionHandler(TangoNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(TangoNotFoundException ex) {
        return error(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(TangoBadRequestException.class)
    public ResponseEntity<ErrorResponse> handleBadRequest(TangoBadRequestException ex) {
        return error(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(TangoConflictException.class)
    public ResponseEntity<ErrorResponse> handleConflict(TangoConflictException ex) {
        return error(HttpStatus.CONFLICT, ex.getMessage());
    }

    @ExceptionHandler({MethodArgumentNotValidException.class})
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        String detail = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(e -> e.getField() + " " + e.getDefaultMessage())
                .orElse("request body is invalid");
        return error(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED: " + detail);
    }

    @ExceptionHandler({MissingServletRequestParameterException.class, MethodArgumentTypeMismatchException.class})
    public ResponseEntity<ErrorResponse> handleBadParameter(Exception ex) {
        return error(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED: invalid or missing request parameter");
    }

    @ExceptionHandler({ObjectOptimisticLockingFailureException.class, DataIntegrityViolationException.class})
    public ResponseEntity<ErrorResponse> handleConcurrentUpdate(RuntimeException ex) {
        return error(HttpStatus.CONFLICT, "ATTEMPT_CONFLICT: concurrent update, retry with the same clientAttemptId");
    }

    private ResponseEntity<ErrorResponse> error(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(ErrorResponse.builder()
                .status(status.value())
                .message(message)
                .timestamp(LocalDateTime.now())
                .build());
    }
}
