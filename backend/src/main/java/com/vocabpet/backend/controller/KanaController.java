package com.vocabpet.backend.controller;

import com.vocabpet.backend.dto.KanaRe.*;
import com.vocabpet.backend.service.KanaProgressService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/japanese/kana")
@RequiredArgsConstructor
public class KanaController {

    private final KanaProgressService kanaProgressService;

    @PostMapping("/attempts")
    @ResponseStatus(HttpStatus.CREATED)
    public KanaAttemptResponse recordAttempt(@Valid @RequestBody KanaAttemptRequest request) {
        return kanaProgressService.recordAttempt(request);
    }

    @GetMapping("/progress")
    public KanaProgressResponse getProgress() {
        return kanaProgressService.getProgress();
    }

    @GetMapping("/progress/weak")
    public List<WeakKanaItem> getWeakKana(
            @RequestParam String script,
            @RequestParam(required = false) String section,
            @RequestParam(defaultValue = "20") int limit) {
        return kanaProgressService.getWeakKana(script, section, limit);
    }

    @GetMapping("/progress/items")
    public List<KanaItemProgressResponse> getItems(@RequestParam String script) {
        return kanaProgressService.getItems(script);
    }
}
