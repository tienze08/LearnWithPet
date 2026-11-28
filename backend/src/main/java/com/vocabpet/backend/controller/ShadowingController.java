package com.vocabpet.backend.controller;

import com.vocabpet.backend.dto.ShadowingRe.ShadowingResponses.Progress;
import com.vocabpet.backend.dto.ShadowingRe.ShadowingResponses.Session;
import com.vocabpet.backend.dto.ShadowingRe.ShadowingSessionRequest;
import com.vocabpet.backend.service.ShadowingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/japanese/shadowing")
@RequiredArgsConstructor
public class ShadowingController {

    private final ShadowingService shadowingService;

    /** 201 when stored, 200 when this clientSessionId was already stored. */
    @PostMapping("/sessions")
    public ResponseEntity<Session> record(@Valid @RequestBody ShadowingSessionRequest request) {
        Session session = shadowingService.record(request);
        return ResponseEntity.status(session.isNew() ? HttpStatus.CREATED : HttpStatus.OK).body(session);
    }

    @GetMapping("/progress")
    public Progress progress() {
        return shadowingService.progress();
    }
}
