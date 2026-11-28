package com.vocabpet.backend.service;

import com.vocabpet.backend.dto.ShadowingRe.ShadowingResponses.*;
import com.vocabpet.backend.dto.ShadowingRe.ShadowingSessionRequest;
import com.vocabpet.backend.entity.ShadowingSentenceResult;
import com.vocabpet.backend.entity.ShadowingSession;
import com.vocabpet.backend.entity.User;
import com.vocabpet.backend.repository.ShadowingSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.*;

/** Records shadowing runs. Deliberately touches no listening, vocabulary, grammar, SRS, XP or Learning Path data. */
@Service
@RequiredArgsConstructor
public class ShadowingService {

    private static final int RECENT = 100;
    /** Below this share of recognised content a sentence counts as a difficulty. */
    private static final int LOW_MATCH = 70;

    private final ShadowingSessionRepository sessions;
    private final CurrentUserService currentUserService;

    /** Idempotent per user and clientSessionId, so the client can retry after a network error. */
    @Transactional
    public Session record(ShadowingSessionRequest req) {
        User user = currentUserService.getCurrentUser();
        var existing = sessions.findByUserIdAndClientSessionId(user.getId(), req.clientSessionId());
        if (existing.isPresent()) return toResponse(existing.get(), false);

        if (!req.unitId().startsWith(req.level().toLowerCase(Locale.ROOT) + "-"))
            throw badRequest("unitId does not belong to level " + req.level());
        if (req.sentences().size() > req.unitSentences())
            throw badRequest("more sentences than the unit has");
        Set<String> keys = new HashSet<>();
        List<ShadowingSentenceResult> results = new ArrayList<>();
        for (var s : req.sentences()) {
            if (!keys.add(s.sentenceKey())) throw badRequest("sentence " + s.sentenceKey() + " is listed twice");
            Set<String> passed = s.passed() == null ? Set.of() : new LinkedHashSet<>(s.passed());
            Set<String> missed = s.missed() == null ? Set.of() : new LinkedHashSet<>(s.missed());
            if (passed.stream().anyMatch(missed::contains))
                throw badRequest("a check cannot be both passed and missed");
            results.add(new ShadowingSentenceResult(s.sentenceKey(), s.recordings(), join(passed), join(missed),
                    s.contentMatch()));
        }

        ShadowingSession saved = sessions.save(ShadowingSession.builder()
                .user(user)
                .clientSessionId(req.clientSessionId())
                .unitId(req.unitId())
                .level(req.level())
                .mode(req.mode())
                .sentences(results.size())
                .recordings(results.stream().mapToInt(ShadowingSentenceResult::getRecordings).sum())
                .completed(results.size() == req.unitSentences())
                .durationSeconds(req.durationSeconds())
                .completedAt(Instant.now())
                .results(results)
                .build());
        return toResponse(saved, true);
    }

    // shortcut: aggregates the user's whole history in memory; store per-sentence summaries if histories grow large.
    @Transactional(readOnly = true)
    public Progress progress() {
        User user = currentUserService.getCurrentUser();
        List<ShadowingSession> all = sessions.findByUserIdOrderByCompletedAtAscIdAsc(user.getId());
        Map<String, ShadowingSentenceResult> latest = new LinkedHashMap<>();
        Map<String, String> unitOf = new HashMap<>();
        Map<String, Integer> timesMissed = new HashMap<>();
        Map<String, int[]> checks = new TreeMap<>();
        Set<String> completed = new LinkedHashSet<>();
        for (ShadowingSession session : all) {
            if (session.isCompleted()) completed.add(session.getUnitId());
            for (ShadowingSentenceResult r : session.getResults()) {
                // A run without any assessment says nothing new about a sentence's difficulties.
                boolean assessed = r.getPassed() != null || r.getMissed() != null || r.getContentMatch() != null;
                if (assessed || !latest.containsKey(r.getSentenceKey())) {
                    latest.put(r.getSentenceKey(), r);
                    unitOf.put(r.getSentenceKey(), session.getUnitId());
                }
                if (isDifficult(r)) timesMissed.merge(r.getSentenceKey(), 1, Integer::sum);
                for (String c : split(r.getPassed())) checks.computeIfAbsent(c, k -> new int[2])[1]++;
                for (String c : split(r.getMissed())) {
                    int[] n = checks.computeIfAbsent(c, k -> new int[2]);
                    n[0]++;
                    n[1]++;
                }
            }
        }
        List<Difficulty> difficulties = latest.values().stream()
                .filter(ShadowingService::isDifficult)
                .map(r -> new Difficulty(r.getSentenceKey(), unitOf.get(r.getSentenceKey()), split(r.getMissed()),
                        r.getContentMatch(), timesMissed.getOrDefault(r.getSentenceKey(), 0)))
                .sorted(Comparator.comparingInt(Difficulty::timesMissed).reversed()
                        .thenComparing(Difficulty::sentenceKey))
                .toList();
        return new Progress(
                latest.size(),
                all.stream().mapToInt(ShadowingSession::getRecordings).sum(),
                all.stream().mapToInt(ShadowingSession::getDurationSeconds).sum(),
                List.copyOf(completed),
                all.reversed().stream().limit(RECENT).map(s -> toResponse(s, false)).toList(),
                difficulties,
                checks.entrySet().stream()
                        .map(e -> new CheckCount(e.getKey(), e.getValue()[0], e.getValue()[1]))
                        .toList());
    }

    private static boolean isDifficult(ShadowingSentenceResult r) {
        return r.getMissed() != null || (r.getContentMatch() != null && r.getContentMatch() < LOW_MATCH);
    }

    private static String join(Set<String> values) {
        return values.isEmpty() ? null : String.join(",", values);
    }

    private static List<String> split(String values) {
        return values == null || values.isEmpty() ? List.of() : List.of(values.split(","));
    }

    private Session toResponse(ShadowingSession s, boolean isNew) {
        return new Session(s.getId(), s.getUnitId(), s.getLevel(), s.getMode(), s.getSentences(), s.getRecordings(),
                s.isCompleted(), s.getDurationSeconds(), s.getCompletedAt(), isNew);
    }

    private static ResponseStatusException badRequest(String reason) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, reason);
    }
}
