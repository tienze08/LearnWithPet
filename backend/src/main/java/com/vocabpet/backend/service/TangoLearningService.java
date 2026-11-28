package com.vocabpet.backend.service;

import com.vocabpet.backend.config.TangoProperties;
import com.vocabpet.backend.dto.TangoRe.TangoRequests.*;
import com.vocabpet.backend.dto.TangoRe.TangoResponses.*;
import com.vocabpet.backend.entity.*;
import com.vocabpet.backend.entity.enums.LearningSource;
import com.vocabpet.backend.entity.enums.Rating;
import com.vocabpet.backend.entity.enums.TangoLessonStatus;
import com.vocabpet.backend.entity.enums.TangoQuizMode;
import com.vocabpet.backend.entity.enums.TangoQuizScope;
import com.vocabpet.backend.entity.enums.TangoVocabularyStatus;
import com.vocabpet.backend.exception.TangoBadRequestException;
import com.vocabpet.backend.exception.TangoConflictException;
import com.vocabpet.backend.exception.TangoNotFoundException;
import com.vocabpet.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/** Write-side Tango logic: start, study progress, quiz building and attempt grading. */
@Service
@RequiredArgsConstructor
public class TangoLearningService {

    private final CurrentUserService currentUserService;
    private final TangoLessonRepository lessonRepository;
    private final TangoLessonVocabularyRepository lessonVocabularyRepository;
    private final UserTangoLessonProgressRepository lessonProgressRepository;
    private final UserTangoVocabularyProgressRepository vocabularyProgressRepository;
    private final TangoQuizAttemptRepository attemptRepository;
    private final TangoQuizAnswerRepository answerRepository;
    private final TangoStatusCalculator statusCalculator;
    private final TangoAnswerNormalizer normalizer;
    private final TangoProperties properties;
    private final LearningEngineService learningEngine;
    private final Random random = new Random();

    @Transactional
    public StartResponse start(Long lessonId) {
        User user = currentUserService.getCurrentUser();
        TangoLesson lesson = publishedLesson(lessonId);
        Optional<UserTangoLessonProgress> existing =
                lessonProgressRepository.findByUserIdAndLessonId(user.getId(), lessonId);
        if (existing.isPresent()) {
            return toStart(existing.get(), false);
        }
        UserTangoLessonProgress lp = lessonProgressRepository.save(UserTangoLessonProgress.builder()
                .user(user)
                .lesson(lesson)
                .status(TangoLessonStatus.IN_PROGRESS)
                .startedAt(LocalDateTime.now())
                .build());
        return toStart(lp, true);
    }

    @Transactional
    public StudyProgressResponse studyProgress(Long lessonId, StudyProgressRequest request) {
        User user = currentUserService.getCurrentUser();
        TangoLesson lesson = publishedLesson(lessonId);
        List<TangoLessonVocabulary> links = lessonVocabularyRepository.findByLessonIdOrderByPositionAsc(lessonId);
        Map<Long, TangoLessonVocabulary> linkByVocab = linkByVocabulary(links);

        Set<Long> requested = new LinkedHashSet<>(request.vocabularyIds());
        if (requested.size() != request.vocabularyIds().size()) {
            throw new TangoBadRequestException("vocabularyIds must not contain duplicates");
        }
        for (Long vocabularyId : requested) {
            if (!linkByVocab.containsKey(vocabularyId)) {
                throw new TangoBadRequestException("Vocabulary " + vocabularyId + " is not in lesson " + lessonId);
            }
        }

        LocalDateTime now = LocalDateTime.now();
        Map<Long, UserTangoVocabularyProgress> progress = progressByVocabulary(user.getId(), linkByVocab.keySet());
        int newlyViewed = 0;
        for (Long vocabularyId : requested) {
            UserTangoVocabularyProgress p = progress.computeIfAbsent(vocabularyId, id ->
                    vocabularyProgressRepository.save(UserTangoVocabularyProgress.builder()
                            .user(user)
                            .vocabulary(linkByVocab.get(id).getVocabulary())
                            .build()));
            if (p.getViewedAt() == null) {
                p.setViewedAt(now);
                newlyViewed++;
                learningEngine.recordSeen(user, linkByVocab.get(vocabularyId).getVocabulary(), LearningSource.TANGO);
            }
        }

        UserTangoLessonProgress lp = getOrStartLessonProgress(user, lesson, now);
        lp.setLastStudiedAt(now);
        if (request.lastPosition() != null) {
            lp.setLastPosition(request.lastPosition());
        }
        refreshCompletion(lp, links, progress, now);

        int required = (int) links.stream().filter(TangoLessonVocabulary::isRequired).count();
        int viewed = (int) links.stream()
                .filter(TangoLessonVocabulary::isRequired)
                .filter(lv -> isViewed(progress.get(lv.getVocabulary().getId())))
                .count();
        return new StudyProgressResponse(lessonId, viewed, required, lp.getStatus().name(), newlyViewed);
    }

    @Transactional(readOnly = true)
    public QuizResponse buildQuiz(Long lessonId, TangoQuizMode mode, TangoQuizScope scope) {
        User user = currentUserService.getCurrentUser();
        publishedLesson(lessonId);
        List<TangoLessonVocabulary> required = lessonVocabularyRepository.findByLessonIdOrderByPositionAsc(lessonId)
                .stream()
                .filter(TangoLessonVocabulary::isRequired)
                .toList();
        if (scope == TangoQuizScope.ALL && required.isEmpty()) {
            throw new TangoConflictException("LESSON_HAS_NO_REQUIRED_WORDS: lesson has no required words");
        }

        if (scope == TangoQuizScope.MISTAKES) {
            Map<Long, UserTangoVocabularyProgress> progress = progressByVocabulary(user.getId(),
                    required.stream().map(lv -> lv.getVocabulary().getId()).toList());
            required = required.stream()
                    .filter(lv -> {
                        UserTangoVocabularyProgress p = progress.get(lv.getVocabulary().getId());
                        return p != null && p.getStatus() == TangoVocabularyStatus.NEED_REVIEW;
                    })
                    .toList();
        }

        List<QuizQuestion> questions = new ArrayList<>(required.stream().map(lv -> {
            TangoVocabulary v = lv.getVocabulary();
            TangoQuizMode questionMode = mode != TangoQuizMode.MIXED ? mode
                    : (random.nextBoolean() ? TangoQuizMode.JP_TO_MEANING : TangoQuizMode.VI_TO_JP);
            QuizPrompt prompt = questionMode == TangoQuizMode.JP_TO_MEANING
                    ? new QuizPrompt(v.getExpression() != null ? v.getExpression() : v.getKana(),
                    v.getExpression() != null ? v.getKana() : null)
                    : new QuizPrompt(primaryMeaning(v), null);
            return new QuizQuestion(v.getId(), questionMode, prompt, "TEXT");
        }).toList());
        Collections.shuffle(questions, random);
        return new QuizResponse(lessonId, mode, scope, questions.size(), questions);
    }

    @Transactional
    public AttemptSubmission submitAttempt(Long lessonId, AttemptRequest request) {
        User user = currentUserService.getCurrentUser();
        TangoLesson lesson = publishedLesson(lessonId);

        Optional<TangoQuizAttempt> replay =
                attemptRepository.findByUserIdAndClientAttemptId(user.getId(), request.clientAttemptId());
        if (replay.isPresent()) {
            TangoQuizAttempt existing = replay.get();
            if (!existing.getLesson().getId().equals(lessonId)) {
                throw new TangoConflictException("clientAttemptId was already used for another lesson");
            }
            return new AttemptSubmission(buildAttemptResponse(existing, true,
                    lessonStatusOf(user, lesson)), false);
        }

        validateAnswerModes(request);
        Set<Long> seen = new HashSet<>();
        for (AnswerRequest answer : request.answers()) {
            if (!seen.add(answer.vocabularyId())) {
                throw new TangoBadRequestException("Vocabulary " + answer.vocabularyId() + " answered twice");
            }
        }

        List<TangoLessonVocabulary> links = lessonVocabularyRepository.findByLessonIdOrderByPositionAsc(lessonId);
        Map<Long, TangoLessonVocabulary> requiredLinks = links.stream()
                .filter(TangoLessonVocabulary::isRequired)
                .collect(Collectors.toMap(lv -> lv.getVocabulary().getId(), lv -> lv));
        Map<Long, UserTangoVocabularyProgress> progress =
                progressByVocabulary(user.getId(), seen);

        for (AnswerRequest answer : request.answers()) {
            if (!requiredLinks.containsKey(answer.vocabularyId())) {
                throw new TangoBadRequestException("ANSWER_NOT_IN_LESSON: vocabulary "
                        + answer.vocabularyId() + " is not a required word of lesson " + lessonId);
            }
            if (request.scope() == TangoQuizScope.MISTAKES) {
                UserTangoVocabularyProgress p = progress.get(answer.vocabularyId());
                if (p == null || p.getStatus() != TangoVocabularyStatus.NEED_REVIEW) {
                    throw new TangoBadRequestException("ANSWER_NOT_IN_LESSON: vocabulary "
                            + answer.vocabularyId() + " is not in the mistakes set");
                }
            }
        }

        LocalDateTime now = LocalDateTime.now();
        int total = request.answers().size();
        List<Graded> graded = request.answers().stream().map(answer -> {
            TangoVocabulary v = requiredLinks.get(answer.vocabularyId()).getVocabulary();
            String raw = answer.answer() == null ? "" : answer.answer();
            String normalized = answer.mode() == TangoQuizMode.VI_TO_JP
                    ? normalizer.normalizeJapanese(raw)
                    : normalizer.normalizeMeaning(raw, properties.answer().ignoreVietnameseDiacritics());
            return new Graded(v, answer.mode(), raw, normalized, isCorrect(v, answer.mode(), normalized));
        }).toList();

        int correct = (int) graded.stream().filter(Graded::correct).count();
        double accuracy = roundAccuracy(total == 0 ? 0 : (double) correct / total);
        boolean passed = request.scope() == TangoQuizScope.ALL
                && accuracy >= properties.lesson().quizPassAccuracy();

        UserTangoLessonProgress lp = getOrStartLessonProgress(user, lesson, now);
        TangoQuizAttempt attempt = attemptRepository.save(TangoQuizAttempt.builder()
                .user(user)
                .lesson(lesson)
                .clientAttemptId(request.clientAttemptId())
                .mode(request.mode())
                .scope(request.scope())
                .totalQuestions(total)
                .correctCount(correct)
                .incorrectCount(total - correct)
                .accuracy(accuracy)
                .passed(passed)
                .durationSeconds(request.durationSeconds())
                .submittedAt(now)
                .build());
        answerRepository.saveAll(graded.stream().map(g -> TangoQuizAnswer.builder()
                .attempt(attempt)
                .vocabulary(g.vocabulary())
                .mode(g.mode())
                .submittedAnswer(g.raw())
                .normalizedAnswer(g.normalized())
                .correct(g.correct())
                .build()).toList());

        for (Graded g : graded) {
            UserTangoVocabularyProgress p = progress.computeIfAbsent(g.vocabulary().getId(), id ->
                    vocabularyProgressRepository.save(UserTangoVocabularyProgress.builder()
                            .user(user)
                            .vocabulary(g.vocabulary())
                            .build()));
            p.setAnsweredCount(p.getAnsweredCount() + 1);
            if (g.correct()) p.setCorrectCount(p.getCorrectCount() + 1);
            else p.setIncorrectCount(p.getIncorrectCount() + 1);
            p.setLastAnsweredAt(now);
            learningEngine.record(user, null, g.vocabulary(), LearningSource.QUIZ,
                    g.correct() ? Rating.GOOD : Rating.AGAIN);
            TangoVocabularyStatus previous = p.getStatus();
            p.setStatus(statusCalculator.calculate(p.getAnsweredCount(), p.getCorrectCount()));
            if (p.getStatus() == TangoVocabularyStatus.MASTERED && previous != TangoVocabularyStatus.MASTERED) {
                p.setMasteredAt(now);
            }
        }

        lp.setLastStudiedAt(now);
        if (request.scope() == TangoQuizScope.ALL) {
            lp.setBestQuizAccuracy(lp.getBestQuizAccuracy() == null
                    ? accuracy : Math.max(lp.getBestQuizAccuracy(), accuracy));
            if (passed) lp.setQuizPassed(true);
        }
        refreshCompletion(lp, links, progressByVocabulary(user.getId(), requiredLinks.keySet()), now);

        return new AttemptSubmission(buildAttemptResponse(attempt, false, lp.getStatus().name()), true);
    }

    @Transactional(readOnly = true)
    public Set<Long> vocabularyIdsOfLesson(Long lessonId) {
        return lessonVocabularyRepository.findByLessonIdOrderByPositionAsc(lessonId).stream()
                .map(lv -> lv.getVocabulary().getId())
                .collect(Collectors.toSet());
    }

    /** Result of a submit: the response plus whether it was newly created (controls HTTP 201 vs 200). */
    public record AttemptSubmission(AttemptResponse response, boolean created) {}

    private record Graded(TangoVocabulary vocabulary, TangoQuizMode mode, String raw, String normalized,
                          boolean correct) {}

    private void validateAnswerModes(AttemptRequest request) {
        for (AnswerRequest answer : request.answers()) {
            if (answer.mode() == TangoQuizMode.MIXED) {
                throw new TangoBadRequestException("answer mode must be JP_TO_MEANING or VI_TO_JP");
            }
            if (request.mode() != TangoQuizMode.MIXED && answer.mode() != request.mode()) {
                throw new TangoBadRequestException("answer mode does not match quiz mode");
            }
        }
    }

    private boolean isCorrect(TangoVocabulary v, TangoQuizMode mode, String normalized) {
        if (normalized.isEmpty()) return false;
        if (mode == TangoQuizMode.VI_TO_JP) {
            return normalized.equals(normalizer.normalizeJapanese(v.getKana()))
                    || (v.getExpression() != null && normalized.equals(normalizer.normalizeJapanese(v.getExpression())));
        }
        boolean ignore = properties.answer().ignoreVietnameseDiacritics();
        return v.getMeanings().stream()
                .anyMatch(m -> normalized.equals(normalizer.normalizeMeaning(m.getMeaning(), ignore)));
    }

    private AttemptResponse buildAttemptResponse(TangoQuizAttempt attempt, boolean replayed, String lessonStatus) {
        List<AttemptResult> results = answerRepository.findByAttemptIdOrderByIdAsc(attempt.getId()).stream()
                .map(a -> {
                    TangoVocabulary v = a.getVocabulary();
                    List<String> correctAnswers = a.getMode() == TangoQuizMode.VI_TO_JP
                            ? (v.getExpression() == null ? List.of(v.getKana()) : List.of(v.getKana(), v.getExpression()))
                            : v.getMeanings().stream().map(TangoVocabularyMeaning::getMeaning).toList();
                    return new AttemptResult(v.getId(), a.getMode(), a.isCorrect(), a.getSubmittedAnswer(),
                            correctAnswers);
                })
                .toList();
        return new AttemptResponse(attempt.getId(), replayed, attempt.getLesson().getId(), attempt.getMode(),
                attempt.getScope(), attempt.getTotalQuestions(), attempt.getCorrectCount(),
                attempt.getIncorrectCount(), attempt.getAccuracy(), attempt.isPassed(), lessonStatus, results,
                attempt.getSubmittedAt());
    }

    private void refreshCompletion(UserTangoLessonProgress lp, List<TangoLessonVocabulary> links,
                                   Map<Long, UserTangoVocabularyProgress> progress, LocalDateTime now) {
        if (lp.getStatus() == TangoLessonStatus.COMPLETED || !lp.isQuizPassed()) return;
        boolean allViewed = links.stream()
                .filter(TangoLessonVocabulary::isRequired)
                .allMatch(lv -> isViewed(progress.get(lv.getVocabulary().getId())));
        if (allViewed) {
            lp.setStatus(TangoLessonStatus.COMPLETED);
            lp.setCompletedAt(now);
        }
    }

    private UserTangoLessonProgress getOrStartLessonProgress(User user, TangoLesson lesson, LocalDateTime now) {
        return lessonProgressRepository.findByUserIdAndLessonId(user.getId(), lesson.getId())
                .orElseGet(() -> lessonProgressRepository.save(UserTangoLessonProgress.builder()
                        .user(user)
                        .lesson(lesson)
                        .status(TangoLessonStatus.IN_PROGRESS)
                        .startedAt(now)
                        .build()));
    }

    private String lessonStatusOf(User user, TangoLesson lesson) {
        return lessonProgressRepository.findByUserIdAndLessonId(user.getId(), lesson.getId())
                .map(lp -> lp.getStatus().name())
                .orElse("NOT_STARTED");
    }

    private TangoLesson publishedLesson(Long lessonId) {
        return lessonRepository.findByIdAndPublishedTrue(lessonId)
                .orElseThrow(() -> new TangoNotFoundException("Lesson not found"));
    }

    private Map<Long, UserTangoVocabularyProgress> progressByVocabulary(Long userId, Collection<Long> ids) {
        if (ids.isEmpty()) return new HashMap<>();
        return vocabularyProgressRepository.findByUserIdAndVocabularyIdIn(userId, ids).stream()
                .collect(Collectors.toMap(p -> p.getVocabulary().getId(), p -> p, (a, b) -> a, HashMap::new));
    }

    private static Map<Long, TangoLessonVocabulary> linkByVocabulary(List<TangoLessonVocabulary> links) {
        return links.stream().collect(Collectors.toMap(lv -> lv.getVocabulary().getId(), lv -> lv));
    }

    private static StartResponse toStart(UserTangoLessonProgress lp, boolean created) {
        return new StartResponse(lp.getLesson().getId(), lp.getStatus().name(), lp.getStartedAt(),
                lp.getLastPosition(), created);
    }

    private static boolean isViewed(UserTangoVocabularyProgress p) {
        return p != null && p.getViewedAt() != null;
    }

    private static double roundAccuracy(double value) {
        return Math.round(value * 10000) / 10000.0;
    }

    private static String primaryMeaning(TangoVocabulary v) {
        return v.getMeanings().stream()
                .filter(TangoVocabularyMeaning::isPrimaryMeaning)
                .findFirst()
                .or(() -> v.getMeanings().stream().findFirst())
                .map(TangoVocabularyMeaning::getMeaning)
                .orElse("");
    }
}
