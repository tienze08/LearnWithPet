package com.vocabpet.backend.service;

import com.vocabpet.backend.dto.ListeningRe.ListeningAttemptRequest;
import com.vocabpet.backend.dto.ListeningRe.ListeningResponses.*;
import com.vocabpet.backend.entity.ListeningAnswer;
import com.vocabpet.backend.entity.ListeningAttempt;
import com.vocabpet.backend.entity.User;
import com.vocabpet.backend.repository.ListeningAttemptRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.*;

/** Records listening runs. Deliberately touches no vocabulary, grammar, SRS, XP or Learning Path data. */
@Service
@RequiredArgsConstructor
public class ListeningService {

    private static final int WEAK_LIMIT = 10;

    private final ListeningAttemptRepository attempts;
    private final CurrentUserService currentUserService;

    /** Idempotent per user and clientAttemptId, so the client can retry after a network error. */
    @Transactional
    public Attempt record(ListeningAttemptRequest req) {
        User user = currentUserService.getCurrentUser();
        var existing = attempts.findByUserIdAndClientAttemptId(user.getId(), req.clientAttemptId());
        if (existing.isPresent()) return toResponse(existing.get(), false);

        if (!req.lessonId().startsWith(req.level().toLowerCase(Locale.ROOT) + "-"))
            throw badRequest("lessonId does not belong to level " + req.level());
        Set<String> seen = new HashSet<>();
        for (var a : req.answers()) {
            if (!a.questionId().startsWith(req.lessonId() + "/"))
                throw badRequest("question " + a.questionId() + " is not part of the lesson");
            if (!seen.add(a.questionId())) throw badRequest("question " + a.questionId() + " is answered twice");
        }

        List<ListeningAnswer> answers = new ArrayList<>(req.answers().stream()
                .map(a -> new ListeningAnswer(a.questionId(), a.type(), a.difficulty(), a.correct(), a.replays(),
                        join(a.words()), join(a.grammar())))
                .toList());
        ListeningAttempt saved = attempts.save(ListeningAttempt.builder()
                .user(user)
                .clientAttemptId(req.clientAttemptId())
                .lessonId(req.lessonId())
                .level(req.level())
                .mode(req.mode())
                .total(answers.size())
                .correct((int) answers.stream().filter(ListeningAnswer::isCorrect).count())
                .replays(answers.stream().mapToInt(ListeningAnswer::getReplays).sum())
                .durationSeconds(req.durationSeconds())
                .completedAt(Instant.now())
                .answers(answers)
                .build());
        return toResponse(saved, true);
    }

    // shortcut: aggregates the user's whole history in memory; store per-lesson summaries if histories grow large.
    @Transactional(readOnly = true)
    public Progress progress() {
        User user = currentUserService.getCurrentUser();
        Map<String, List<ListeningAttempt>> byLesson = new LinkedHashMap<>();
        Map<String, int[]> words = new HashMap<>();
        Map<String, int[]> grammar = new HashMap<>();
        for (ListeningAttempt a : attempts.findByUserIdOrderByCompletedAtAscIdAsc(user.getId())) {
            byLesson.computeIfAbsent(a.getLessonId(), k -> new ArrayList<>()).add(a);
            for (ListeningAnswer answer : a.getAnswers()) {
                count(words, answer.getWords(), answer.isCorrect());
                count(grammar, answer.getGrammar(), answer.isCorrect());
            }
        }
        List<LessonProgress> lessons = byLesson.values().stream().map(this::summarize).toList();
        return new Progress(lessons, weakest(words), weakest(grammar));
    }

    private LessonProgress summarize(List<ListeningAttempt> runs) {
        List<ListeningAttempt> full = runs.stream().filter(r -> "FULL".equals(r.getMode())).toList();
        // The latest answer wins: a question missed once and answered later is no longer a mistake to review.
        Map<String, Boolean> latest = new LinkedHashMap<>();
        runs.forEach(r -> r.getAnswers().forEach(a -> latest.put(a.getQuestionId(), a.isCorrect())));
        ListeningAttempt last = runs.getLast();
        return new LessonProgress(
                last.getLessonId(),
                last.getLevel(),
                full.size(),
                full.isEmpty() ? null : accuracy(full.getLast()),
                full.stream().map(ListeningService::accuracy).max(Double::compare).orElse(null),
                runs.stream().mapToInt(ListeningAttempt::getReplays).sum(),
                runs.stream().mapToInt(ListeningAttempt::getDurationSeconds).sum(),
                last.getCompletedAt(),
                latest.entrySet().stream().filter(e -> !e.getValue()).map(Map.Entry::getKey).toList());
    }

    private static void count(Map<String, int[]> into, String refs, boolean correct) {
        if (refs == null || refs.isEmpty()) return;
        for (String ref : refs.split(",")) {
            int[] c = into.computeIfAbsent(ref, k -> new int[2]);
            if (!correct) c[0]++;
            c[1]++;
        }
    }

    /** Refs missed at least half the time, most misses first. */
    private static List<WeakRef> weakest(Map<String, int[]> counts) {
        return counts.entrySet().stream()
                .filter(e -> e.getValue()[0] > 0 && e.getValue()[0] * 2 >= e.getValue()[1])
                .map(e -> new WeakRef(e.getKey(), e.getValue()[0], e.getValue()[1]))
                .sorted(Comparator.comparingInt(WeakRef::wrong).reversed().thenComparing(WeakRef::ref))
                .limit(WEAK_LIMIT)
                .toList();
    }

    private static String join(List<String> refs) {
        return refs == null || refs.isEmpty() ? null : String.join(",", new LinkedHashSet<>(refs));
    }

    private static double accuracy(ListeningAttempt a) {
        return (double) a.getCorrect() / a.getTotal();
    }

    private Attempt toResponse(ListeningAttempt a, boolean isNew) {
        return new Attempt(a.getId(), a.getLessonId(), a.getMode(), a.getTotal(), a.getCorrect(), accuracy(a),
                a.getReplays(), a.getDurationSeconds(), a.getCompletedAt(), isNew);
    }

    private static ResponseStatusException badRequest(String reason) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, reason);
    }
}
