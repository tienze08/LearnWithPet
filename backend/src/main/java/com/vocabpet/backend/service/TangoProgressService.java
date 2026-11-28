package com.vocabpet.backend.service;

import com.vocabpet.backend.dto.TangoRe.TangoResponses.*;
import com.vocabpet.backend.entity.*;
import com.vocabpet.backend.entity.enums.JlptLevel;
import com.vocabpet.backend.entity.enums.TangoLessonStatus;
import com.vocabpet.backend.exception.TangoBadRequestException;
import com.vocabpet.backend.exception.TangoNotFoundException;
import com.vocabpet.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Progress overview, weak words, favorites and search. Reads only, plus
 * favorite toggles.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TangoProgressService {

    private static final int MAX_LIMIT = 100;
    private static final int SEARCH_LIMIT = 20;

    private final CurrentUserService currentUserService;
    private final TangoLessonRepository lessonRepository;
    private final TangoLessonVocabularyRepository lessonVocabularyRepository;
    private final TangoVocabularyRepository vocabularyRepository;
    private final UserTangoLessonProgressRepository lessonProgressRepository;
    private final UserTangoVocabularyProgressRepository vocabularyProgressRepository;
    private final UserTangoFavoriteRepository favoriteRepository;
    private final TangoQuizAttemptRepository attemptRepository;

    public ProgressResponse getProgress(JlptLevel level) {
        Long userId = currentUserService.getCurrentUser().getId();
        Scope scope = scopeOf(level);

        Map<Long, UserTangoVocabularyProgress> vocabProgress = vocabProgressFor(userId, scope.vocabularyIds());
        Map<Long, UserTangoLessonProgress> lessonProgress = lessonProgressFor(userId, scope.lessonIds());

        int learning = 0, mastered = 0, needReview = 0;
        for (Long id : scope.vocabularyIds()) {
            UserTangoVocabularyProgress p = vocabProgress.get(id);
            if (p == null)
                continue;
            switch (p.getStatus()) {
                case LEARNING -> learning++;
                case MASTERED -> mastered++;
                case NEED_REVIEW -> needReview++;
                default -> {
                }
            }
        }
        int total = scope.vocabularyIds().size();
        WordCounts words = new WordCounts(total - learning - mastered - needReview, learning, mastered,
                needReview, total);

        int inProgress = 0, completed = 0;
        for (Long id : scope.lessonIds()) {
            UserTangoLessonProgress lp = lessonProgress.get(id);
            if (lp == null)
                continue;
            if (lp.getStatus() == TangoLessonStatus.COMPLETED)
                completed++;
            else
                inProgress++;
        }
        int lessonTotal = scope.lessonIds().size();
        LessonCounts lessons = new LessonCounts(lessonTotal - inProgress - completed, inProgress, completed,
                lessonTotal);

        ContinueLearning continueLearning = lessonProgress.values().stream()
                .filter(lp -> lp.getStatus() == TangoLessonStatus.IN_PROGRESS)
                .max(Comparator.comparing(lp -> lp.getLastStudiedAt() == null
                        ? LocalDateTime.MIN
                        : lp.getLastStudiedAt()))
                .map(lp -> new ContinueLearning(lp.getLesson().getId(), lp.getLesson().getLessonNumber(),
                        lp.getLesson().getTitle(), lp.getLastPosition()))
                .orElse(null);

        List<RecentAttempt> recent = attemptRepository.findByUserIdOrderBySubmittedAtDesc(userId).stream()
                .filter(a -> scope.levels().contains(a.getLesson().getJlptLevel()))
                .limit(5)
                .map(a -> new RecentAttempt(a.getId(), a.getLesson().getId(), a.getScope().name(),
                        a.getAccuracy(), a.getSubmittedAt()))
                .toList();

        return new ProgressResponse(level == null ? null : level.name(), words, lessons, continueLearning, recent);
    }

    public WeakResponse getWeak(JlptLevel level, Integer limit) {
        int max = limit == null ? 20 : limit;
        if (max < 1 || max > MAX_LIMIT) {
            throw new TangoBadRequestException("limit must be between 1 and " + MAX_LIMIT);
        }
        Long userId = currentUserService.getCurrentUser().getId();
        Scope scope = scopeOf(level);
        List<WeakItem> items = vocabProgressFor(userId, scope.vocabularyIds()).values().stream()
                .filter(p -> p.getAnsweredCount() > 0)
                .sorted(Comparator
                        .comparingDouble((UserTangoVocabularyProgress p) -> accuracy(p))
                        .thenComparing(
                                Comparator.comparingInt(UserTangoVocabularyProgress::getIncorrectCount).reversed())
                        .thenComparing(p -> p.getLastAnsweredAt() == null ? LocalDateTime.MIN : p.getLastAnsweredAt()))
                .limit(max)
                .map(p -> {
                    TangoVocabulary v = p.getVocabulary();
                    return new WeakItem(v.getId(), v.getExpression(), v.getKana(), primaryMeaning(v),
                            p.getStatus().name(), p.getAnsweredCount(), p.getCorrectCount(),
                            p.getIncorrectCount(), accuracy(p), p.getLastAnsweredAt());
                })
                .toList();
        return new WeakResponse(items);
    }

    @Transactional
    public FavoriteToggleResponse setFavorite(Long vocabularyId, boolean favorite) {
        User user = currentUserService.getCurrentUser();
        TangoVocabulary v = vocabularyRepository.findById(vocabularyId)
                .orElseThrow(() -> new TangoNotFoundException("Vocabulary not found"));
        Optional<UserTangoFavorite> existing = favoriteRepository.findByUserIdAndVocabularyId(user.getId(),
                vocabularyId);
        if (favorite && existing.isEmpty()) {
            favoriteRepository.save(UserTangoFavorite.builder()
                    .user(user).vocabulary(v).createdAt(LocalDateTime.now()).build());
        } else if (!favorite) {
            existing.ifPresent(favoriteRepository::delete);
        }
        return new FavoriteToggleResponse(vocabularyId, favorite);
    }

    public FavoritesResponse getFavorites(int page, int size) {
        if (page < 0 || size < 1 || size > MAX_LIMIT) {
            throw new TangoBadRequestException("page must be >= 0 and size between 1 and " + MAX_LIMIT);
        }
        Long userId = currentUserService.getCurrentUser().getId();
        List<UserTangoFavorite> all = favoriteRepository.findByUserIdOrderByCreatedAtDesc(userId);
        List<WordSummary> items = all.stream()
                .skip((long) page * size)
                .limit(size)
                .map(f -> summary(f.getVocabulary()))
                .toList();
        return new FavoritesResponse(items, page, size, all.size());
    }

    public SearchResponse search(String q, JlptLevel level, String type) {
        String needle = normalizeForSearch(q == null ? "" : q);
        if (needle.isEmpty()) {
            throw new TangoBadRequestException("q must not be blank");
        }
        boolean wantLessons = type == null || type.equals("all") || type.equals("lessons");
        boolean wantVocabularies = type == null || type.equals("all") || type.equals("vocabularies");
        if (!wantLessons && !wantVocabularies) {
            throw new TangoBadRequestException("type must be lessons, vocabularies or all");
        }
        Scope scope = scopeOf(level);

        List<SearchLesson> lessons = wantLessons
                ? scope.lessons().stream()
                        .filter(l -> normalizeForSearch(l.getTitle()).contains(needle))
                        .limit(SEARCH_LIMIT)
                        .map(l -> new SearchLesson(l.getId(), l.getJlptLevel().name(), l.getLessonNumber(),
                                l.getTitle()))
                        .toList()
                : List.of();

        List<WordSummary> vocabularies = wantVocabularies
                ? scope.vocabularies().stream()
                        .filter(v -> matchesWord(v, needle))
                        .limit(SEARCH_LIMIT)
                        .map(TangoProgressService::summary)
                        .toList()
                : List.of();

        return new SearchResponse(lessons, vocabularies);
    }

    private boolean matchesWord(TangoVocabulary v, String needle) {
        if (normalizeForSearch(nullToEmpty(v.getExpression())).contains(needle))
            return true;
        if (normalizeForSearch(v.getKana()).contains(needle))
            return true;
        if (normalizeForSearch(v.getRomaji()).contains(needle))
            return true;
        return v.getMeanings().stream().anyMatch(m -> normalizeForSearch(m.getMeaning()).contains(needle));
    }

    /**
     * Searchable form: NFKC, katakana to hiragana, lowercase. Kanji are kept as-is.
     */
    private static String normalizeForSearch(String raw) {
        String s = Normalizer.normalize(nullToEmpty(raw), Normalizer.Form.NFKC).trim().toLowerCase(Locale.ROOT);
        StringBuilder out = new StringBuilder(s.length());
        for (char c : s.toCharArray()) {
            out.append(c >= 'ァ' && c <= 'ヶ' ? (char) (c - 0x60) : c);
        }
        return out.toString();
    }

    /**
     * The catalog slice a query covers: all published content, or one JLPT level.
     */
    private Scope scopeOf(JlptLevel level) {
        List<JlptLevel> levels = level == null ? List.of(JlptLevel.values()) : List.of(level);
        List<TangoLesson> lessons = new ArrayList<>();
        Map<Long, TangoVocabulary> vocabularies = new LinkedHashMap<>();
        for (JlptLevel l : levels) {
            lessons.addAll(lessonRepository.findByJlptLevelAndPublishedTrueOrderBySortOrderAsc(l));
            lessonVocabularyRepository.findPublishedByLevel(l)
                    .forEach(lv -> vocabularies.putIfAbsent(lv.getVocabulary().getId(), lv.getVocabulary()));
        }
        return new Scope(levels, lessons, List.copyOf(vocabularies.values()));
    }

    private Map<Long, UserTangoVocabularyProgress> vocabProgressFor(Long userId, Collection<Long> ids) {
        if (ids.isEmpty())
            return Map.of();
        return vocabularyProgressRepository.findByUserIdAndVocabularyIdIn(userId, ids).stream()
                .collect(Collectors.toMap(p -> p.getVocabulary().getId(), p -> p, (a, b) -> a));
    }

    private Map<Long, UserTangoLessonProgress> lessonProgressFor(Long userId, Collection<Long> ids) {
        if (ids.isEmpty())
            return Map.of();
        return lessonProgressRepository.findByUserIdAndLessonIdIn(userId, ids).stream()
                .collect(Collectors.toMap(p -> p.getLesson().getId(), p -> p, (a, b) -> a));
    }

    private record Scope(List<JlptLevel> levels, List<TangoLesson> lessons, List<TangoVocabulary> vocabularies) {
        Set<Long> lessonIds() {
            return lessons.stream().map(TangoLesson::getId).collect(Collectors.toSet());
        }

        Set<Long> vocabularyIds() {
            return vocabularies.stream().map(TangoVocabulary::getId).collect(Collectors.toSet());
        }
    }

    private static WordSummary summary(TangoVocabulary v) {
        return new WordSummary(v.getId(), v.getExpression(), v.getKana(), primaryMeaning(v));
    }

    private static double accuracy(UserTangoVocabularyProgress p) {
        return p.getAnsweredCount() == 0 ? 0 : (double) p.getCorrectCount() / p.getAnsweredCount();
    }

    private static String primaryMeaning(TangoVocabulary v) {
        return v.getMeanings().stream()
                .filter(TangoVocabularyMeaning::isPrimaryMeaning)
                .findFirst()
                .or(() -> v.getMeanings().stream().findFirst())
                .map(TangoVocabularyMeaning::getMeaning)
                .orElse(null);
    }

    private static String nullToEmpty(String s) {
        return s == null ? "" : s;
    }
}
