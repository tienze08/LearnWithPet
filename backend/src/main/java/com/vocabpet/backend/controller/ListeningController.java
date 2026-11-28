package com.vocabpet.backend.controller;

import com.vocabpet.backend.dto.ListeningRe.ListeningAttemptRequest;
import com.vocabpet.backend.dto.ListeningRe.ListeningResponses.Attempt;
import com.vocabpet.backend.dto.ListeningRe.ListeningResponses.Progress;
import com.vocabpet.backend.service.ListeningService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/japanese/listening")
@RequiredArgsConstructor
public class ListeningController {

    private final ListeningService listeningService;

    /** 201 when stored, 200 when this clientAttemptId was already stored. */
    @PostMapping("/attempts")
    public ResponseEntity<Attempt> record(@Valid @RequestBody ListeningAttemptRequest request) {
        Attempt attempt = listeningService.record(request);
        return ResponseEntity.status(attempt.isNew() ? HttpStatus.CREATED : HttpStatus.OK).body(attempt);
    }

    @GetMapping("/progress")
    public Progress progress() {
        return listeningService.progress();
    }
}
