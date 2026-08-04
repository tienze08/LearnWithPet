package com.vocabpet.backend.controller;

import com.vocabpet.backend.dto.companion.CompanionEventRequest;
import com.vocabpet.backend.dto.companion.CompanionPreferencesRequest;
import com.vocabpet.backend.dto.companion.CompanionStateResponse;
import com.vocabpet.backend.service.CompanionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/companion")
@RequiredArgsConstructor
public class CompanionController {
    private final CompanionService companionService;

    @GetMapping("/state")
    public CompanionStateResponse state() {
        return companionService.getState();
    }

    @PostMapping("/events")
    public CompanionStateResponse event(@Valid @RequestBody CompanionEventRequest request) {
        return companionService.recordEvent(request);
    }

    @PatchMapping("/preferences")
    public CompanionStateResponse preferences(@Valid @RequestBody CompanionPreferencesRequest request) {
        return companionService.updatePreferences(request);
    }
}
